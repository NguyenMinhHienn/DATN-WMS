import { Response } from 'express';
import { notificationRepository } from '../repositories/notification.repository';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

/** [GET] /notifications - User: lấy danh sách thông báo */
export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await notificationRepository.getByUserId(userId, page, limit);

    res.json({
        success: true,
        data: result.data,
        pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
        },
    } as ApiResponse);
});

/** [GET] /notifications/unread-count - User: đếm thông báo chưa đọc */
export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const count = await notificationRepository.getUnreadCount(userId);
    res.json({ success: true, data: { count } } as ApiResponse);
});

/** [PUT] /notifications/:id/read - User: đánh dấu đã đọc */
export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const id = parseInt(req.params.id, 10);
    await notificationRepository.markAsRead(id, userId);
    res.json({ success: true, message: 'Đã đánh dấu đã đọc' } as ApiResponse);
});

/** [PUT] /notifications/read-all - User: đánh dấu tất cả đã đọc */
export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const count = await notificationRepository.markAllAsRead(userId);
    res.json({ success: true, message: `Đã đánh dấu ${count} thông báo`, data: { count } } as ApiResponse);
});
