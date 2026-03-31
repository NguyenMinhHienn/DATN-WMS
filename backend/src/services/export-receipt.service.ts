import { exportReceiptRepository } from '../repositories/export-receipt.repository';
import { CreateExportReceiptDto, ExportReceipt, ExportReceiptItem, PaginatedResult } from '../types';
import { AppError } from '../middlewares/error.middleware';

export class ExportReceiptService {
    async getAllReceipts(
        page: number = 1,
        limit: number = 10,
        warehouseId?: number,
        status?: string,
        startDate?: string,
        endDate?: string
    ): Promise<PaginatedResult<ExportReceipt>> {
        return exportReceiptRepository.findAll(page, limit, warehouseId, status, startDate, endDate);
    }

    async getReceiptById(id: number): Promise<ExportReceipt & { items: ExportReceiptItem[] }> {
        const receipt = await exportReceiptRepository.findById(id);
        if (!receipt) {
            throw new AppError('Phiếu xuất kho không tồn tại', 404);
        }

        const items = await exportReceiptRepository.getItems(id);
        return { ...receipt, items };
    }

    async createReceipt(dto: CreateExportReceiptDto, userId?: number): Promise<ExportReceipt> {
        if (!dto.items || dto.items.length === 0) {
            throw new AppError('Cần ít nhất một sản phẩm trong phiếu xuất', 400);
        }

        // Validate quantities
        for (const item of dto.items) {
            if (item.quantity_requested <= 0) {
                throw new AppError('Số lượng yêu cầu phải lớn hơn 0', 400);
            }
        }

        const receiptId = await exportReceiptRepository.create(dto, userId);

        const receipt = await exportReceiptRepository.findById(receiptId);
        if (!receipt) {
            throw new AppError('Không thể tạo phiếu xuất kho', 500);
        }

        return receipt;
    }

    async approveReceipt(id: number, userId?: number): Promise<boolean> {
        const receipt = await exportReceiptRepository.findById(id);
        if (!receipt) {
            throw new AppError('Phiếu xuất kho không tồn tại', 404);
        }

        if (receipt.status === 'APPROVED') {
            throw new AppError('Phiếu đã được duyệt', 400);
        }

        if (receipt.status === 'CANCELLED') {
            throw new AppError('Không thể duyệt phiếu đã hủy', 400);
        }

        if (receipt.status !== 'PENDING') {
            throw new AppError('Chỉ có thể duyệt phiếu ở trạng thái PENDING', 400);
        }

        try {
            return await exportReceiptRepository.approveReceipt(id, userId);
        } catch (error: any) {
            // Re-throw stock errors as AppError with 400 status
            if (error.message && error.message.includes('Tồn kho không đủ')) {
                throw new AppError(error.message, 400);
            }
            throw error;
        }
    }

    async deleteReceipt(id: number): Promise<void> {
        const receipt = await exportReceiptRepository.findById(id);
        if (!receipt) {
            throw new AppError('Phiếu xuất kho không tồn tại', 404);
        }

        if (receipt.status !== 'PENDING') {
            throw new AppError('Chỉ có thể xóa phiếu ở trạng thái PENDING', 400);
        }

        const deleted = await exportReceiptRepository.delete(id);
        if (!deleted) {
            throw new AppError('Không thể xóa phiếu xuất kho', 500);
        }
    }
}

export const exportReceiptService = new ExportReceiptService();
