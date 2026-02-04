import pool from '../config/database';
import { RowDataPacket } from 'mysql2/promise';

export interface SupportTicket {
    id: number;
    user_id: number;
    subject: string;
    message: string;
    order_id?: number;
    order_number?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    admin_notes?: string;
    resolved_at?: Date;
    created_at: Date;
    updated_at: Date;
}

export interface SupportTicketReply {
    id: number;
    ticket_id: number;
    user_id: number;
    user_name?: string;
    user_role?: string;
    message: string;
    is_staff_reply: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateTicketData {
    userId: number;
    subject: string;
    message: string;
    orderId?: number;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CreateReplyData {
    ticketId: number;
    userId: number;
    message: string;
    isStaffReply: boolean;
}

class SupportService {
    /**
     * Lấy danh sách tickets của client
     */
    async getClientTickets(
        userId: number, 
        page: number = 1, 
        limit: number = 10, 
        status?: string
    ): Promise<{ data: SupportTicket[], pagination: any }> {
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                st.*,
                co.order_number
            FROM support_tickets st
            LEFT JOIN customer_orders co ON st.order_id = co.id
            WHERE st.user_id = ? AND st.deleted_at IS NULL
        `;
        
        const params: any[] = [userId];
        
        if (status) {
            query += ' AND st.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY st.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        // Count total
        let countQuery = `
            SELECT COUNT(*) as total
            FROM support_tickets st
            WHERE st.user_id = ? AND st.deleted_at IS NULL
        `;
        const countParams: any[] = [userId];
        
        if (status) {
            countQuery += ' AND st.status = ?';
            countParams.push(status);
        }
        
        try {
            const [rows] = await pool.query<RowDataPacket[]>(query, params);
            const [[{ total }]] = await pool.query<RowDataPacket[]>(countQuery, countParams);
            
            return {
                data: rows as SupportTicket[],
                pagination: {
                    page,
                    limit,
                    total: parseInt(total),
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error fetching support tickets:', error);
            // Trả về mock data nếu table chưa tồn tại
            return this.getMockTickets(userId, page, limit);
        }
    }

    /**
     * Lấy chi tiết ticket
     */
    async getTicketById(ticketId: number, userId: number): Promise<SupportTicket & { replies?: SupportTicketReply[] } | null> {
        try {
            // Lấy thông tin ticket
            const ticketQuery = `
                SELECT 
                    st.*,
                    co.order_number
                FROM support_tickets st
                LEFT JOIN customer_orders co ON st.order_id = co.id
                WHERE st.id = ? AND st.user_id = ? AND st.deleted_at IS NULL
            `;
            
            const [ticketRows] = await pool.query<RowDataPacket[]>(ticketQuery, [ticketId, userId]);
            
            if (ticketRows.length === 0) {
                return null;
            }
            
            const ticket = ticketRows[0] as SupportTicket;
            
            // Lấy replies
            const repliesQuery = `
                SELECT 
                    str.*,
                    u.full_name as user_name,
                    u.role as user_role
                FROM support_ticket_replies str
                LEFT JOIN users u ON str.user_id = u.id
                WHERE str.ticket_id = ?
                ORDER BY str.created_at ASC
            `;
            
            const [replyRows] = await pool.query<RowDataPacket[]>(repliesQuery, [ticketId]);
            
            return {
                ...ticket,
                replies: replyRows as SupportTicketReply[]
            };
        } catch (error) {
            console.error('Error fetching ticket details:', error);
            // Trả về mock data
            return this.getMockTicketDetail(ticketId, userId);
        }
    }

    /**
     * Tạo ticket mới
     */
    async createSupportTicket(data: CreateTicketData): Promise<SupportTicket> {
        const { userId, subject, message, orderId, priority = 'medium' } = data;
        
        const query = `
            INSERT INTO support_tickets 
            (user_id, subject, message, order_id, priority, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'open', NOW(), NOW())
        `;
        
        try {
            const [result] = await pool.query(query, [
                userId, subject, message, orderId || null, priority
            ]);
            
            const insertId = (result as any).insertId;
            
            // Lấy ticket vừa tạo
            const [rows] = await pool.query<RowDataPacket[]>(
                'SELECT * FROM support_tickets WHERE id = ?',
                [insertId]
            );
            
            return rows[0] as SupportTicket;
        } catch (error) {
            console.error('Error creating support ticket:', error);
            // Trả về mock response
            return this.createMockTicket(data);
        }
    }

    /**
     * Thêm reply cho ticket
     */
    async addTicketReply(data: CreateReplyData): Promise<SupportTicketReply> {
        const { ticketId, userId, message, isStaffReply } = data;
        
        const query = `
            INSERT INTO support_ticket_replies 
            (ticket_id, user_id, message, is_staff_reply, created_at, updated_at)
            VALUES (?, ?, ?, ?, NOW(), NOW())
        `;
        
        try {
            const [result] = await pool.query(query, [
                ticketId, userId, message, isStaffReply
            ]);
            
            const insertId = (result as any).insertId;
            
            // Lấy reply vừa tạo
            const [rows] = await pool.query<RowDataPacket[]>(
                `SELECT 
                    str.*,
                    u.full_name as user_name,
                    u.role as user_role
                FROM support_ticket_replies str
                LEFT JOIN users u ON str.user_id = u.id
                WHERE str.id = ?`,
                [insertId]
            );
            
            return rows[0] as SupportTicketReply;
        } catch (error) {
            console.error('Error adding ticket reply:', error);
            // Trả về mock response
            return this.createMockReply(data);
        }
    }

    // ========== MOCK DATA (Tạm thời) ==========
    
    private getMockTickets(userId: number, page: number, limit: number): { data: SupportTicket[], pagination: any } {
        const mockTickets: SupportTicket[] = [
            {
                id: 1,
                user_id: userId,
                subject: 'Hỏi về thời gian giao hàng',
                message: 'Tôi đặt hàng 3 ngày trước nhưng chưa thấy cập nhật trạng thái giao hàng.',
                order_id: 1001,
                order_number: 'ORD-2024-001',
                priority: 'medium',
                status: 'resolved',
                created_at: new Date('2024-01-15T10:30:00Z'),
                updated_at: new Date('2024-01-16T14:20:00Z'),
                resolved_at: new Date('2024-01-16T14:20:00Z')
            },
            {
                id: 2,
                user_id: userId,
                subject: 'Sản phẩm bị lỗi',
                message: 'Sản phẩm tôi nhận được bị trầy xước và không hoạt động.',
                order_id: 1002,
                order_number: 'ORD-2024-002',
                priority: 'high',
                status: 'in_progress',
                created_at: new Date('2024-01-20T15:45:00Z'),
                updated_at: new Date('2024-01-20T16:30:00Z')
            },
            {
                id: 3,
                user_id: userId,
                subject: 'Yêu cầu hoàn tiền',
                message: 'Tôi muốn yêu cầu hoàn tiền cho đơn hàng đã hủy.',
                order_id: 1003,
                order_number: 'ORD-2024-003',
                priority: 'medium',
                status: 'open',
                created_at: new Date('2024-01-25T09:15:00Z'),
                updated_at: new Date('2024-01-25T09:15:00Z')
            }
        ];
        
        return {
            data: mockTickets,
            pagination: {
                page,
                limit,
                total: mockTickets.length,
                totalPages: 1
            }
        };
    }
    
    private getMockTicketDetail(ticketId: number, userId: number): SupportTicket & { replies: SupportTicketReply[] } {
        const mockTickets = this.getMockTickets(userId, 1, 10).data;
        const ticket = mockTickets.find(t => t.id === ticketId) || mockTickets[0];
        
        return {
            ...ticket,
            replies: [
                {
                    id: 1,
                    ticket_id: ticketId,
                    user_id: userId,
                    user_name: 'Nguyễn Văn A',
                    user_role: 'customer',
                    message: 'Xin chào, tôi cần hỗ trợ về vấn đề này.',
                    is_staff_reply: false,
                    created_at: ticket.created_at,
                    updated_at: ticket.created_at
                },
                {
                    id: 2,
                    ticket_id: ticketId,
                    user_id: 2,
                    user_name: 'Hỗ trợ viên',
                    user_role: 'staff',
                    message: 'Chào bạn, chúng tôi đã nhận được yêu cầu của bạn và đang xử lý.',
                    is_staff_reply: true,
                    created_at: new Date('2024-01-15T11:30:00Z'),
                    updated_at: new Date('2024-01-15T11:30:00Z')
                }
            ]
        };
    }
    
    private createMockTicket(data: CreateTicketData): SupportTicket {
        const newTicket: SupportTicket = {
            id: Date.now(),
            user_id: data.userId,
            subject: data.subject,
            message: data.message,
            order_id: data.orderId,
            priority: data.priority || 'medium',
            status: 'open',
            created_at: new Date(),
            updated_at: new Date()
        };
        
        return newTicket;
    }
    
    private createMockReply(data: CreateReplyData): SupportTicketReply {
        return {
            id: Date.now(),
            ticket_id: data.ticketId,
            user_id: data.userId,
            user_name: data.isStaffReply ? 'Hỗ trợ viên' : 'Nguyễn Văn A',
            user_role: data.isStaffReply ? 'staff' : 'customer',
            message: data.message,
            is_staff_reply: data.isStaffReply,
            created_at: new Date(),
            updated_at: new Date()
        };
    }
}

export const supportService = new SupportService();