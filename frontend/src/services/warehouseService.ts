import api from './api';
import { ApiResponse, Warehouse, StorageLocation, WarehouseFormData } from '../interface';

export const warehouseService = {
    async getAll(): Promise<Warehouse[]> {
        const response = await api.get<ApiResponse<Warehouse[]>>('/warehouses');
        return response.data.data || [];
    },

    async getById(id: number): Promise<Warehouse> {
        const response = await api.get<ApiResponse<Warehouse>>(`/warehouses/${id}`);
        return response.data.data!;
    },

    async create(data: WarehouseFormData): Promise<Warehouse> {
        const response = await api.post<ApiResponse<Warehouse>>('/warehouses', data);
        return response.data.data!;
    },

    async update(id: number, data: Partial<WarehouseFormData>): Promise<Warehouse> {
        const response = await api.put<ApiResponse<Warehouse>>(`/warehouses/${id}`, data);
        return response.data.data!;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`/warehouses/${id}`);
    },

    async getLocations(warehouseId: number): Promise<StorageLocation[]> {
        const response = await api.get<ApiResponse<StorageLocation[]>>(`/warehouses/${warehouseId}/locations`);
        return response.data.data || [];
    },
};
