import api from './api';

/**
 * Order Service (Frontend)
 * API calls cho đơn hàng
 */

// ==================== INTERFACES ====================

export interface OrderSummary {
    id: number;
    user_id: number;
    total_amount: number;
    payment_method: 'COD' | 'BANKING';
    payment_status: 'unpaid' | 'paid';
    status: 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'failed' | 'cancelled';
    shipping_name: string;
    shipping_phone: string;
    shipping_address: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    user_fullname?: string;
    user_email?: string;
}

export interface OrderItem {
    id: number;
    order_id: number;
    product_id: number;
    variant_id: number | null;
    product_name: string;
    variant_sku: string | null;
    quantity: number;
    unit_price: number;
    variant_attributes: string | null;
    image_url?: string;
}

export interface OrderDetail extends OrderSummary {
    items: OrderItem[];
}

export interface CreateOrderDto {
    shipping_name: string;
    shipping_phone: string;
    shipping_address: string;
    payment_method: 'COD' | 'BANKING';
    notes?: string;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// ==================== API CALLS ====================

export const orderService = {

    // ==================== CLIENT ====================

    /** Client: Tạo đơn hàng từ giỏ hàng */
    async createOrder(data: CreateOrderDto): Promise<OrderDetail> {
        const response = await api.post('/orders', data);
        return response.data.data;
    },

    /** Client: Lấy đơn hàng của mình */
    async getClientOrders(page = 1, limit = 10, status?: string): Promise<{ data: OrderSummary[], pagination: Pagination }> {
        const params: any = { page, limit };
        if (status) params.status = status;
        const response = await api.get('/client/orders', { params });
        return { data: response.data.data, pagination: response.data.pagination };
    },

    /** Client: Lấy chi tiết đơn hàng */
    async getClientOrderById(orderId: number): Promise<OrderDetail> {
        const response = await api.get(`/client/orders/${orderId}`);
        return response.data.data;
    },

    /** Client/Admin: Hủy đơn hàng */
    async cancelOrder(orderId: number): Promise<void> {
        await api.put(`/orders/${orderId}/cancel`);
    },

    // ==================== ADMIN ====================

    /** Admin: Lấy tất cả đơn hàng */
    async getAllOrders(page = 1, limit = 10, status?: string): Promise<{ data: OrderSummary[], pagination: Pagination }> {
        const params: any = { page, limit };
        if (status) params.status = status;
        const response = await api.get('/orders', { params });
        return { data: response.data.data, pagination: response.data.pagination };
    },

    /** Admin: Lấy chi tiết đơn hàng bất kỳ */
    async getOrderById(orderId: number): Promise<OrderDetail> {
        const response = await api.get(`/orders/${orderId}`);
        return response.data.data;
    },

    /** Admin: Duyệt đơn hàng (pending → confirmed) */
    async confirmOrder(orderId: number): Promise<void> {
        await api.put(`/orders/${orderId}/confirm`);
    },

    /** Admin: Chuyển sang đang giao (confirmed → shipping) */
    async markShipping(orderId: number): Promise<void> {
        await api.put(`/orders/${orderId}/shipping`);
    },

    /** Admin: Xác nhận giao thành công (shipping → delivered) */
    async markDelivered(orderId: number): Promise<void> {
        await api.put(`/orders/${orderId}/delivered`);
    },

    /** Admin: Đánh dấu giao thất bại (shipping → failed) */
    async markFailed(orderId: number): Promise<void> {
        await api.put(`/orders/${orderId}/failed`);
    },

    /** Staff: Lấy đơn đã duyệt (confirmed) */
    async getConfirmedOrders(page = 1, limit = 10): Promise<{ data: OrderSummary[], pagination: Pagination }> {
        const response = await api.get('/orders/confirmed', { params: { page, limit } });
        return { data: response.data.data, pagination: response.data.pagination };
    },

    // ==================== HELPERS ====================

    getStatusInfo(status: string): { text: string; color: string; bg: string } {
        const map: Record<string, { text: string; color: string; bg: string }> = {
            pending: { text: 'Chờ xử lý', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
            confirmed: { text: 'Đã duyệt', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
            shipping: { text: 'Đang giao', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
            delivered: { text: 'Đã giao', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
            failed: { text: 'Giao thất bại', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
            cancelled: { text: 'Đã hủy', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
        };
        return map[status] || { text: status, color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };
    },

    getPaymentStatusInfo(status: string): { text: string; color: string; bg: string } {
        const map: Record<string, { text: string; color: string; bg: string }> = {
            unpaid: { text: 'Chưa thanh toán', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
            paid: { text: 'Đã thanh toán', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
        };
        return map[status] || { text: status, color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };
    },

    getPaymentMethodText(method: string): string {
        return method === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng';
    },

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    },

    // ==================== STAFF ====================



/** Staff: Xem tất cả đơn hàng */
async getStaffOrders(page = 1, limit = 10): Promise<{ data: OrderSummary[], pagination: Pagination }> {
    const response = await api.get('/staff/orders', { params: { page, limit } });
    return { data: response.data.data, pagination: response.data.pagination };
},
};