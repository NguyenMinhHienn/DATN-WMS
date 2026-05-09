import { Response } from 'express';
import { goodsReceiptService } from '../services/goods-receipt.service';
import { AuthRequest, ApiResponse, CreateGoodsReceiptDto } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

export const getAllReceipts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id as string) : undefined;
    const status = req.query.status as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    const result = await goodsReceiptService.getAllReceipts(page, limit, warehouseId, status, startDate, endDate);

    res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    } as ApiResponse);
});

export const getReceiptById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const receipt = await goodsReceiptService.getReceiptById(id);

    res.json({
        success: true,
        data: receipt,
    } as ApiResponse);
});

export const createReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const dto: CreateGoodsReceiptDto = req.body;
    const userId = req.user?.userId;
    const receipt = await goodsReceiptService.createReceipt(dto, userId);

    res.status(201).json({
        success: true,
        message: 'Tạo phiếu nhập kho thành công',
        data: receipt,
    } as ApiResponse);
});

export const updateReceiptStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    await goodsReceiptService.updateStatus(id, status);

    res.json({
        success: true,
        message: 'Cập nhật trạng thái thành công',
    } as ApiResponse);
});

export const approveReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const userId = req.user?.userId;
    await goodsReceiptService.approveReceipt(id, userId);

    res.json({
        success: true,
        message: 'Duyệt phiếu nhập kho thành công. Tồn kho đã được cập nhật.',
    } as ApiResponse);
});

export const deleteReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await goodsReceiptService.deleteReceipt(id);

    res.json({
        success: true,
        message: 'Xóa phiếu nhập kho thành công',
    } as ApiResponse);
});
