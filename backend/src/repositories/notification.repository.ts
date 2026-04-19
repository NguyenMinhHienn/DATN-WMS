import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * Notification Repository - CRUD cho bảng notifications
 */
class NotificationRepository {

    async create(data: {
        user_id: number;
        type: 'payment_receipt' | 'debt_reminder' | 'debt_created' | 'order_update' | 'system';
        title: string;
        message: string;
        reference_type?: string;
        reference_id?: number;
    }): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(`
            INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [data.user_id, data.type, data.title, data.message, data.reference_type || null, data.reference_id || null]);

        return result.insertId;
    }

    async getByUserId(userId: number, page: number = 1, limit: number = 20): Promise<{ data: any[]; total: number }> {
        const offset = (page - 1) * limit;

        const [countRows] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
            [userId]
        );

        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT * FROM notifications 
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);

        return {
            data: rows,
            total: countRows[0].total,
        };
    }

    async getUnreadCount(userId: number): Promise<number> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [userId]
        );
        return rows[0].count;
    }

    async markAsRead(id: number, userId: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    }

    async markAllAsRead(userId: number): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(
            'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0',
            [userId]
        );
        return result.affectedRows;
    }
}

export const notificationRepository = new NotificationRepository();
