import api from './api';

/**
 * ExportSlip Service (Frontend)
 * API calls cho phiếu xuất kho
 */

// ==================== INTERFACES ====================

export interface ExportSlipSummary {
    id: number;
    order_id: number;
    created_by: number;
    approved_by: number | null;
    status: 'waiting_approval' | 'approved' | 'completed' | 'returned';
    notes: string | null;
    created_at: string;
    updated_at: string;
    creator_name?: string;
    approver_name?: string;
    order_status?: string;
    order_total?: number;
    order_shipping_name?: string;
}

export interface ExportSlipDetail {
    id: number;
    export_slip_id: number;
    product_id: number;
    variant_id: number | null;
    quantity: number;
    product_name?: string;
    variant_sku?: string;
    image_url?: string;
    current_stock?: number;
}

export interface ExportSlipFull extends ExportSlipSummary {
    details: ExportSlipDetail[];
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// ==================== API CALLS ====================

export const exportSlipService = {

    /** Staff: Tạo phiếu xuất kho từ đơn confirmed */
    async createExportSlip(orderId: number, notes?: string): Promise<ExportSlipFull> {
        const response = await api.post('/export-slips', { order_id: orderId, notes });
        return response.data.data;
    },

    /** Lấy tất cả phiếu xuất kho */
    async getAllExportSlips(page = 1, limit = 10, status?: string): Promise<{ data: ExportSlipSummary[], pagination: Pagination }> {
        const params: any = { page, limit };
        if (status) params.status = status;
        const response = await api.get('/export-slips', { params });
        return { data: response.data.data, pagination: response.data.pagination };
    },

    /** Staff: Lấy phiếu do mình tạo */
    async getMyExportSlips(page = 1, limit = 10): Promise<{ data: ExportSlipSummary[], pagination: Pagination }> {
        const response = await api.get('/export-slips/my', { params: { page, limit } });
        return { data: response.data.data, pagination: response.data.pagination };
    },

    /** Lấy chi tiết phiếu xuất kho */
    async getExportSlipById(id: number): Promise<ExportSlipFull> {
        const response = await api.get(`/export-slips/${id}`);
        return response.data.data;
    },

    /** Admin: Duyệt phiếu xuất kho */
    async approveExportSlip(id: number): Promise<void> {
        await api.put(`/export-slips/${id}/approve`);
    },

    /** Admin: Giao hàng thành công */
    async completeDelivery(id: number): Promise<void> {
        await api.put(`/export-slips/${id}/complete`);
    },

    /** Admin: Giao hàng thất bại */
    async failDelivery(id: number): Promise<void> {
        await api.put(`/export-slips/${id}/fail`);
    },

    // ==================== HELPERS ====================

    getStatusInfo(status: string): { text: string; color: string; bg: string } {
        const map: Record<string, { text: string; color: string; bg: string }> = {
            waiting_approval: { text: 'Chờ duyệt', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
            approved: { text: 'Đã duyệt', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
            completed: { text: 'Hoàn tất', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
            returned: { text: 'Trả hàng', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
        };
        return map[status] || { text: status, color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };
    },
};
