import { Response } from 'express';
import { inventoryService } from '../services/inventory.service';
import { AuthRequest, ApiResponse, InventoryAdjustmentDto } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

export const getAllInventory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id as string) : undefined;
    const productId = req.query.product_id ? parseInt(req.query.product_id as string) : undefined;
    const status = req.query.status as string;

    const result = await inventoryService.getAllInventory(page, limit, warehouseId, productId, status);

    res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    } as ApiResponse);
});

export const getInventoryById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const inventory = await inventoryService.getInventoryById(id);

    res.json({
        success: true,
        data: inventory,
    } as ApiResponse);
});

export const adjustInventory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const dto: InventoryAdjustmentDto = req.body;
    const userId = req.user?.userId;
    const inventoryId = await inventoryService.adjustInventory(dto, userId);

    res.json({
        success: true,
        message: 'Inventory adjusted successfully',
        data: { id: inventoryId },
    } as ApiResponse);
});

export const getLowStockItems = asyncHandler(async (req: AuthRequest, res: Response) => {
    const items = await inventoryService.getLowStockItems();

    res.json({
        success: true,
        data: items,
    } as ApiResponse);
});

export const getUnderTenStockItems = asyncHandler(async (req: AuthRequest, res: Response) => {
    const items = await inventoryService.getUnderTenStockItems();

    res.json({
        success: true,
        data: items,
    } as ApiResponse);
});

export const getMovementLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const inventoryId = req.query.inventory_id ? parseInt(req.query.inventory_id as string) : undefined;
    const productId = req.query.product_id ? parseInt(req.query.product_id as string) : undefined;
    const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id as string) : undefined;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    const result = await inventoryService.getMovementLogs(page, limit, inventoryId, productId, warehouseId, startDate, endDate);

    res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    } as ApiResponse);
});

export const getPerformanceMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const metrics = await inventoryService.getPerformanceMetrics(id);

    res.json({
        success: true,
        data: metrics,
    } as ApiResponse);
});
