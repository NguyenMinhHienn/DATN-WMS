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
        return response.data.data;
    },


    /**
     * Lấy danh sách đơn hàng của một user
     */
    async getOrdersByUserId(userId: number): Promise<OrderSummary[]> {
        const response = await api.get(`/users/${userId}/orders`);
        return response.data.data;
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
        return response.data.data;
    },
};
