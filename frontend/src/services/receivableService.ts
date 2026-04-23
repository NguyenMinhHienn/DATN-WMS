import api from './api';

export interface Receivable {
    id: number;
    receivable_number: string;
    source_type: 'order' | 'export_receipt' | 'export_transfer';
    source_id: number;
    source_number: string | null;
    debtor_type: 'user' | 'customer' | 'external';
    user_id: number | null;
    debtor_name: string;
    debtor_phone: string | null;
    debtor_email: string | null;
    debtor_address: string | null;
    total_amount: string;
    paid_amount: string;
    remaining_amount: string;
    currency: string;
    issue_date: string;
    due_date: string | null;
    payment_terms: number;
    status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'bad_debt';
    created_at: string;
    user_full_name?: string;
    created_by_name?: string;
    notes?: string | null;
    user_email_account?: string;
    payment_history?: PaymentReceipt[];
    items?: ReceivableItem[];
}

export interface ReceivableItem {
    product_id: number;
    product_name: string;
    sku: string;
    quantity: number;
    unit_cost: number | string;
    line_total: number | string;
}

export interface PaymentReceipt {
    id: number;
    receipt_number: string;
    receivable_id: number;
    amount: string;
    payment_method: 'cash' | 'bank_transfer' | 'banking_online' | 'cod_collected' | 'other';
    payment_date: string;
    bank_name: string | null;
    bank_account: string | null;
    bank_reference: string | null;
    status: 'pending' | 'approved' | 'rejected';
    notes: string | null;
    created_at: string;
    created_by_name?: string;
    approved_by_name?: string;
    rejection_reason?: string;
    // Tự fill khi join với receivable
    receivable_number?: string;
    debtor_name?: string;
    source_number?: string;
}

export interface ReceivableSummary {
    total_receivables: number;
    total_amount: number;
    total_paid: number;
    total_remaining: number;
    total_overdue: number;
    overdue_amount: number;
    count_by_status: Record<string, number>;
}

export interface ConsolidatedLedgerEntry {
    debtor_phone: string;
    debtor_name: string;
    debtor_address: string;
    total_slips: number;
    unpaid_slips: number;
    total_debt: number;
    total_paid: number;
    remaining_debt: number;
    last_payment_at: string | null;
    last_activity_at: string;
}

export const receivableService = {
    // ==================== RECEIVABLES (ADMIN/STAFF) ====================
    async getAll(params: any = {}) {
        const response = await api.get('/receivables', { params });
        return response.data;
    },

    async getById(id: number) {
        const response = await api.get(`/receivables/${id}`);
        return response.data.data;
    },

    async getSummary(): Promise<ReceivableSummary> {
        const response = await api.get('/receivables/summary');
        return response.data.data;
    },

    async getOverdue() {
        const response = await api.get('/receivables/overdue');
        return response.data.data;
    },

    async getMonthlyStats(year: number) {
        const response = await api.get('/receivables/monthly-stats', { params: { year } });
        return response.data.data;
    },

    async checkOverdue() {
        const response = await api.post('/receivables/check-overdue');
        return response.data.data;
    },

    async cancel(id: number) {
        const response = await api.put(`/receivables/${id}/cancel`);
        return response.data;
    },

    async markBadDebt(id: number) {
        const response = await api.put(`/receivables/${id}/bad-debt`);
        return response.data;
    },

    async sendReminder(id: number, email?: string) {
        const response = await api.post(`/receivables/${id}/remind`, { email });
        return response.data;
    },

    // ==================== CONSOLIDATED LEDGER (SỔ NỢ) ====================
    async getConsolidatedLedger(params: { page?: number; limit?: number; search?: string } = {}) {
        const response = await api.get('/receivables/ledger', { params });
        return response.data;
    },

    async createConsolidatedPayment(data: {
        debtor_phone: string;
        amount: number;
        payment_method: string;
        payment_date: string;
        bank_name?: string;
        bank_account?: string;
        bank_reference?: string;
        notes?: string;
    }) {
        const response = await api.post('/payment-receipts/consolidated', data);
        return response.data;
    },

    // ==================== RECEIVABLES (CLIENT) ====================
    async getClientReceivables() {
        const response = await api.get('/client/receivables');
        return response.data.data;
    },

    // ==================== PAYMENT RECEIPTS ====================
    async getPaymentReceipts(params: any = {}) {
        const response = await api.get('/payment-receipts', { params });
        return response.data;
    },

    async createPaymentReceipt(data: any) {
        const response = await api.post('/payment-receipts', data);
        return response.data;
    },

    async approvePaymentReceipt(id: number) {
        const response = await api.put(`/payment-receipts/${id}/approve`);
        return response.data;
    },

    async rejectPaymentReceipt(id: number, reason: string) {
        const response = await api.put(`/payment-receipts/${id}/reject`, { reason });
        return response.data;
    },

    // ==================== HELPERS ====================
    getStatusInfo(status: string) {
        const map: Record<string, { label: string; color: string; bg: string }> = {
            'unpaid': { label: 'Chưa thu', color: '#f59e0b', bg: '#fef3c7' },
            'partial': { label: 'Thu một phần', color: '#3b82f6', bg: '#eff6ff' },
            'paid': { label: 'Đã thu đủ', color: '#10b981', bg: '#ecfdf5' },
            'overdue': { label: 'Quá hạn', color: '#ef4444', bg: '#fef2f2' },
            'cancelled': { label: 'Đã hủy', color: '#6b7280', bg: '#f3f4f6' },
            'bad_debt': { label: 'Nợ xấu', color: '#111827', bg: '#e5e7eb' },
        };
        return map[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
    },

    getReceiptStatusInfo(status: string) {
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
            'banking_online': 'Thanh toán Online',
            'cod_collected': 'Thu hộ COD',
            'other': 'Khác',
        };
        return map[method] || method;
    }
};
