import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { exportSlipService } from '../services/export-slip.service';
import { asyncHandler } from '../middlewares/error.middleware';

/**
 * ExportSlip Controller
 * API endpoints cho phiếu xuất kho
 */

/**
 * POST /export-slips
 * Staff tạo phiếu xuất kho từ đơn hàng confirmed
 */
export const createExportSlip = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' } as ApiResponse);
    }

    const { order_id, notes } = req.body;

    if (!order_id) {
        return res.status(400).json({ success: false, message: 'Thiếu order_id' } as ApiResponse);
    }

    const slipId = await exportSlipService.createExportSlip(
        parseInt(order_id),
        req.user.userId,
        notes
    );

    const slip = await exportSlipService.getExportSlipById(slipId);

    res.status(201).json({
        success: true,
        message: 'Đã tạo phiếu xuất kho',
        data: slip,
    } as ApiResponse);
});

/**
 * GET /export-slips
 * Admin/Staff lấy tất cả phiếu xuất kho
 */
export const getAllExportSlips = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;

    const result = await exportSlipService.getAllExportSlips(page, limit, status);

    res.json({
        success: true,
        message: 'Export slips retrieved successfully',
        data: result.data,
        pagination: result.pagination,
    } as ApiResponse);
});

/**
 * GET /export-slips/my
 * Staff lấy phiếu do mình tạo
 */
export const getMyExportSlips = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' } as ApiResponse);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await exportSlipService.getMyExportSlips(req.user.userId, page, limit);

    res.json({
        success: true,
        message: 'My export slips retrieved successfully',
        data: result.data,
        pagination: result.pagination,
    } as ApiResponse);
});

/**
 * GET /export-slips/:id
 * Lấy chi tiết phiếu xuất kho
 */
export const getExportSlipById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' } as ApiResponse);
    }

    const slip = await exportSlipService.getExportSlipById(id);

    res.json({
        success: true,
        message: 'Export slip retrieved successfully',
        data: slip,
    } as ApiResponse);
});

/**
 * PUT /export-slips/:id/approve
 * Admin duyệt phiếu xuất kho (trừ kho, order → shipping)
 */
export const approveExportSlip = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' } as ApiResponse);
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' } as ApiResponse);
    }

    await exportSlipService.approveExportSlip(id, req.user.userId);

    res.json({
        success: true,
        message: 'Đã duyệt phiếu xuất kho và trừ tồn kho',
    } as ApiResponse);
});

/**
 * PUT /export-slips/:id/complete
 * Admin đánh dấu giao thành công
 */
export const completeDelivery = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' } as ApiResponse);
    }

    await exportSlipService.completeDelivery(id);

    res.json({
        success: true,
        message: 'Đã xác nhận giao hàng thành công',
    } as ApiResponse);
});

/**
 * PUT /export-slips/:id/fail
 * Admin đánh dấu giao thất bại (cộng lại kho)
 */
export const failDelivery = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' } as ApiResponse);
    }

    await exportSlipService.failDelivery(id);

    res.json({
        success: true,
        message: 'Đã đánh dấu giao thất bại và hoàn kho',
    } as ApiResponse);
});
