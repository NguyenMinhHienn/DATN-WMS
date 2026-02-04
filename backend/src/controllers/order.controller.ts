import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { orderService } from '../services/order.service';
import { asyncHandler } from '../middlewares/error.middleware';


/**
 * Order Controller
 * API endpoints cho đơn hàng (READ ONLY cho Staff)
 */


/**
 * GET /orders/users
 * Lấy danh sách users có ít nhất 1 đơn hàng
 */
export const getUsersWithOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const search = req.query.search as string | undefined;


    const users = await orderService.getUsersWithOrders(search);


    res.json({
        success: true,
        message: 'Users with orders retrieved successfully',
        data: users,
    } as ApiResponse);
});


/**
 * GET /users/:id/orders
 * Lấy danh sách đơn hàng của một user
 */
export const getOrdersByUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10);


    if (isNaN(userId)) {
        return res.status(400).json({
            success: false,
            message: 'User ID không hợp lệ',
        } as ApiResponse);
    }


    const orders = await orderService.getOrdersByUserId(userId);


    res.json({
        success: true,
        message: 'Orders retrieved successfully',
        data: orders,
    } as ApiResponse);
});


/**
 * GET /orders/:id
 * Lấy chi tiết một đơn hàng (bao gồm items)
 */
export const getOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orderId = parseInt(req.params.id, 10);


    if (isNaN(orderId)) {
        return res.status(400).json({
            success: false,
            message: 'Order ID không hợp lệ',
        } as ApiResponse);
    }


    const order = await orderService.getOrderById(orderId);


    res.json({
        success: true,
        message: 'Order retrieved successfully',
        data: order,
    } as ApiResponse);
});


/**
 * GET /orders/:id/items
 * Lấy danh sách items của một đơn hàng
 */
export const getOrderItems = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orderId = parseInt(req.params.id, 10);


    if (isNaN(orderId)) {
        return res.status(400).json({
            success: false,
            message: 'Order ID không hợp lệ',
        } as ApiResponse);
    }


    const items = await orderService.getOrderItems(orderId);


    res.json({
        success: true,
        message: 'Order items retrieved successfully',
        data: items,
    } as ApiResponse);
});




/**
 * GET /client/orders
 * Client xem đơn hàng của chính mình (lấy userId từ token)
 */
export const getClientOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
        } as ApiResponse);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;

    const orders = await orderService.getOrdersByUserId(req.user.userId, page, limit, status);

    res.json({
        success: true,
        message: 'Client orders retrieved successfully',
        data: orders.data,
        pagination: orders.pagination,
    } as ApiResponse);
});

/**
 * GET /client/orders/:id
 * Client xem chi tiết đơn hàng của chính mình
 */
export const getClientOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
        } as ApiResponse);
    }

    const orderId = parseInt(req.params.id, 10);
    
    if (isNaN(orderId)) {
        return res.status(400).json({
            success: false,
            message: 'Order ID không hợp lệ',
        } as ApiResponse);
    }

    const order = await orderService.getOrderById(orderId);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found',
        } as ApiResponse);
    }

    // Kiểm tra xem order có thuộc về client này không
    if (order.user_id !== req.user.userId && !req.user.roles.includes('admin') && !req.user.roles.includes('staff')) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden - Order does not belong to you',
        } as ApiResponse);
    }

    res.json({
        success: true,
        message: 'Order details retrieved successfully',
        data: order,
    } as ApiResponse);
});

/**
 * GET /support/tickets
 * Client xem tickets hỗ trợ của mình
 */
export const getClientTickets = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
        } as ApiResponse);
    }

    // Tạm thời trả về mock data
    res.json({
        success: true,
        message: 'Support tickets retrieved successfully',
        data: [],
    } as ApiResponse);
});

/**
 * POST /support/tickets
 * Client tạo ticket hỗ trợ mới
 */
export const createSupportTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
        } as ApiResponse);
    }

    const { subject, message, order_id, priority = 'medium' } = req.body;

    if (!subject || !message) {
        return res.status(400).json({
            success: false,
            message: 'Subject and message are required',
        } as ApiResponse);
    }

    // Tạm thời trả về mock response
    const ticket = {
        id: Date.now(),
        user_id: req.user.userId,
        subject,
        message,
        order_id: order_id || null,
        priority,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket,
    } as ApiResponse);
});
