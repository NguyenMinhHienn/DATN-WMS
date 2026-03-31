import { goodsReceiptRepository } from '../repositories/goods-receipt.repository';
import { CreateGoodsReceiptDto, GoodsReceipt, GoodsReceiptItem, PaginatedResult } from '../types';
import { AppError } from '../middlewares/error.middleware';

export class GoodsReceiptService {
    async getAllReceipts(
        page: number = 1,
        limit: number = 10,
        warehouseId?: number,
        status?: string,
        startDate?: string,
        endDate?: string
    ): Promise<PaginatedResult<GoodsReceipt>> {
        return goodsReceiptRepository.findAll(page, limit, warehouseId, status, startDate, endDate);
    }

    async getReceiptById(id: number): Promise<GoodsReceipt & { items: GoodsReceiptItem[] }> {
        const receipt = await goodsReceiptRepository.findById(id);
        if (!receipt) {
            throw new AppError('Goods receipt not found', 404);
        }

        const items = await goodsReceiptRepository.getItems(id);
        return { ...receipt, items };
    }

    async createReceipt(dto: CreateGoodsReceiptDto, userId?: number): Promise<GoodsReceipt> {
        if (!dto.items || dto.items.length === 0) {
            throw new AppError('At least one item is required', 400);
        }

        const receiptId = await goodsReceiptRepository.create(dto, userId);

        const receipt = await goodsReceiptRepository.findById(receiptId);
        if (!receipt) {
            throw new AppError('Failed to create goods receipt', 500);
        }

        return receipt;
    }

    async approveReceipt(id: number, userId?: number): Promise<boolean> {
        const receipt = await goodsReceiptRepository.findById(id);
        if (!receipt) {
            throw new AppError('Phiếu nhập không tồn tại', 404);
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

        return goodsReceiptRepository.approveReceipt(id, userId);
    }

    async updateStatus(id: number, status: string): Promise<boolean> {
        const receipt = await goodsReceiptRepository.findById(id);
        if (!receipt) {
            throw new AppError('Phiếu nhập không tồn tại', 404);
        }

        if (receipt.status === 'APPROVED') {
            throw new AppError('Không thể thay đổi trạng thái phiếu đã duyệt', 400);
        }

        return goodsReceiptRepository.updateStatus(id, status);
    }

    async deleteReceipt(id: number): Promise<void> {
        const receipt = await goodsReceiptRepository.findById(id);
        if (!receipt) {
            throw new AppError('Phiếu nhập không tồn tại', 404);
        }

        if (receipt.status !== 'PENDING') {
            throw new AppError('Chỉ có thể xóa phiếu ở trạng thái PENDING', 400);
        }

        const deleted = await goodsReceiptRepository.delete(id);
        if (!deleted) {
            throw new AppError('Failed to delete goods receipt', 500);
        }
    }
}

export const goodsReceiptService = new GoodsReceiptService();
