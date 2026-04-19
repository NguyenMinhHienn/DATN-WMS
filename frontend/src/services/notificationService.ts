import api from './api';

export interface Notification {
    id: number;
    user_id: number;
    type: 'payment_receipt' | 'debt_reminder' | 'debt_created' | 'order_update' | 'system';
    title: string;
    message: string;
    reference_type: string | null;
    reference_id: number | null;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
}

export const notificationService = {
    async getNotifications(page = 1, limit = 20) {
        const response = await api.get('/notifications', { params: { page, limit } });
        return response.data;
    },

    async getUnreadCount(): Promise<number> {
        const response = await api.get('/notifications/unread-count');
        return response.data.data.count;
    },

    async markAsRead(id: number) {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    },

    async markAllAsRead() {
        const response = await api.put('/notifications/read-all');
        return response.data.data.count;
    }
};
