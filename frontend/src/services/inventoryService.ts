import api from './api';
import { ApiResponse, Inventory, InventoryLog, PaginationInfo } from '../interface';

export const inventoryService = {
    async getAll(
        page: number = 1,
        limit: number = 10,
        warehouseId?: number,
        productId?: number,
        status?: string
    ): Promise<{ data: Inventory[]; pagination: PaginationInfo }> {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (warehouseId) params.append('warehouse_id', warehouseId.toString());
        if (productId) params.append('product_id', productId.toString());
        if (status) params.append('status', status);

        const response = await api.get<ApiResponse<Inventory[]>>(`/inventory?${params}`);
        return {
            data: response.data.data || [],
            pagination: response.data.pagination!,
        };
    },

    async getById(id: number): Promise<Inventory> {
        const response = await api.get<ApiResponse<Inventory>>(`/inventory/${id}`);
        return response.data.data!;
    },

    async adjust(data: {
        product_id: number;
        warehouse_id: number;
        location_id?: number;
        adjustment_type: 'in' | 'out';
        quantity: number;
        reason: string;
        notes?: string;
    }): Promise<void> {
        await api.post('/inventory/adjust', data);
    },

    async getLowStock(): Promise<any[]> {
        const response = await api.get<ApiResponse<any[]>>('/inventory/low-stock');
        return response.data.data || [];
    },

    async getUnderTenStock(): Promise<any[]> {
        const response = await api.get<ApiResponse<any[]>>('/inventory/under-ten-stock');
        return response.data.data || [];
    },

    async getMovements(
        page: number = 1,
        limit: number = 20,
        inventoryId?: number,
        productId?: number,
        warehouseId?: number,
        startDate?: string,
        endDate?: string
    ): Promise<{ data: InventoryLog[]; pagination: PaginationInfo }> {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (inventoryId) params.append('inventory_id', inventoryId.toString());
        if (productId) params.append('product_id', productId.toString());
        if (warehouseId) params.append('warehouse_id', warehouseId.toString());
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await api.get<ApiResponse<InventoryLog[]>>(`/inventory/movements?${params}`);
        return {
            data: response.data.data || [],
            pagination: response.data.pagination!,
        };
    },

    async getMetrics(id: number): Promise<{ totalCompletedOrders: number, totalRevenue: number, totalCost: number, totalProfit: number }> {
        const response = await api.get<ApiResponse<any>>(`/inventory/${id}/metrics`);
        return response.data.data;
    },

    async getReport(id: number, fromDate: string, toDate: string): Promise<{ ton_dau: number, nhap_trong_ky: number, xuat_trong_ky: number, ton_cuoi: number }> {
        const response = await api.get<ApiResponse<any>>(`/inventory/${id}/report?from_date=${fromDate}&to_date=${toDate}`);
        return response.data.data;
    }
};
