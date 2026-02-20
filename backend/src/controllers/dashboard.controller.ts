import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { dashboardService } from '../services/dashboard.service';
import { asyncHandler } from '../middlewares/error.middleware';

/**
 * Dashboard Controller
 * API endpoints cho dashboard doanh thu & lợi nhuận
 */

/**
 * GET /dashboard/summary
 * Trả về tổng doanh thu, giá vốn, lợi nhuận, tổng đơn hoàn thành
 */
export const getSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const summary = await dashboardService.getSummary();

    res.json({
        success: true,
        message: 'Dashboard summary retrieved successfully',
        data: summary,
    } as ApiResponse);
});

/**
 * GET /dashboard/monthly-report?year=2026
 * Trả về doanh thu & lợi nhuận theo 12 tháng
 */
export const getMonthlyReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const report = await dashboardService.getMonthlyReport(year);

    res.json({
        success: true,
        message: 'Monthly report retrieved successfully',
        data: report,
    } as ApiResponse);
});
