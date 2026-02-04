import { orderRepository, UserWithOrderCount, OrderSummary, OrderDetail, OrderItem } from '../repositories/order.repository';
import { AppError } from '../middlewares/error.middleware';


/**
 * Order Service
 * Business logic cho đơn hàng (READ ONLY cho Staff)
 */


class OrderService {
    /**
     * Lấy danh sách users có ít nhất 1 đơn hàng
     */
    async getUsersWithOrders(search?: string): Promise<UserWithOrderCount[]> {
        return orderRepository.getUsersWithOrders(search);
    }


    /**
     * Lấy danh sách đơn hàng của một user
     */
    async getOrdersByUserId(userId: number, page?: number, limit?: number, status?: string): Promise<{ data: OrderSummary[], pagination: any }> {
        if (!userId || userId <= 0) {
            throw new AppError('User ID không hợp lệ', 400);
        }
        return orderRepository.getOrdersByUserId(userId, page, limit, status);
    }


    /**
     * Lấy chi tiết đơn hàng (bao gồm items)
     */
    async getOrderById(orderId: number): Promise<OrderDetail> {
        if (!orderId || orderId <= 0) {
            throw new AppError('Order ID không hợp lệ', 400);
        }


        const order = await orderRepository.getOrderById(orderId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng', 404);
        }


        return order;
    }


    /**
     * Lấy items của một đơn hàng
     */
    async getOrderItems(orderId: number): Promise<OrderItem[]> {
        if (!orderId || orderId <= 0) {
            throw new AppError('Order ID không hợp lệ', 400);
        }
        return orderRepository.getOrderItems(orderId);
    }


    /**
     * Đếm tổng số users có đơn hàng
     */
    async countUsersWithOrders(): Promise<number> {
        return orderRepository.countUsersWithOrders();
    }
    
}


export const orderService = new OrderService();