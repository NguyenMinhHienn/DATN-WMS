import { Response } from 'express';
import { warehouseService } from '../services/warehouse.service';
import { AuthRequest, ApiResponse, CreateWarehouseDto, UpdateWarehouseDto } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

export const getAllWarehouses = asyncHandler(async (req: AuthRequest, res: Response) => {
    const warehouses = await warehouseService.getAllWarehouses();

    res.json({
        success: true,
        data: warehouses,
    } as ApiResponse);
});

export const getWarehouseById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const warehouse = await warehouseService.getWarehouseById(id);

    res.json({
        success: true,
        data: warehouse,
    } as ApiResponse);
});

export const createWarehouse = asyncHandler(async (req: AuthRequest, res: Response) => {
    const dto: CreateWarehouseDto = req.body;
    const userId = req.user?.userId;

    // Validate required fields
    if (!dto.name || dto.name.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Tên kho là bắt buộc',
        } as ApiResponse);
    }

    if (!dto.code || dto.code.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Mã kho là bắt buộc',
        } as ApiResponse);
    }

    const warehouse = await warehouseService.createWarehouse(dto, userId);

    res.status(201).json({
        success: true,
        message: 'Warehouse created successfully',
        data: warehouse,
    } as ApiResponse);
});

export const updateWarehouse = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const dto: UpdateWarehouseDto = req.body;
    const warehouse = await warehouseService.updateWarehouse(id, dto);

    res.json({
        success: true,
        message: 'Warehouse updated successfully',
        data: warehouse,
    } as ApiResponse);
});

export const deleteWarehouse = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await warehouseService.deleteWarehouse(id);

    res.json({
        success: true,
        message: 'Warehouse deleted successfully',
    } as ApiResponse);
});

export const getWarehouseLocations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const locations = await warehouseService.getWarehouseLocations(id);

    res.json({
        success: true,
        data: locations,
    } as ApiResponse);
});

export const createWarehouseLocation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const warehouseId = parseInt(req.params.id, 10);
    const locationId = await warehouseService.createLocation(warehouseId, req.body);

    res.status(201).json({
        success: true,
        message: 'Location created successfully',
        data: { id: locationId },
    } as ApiResponse);
});
