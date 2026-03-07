import { exportSlipRepository, CreateExportSlipItemInput } from '../repositories/export-slip.repository';
import { orderRepository } from '../repositories/order.repository';
import { AppError } from '../middlewares/error.middleware';
import pool from '../config/database';

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

            // ExportSlip → completed
            await connection.execute(
                'UPDATE export_slips SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['completed', slipId]
            );

            // Order → delivered
            await connection.execute(
                'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['delivered', slip.order_id]
            );

            // COD → paid
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
    }

    /**
     * Giao hàng thất bại
     * - ExportSlip → returned
     * - Order → failed
     * - Cộng lại tồn kho
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

            // Cộng lại tồn kho
            for (const detail of slip.details) {
                if (detail.variant_id) {
                    await connection.execute(
                        'UPDATE product_variants SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [detail.quantity, detail.variant_id]
                    );
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
