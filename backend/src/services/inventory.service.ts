import { inventoryRepository } from '../repositories/inventory.repository';
import { InventoryAdjustmentDto, PaginatedResult, Inventory } from '../types';
import { AppError } from '../middlewares/error.middleware';

export class InventoryService {
    async getAllInventory(
        page: number = 1,
        limit: number = 10,
        warehouseId?: number,
        productId?: number,
        status?: string
    ): Promise<PaginatedResult<Inventory & { product_name: string; warehouse_name: string }>> {
        return inventoryRepository.findAll(page, limit, warehouseId, productId, status);
    }

    async getInventoryById(id: number): Promise<Inventory> {
        const inventory = await inventoryRepository.findById(id);
        if (!inventory) {
            throw new AppError('Inventory record not found', 404);
        }
        return inventory;
    }

    async adjustInventory(dto: InventoryAdjustmentDto, userId?: number): Promise<number> {
        if (dto.quantity <= 0) {
            throw new AppError('Quantity must be greater than 0', 400);
        }

        return inventoryRepository.adjustInventory(dto, userId);
    }

    async getLowStockItems() {
        return inventoryRepository.getLowStockItems();
    }

    async getMovementLogs(
        page: number = 1,
        limit: number = 20,
        inventoryId?: number,
        productId?: number,
        warehouseId?: number,
        startDate?: string,
        endDate?: string
    ) {
        return inventoryRepository.getMovementLogs(page, limit, inventoryId, productId, warehouseId, startDate, endDate);
    }

    async getPerformanceMetrics(inventoryId: number) {
        return inventoryRepository.getProductPerformanceMetrics(inventoryId);
    }
}

export const inventoryService = new InventoryService();
