import api from './api';

export interface FinancialAuditLog {
    id: number;
    reference_type: 'receivable' | 'payable' | 'payment_receipt' | 'payment_voucher';
    reference_id: number;
    reference_number?: string;
    action: string;
    amount?: string | number;
    actor_id: number;
    actor_name?: string;
    approver_id?: number;
    approver_name?: string;
    status_before?: string;
    status_after?: string;
    notes?: string;
    metadata?: any;
    ip_address?: string;
    created_at: string;
}

export const auditService = {
    /** Lấy lịch sử theo phiếu */
    async getHistory(type: string, id: number): Promise<FinancialAuditLog[]> {
        const response = await api.get(`/audit/history/${type}/${id}`);
        return response.data.data;
    },

    /** Lấy toàn bộ nhật ký (Admin) */
    async getAllLogs(params: any = {}) {
        const response = await api.get('/audit/logs', { params });
        return response.data;
    }
};
