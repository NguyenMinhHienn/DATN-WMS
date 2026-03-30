import api from './api';
import { ApiResponse, GoodsReceipt, GoodsIssue, PaginationInfo } from '../interface';

export const stockService = {
    // Goods Receipts (Stock In)
    async getReceipts(
        page: number = 1,
        limit: number = 10,
        warehouseId?: number,
        status?: string,
        startDate?: string,
        endDate?: string
    ): Promise<{ data: GoodsReceipt[]; pagination: PaginationInfo }> {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (warehouseId) params.append('warehouse_id', warehouseId.toString());
        if (status) params.append('status', status);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await api.get<ApiResponse<GoodsReceipt[]>>(`/goods-receipts?${params}`);
        return {
            data: response.data.data || [],
            pagination: response.data.pagination!,
        };
    },

    async getReceiptById(id: number): Promise<GoodsReceipt> {
        const response = await api.get<ApiResponse<GoodsReceipt>>(`/goods-receipts/${id}`);
        return response.data.data!;
    },

    async createReceipt(data: any): Promise<GoodsReceipt> {
        const response = await api.post<ApiResponse<GoodsReceipt>>('/goods-receipts', data);
        return response.data.data!;
    },

    async approveReceipt(id: number): Promise<void> {
        await api.post(`/goods-receipts/${id}/approve`);
    },

    async deleteReceipt(id: number): Promise<void> {
        await api.delete(`/goods-receipts/${id}`);
    },

    // Goods Issues (Stock Out)
    async getIssues(
        page: number = 1,
        limit: number = 10,
        warehouseId?: number,
        status?: string,
        startDate?: string,
        endDate?: string
    ): Promise<{ data: GoodsIssue[]; pagination: PaginationInfo }> {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (warehouseId) params.append('warehouse_id', warehouseId.toString());
        if (status) params.append('status', status);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await api.get<ApiResponse<GoodsIssue[]>>(`/goods-issues?${params}`);
        return {
            data: response.data.data || [],
            pagination: response.data.pagination!,
        };
    },

    async getIssueById(id: number): Promise<GoodsIssue> {
        const response = await api.get<ApiResponse<GoodsIssue>>(`/goods-issues/${id}`);
        return response.data.data!;
    },

    async createIssue(data: any): Promise<GoodsIssue> {
        const response = await api.post<ApiResponse<GoodsIssue>>('/goods-issues', data);
        return response.data.data!;
    },

    async shipIssue(id: number): Promise<void> {
        await api.post(`/goods-issues/${id}/ship`);
    },

    async deleteIssue(id: number): Promise<void> {
        await api.delete(`/goods-issues/${id}`);
    },
};
