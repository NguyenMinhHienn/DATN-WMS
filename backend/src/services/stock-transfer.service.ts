import { stockTransferRepository } from '../repositories/stock-transfer.repository';
import {
    CreateStockTransferDto,
    CreateStockTransferItemDto,
    StockTransfer,
    StockTransferItem,
    PaginatedResult
} from '../types';
import { AppError } from '../middlewares/error.middleware';

/**
 * Stock Transfer Service
 * Layer xử lý business logic cho phiếu chuyển/nhập/xuất kho
 * 
 * QUY TẮC NGHIỆP VỤ:
 * - STAFF: Chỉ được tạo phiếu (trạng thái PENDING), xem phiếu của mình
 * - ADMIN: Xem tất cả phiếu, duyệt/từ chối phiếu
 * - IMPORT: Cho phép nhập thông tin sản phẩm mới (tên, SKU, hình)
 */
// test
export class StockTransferService {

    async getAllTransfers(
        page: number = 1,
        limit: number = 10,
        status?: string,
        transferType?: string,
        startDate?: string,
        endDate?: string,
        userId?: number,
        isAdmin: boolean = false
    ): Promise<PaginatedResult<StockTransfer>> {
        if (isAdmin) {
            return stockTransferRepository.findAll(page, limit, status, transferType, startDate, endDate);
        } else {
            if (!userId) {
                throw new AppError('User ID required for staff access', 400);
            }
            return stockTransferRepository.findByCreator(userId, page, limit, status);
        }
    }

    async getTransferById(
        id: number,
        userId?: number,
        isAdmin: boolean = false
    ): Promise<StockTransfer & { items: StockTransferItem[] }> {
        const transfer = await stockTransferRepository.findById(id);

        if (!transfer) {
            throw new AppError('Stock transfer not found', 404);
        }

        if (!isAdmin && transfer.created_by !== userId) {
            throw new AppError('You do not have permission to view this transfer', 403);
        }

        const items = await stockTransferRepository.getItems(id);
        return { ...transfer, items };
    }

    /**
     * Tạo phiếu mới - Chỉ STAFF
     * 
     * Với phiếu IMPORT: Cho phép nhập thông tin sản phẩm mới
     * Payload IMPORT:
     * {
     *   type: "IMPORT",
     *   destination_warehouse_id: number,
     *   items: [{ 
     *     product_name, product_sku, product_image_url,
     *     quantity, unit_price, notes 
     *   }]
     * }
     */
    async createTransfer(dto: CreateStockTransferDto, userId: number): Promise<StockTransfer> {
        console.log('[StockTransferService] Received payload:', JSON.stringify(dto, null, 2));

        try {
            // Chuẩn hóa dữ liệu
            const normalizedDto = this.normalizeCreateDto(dto);

            // Validate cơ bản
            const errors = this.validateCreateDto(normalizedDto);
            if (errors.length > 0) {
                console.error('[StockTransferService] Validation errors:', errors);
                throw new AppError(`Dữ liệu không hợp lệ: ${errors.join(', ')}`, 400);
            }

            // Kiểm tra tồn kho cho EXPORT/TRANSFER trước khi tạo phiếu
            if (normalizedDto.transfer_type === 'EXPORT' || normalizedDto.transfer_type === 'TRANSFER') {
                const stockErrors = await this.validateStockAvailability(normalizedDto);
                if (stockErrors.length > 0) {
                    console.error('[StockTransferService] Stock validation errors:', stockErrors);
                    throw new AppError(`Không đủ tồn kho: ${stockErrors.join(', ')}`, 400);
                }
            }

            // Tạo phiếu
            const transferId = await stockTransferRepository.create(normalizedDto, userId);

            const transfer = await stockTransferRepository.findById(transferId);
            if (!transfer) {
                throw new AppError('Không thể tạo phiếu', 500);
            }

            console.log('[StockTransferService] Created transfer:', transfer.transfer_number);
            return transfer;
        } catch (error: any) {
            console.error('[StockTransferService] Error creating transfer:', error);
            // Re-throw AppError directly
            if (error instanceof AppError) {
                throw error;
            }
            // Wrap other errors
            throw new AppError(error.message || 'Lỗi tạo phiếu không xác định', 500);
        }
    }

