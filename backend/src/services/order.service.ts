import { orderRepository, CreateOrderItemInput } from '../repositories/order.repository';
import * as cartRepository from '../repositories/cart.repository';
import * as variantRepository from '../repositories/variant.repository';
import { AppError } from '../middlewares/error.middleware';

/**
 * Order Service
 * Business logic cho đơn hàng: tạo đơn từ giỏ hàng, duyệt, hủy, giao hàng
 */

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['shipping', 'cancelled'],
    shipping: ['delivered', 'failed'],
    delivered: [],
    failed: [],
    cancelled: [],
};

class OrderService {

    /**
     * User tạo đơn hàng từ giỏ hàng (COD)
     */
    async createOrder(
        userId: number,
        shippingName: string,
        shippingPhone: string,
        shippingAddress: string,
        paymentMethod: 'COD' | 'BANKING' = 'COD',
        notes?: string
    ): Promise<number> {
        // Validate shipping info
        if (!shippingName || !shippingName.trim()) {
            throw new AppError('Vui lòng nhập tên người nhận', 400);
        }
        if (!shippingPhone || !shippingPhone.trim()) {
            throw new AppError('Vui lòng nhập số điện thoại', 400);
        }
        if (!shippingAddress || !shippingAddress.trim()) {
            throw new AppError('Vui lòng nhập địa chỉ giao hàng', 400);
        }

        // Chỉ hỗ trợ COD
        if (paymentMethod !== 'COD') {
            throw new AppError('Hiện tại chỉ hỗ trợ thanh toán COD', 400);
        }

        // Lấy giỏ hàng
        const { cart, items: cartItems } = await cartRepository.getCartWithItems(userId);
        if (!cart || cartItems.length === 0) {
            throw new AppError('Giỏ hàng trống', 400);
        }

        // Validate stock cho từng item
        const orderItems: CreateOrderItemInput[] = [];
        let totalAmount = 0;

        for (const cartItem of cartItems) {
            // Check stock
            const variant = await variantRepository.findById(cartItem.product_variant_id);
            if (!variant) {
                throw new AppError(`Biến thể sản phẩm "${cartItem.product_name}" không tồn tại`, 400);
            }
            if (variant.stock < cartItem.quantity) {
                throw new AppError(
                    `Sản phẩm "${cartItem.product_name}" không đủ tồn kho. Còn lại: ${variant.stock}`,
                    400
                );
            }

            const lineTotal = cartItem.quantity * cartItem.unit_price;
            totalAmount += lineTotal;

            orderItems.push({
                product_id: cartItem.product_id,
                variant_id: cartItem.product_variant_id,
                product_name: cartItem.product_name,
                variant_sku: cartItem.variant_sku || null,
                quantity: cartItem.quantity,
                unit_price: cartItem.unit_price,
                variant_attributes: cartItem.variant_color ? JSON.stringify({ color: cartItem.variant_color }) : null,
            });
        }

        // Tạo đơn hàng
        const orderId = await orderRepository.createOrder(
            userId,
            shippingName.trim(),
            shippingPhone.trim(),
            shippingAddress.trim(),
            paymentMethod,
            totalAmount,
            orderItems,
            notes
        );

        // Xóa giỏ hàng sau khi tạo đơn thành công
        await cartRepository.clearCartItems(cart.id);
        await cartRepository.updateCartTotals(cart.id);

        return orderId;
    }

    /**
     * Admin duyệt đơn hàng: pending → confirmed
     */
    async confirmOrder(orderId: number): Promise<void> {
        const order = await orderRepository.getOrderById(orderId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng', 404);
        }
        if (order.status !== 'pending') {
            throw new AppError(`Không thể duyệt đơn ở trạng thái "${order.status}". Chỉ duyệt được đơn "pending"`, 400);
        }
        await orderRepository.updateOrderStatus(orderId, 'confirmed');
    }

    /**
     * Hủy đơn hàng
     * - User: chỉ hủy khi pending
     * - Admin: hủy khi pending hoặc confirmed
     */
    async cancelOrder(orderId: number, userId: number, isAdmin: boolean): Promise<void> {
        const order = await orderRepository.getOrderById(orderId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng', 404);
        }

        // Check quyền
        if (!isAdmin && order.user_id !== userId) {
            throw new AppError('Bạn không có quyền hủy đơn hàng này', 403);
        }

        // User chỉ hủy khi pending
        if (!isAdmin && order.status !== 'pending') {
            throw new AppError('Chỉ có thể hủy đơn ở trạng thái "Chờ xử lý"', 400);
        }

        // Admin hủy khi pending hoặc confirmed
        if (isAdmin && !['pending', 'confirmed'].includes(order.status)) {
            throw new AppError(`Không thể hủy đơn ở trạng thái "${order.status}"`, 400);
        }

        await orderRepository.updateOrderStatus(orderId, 'cancelled');
    }

    /**
     * Admin chuyển trạng thái: confirmed → shipping
     */
    async markShipping(orderId: number): Promise<void> {
        const order = await orderRepository.getOrderById(orderId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng', 404);
        }
        if (order.status !== 'confirmed') {
            throw new AppError(`Không thể chuyển sang "Đang giao" từ trạng thái "${order.status}". Chỉ áp dụng cho đơn đã duyệt.`, 400);
        }
        await orderRepository.updateOrderStatus(orderId, 'shipping');
    }

    /**
     * Admin xác nhận giao thành công: shipping → delivered
     * COD → payment_status = paid
     */
    async markDelivered(orderId: number): Promise<void> {
        const order = await orderRepository.getOrderById(orderId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng', 404);
        }
        if (order.status !== 'shipping') {
            throw new AppError(`Không thể xác nhận "Đã giao" từ trạng thái "${order.status}". Chỉ áp dụng cho đơn đang giao.`, 400);
        }
        await orderRepository.updateOrderStatus(orderId, 'delivered');
        // COD: tự động chuyển payment_status → paid
        if (order.payment_method === 'COD') {
            await orderRepository.updatePaymentStatus(orderId, 'paid');
        }
    }

    /**
     * Admin đánh dấu giao thất bại: shipping → failed
     */
    async markFailed(orderId: number): Promise<void> {
        const order = await orderRepository.getOrderById(orderId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng', 404);
        }
        if (order.status !== 'shipping') {
            throw new AppError(`Không thể đánh dấu "Giao thất bại" từ trạng thái "${order.status}". Chỉ áp dụng cho đơn đang giao.`, 400);
        }
        await orderRepository.updateOrderStatus(orderId, 'failed');
    }

    /**
     * Lấy tất cả đơn hàng (admin)
     */
    async getAllOrders(page: number = 1, limit: number = 10, status?: string) {
        return orderRepository.getAllOrders(page, limit, status);
    }

    /**
     * Lấy đơn hàng của user (client)
     */
    async getClientOrders(userId: number, page: number = 1, limit: number = 10, status?: string) {
        return orderRepository.getOrdersByUserId(userId, page, limit, status);
    }

    /**
     * Lấy chi tiết đơn hàng
     */
    async getOrderById(orderId: number) {
        const order = await orderRepository.getOrderById(orderId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng', 404);
        }
        return order;
    }

    /**
     * Lấy đơn hàng theo status (cho staff)
     */
    async getOrdersByStatus(status: string, page: number = 1, limit: number = 10) {
        return orderRepository.getOrdersByStatus(status, page, limit);
    }
}

export const orderService = new OrderService();