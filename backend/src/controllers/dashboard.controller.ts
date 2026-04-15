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

/**
 * GET /dashboard/monthly-detail/:year/:month
 * Trả về chi tiết đơn hàng, phiếu nhập, phiếu xuất trong tháng
 */
export const getMonthlyDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month);

        if (isNaN(year) || isNaN(month)) {
            return res.status(400).json({
                success: false,
                message: 'Năm hoặc tháng không hợp lệ',
            } as ApiResponse);
        }

        const detail = await dashboardService.getMonthlyDetail(year, month);

        return res.json({
            success: true,
            message: 'Monthly detail retrieved successfully',
            data: detail,
        } as ApiResponse);
    } catch (error: any) {
        console.error('Error in getMonthlyDetail:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy chi tiết báo cáo: ' + error.message,
        } as ApiResponse);
    }
});

/**
 * GET /dashboard/order-items/:orderId?type=online|internal
 * Trả về danh sách sản phẩm của 1 đơn hàng
 */
export const getOrderItems = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orderId = parseInt(req.params.orderId);
    const orderType = (req.query.type as string) || 'online';

    if (isNaN(orderId)) {
        return res.status(400).json({
            success: false,
            message: 'Order ID không hợp lệ',
        } as ApiResponse);
    }

    const items = await dashboardService.getOrderItems(orderId, orderType);

    return res.json({
        success: true,
        message: 'Order items retrieved successfully',
        data: items,
    } as ApiResponse);
});
