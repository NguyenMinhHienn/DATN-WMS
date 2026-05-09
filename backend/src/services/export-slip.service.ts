import { exportSlipRepository, CreateExportSlipItemInput } from '../repositories/export-slip.repository';
import { orderRepository } from '../repositories/order.repository';
import { AppError } from '../middlewares/error.middleware';
import { inventoryCoreService } from './inventory-core.service';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

/**
 * ExportSlip Service
 * Business logic cho phiếu xuất kho: tạo, duyệt, giao hàng thành công/thất bại
 */

class ExportSlipService {

    /**
     * Staff tạo phiếu xuất kho
     * Điều kiện: Order.status == confirmed, chưa có phiếu active
     */
    async createExportSlip(
        orderId: number,
        staffId: number,
        notes?: string
    ): Promise<number> {
        // Validate order
        const order = await orderRepository.getOrderById(orderId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng', 404);
        }
        if (order.status !== 'confirmed') {
            throw new AppError(`Chỉ tạo phiếu xuất kho cho đơn đã duyệt (confirmed). Đơn hiện tại: "${order.status}"`, 400);
        }

        // Kiểm tra phiếu đã tồn tại
        const existingSlip = await exportSlipRepository.getActiveExportSlipByOrderId(orderId);
        if (existingSlip) {
            throw new AppError('Đã có phiếu xuất kho đang xử lý cho đơn hàng này', 400);
        }

        // Tạo items từ order items
        const items: CreateExportSlipItemInput[] = order.items.map(item => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
        }));

        if (items.length === 0) {
            throw new AppError('Đơn hàng không có sản phẩm', 400);
        }

        // Tạo phiếu (status = waiting_approval, CHƯA trừ kho)
        const slipId = await exportSlipRepository.createExportSlip(orderId, staffId, items, notes);
        return slipId;
    }

    /**
     * Admin duyệt phiếu xuất kho
     * - Kiểm tra stock đủ
     * - Trừ tồn kho
     * - Cập nhật order status → shipping
     */
    async approveExportSlip(slipId: number, adminId: number): Promise<void> {
        const slip = await exportSlipRepository.getExportSlipById(slipId);
        if (!slip) {
            throw new AppError('Không tìm thấy phiếu xuất kho', 404);
        }
        if (slip.status !== 'waiting_approval') {
            throw new AppError(`Chỉ duyệt được phiếu ở trạng thái "Chờ duyệt". Trạng thái hiện tại: "${slip.status}"`, 400);
        }

        // Validate order status
        const order = await orderRepository.getOrderById(slip.order_id);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng liên kết', 404);
        }
        if (order.status !== 'confirmed') {
            throw new AppError(`Đơn hàng không ở trạng thái "confirmed". Trạng thái: "${order.status}"`, 400);
        }

        // BỎ QUA KIỂM TRA TỒN KHO VÀ TRỪ TỒN KHO: 
        // Vì số lượng tồn kho đã được trừ NGAY LẬP TỨC từ khi khách hàng bấm Đặt Hàng (thành công ở bước Order).
        // Phiếu xuất kho hiện tại chỉ mang tính chất minh chứng giao dịch và tính toán giá vốn (COGS).

        // Transaction: Trừ kho + cập nhật status
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Trừ tồn kho và ghi COGS
            for (const detail of slip.details) {
                if (detail.variant_id) {
                    // Lấy average_cost để tính COGS
                    const [vRows] = await connection.execute<any[]>(
                        'SELECT stock, average_cost FROM product_variants WHERE id = ?',
                        [detail.variant_id]
                    );
                    const avgCost = Number(vRows[0]?.average_cost) || 0;
                    const cogs = detail.quantity * avgCost;

                    // Bỏ lệnh trừ tồn kho:
                    // Đã trừ ở OrderRepository.createOrder

                    // Ghi COGS snapshot
                    await connection.execute(
                        'UPDATE export_slip_details SET unit_cost_snapshot = ?, cost_of_goods_sold = ? WHERE id = ?',
                        [avgCost, cogs, detail.id]
                    );
                }
            }

            // Cập nhật phiếu xuất kho
            await connection.execute(
                'UPDATE export_slips SET status = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['approved', adminId, slipId]
            );

            // Cập nhật order status → shipping
            await connection.execute(
                'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['shipping', slip.order_id]
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Giao hàng thành công
     * - ExportSlip → completed
     * - Order → delivered
     * - COD → payment_status = paid
     * - Xuất kho qua inventoryCoreService (giảm on_hand + reserved)
     * - Tạo công nợ phải thu (COD auto-close, CREDIT để mở)
     * - Auto-check credit eligibility
     */
    async completeDelivery(slipId: number): Promise<void> {
        const slip = await exportSlipRepository.getExportSlipById(slipId);
        if (!slip) {
            throw new AppError('Không tìm thấy phiếu xuất kho', 404);
        }
        if (slip.status !== 'approved') {
            throw new AppError(`Chỉ hoàn tất phiếu đã duyệt. Trạng thái hiện tại: "${slip.status}"`, 400);
        }

        const order = await orderRepository.getOrderById(slip.order_id);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng', 404);
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Xuất kho qua inventoryCoreService (giảm on_hand + giảm reserved)
            // Khi createOrder đã reserveStock, giờ giao thành công → exportStock chính thức xuất
            for (const detail of slip.details) {
                if (detail.variant_id) {
                    await inventoryCoreService.exportStock({
                        connection,
                        productId: detail.product_id,
                        variantId: detail.variant_id,
                        warehouseId: 1, // Kho Tổng
                        quantity: detail.quantity,
                        referenceType: 'export_slip',
                        referenceId: slipId,
                        reason: `Giao hàng thành công - Đơn #${slip.order_id}`,
                    });
                }
            }

            // 2. ExportSlip → completed
            await connection.execute(
                'UPDATE export_slips SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['completed', slipId]
            );

            // 3. Order → delivered
            await connection.execute(
                'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['delivered', slip.order_id]
            );

            // 4. COD → paid
            if (order.payment_method === 'COD') {
                await connection.execute(
                    'UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    ['paid', slip.order_id]
                );
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        // ===== SAU TRANSACTION: Tạo công nợ (không nằm trong transaction để đảm bảo delivery luôn thành công) =====

        // 5. Tạo công nợ cho đơn COD (đã thu tiền khi giao → auto-close receivable)
        if (order.payment_method === 'COD') {
            try {
                const { receivableService } = require('./receivable.service');

                // Lấy tổng thực tế từ stock_transfer (subtotal + VAT + shipping)
                const [stRows] = await pool.query<RowDataPacket[]>(
                    `SELECT subtotal, COALESCE(vat_amount, 0) as vat_amount, COALESCE(shipping_fee, 0) as shipping_fee 
                     FROM stock_transfers WHERE order_id = ? AND transfer_type = 'EXPORT' LIMIT 1`,
                    [slip.order_id]
                );
                let grandTotal = Number(order.total_amount);
                if (stRows.length > 0) {
                    grandTotal = Number(stRows[0].subtotal) + Number(stRows[0].vat_amount) + Number(stRows[0].shipping_fee);
                }

                const receivableId = await receivableService.createFromOrder({
                    id: slip.order_id,
                    total_amount: grandTotal,
                    shipping_name: order.shipping_name,
                    shipping_phone: order.shipping_phone,
                    shipping_address: order.shipping_address,
                    user_id: order.user_id,
                    created_at: order.created_at,
                });
                // Auto-close receivable vì COD đã thu tiền khi giao
                const { receivableRepository } = require('../repositories/receivable.repository');
                await receivableRepository.updatePaidAmount(receivableId, grandTotal);
            } catch (recErr) {
                // Log lỗi nhưng KHÔNG throw - đảm bảo delivery vẫn thành công
                console.error('⚠️ [ExportSlip] Lỗi tạo công nợ từ đơn COD:', recErr);
            }
        }

        // 6. Tạo công nợ cho đơn CREDIT (trả sau) - KHÔNG auto-close
        if (order.payment_method === 'CREDIT') {
            try {
                const { receivableService } = require('./receivable.service');
                const { creditService } = require('./credit.service');

                // Lấy tổng thực tế từ stock_transfer (subtotal + VAT + shipping)
                const [stRows] = await pool.query<RowDataPacket[]>(
                    `SELECT subtotal, COALESCE(vat_amount, 0) as vat_amount, COALESCE(shipping_fee, 0) as shipping_fee 
                     FROM stock_transfers WHERE order_id = ? AND transfer_type = 'EXPORT' LIMIT 1`,
                    [slip.order_id]
                );
                let grandTotal = Number(order.total_amount);
                if (stRows.length > 0) {
                    grandTotal = Number(stRows[0].subtotal) + Number(stRows[0].vat_amount) + Number(stRows[0].shipping_fee);
                }

                const creditInfo = await creditService.getCreditInfo(order.user_id);
                await receivableService.createFromCreditOrder({
                    id: slip.order_id,
                    total_amount: grandTotal,
                    shipping_name: order.shipping_name,
                    shipping_phone: order.shipping_phone,
                    shipping_address: order.shipping_address,
                    user_id: order.user_id,
                    created_at: order.created_at,
                    payment_terms: creditInfo.credit_payment_terms,
                });
                // Cập nhật credit_used
                await creditService.syncCreditUsed(order.user_id);
            } catch (recErr) {
                console.error('⚠️ [ExportSlip] Lỗi tạo công nợ từ đơn CREDIT:', recErr);
            }
        }

        // 7. Auto-check credit eligibility sau khi giao hàng (COD/BANKING)
        if (order.payment_method !== 'CREDIT') {
            try {
                const { creditService } = require('./credit.service');
                await creditService.autoCheckAndEnable(order.user_id);
            } catch (err) {
                console.error('⚠️ [ExportSlip] Lỗi auto-check credit:', err);
            }
        }
    }

    /**
     * Giao hàng thất bại
     * - ExportSlip → returned
     * - Order → failed
     * - Hoàn trả tồn kho qua inventoryCoreService.releaseStock (hủy reserved)
     */
    async failDelivery(slipId: number): Promise<void> {
        const slip = await exportSlipRepository.getExportSlipById(slipId);
        if (!slip) {
            throw new AppError('Không tìm thấy phiếu xuất kho', 404);
        }
        if (slip.status !== 'approved') {
            throw new AppError(`Chỉ đánh dấu thất bại cho phiếu đã duyệt. Trạng thái: "${slip.status}"`, 400);
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Hoàn trả tồn kho qua inventoryCoreService
            // Khi createOrder đã gọi reserveStock (tăng reserved), giờ giao thất bại → releaseStock (giảm reserved)
            // Điều này giữ đồng bộ cả inventories table và product_variants.stock (qua syncVariantStock)
            for (const detail of slip.details) {
                if (detail.variant_id) {
                    await inventoryCoreService.releaseStock({
                        connection,
                        productId: detail.product_id,
                        variantId: detail.variant_id,
                        warehouseId: 1, // Kho Tổng
                        quantity: detail.quantity,
                        referenceType: 'export_slip',
                        referenceId: slipId,
                        reason: `Giao hàng thất bại - Đơn #${slip.order_id}`,
                    });
                }
            }

            // ExportSlip → returned
            await connection.execute(
                'UPDATE export_slips SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['returned', slipId]
            );

            // Order → failed
            await connection.execute(
                'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['failed', slip.order_id]
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Lấy tất cả phiếu xuất kho (admin)
     */
    async getAllExportSlips(page: number = 1, limit: number = 10, status?: string) {
        return exportSlipRepository.getAllExportSlips(page, limit, status);
    }

    /**
     * Lấy phiếu của staff
     */
    async getMyExportSlips(staffId: number, page: number = 1, limit: number = 10) {
        return exportSlipRepository.getExportSlipsByStaff(staffId, page, limit);
    }

    /**
     * Lấy chi tiết phiếu
     */
    async getExportSlipById(id: number) {
        const slip = await exportSlipRepository.getExportSlipById(id);
        if (!slip) {
            throw new AppError('Không tìm thấy phiếu xuất kho', 404);
        }
        return slip;
    }
}

export const exportSlipService = new ExportSlipService();
