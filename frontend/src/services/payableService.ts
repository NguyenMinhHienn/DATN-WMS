import api from './api';

export interface Payable {
    id: number;
    payable_number: string;
    source_type: 'import_transfer' | 'goods_receipt';
    source_id: number;
    source_number: string;
    supplier_id: number;
    supplier_name: string;
    supplier_phone: string | null;
    supplier_email: string | null;
    total_amount: string;
    paid_amount: string;
    remaining_amount: string;
    issue_date: string;
    due_date: string;
    payment_terms: number;
    status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'cancelled';
    created_at: string;
    created_by_name?: string;
    notes?: string | null;
    bank_name?: string | null;
    bank_account?: string | null;

    supplier_address?: string | null;
    items?: PayableItem[];
}

export interface PayableItem {
    product_id: number;
    product_name: string;
    sku: string;
    quantity: number;
    unit_cost: number | string;
    line_total: number | string;
}

export interface PaymentVoucher {
    id: number;
    voucher_number: string;
    payable_id: number;
    amount: string;
    payment_method: 'cash' | 'bank_transfer' | 'other';
    payment_date: string;
    bank_reference: string | null;
    status: 'draft' | 'pending' | 'approved' | 'rejected';
    notes: string | null;
    created_at: string;
    created_by_name?: string;
    approved_by_name?: string;
    payable_number?: string;
    supplier_name?: string;
}

export interface PayableSummary {
    total_payables: number;
    total_amount: number;
    total_paid: number;
    total_remaining: number;
    total_overdue: number;
    overdue_amount: number;
}

export const payableService = {
    // ==================== PAYABLES (ADMIN) ====================
    async getAll(params: any = {}) {
        const response = await api.get('/payables', { params });
        return response.data;
    },

    async getById(id: number) {
        const response = await api.get(`/payables/${id}`);
        return response.data.data;
    },

    async getSummary(params: any = {}): Promise<PayableSummary> {
        const response = await api.get('/payables/summary', { params });
        return response.data.data;
    },

    async cancel(id: number) {
        const response = await api.put(`/payables/${id}/cancel`);
        return response.data;
    },

    async getMonthlyStats(year: number) {
        const response = await api.get('/payables/monthly-stats', { params: { year } });
        return response.data.data;
    },

    async getConsolidatedLedger(params: any = {}) {
        const response = await api.get('/payables/ledger', { params });
        return response.data; // Note: This one should return the whole object because it has pagination
    },

    async getUnpaidBySupplier(supplierId: number) {
        const response = await api.get(`/payables/supplier/${supplierId}/unpaid`);
        return response.data.data;
    },

    async createConsolidatedVoucher(data: {
        supplier_id: number;
        amount: number;
        payment_method: 'cash' | 'bank_transfer' | 'other';
        payment_date?: string;
        bank_reference?: string;
        notes?: string;
    }) {
        const response = await api.post('/payables/consolidated-voucher', data);
        return response.data;
    },

    async getUpcomingDue(days: number = 3) {
        const response = await api.get('/payables/upcoming-due', { params: { days } });
        return response.data.data;
    },


    // ==================== PAYMENT VOUCHERS ====================
    async getVouchers(payableId: number) {
        const response = await api.get(`/payables/${payableId}/vouchers`);
        return response.data.data;
    },

    async createVoucher(payableId: number, data: any) {
        const response = await api.post(`/payables/${payableId}/vouchers`, data);
        return response.data;
    },

    async approveVoucher(voucherId: number) {
        const response = await api.put(`/payment-vouchers/${voucherId}/approve`);
        return response.data;
    },

    async rejectVoucher(voucherId: number, reason: string) {
        const response = await api.put(`/payment-vouchers/${voucherId}/reject`, { reason });
        return response.data;
    },

    // ==================== HELPERS ====================
    getStatusInfo(status: string) {
        const map: Record<string, { label: string; color: string; bg: string }> = {
            'unpaid': { label: 'Chưa trả', color: '#ef4444', bg: '#fef2f2' },
            'partial': { label: 'Trả 1 phần', color: '#f59e0b', bg: '#fef3c7' },
            'paid': { label: 'Đã thanh toán', color: '#10b981', bg: '#ecfdf5' },
            'overdue': { label: 'Quá hạn', color: '#111827', bg: '#e5e7eb' },
            'cancelled': { label: 'Đã hủy', color: '#6b7280', bg: '#f3f4f6' },
        };
        return map[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
    },

    getVoucherStatusInfo(status: string) {
        const map: Record<string, { label: string; color: string; bg: string }> = {
            'draft': { label: 'Nháp', color: '#6b7280', bg: '#f3f4f6' },
            'pending': { label: 'Chờ duyệt', color: '#f59e0b', bg: '#fef3c7' },
            'approved': { label: 'Đã duyệt', color: '#10b981', bg: '#ecfdf5' },
            'rejected': { label: 'Từ chối', color: '#ef4444', bg: '#fef2f2' },
        };
        return map[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
    },

    getPaymentMethodLabel(method: string) {
        const map: Record<string, string> = {
            'cash': 'Tiền mặt',
            'bank_transfer': 'Chuyển khoản',
            'other': 'Khác',
        };
        return map[method] || method;
    }
};