    /**
     * Chuẩn hóa dữ liệu đầu vào
     */
    private normalizeCreateDto(dto: CreateStockTransferDto): CreateStockTransferDto {
        const transfer_type = dto.transfer_type || dto.type;

        // Chuẩn hóa items - giữ nguyên thông tin sản phẩm mới
        const normalizedItems: CreateStockTransferItemDto[] = (dto.items || []).map(item => ({
            // Thông tin sản phẩm
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            product_image_url: item.product_image_url,

            // Số lượng và giá
            quantity_requested: item.quantity_requested ?? item.quantity ?? 0,
            unit_cost: item.unit_cost ?? item.unit_price ?? 0,

            // Thông tin bổ sung
            batch_number: item.batch_number,
            expiry_date: item.expiry_date,
            notes: item.notes,
        }));

        // Console log normalized DTO including order_id
        console.log('[StockTransferService] Normalized DTO order_id:', dto.order_id);
        
        return {
            transfer_type,
            source_warehouse_id: dto.source_warehouse_id,
            destination_warehouse_id: dto.destination_warehouse_id,
            transfer_date: dto.transfer_date || new Date().toISOString().split('T')[0],
            expected_arrival_date: dto.expected_arrival_date,
            supplier_id: dto.supplier_id,
            delivery_person: dto.delivery_person,
            storekeeper: dto.storekeeper,
            receiver_name: dto.receiver_name,
            receiver_department: dto.receiver_department,
            receiver_address: dto.receiver_address,
            receiver_phone: dto.receiver_phone,
            order_id: dto.order_id || dto.orderId,
            reason: dto.reason,
            notes: dto.notes,
            items: normalizedItems,
        };
    }

    /**
     * Validate dữ liệu đầu vào
     */
    private validateCreateDto(dto: CreateStockTransferDto): string[] {
        const errors: string[] = [];

        // Kiểm tra transfer_type
        if (!dto.transfer_type) {
            errors.push('Loại phiếu (type) là bắt buộc');
        } else if (!['IMPORT', 'EXPORT', 'TRANSFER'].includes(dto.transfer_type)) {
            errors.push('Loại phiếu không hợp lệ. Phải là IMPORT, EXPORT, hoặc TRANSFER');
        }

        // Kiểm tra nhà cung cấp (bắt buộc cho phiếu NHẬP)
        if (dto.transfer_type === 'IMPORT' && !dto.supplier_id) {
            errors.push('Nhà cung cấp là bắt buộc cho phiếu NHẬP. Mỗi phiếu nhập chỉ gắn với một nhà cung cấp duy nhất.');
        }

        // Kiểm tra warehouse
        if (dto.transfer_type === 'IMPORT' && !dto.destination_warehouse_id) {
            errors.push('Kho đích là bắt buộc cho phiếu NHẬP');
        }
        if (dto.transfer_type === 'EXPORT' && !dto.source_warehouse_id) {
            errors.push('Kho nguồn là bắt buộc cho phiếu XUẤT');
        }
        if (dto.transfer_type === 'TRANSFER') {
            if (!dto.source_warehouse_id) {
                errors.push('Kho nguồn là bắt buộc cho phiếu CHUYỂN');
            }
            if (!dto.destination_warehouse_id) {
                errors.push('Kho đích là bắt buộc cho phiếu CHUYỂN');
            }
            if (dto.source_warehouse_id === dto.destination_warehouse_id && dto.source_warehouse_id) {
                errors.push('Kho nguồn và kho đích phải khác nhau');
            }
        }

        // Kiểm tra items
        if (!dto.items || dto.items.length === 0) {
            errors.push('Ít nhất một sản phẩm là bắt buộc');
        } else {
            dto.items.forEach((item, index) => {
                // Đối với IMPORT: Có thể nhập product mới (product_name) HOẶC chọn product_id
                // Đối với EXPORT/TRANSFER: Bắt buộc product_id
                const isImport = dto.transfer_type === 'IMPORT';
                const hasProductId = item.product_id && item.product_id > 0;
                const hasProductName = item.product_name && item.product_name.trim().length > 0;

                if (isImport) {
                    // IMPORT: Cần có tên sản phẩm HOẶC product_id
                    if (!hasProductId && !hasProductName) {
                        errors.push(`Sản phẩm ${index + 1}: Cần có tên sản phẩm hoặc mã sản phẩm`);
                    }
                } else {
                    // EXPORT/TRANSFER: Bắt buộc product_id
                    if (!hasProductId) {
                        errors.push(`Sản phẩm ${index + 1}: Product ID là bắt buộc cho phiếu xuất/chuyển`);
                    }
                }

                const qty = item.quantity_requested ?? 0;
                if (qty <= 0) {
                    errors.push(`Sản phẩm ${index + 1}: Số lượng phải lớn hơn 0`);
                }

                const price = item.unit_cost ?? 0;
                if (price < 0) {
                    errors.push(`Sản phẩm ${index + 1}: Đơn giá không được âm`);
                }
            });
        }

        return errors;
    }

