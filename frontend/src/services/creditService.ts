import api from './api';

export interface CreditInfo {
    is_registered: boolean;
    is_eligible: boolean;
    credit_limit: number;
    credit_used: number;
    credit_available: number;
    credit_payment_terms: number;
    total_spent: number;
    min_required: number;
    has_active_debt: boolean;
    has_overdue: boolean;
    active_debt_count: number;
    paid_percentage?: number;
    reason_not_eligible?: string;
}

export interface CreditRegistrationData {
    id_number: string;
    address: string;
    company?: string;
    tax_code?: string;
    payment_terms?: number;
}

export interface CreditSettings {
    credit_min_total_spent: string;
    credit_default_limit: string;
    credit_default_payment_terms: string;
    credit_auto_enable: string;
}

export const creditService = {
    // ==================== CLIENT ====================

    /** User xem thông tin tín dụng */
    async getCreditInfo(): Promise<CreditInfo> {
        const response = await api.get('/client/credit-info');
        return response.data.data;
    },

    /** User đăng ký sử dụng công nợ */
    async register(data: CreditRegistrationData): Promise<{ message: string; data: CreditInfo }> {
        const response = await api.post('/client/credit/register', data);
        return { message: response.data.message, data: response.data.data };
    },

    // ==================== ADMIN ====================

    /** Admin xem credit info của user */
    async getAdminUserCredit(userId: number): Promise<CreditInfo> {
        const response = await api.get(`/admin/users/${userId}/credit`);
        return response.data.data;
    },

    /** Admin bật quyền công nợ */
    async enableCredit(userId: number): Promise<void> {
        await api.put(`/admin/users/${userId}/credit/enable`);
    },

    /** Admin tắt quyền công nợ */
    async disableCredit(userId: number): Promise<void> {
        await api.put(`/admin/users/${userId}/credit/disable`);
    },

    /** Admin điều chỉnh hạn mức */
    async updateCreditLimit(userId: number, creditLimit: number): Promise<void> {
        await api.put(`/admin/users/${userId}/credit/limit`, { credit_limit: creditLimit });
    },

    /** Admin cập nhật hạn thanh toán */
    async updatePaymentTerms(userId: number, paymentTerms: number): Promise<void> {
        await api.put(`/admin/users/${userId}/credit/payment-terms`, { payment_terms: paymentTerms });
    },

    /** Admin lấy cấu hình credit */
    async getCreditSettings(): Promise<CreditSettings> {
        const response = await api.get('/admin/credit/settings');
        return response.data.data;
    },

    /** Admin cập nhật cấu hình credit */
    async updateCreditSettings(settings: Partial<CreditSettings>): Promise<void> {
        await api.put('/admin/credit/settings', settings);
    },

    // ==================== HELPERS ====================

    formatMoney(amount: number): string {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    },

    getCreditStatusInfo(info: CreditInfo): { label: string; color: string; bg: string; icon: string } {
        if (!info.is_registered) {
            return { label: 'Chưa đăng ký', color: '#6b7280', bg: '#f3f4f6', icon: '📝' };
        }
        if (info.has_overdue) {
            return { label: 'Nợ quá hạn', color: '#ef4444', bg: '#fef2f2', icon: '⚠️' };
        }
        if (info.has_active_debt) {
            return { label: 'Đang có nợ', color: '#f59e0b', bg: '#fef3c7', icon: '🔄' };
        }
        if (info.is_eligible) {
            return { label: 'Sẵn sàng', color: '#10b981', bg: '#ecfdf5', icon: '✅' };
        }
        return { label: 'Chưa đủ điều kiện', color: '#8b5cf6', bg: '#f5f3ff', icon: '📊' };
    },
};
