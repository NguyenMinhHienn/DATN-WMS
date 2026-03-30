import { Response } from 'express';
import { exportReceiptService } from '../services/export-receipt.service';
import { AuthRequest, ApiResponse, CreateExportReceiptDto } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

export const getAllReceipts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id as string) : undefined;
    const status = req.query.status as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    const result = await exportReceiptService.getAllReceipts(page, limit, warehouseId, status, startDate, endDate);

    res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    } as ApiResponse);
});

export const getReceiptById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const receipt = await exportReceiptService.getReceiptById(id);

    res.json({
        success: true,
        data: receipt,
    } as ApiResponse);
});

export const createReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const dto: CreateExportReceiptDto = req.body;
    const userId = req.user?.userId;
    const receipt = await exportReceiptService.createReceipt(dto, userId);

    res.status(201).json({
        success: true,
        message: 'Tạo phiếu xuất kho thành công',
        data: receipt,
    } as ApiResponse);
});

export const approveReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const userId = req.user?.userId;
    await exportReceiptService.approveReceipt(id, userId);

    res.json({
        success: true,
        message: 'Duyệt phiếu xuất kho thành công. Tồn kho đã được cập nhật.',
    } as ApiResponse);
});

export const deleteReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await exportReceiptService.deleteReceipt(id);

    res.json({
        success: true,
        message: 'Xóa phiếu xuất kho thành công',
    } as ApiResponse);
});
