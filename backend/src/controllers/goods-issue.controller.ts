import { Response } from 'express';
import { goodsIssueService } from '../services/goods-issue.service';
import { AuthRequest, ApiResponse, CreateGoodsIssueDto } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

export const getAllIssues = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id as string) : undefined;
    const status = req.query.status as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    const result = await goodsIssueService.getAllIssues(page, limit, warehouseId, status, startDate, endDate);

    res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    } as ApiResponse);
});

export const getIssueById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const issue = await goodsIssueService.getIssueById(id);

    res.json({
        success: true,
        data: issue,
    } as ApiResponse);
});

export const createIssue = asyncHandler(async (req: AuthRequest, res: Response) => {
    const dto: CreateGoodsIssueDto = req.body;
    const userId = req.user?.userId;
    const issue = await goodsIssueService.createIssue(dto, userId);

    res.status(201).json({
        success: true,
        message: 'Goods issue created successfully',
        data: issue,
    } as ApiResponse);
});

export const updateIssueStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    await goodsIssueService.updateStatus(id, status);

    res.json({
        success: true,
        message: 'Issue status updated successfully',
    } as ApiResponse);
});

export const shipIssue = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const userId = req.user?.userId;
    await goodsIssueService.shipIssue(id, userId);

    res.json({
        success: true,
        message: 'Goods issue shipped successfully',
    } as ApiResponse);
});

export const deleteIssue = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await goodsIssueService.deleteIssue(id);

    res.json({
        success: true,
        message: 'Goods issue deleted successfully',
    } as ApiResponse);
});
