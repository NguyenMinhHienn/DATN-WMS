import { warehouseRepository } from '../repositories/warehouse.repository';
import { CreateWarehouseDto, UpdateWarehouseDto, Warehouse, StorageLocation } from '../types';
import { AppError } from '../middlewares/error.middleware';

export class WarehouseService {
    async getAllWarehouses(): Promise<Warehouse[]> {
        return warehouseRepository.findAll();
    }

    async getWarehouseById(id: number): Promise<Warehouse> {
        const warehouse = await warehouseRepository.findById(id);
        if (!warehouse) {
            throw new AppError('Warehouse not found', 404);
        }
        return warehouse;
    }

    async createWarehouse(dto: CreateWarehouseDto, userId?: number): Promise<Warehouse> {
        const existingCode = await warehouseRepository.findByCode(dto.code);
        if (existingCode) {
            throw new AppError('Warehouse code already exists', 400);
        }

        const warehouseId = await warehouseRepository.create(dto, userId);

        const warehouse = await warehouseRepository.findById(warehouseId);
        if (!warehouse) {
            throw new AppError('Failed to create warehouse', 500);
        }

        return warehouse;
    }

    async updateWarehouse(id: number, dto: UpdateWarehouseDto): Promise<Warehouse> {
        const existingWarehouse = await warehouseRepository.findById(id);
        if (!existingWarehouse) {
            throw new AppError('Warehouse not found', 404);
        }

        if (dto.code && dto.code !== existingWarehouse.code) {
            const existingCode = await warehouseRepository.findByCode(dto.code);
            if (existingCode) {
                throw new AppError('Warehouse code already exists', 400);
            }
        }

        await warehouseRepository.update(id, dto);

        const warehouse = await warehouseRepository.findById(id);
        if (!warehouse) {
            throw new AppError('Failed to update warehouse', 500);
        }

        return warehouse;
    }

    async deleteWarehouse(id: number): Promise<void> {
        const existingWarehouse = await warehouseRepository.findById(id);
        if (!existingWarehouse) {
            throw new AppError('Warehouse not found', 404);
        }

        const deleted = await warehouseRepository.delete(id);
        if (!deleted) {
            throw new AppError('Failed to delete warehouse', 500);
        }
    }

    async getWarehouseLocations(warehouseId: number): Promise<StorageLocation[]> {
        const warehouse = await warehouseRepository.findById(warehouseId);
        if (!warehouse) {
            throw new AppError('Warehouse not found', 404);
        }

        return warehouseRepository.getLocations(warehouseId);
    }

    async createLocation(warehouseId: number, data: Partial<StorageLocation>): Promise<number> {
        const warehouse = await warehouseRepository.findById(warehouseId);
        if (!warehouse) {
            throw new AppError('Warehouse not found', 404);
        }

        return warehouseRepository.createLocation(warehouseId, data);
    }
}

export const warehouseService = new WarehouseService();
