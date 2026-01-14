import { Response } from 'express';
import { stockTransferService } from '../services/stock-transfer.service';
import { AuthRequest, ApiResponse, CreateStockTransferDto } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

/**
 * Stock Transfer Controller
 * Xử lý HTTP requests cho module phiếu chuyển/nhập/xuất kho
 * 
 * PHÂN QUYỀN:
 * - createTransfer: STAFF only
 * - getAllTransfers: ADMIN (tất cả) / STAFF (của mình)
 * - getTransferById: ADMIN (tất cả) / STAFF (của mình)
 * - approveTransfer: ADMIN only
 * - rejectTransfer: ADMIN only
 */

/**
 * Tạo phiếu mới - Chỉ STAFF
 * POST /stock-transfers
 */
export const createTransfer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const dto: CreateStockTransferDto = req.body;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated',
        } as ApiResponse);
    }

    const transfer = await stockTransferService.createTransfer(dto, userId);

    res.status(201).json({
        success: true,
        message: 'Stock transfer created successfully. Waiting for admin approval.',
        data: transfer,
    } as ApiResponse);
});

/**
 * Lấy danh sách phiếu - ADMIN: tất cả, STAFF: của mình
 * GET /stock-transfers
 */
export const getAllTransfers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const transferType = req.query.transfer_type as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.includes('admin');

    const result = await stockTransferService.getAllTransfers(
        page, limit, status, transferType, startDate, endDate, userId, isAdmin
    );

    res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    } as ApiResponse);
});

/**
 * Lấy chi tiết phiếu - ADMIN: tất cả, STAFF: của mình
 * GET /stock-transfers/:id
 */
export const getTransferById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.includes('admin');

    const transfer = await stockTransferService.getTransferById(id, userId, isAdmin);

    res.json({
        success: true,
        data: transfer,
    } as ApiResponse);
});

/**
 * DUYỆT PHIẾU - Chỉ ADMIN
 * PUT /stock-transfers/:id/approve
 * 
 * Khi duyệt sẽ tự động cập nhật tồn kho theo loại phiếu
 */
export const approveTransfer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated',
        } as ApiResponse);
    }

    await stockTransferService.approveTransfer(id, adminUserId);

    res.json({
        success: true,
        message: 'Stock transfer approved successfully. Inventory has been updated.',
    } as ApiResponse);
});

/**
 * TỪ CHỐI PHIẾU - Chỉ ADMIN
 * PUT /stock-transfers/:id/reject
 * 
 * KHÔNG cập nhật tồn kho
 */
export const rejectTransfer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const adminUserId = req.user?.userId;
    const { reason } = req.body;

    if (!adminUserId) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated',
        } as ApiResponse);
    }

    await stockTransferService.rejectTransfer(id, adminUserId, reason);

    res.json({
        success: true,
        message: 'Stock transfer rejected. No inventory changes were made.',
    } as ApiResponse);
});

/**
 * Xóa phiếu - Người tạo hoặc ADMIN (chỉ draft/pending)
 * DELETE /stock-transfers/:id
 */
export const deleteTransfer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.includes('admin');

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated',
        } as ApiResponse);
    }

    await stockTransferService.deleteTransfer(id, userId, isAdmin);

    res.json({
        success: true,
        message: 'Stock transfer deleted successfully.',
    } as ApiResponse);
});
