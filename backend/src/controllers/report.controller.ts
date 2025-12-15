import { Response } from 'express';
import { reportService } from '../services/report.service';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

export const getDashboardStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await reportService.getDashboardStats();

    res.json({
        success: true,
        data: stats,
    } as ApiResponse);
});

export const getInventoryReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id as string) : undefined;
    const report = await reportService.getInventoryReport(warehouseId);

    res.json({
        success: true,
        data: report,
    } as ApiResponse);
});

export const getMovementReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id as string) : undefined;
    const movementType = req.query.movement_type as string;

    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: 'start_date and end_date are required',
        } as ApiResponse);
    }

    const report = await reportService.getMovementReport(startDate, endDate, warehouseId, movementType);

    res.json({
        success: true,
        data: report,
    } as ApiResponse);
});

export const getStockValueReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const report = await reportService.getStockValueReport();

    res.json({
        success: true,
        data: report,
    } as ApiResponse);
});

export const getProductStockSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.productId, 10);
    const summary = await reportService.getProductStockSummary(productId);

    res.json({
        success: true,
        data: summary,
    } as ApiResponse);
});
