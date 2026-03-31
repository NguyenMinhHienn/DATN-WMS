import api from './api';

// ==================== INTERFACES ====================

export interface ExportReceiptSummary {
    id: number;
    receipt_number: string;
    receipt_date: string;
    receiver_name?: string;
    receiver_department?: string;
    receiver_address?: string;
    receiver_phone?: string;
    export_reason: 'sale' | 'internal' | 'disposal' | 'transfer';
    warehouse_id: number;
    warehouse_name?: string;
    notes?: string;
    reference_document?: string;
    delivery_person?: string;
    storekeeper?: string;
    total_items: number;
    total_quantity: number;
    total_amount: number;
    created_by?: number;
    created_by_name?: string;
    approved_by?: number;
    approved_by_name?: string;
    approved_at?: string;
    status: 'PENDING' | 'APPROVED' | 'CANCELLED';
    created_at: string;
    updated_at: string;
}

export interface ExportReceiptItemDetail {
    id: number;
    export_receipt_id: number;
    product_id: number;
    product_variant_id?: number;
    quantity_requested: number;
    quantity_actual: number;
    unit_price: number;
    line_total: number;
    notes?: string;
    product_name?: string;
    sku?: string;
    variant_sku?: string;
    current_stock?: number;
    unit_name?: string;
}

export interface ExportReceiptFull extends ExportReceiptSummary {
    items: ExportReceiptItemDetail[];
}

export interface CreateExportReceiptPayload {
    receipt_date: string;
    receiver_name?: string;
    receiver_department?: string;
    receiver_address?: string;
    receiver_phone?: string;
    export_reason?: string;
    warehouse_id: number;
    notes?: string;
    reference_document?: string;
    delivery_person?: string;
    storekeeper?: string;
    items: {
        product_id: number;
        product_variant_id?: number;
        quantity_requested: number;
        quantity_actual?: number;
        unit_price?: number;
    }[];
}

// ==================== API CALLS ====================

export const exportReceiptService = {

    async getAllReceipts(
        page = 1,
        limit = 10,
        status?: string,
        warehouseId?: number
    ): Promise<{ data: ExportReceiptSummary[]; pagination: any }> {
        const params: any = { page, limit };
        if (status) params.status = status;
        if (warehouseId) params.warehouse_id = warehouseId;
        const response = await api.get('/export-receipts', { params });
        return { data: response.data.data, pagination: response.data.pagination };
    },

    async getReceiptById(id: number): Promise<ExportReceiptFull> {
        const response = await api.get(`/export-receipts/${id}`);
        return response.data.data;
    },

    async createReceipt(data: CreateExportReceiptPayload): Promise<ExportReceiptSummary> {
        const response = await api.post('/export-receipts', data);
        return response.data.data;
    },

    async approveReceipt(id: number): Promise<void> {
        await api.post(`/export-receipts/${id}/approve`);
    },

    async deleteReceipt(id: number): Promise<void> {
        await api.delete(`/export-receipts/${id}`);
    },

    getExportReasonLabel(reason: string): string {
        const map: Record<string, string> = {
            sale: 'Bán hàng',
            internal: 'Nội bộ',
            disposal: 'Hủy',
            transfer: 'Chuyển kho',
        };
        return map[reason] || reason;
    },

    getStatusInfo(status: string): { text: string; color: string; bg: string } {
        const map: Record<string, { text: string; color: string; bg: string }> = {
            PENDING: { text: 'Chờ duyệt', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
            APPROVED: { text: 'Đã duyệt', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
            CANCELLED: { text: 'Đã hủy', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
        };
        return map[status] || { text: status, color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };
    },
};
