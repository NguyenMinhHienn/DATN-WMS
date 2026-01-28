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



