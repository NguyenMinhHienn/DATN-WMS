import api from './api';
import { ApiResponse, StockTransfer, PaginationInfo } from '../interface';

/**
 * Stock Transfer Service
 * API client cho module phiếu chuyển/nhập/xuất kho
 */
export const stockTransferService = {
    /**
     * Lấy danh sách phiếu - phân quyền tự động ở backend
     * ADMIN: Xem tất cả phiếu
     * STAFF: Chỉ xem phiếu của mình
     */
    async getTransfers(
        page: number = 1,
        limit: number = 10,
        status?: string,
        transferType?: string,
        startDate?: string,
        endDate?: string
    ): Promise<{ data: StockTransfer[]; pagination: PaginationInfo }> {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (status) params.append('status', status);
        if (transferType) params.append('transfer_type', transferType);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await api.get<ApiResponse<StockTransfer[]>>(`/stock-transfers?${params}`);
        return {
            data: response.data.data || [],
            pagination: response.data.pagination!,
        };
    },

    /**
     * Lấy chi tiết phiếu
     */
    async getTransferById(id: number): Promise<StockTransfer> {
        const response = await api.get<ApiResponse<StockTransfer>>(`/stock-transfers/${id}`);
        return response.data.data!;
    },

    /**
     * Tạo phiếu mới - Chỉ STAFF
     * Phiếu luôn được tạo với trạng thái PENDING
     */
    async createTransfer(data: CreateStockTransferData): Promise<StockTransfer> {
        const response = await api.post<ApiResponse<StockTransfer>>('/stock-transfers', data);
        return response.data.data!;
    },

    /**
     * Duyệt phiếu - Chỉ ADMIN
     * Khi duyệt sẽ tự động cập nhật tồn kho
     */
    async approveTransfer(id: number): Promise<void> {
        await api.put(`/stock-transfers/${id}/approve`);
    },

    /**
     * Từ chối phiếu - Chỉ ADMIN
     * KHÔNG cập nhật tồn kho
     */
    async rejectTransfer(id: number, reason?: string): Promise<void> {
        await api.put(`/stock-transfers/${id}/reject`, { reason });
    },

    /**
     * Xóa phiếu - Chỉ draft/pending
     */
    async deleteTransfer(id: number): Promise<void> {
        await api.delete(`/stock-transfers/${id}`);
    },
};

// Types for creating transfer - accepts both formats
export interface CreateStockTransferData {
    type?: 'IMPORT' | 'EXPORT' | 'TRANSFER'; // Simpler format
    transfer_type?: 'IMPORT' | 'EXPORT' | 'TRANSFER'; // Alias
    source_warehouse_id?: number;
    destination_warehouse_id?: number;
    transfer_date?: string;
    expected_arrival_date?: string;
    supplier_id?: number;
    delivery_person?: string;
    storekeeper?: string;
    receiver_name?: string;
    receiver_department?: string;
    receiver_address?: string;
    receiver_phone?: string;
    order_id?: number;
    reason?: string;
    notes?: string;
    items: CreateStockTransferItemData[];
}

export interface CreateStockTransferItemData {
    product_id?: number;
    product_variant_id?: number;
    // Legacy fields for backward compat
    product_name?: string;
    product_sku?: string;
    product_image_url?: string;
    quantity?: number;
    quantity_requested?: number;
    unit_price?: number;
    unit_cost?: number;
    batch_number?: string;
    expiry_date?: string;
    notes?: string;
}

