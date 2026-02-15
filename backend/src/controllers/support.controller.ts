import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';
import { supportService } from '../services/support.service';

/**
 * Support Controller
 * API endpoints cho hỗ trợ khách hàng
 */

export const getClientTickets = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
        } as ApiResponse);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;

    const tickets = await supportService.getClientTickets(req.user.userId, page, limit, status);

    res.json({
        success: true,
        message: 'Support tickets retrieved successfully',
        data: tickets.data,
        pagination: tickets.pagination,
    } as ApiResponse);
});

export const getClientTicketById = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
        } as ApiResponse);
    }

    const ticketId = parseInt(req.params.id, 10);
    
    if (isNaN(ticketId)) {
        return res.status(400).json({
            success: false,
            message: 'Ticket ID không hợp lệ',
        } as ApiResponse);
    }

    const ticket = await supportService.getTicketById(ticketId, req.user.userId);

    if (!ticket) {
        return res.status(404).json({
            success: false,
            message: 'Ticket not found',
        } as ApiResponse);
    }

    res.json({
        success: true,
        message: 'Ticket details retrieved successfully',
        data: ticket,
    } as ApiResponse);
});

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

    const ticket = await supportService.createSupportTicket({
        userId: req.user.userId,
        subject,
        message,
        orderId: order_id,
        priority
    });

    res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket,
    } as ApiResponse);
});

export const addTicketReply = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
        } as ApiResponse);
    }

    const ticketId = parseInt(req.params.id, 10);
    const { message } = req.body;

    if (isNaN(ticketId)) {
        return res.status(400).json({
            success: false,
            message: 'Ticket ID không hợp lệ',
        } as ApiResponse);
    }

    if (!message || message.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Message is required',
        } as ApiResponse);
    }

    const reply = await supportService.addTicketReply({
        ticketId,
        userId: req.user.userId,
        message: message.trim(),
        isStaffReply: req.user.roles.includes('staff') || req.user.roles.includes('admin')
    });

    res.status(201).json({
        success: true,
        message: 'Reply added successfully',
        data: reply,
    } as ApiResponse);
});