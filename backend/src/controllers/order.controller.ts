import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { orderService } from '../services/order.service';
import { asyncHandler } from '../middlewares/error.middleware';

/**
 * Order Controller
 * API endpoints cho quản lý đơn hàng
 */

// ==================== CLIENT ENDPOINTS ====================

/**
 * POST /orders
 * Client tạo đơn hàng từ giỏ hàng
 */
export const createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' } as ApiResponse);
    }

    const { shipping_name, shipping_phone, shipping_address, payment_method, notes } = req.body;

    const orderId = await orderService.createOrder(
        req.user.userId,
        shipping_name,
        shipping_phone,
        shipping_address,
        payment_method || 'COD',
        notes
    );

    const order = await orderService.getOrderById(orderId);

    res.status(201).json({
        success: true,
        message: 'Đặt hàng thành công',
        data: order,
    } as ApiResponse);
});

/**
 * GET /client/orders
 * Client xem đơn hàng của mình
 */
export const getClientOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' } as ApiResponse);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;

    const result = await orderService.getClientOrders(req.user.userId, page, limit, status);

    res.json({
        success: true,
        message: 'Client orders retrieved successfully',
        data: result.data,
        pagination: result.pagination,
    } as ApiResponse);
});

/**
 * GET /client/orders/:id
 * Client xem chi tiết đơn hàng của mình
 */
export const getClientOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' } as ApiResponse);
    }

    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
        return res.status(400).json({ success: false, message: 'Order ID không hợp lệ' } as ApiResponse);
    }

    const order = await orderService.getOrderById(orderId);

    // Kiểm tra đơn thuộc về client
    if (order.user_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Đơn hàng không thuộc về bạn' } as ApiResponse);
    }

    res.json({
        success: true,
        message: 'Order details retrieved successfully',
        data: order,
    } as ApiResponse);
});

/**
 * PUT /orders/:id/cancel
 * User hoặc Admin hủy đơn
 */
export const cancelOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' } as ApiResponse);
    }

    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
        return res.status(400).json({ success: false, message: 'Order ID không hợp lệ' } as ApiResponse);
    }

    const isAdmin = req.user.roles.includes('admin');
    await orderService.cancelOrder(orderId, req.user.userId, isAdmin);

    res.json({
        success: true,
        message: 'Đã hủy đơn hàng',
    } as ApiResponse);
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /orders
 * Admin xem tất cả đơn hàng
 */
export const getAllOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;

    const result = await orderService.getAllOrders(page, limit, status);

    res.json({
        success: true,
        message: 'Orders retrieved successfully',
        data: result.data,
        pagination: result.pagination,
    } as ApiResponse);
});

/**
 * GET /orders/:id
 * Xem chi tiết đơn hàng (admin/staff)
 */
export const getOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
        return res.status(400).json({ success: false, message: 'Order ID không hợp lệ' } as ApiResponse);
    }

    const order = await orderService.getOrderById(orderId);

    res.json({
        success: true,
        message: 'Order retrieved successfully',
        data: order,
    } as ApiResponse);
});

/**
 * PUT /orders/:id/confirm
 * Admin duyệt đơn (pending → confirmed)
 */
export const confirmOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
        return res.status(400).json({ success: false, message: 'Order ID không hợp lệ' } as ApiResponse);
    }

    await orderService.confirmOrder(orderId);

    res.json({
        success: true,
        message: 'Đã duyệt đơn hàng',
    } as ApiResponse);
});

// markDelivered và markFailed đã được thêm lại
// Admin quản lý trực tiếp trạng thái đơn hàng

/**
 * PUT /orders/:id/shipping
 * Admin chuyển đơn sang đang giao (confirmed → shipping)
 */
export const markShipping = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
        return res.status(400).json({ success: false, message: 'Order ID không hợp lệ' } as ApiResponse);
    }

    await orderService.markShipping(orderId);

    res.json({
        success: true,
        message: 'Đã chuyển đơn hàng sang trạng thái "Đang giao"',
    } as ApiResponse);
});

/**
 * PUT /orders/:id/delivered
 * Admin xác nhận giao thành công (shipping → delivered)
 */
export const markDelivered = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
        return res.status(400).json({ success: false, message: 'Order ID không hợp lệ' } as ApiResponse);
    }

    await orderService.markDelivered(orderId);

    res.json({
        success: true,
        message: 'Đã xác nhận giao hàng thành công',
    } as ApiResponse);
});

/**
 * PUT /orders/:id/failed
 * Admin đánh dấu giao thất bại (shipping → failed)
 */
export const markFailed = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
        return res.status(400).json({ success: false, message: 'Order ID không hợp lệ' } as ApiResponse);
    }

    await orderService.markFailed(orderId);

    res.json({
        success: true,
        message: 'Đã đánh dấu giao hàng thất bại',
    } as ApiResponse);
});

/**
 * GET /orders/confirmed
 * Lấy danh sách đơn đã duyệt (cho staff tạo phiếu)
 */
export const getConfirmedOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await orderService.getOrdersByStatus('confirmed', page, limit);

    res.json({
        success: true,
        message: 'Confirmed orders retrieved successfully',
        data: result.data,
        pagination: result.pagination,
    } as ApiResponse);
});
