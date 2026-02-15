import api from './api';

/**
 * Order Service (Frontend)
 * API calls cho đơn hàng - chỉ READ cho Staff
 */

export interface UserWithOrderCount {
    id: number;
    username: string;
    email: string;
    full_name: string;
    order_count: number;
}

export interface OrderSummary {
    id: number;
    order_number: string;
    order_date: string;
    status_code: string;
    status_name: string;
    status_color: string;
    total_amount: number;
    total_items: number;
    payment_status: string;
    shipping_name: string;
    created_at?: string; // Thêm field optional
    status?: string; // Thêm field optional
    final_amount?: number; // Thêm field optional
}

export interface OrderItem {
    id: number;
    product_name: string;
    variant_sku: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    variant_attributes?: string;
    image_url?: string;
}

export interface OrderDetail extends OrderSummary {
    items: OrderItem[];
}

export const orderService = {
    /**
     * Lấy danh sách users có đơn hàng
     */
    async getUsersWithOrders(search?: string): Promise<UserWithOrderCount[]> {
        const params = search ? { search } : {};
        const response = await api.get('/orders/users', { params });
        return response.data.data || [];
    },

    /**
     * Lấy danh sách đơn hàng của một user
     */
    async getOrdersByUserId(userId: number): Promise<OrderSummary[]> {
        const response = await api.get(`/users/${userId}/orders`);
        return response.data.data || [];
    },

    /**
     * Lấy chi tiết đơn hàng (bao gồm items)
     */
    async getOrderById(orderId: number): Promise<OrderDetail> {
        const response = await api.get(`/orders/${orderId}`);
        return response.data.data;
    },

    /**
     * Lấy items của một đơn hàng
     */
    async getOrderItems(orderId: number): Promise<OrderItem[]> {
        const response = await api.get(`/orders/${orderId}/items`);
        return response.data.data || [];
    },

    /**
     * CLIENT: Lấy danh sách đơn hàng của chính mình
     * (dùng cho trang /orders của client)
     */
    async getClientOrders(page = 1, limit = 10, status?: string): Promise<{ data: OrderSummary[], pagination: any }> {
        try {
            const params: any = { page, limit };
            if (status) params.status = status;
            
            console.log('API Request: /client/orders', params);
            const response = await api.get('/client/orders', { params });
            console.log('API Response:', response.data);
            
            // FIX: Đảm bảo luôn trả về đúng cấu trúc
            const responseData = response.data;
            
            // Trường hợp response có data và pagination
            if (responseData && responseData.data !== undefined) {
                return {
                    data: Array.isArray(responseData.data) ? responseData.data : [],
                    pagination: responseData.pagination || {
                        page,
                        limit,
                        total: 0,
                        totalPages: 1
                    }
                };
            }
            
            // Trường hợp response trực tiếp là mảng
            if (Array.isArray(responseData)) {
                return {
                    data: responseData,
                    pagination: {
                        page,
                        limit,
                        total: responseData.length,
                        totalPages: Math.ceil(responseData.length / limit)
                    }
                };
            }
            
            // Mặc định trả về mảng rỗng
            console.warn('Unexpected API response structure:', responseData);
            return {
                data: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 1
                }
            };
            
        } catch (error: any) {
            console.error('Error fetching client orders:', error);
            
            // Nếu lỗi 401, có thể token hết hạn
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
            
            throw error;
        }
    },

    /**
     * CLIENT: Lấy chi tiết đơn hàng của chính mình
     */
    async getClientOrderById(orderId: number): Promise<OrderDetail> {
        try {
            const response = await api.get(`/client/orders/${orderId}`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching client order details:', error);
            throw error;
        }
    },

    /**
     * Helper: Lấy thông tin trạng thái đơn hàng (cho UI)
     */
    getOrderStatusInfo(status: string): { text: string, color: string } {
        // Chuẩn hóa status (lowercase, trim)
        const normalizedStatus = status.toLowerCase().trim();
        
        const statusMap: Record<string, { text: string, color: string }> = {
            // Tiếng Việt
            'chờ xác nhận': { text: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
            'chờ xác nhân': { text: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
            'đã xác nhận': { text: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' },
            'đang xử lý': { text: 'Đang xử lý', color: 'bg-indigo-100 text-indigo-800' },
            
            // Tiếng Anh
            'pending': { text: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
            'confirmed': { text: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' },
            'processing': { text: 'Đang xử lý', color: 'bg-indigo-100 text-indigo-800' },
            'ready_to_ship': { text: 'Sẵn sàng giao', color: 'bg-purple-100 text-purple-800' },
            'shipping': { text: 'Đang giao hàng', color: 'bg-pink-100 text-pink-800' },
            'shipped': { text: 'Đã giao hàng', color: 'bg-green-100 text-green-800' },
            'delivered': { text: 'Đã nhận hàng', color: 'bg-green-100 text-green-800' },
            'completed': { text: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
            'cancelled': { text: 'Đã hủy', color: 'bg-red-100 text-red-800' },
            'refunded': { text: 'Đã hoàn tiền', color: 'bg-gray-100 text-gray-800' }
        };
        
        // Tìm status phù hợp
        if (statusMap[normalizedStatus]) {
            return statusMap[normalizedStatus];
        }
        
        // Tìm theo từ khóa
        if (normalizedStatus.includes('ship')) {
            return { text: 'Đang giao hàng', color: 'bg-pink-100 text-pink-800' };
        }
        if (normalizedStatus.includes('confirm')) {
            return { text: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' };
        }
        if (normalizedStatus.includes('pending') || normalizedStatus.includes('chờ')) {
            return { text: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' };
        }
        if (normalizedStatus.includes('process') || normalizedStatus.includes('xử lý')) {
            return { text: 'Đang xử lý', color: 'bg-indigo-100 text-indigo-800' };
        }
        
        // Mặc định
        return { text: status, color: 'bg-gray-100 text-gray-800' };
    },

    /**
     * Helper: Lấy thông tin trạng thái thanh toán
     */
    getPaymentStatusInfo(status: string): { text: string, color: string } {
        const statusMap: Record<string, { text: string, color: string }> = {
            'pending': { text: 'Chờ thanh toán', color: 'bg-yellow-100 text-yellow-800' },
            'paid': { text: 'Đã thanh toán', color: 'bg-green-100 text-green-800' },
            'partially_paid': { text: 'Thanh toán một phần', color: 'bg-blue-100 text-blue-800' },
            'refunded': { text: 'Đã hoàn tiền', color: 'bg-gray-100 text-gray-800' },
            'failed': { text: 'Thanh toán thất bại', color: 'bg-red-100 text-red-800' }
        };
        return statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    }
};