    /**
     * Kiểm tra tồn kho cho EXPORT/TRANSFER
     * Trả về mảng lỗi nếu không đủ tồn kho
     */
    private async validateStockAvailability(dto: CreateStockTransferDto): Promise<string[]> {
        const errors: string[] = [];

        if (!dto.source_warehouse_id) {
            return errors; // Không có kho nguồn thì không cần check
        }

        for (let i = 0; i < dto.items.length; i++) {
            const item = dto.items[i];
            if (item.product_id && item.product_id > 0) {
                const qty = item.quantity_requested ?? 0;
                const stockCheck = await stockTransferRepository.checkSufficientStock(
                    dto.source_warehouse_id,
                    item.product_id,
                    qty,
                    item.product_variant_id
                );

                if (!stockCheck.sufficient) {
                    errors.push(
                        `Sản phẩm ${i + 1} (ID: ${item.product_id}): Yêu cầu ${qty}, tồn kho chỉ còn ${stockCheck.available}`
                    );
                }
            }
        }

        return errors;
    }

    async approveTransfer(id: number, adminUserId: number): Promise<boolean> {
        const transfer = await stockTransferRepository.findById(id);

        if (!transfer) {
            throw new AppError('Không tìm thấy phiếu', 404);
        }

        if (transfer.status !== 'pending') {
            throw new AppError(
                `Không thể duyệt phiếu có trạng thái "${transfer.status}". Chỉ phiếu PENDING mới được duyệt.`,
                400
            );
        }

        return stockTransferRepository.approve(id, adminUserId);
    }

    async rejectTransfer(id: number, adminUserId: number, reason?: string): Promise<boolean> {
        const transfer = await stockTransferRepository.findById(id);

        if (!transfer) {
            throw new AppError('Không tìm thấy phiếu', 404);
        }

        if (transfer.status !== 'pending') {
            throw new AppError(
                `Không thể từ chối phiếu có trạng thái "${transfer.status}". Chỉ phiếu PENDING mới được từ chối.`,
                400
            );
        }

        const rejected = await stockTransferRepository.reject(id, adminUserId, reason);
        if (!rejected) {
            throw new AppError('Không thể từ chối phiếu', 500);
        }

        return true;
    }

    async deleteTransfer(id: number, userId: number, isAdmin: boolean): Promise<void> {
        const transfer = await stockTransferRepository.findById(id);

        if (!transfer) {
            throw new AppError('Không tìm thấy phiếu', 404);
        }

        if (!isAdmin && transfer.created_by !== userId) {
            throw new AppError('Bạn không có quyền xóa phiếu này', 403);
        }

        if (!['draft', 'pending'].includes(transfer.status)) {
            throw new AppError(
                `Không thể xóa phiếu có trạng thái "${transfer.status}". Chỉ phiếu draft hoặc pending mới được xóa.`,
                400
            );
        }

        const deleted = await stockTransferRepository.delete(id);
        if (!deleted) {
            throw new AppError('Không thể xóa phiếu', 500);
        }
    }
}

export const stockTransferService = new StockTransferService();
