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

// ==================== NEW ANALYTICS ENDPOINTS ====================

/**
 * KPI tổng quan theo khoảng thời gian
 * GET /reports/kpi?start_date=&end_date=
 */
export const getKpiOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: 'start_date and end_date are required',
        } as ApiResponse);
    }

    const data = await reportService.getKpiOverview(startDate, endDate);
    res.json({ success: true, data } as ApiResponse);
});

/**
 * Top N sản phẩm bán chạy
 * GET /reports/top-selling?start_date=&end_date=&limit=10
 */
export const getTopSellingProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: 'start_date and end_date are required',
        } as ApiResponse);
    }

    const data = await reportService.getTopSellingProducts(startDate, endDate, limit);
    res.json({ success: true, data } as ApiResponse);
});

/**
 * Tổng hợp biến động nhập/xuất + xu hướng
 * GET /reports/movement-summary?start_date=&end_date=
 */
export const getMovementSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: 'start_date and end_date are required',
        } as ApiResponse);
    }

    const data = await reportService.getMovementSummary(startDate, endDate);
    res.json({ success: true, data } as ApiResponse);
});

/**
 * Giá trị tồn kho theo sản phẩm
 * GET /reports/stock-value-by-product?warehouse_id=
 */
export const getStockValueByProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id as string) : undefined;
    const data = await reportService.getStockValueByProduct(warehouseId);
    res.json({ success: true, data } as ApiResponse);
});

/**
 * Giá trị tồn kho theo danh mục
 * GET /reports/stock-value-by-category
 */
export const getStockValueByCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await reportService.getStockValueByCategory();
    res.json({ success: true, data } as ApiResponse);
});

/**
 * Cảnh báo thông minh (tồn thấp + ứ đọng)
 * GET /reports/alerts
 */
export const getSmartAlerts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await reportService.getSmartAlerts();
    res.json({ success: true, data } as ApiResponse);
});

/**
 * Drill-down chi tiết 1 sản phẩm
 * GET /reports/products/:productId/drill-down?start_date=&end_date=
 */
export const getProductDrillDown = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.productId, 10);
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;

    const data = await reportService.getProductDrillDown(productId, startDate, endDate);
    res.json({ success: true, data } as ApiResponse);
});

