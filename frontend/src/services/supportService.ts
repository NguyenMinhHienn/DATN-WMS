
export interface SupportTicket {
    id: number;
    user_id: number;
    subject: string;
    message: string;
    order_id?: number;
    order_number?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    created_at: string;
    updated_at: string;
    resolved_at?: string;
}

export interface CreateTicketData {
    subject: string;
    message: string;
    order_id?: number;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface SupportTicketReply {
    id: number;
    ticket_id: number;
    user_id: number;
    user_name?: string;
    message: string;
    is_staff_reply: boolean;
    created_at: string;
}

class SupportService {
    // ========== MOCK DATA ==========
    private mockTickets: SupportTicket[] = [
        {
            id: 1,
            user_id: 1,
            subject: 'Hỏi về thời gian giao hàng',
            message: 'Tôi đặt hàng 3 ngày trước nhưng chưa thấy cập nhật trạng thái giao hàng.',
            order_id: 1001,
            order_number: 'ORD-2024-001',
            priority: 'medium',
            status: 'resolved',
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-16T14:20:00Z',
            resolved_at: '2024-01-16T14:20:00Z'
        },
        {
            id: 2,
            user_id: 1,
            subject: 'Sản phẩm bị lỗi',
            message: 'Sản phẩm tôi nhận được bị trầy xước và không hoạt động.',
            order_id: 1002,
            order_number: 'ORD-2024-002',
            priority: 'high',
            status: 'in_progress',
            created_at: '2024-01-20T15:45:00Z',
            updated_at: '2024-01-20T16:30:00Z'
        },
        {
            id: 3,
            user_id: 1,
            subject: 'Yêu cầu hoàn tiền',
            message: 'Tôi muốn yêu cầu hoàn tiền cho đơn hàng đã hủy.',
            order_id: 1003,
            order_number: 'ORD-2024-003',
            priority: 'medium',
            status: 'open',
            created_at: '2024-01-25T09:15:00Z',
            updated_at: '2024-01-25T09:15:00Z'
        }
    ];

    private mockReplies: SupportTicketReply[] = [
        {
            id: 1,
            ticket_id: 1,
            user_id: 1,
            user_name: 'Nguyễn Văn A',
            message: 'Xin chào, tôi cần hỗ trợ về vấn đề này.',
            is_staff_reply: false,
            created_at: '2024-01-15T10:30:00Z'
        },
        {
            id: 2,
            ticket_id: 1,
            user_id: 2,
            user_name: 'Hỗ trợ viên',
            message: 'Chào bạn, chúng tôi đã nhận được yêu cầu và đang xử lý.',
            is_staff_reply: true,
            created_at: '2024-01-15T11:30:00Z'
        }
    ];

    // ========== PUBLIC METHODS ==========
    
    /**
     * Lấy danh sách tickets hỗ trợ (MOCK)
     */
    async getClientTickets(page = 1, limit = 10, status?: string): Promise<{ data: SupportTicket[], pagination: any }> {
        console.log('📞 [MOCK] Fetching support tickets');
        
        // Lọc theo status nếu có
        let filteredTickets = this.mockTickets;
        if (status) {
            filteredTickets = this.mockTickets.filter(ticket => 
                ticket.status.toLowerCase() === status.toLowerCase()
            );
        }
        
        // Phân trang (mock)
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedTickets = filteredTickets.slice(start, end);
        
        return {
            data: paginatedTickets,
            pagination: {
                page,
                limit,
                total: filteredTickets.length,
                totalPages: Math.ceil(filteredTickets.length / limit)
            }
        };
    }

    /**
     * Tạo ticket hỗ trợ mới (MOCK)
     */
    async createSupportTicket(ticketData: CreateTicketData): Promise<SupportTicket> {
        console.log('📝 [MOCK] Creating support ticket:', ticketData);
        
        const newTicket: SupportTicket = {
            id: Date.now(), // Dùng timestamp làm ID
            user_id: 1, // Mock user ID
            subject: ticketData.subject,
            message: ticketData.message,
            order_id: ticketData.order_id,
            priority: ticketData.priority || 'medium',
            status: 'open',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Thêm vào mock data
        this.mockTickets.unshift(newTicket);
        
        // Lưu vào localStorage để persistence (tùy chọn)
        this.saveToLocalStorage();
        
        return newTicket;
    }

    /**
     * Lấy chi tiết ticket (MOCK)
     */
    async getTicketById(ticketId: number): Promise<SupportTicket & { replies?: SupportTicketReply[] }> {
        console.log('🔍 [MOCK] Getting ticket details:', ticketId);
        
        const ticket = this.mockTickets.find(t => t.id === ticketId) || this.mockTickets[0];
        const replies = this.mockReplies.filter(r => r.ticket_id === ticketId);
        
        return {
            ...ticket,
            replies
        };
    }

    /**
     * Thêm reply cho ticket (MOCK)
     */
    async addTicketReply(ticketId: number, message: string, isStaffReply = false): Promise<SupportTicketReply> {
        console.log('💬 [MOCK] Adding reply to ticket:', ticketId);
        
        const newReply: SupportTicketReply = {
            id: Date.now(),
            ticket_id: ticketId,
            user_id: isStaffReply ? 2 : 1,
            user_name: isStaffReply ? 'Hỗ trợ viên' : 'Nguyễn Văn A',
            message,
            is_staff_reply: isStaffReply,
            created_at: new Date().toISOString()
        };
        
        // Thêm vào mock replies
        this.mockReplies.push(newReply);
        
        // Lưu vào localStorage
        this.saveToLocalStorage();
        
        return newReply;
    }

    // ========== HELPER METHODS ==========
    
    /**
     * Lấy text hiển thị cho priority
     */
    getPriorityText(priority: string): { text: string, color: string } {
        const priorityMap: Record<string, { text: string, color: string }> = {
            'low': { text: 'Thấp', color: 'bg-gray-100 text-gray-800' },
            'medium': { text: 'Trung bình', color: 'bg-blue-100 text-blue-800' },
            'high': { text: 'Cao', color: 'bg-orange-100 text-orange-800' },
            'urgent': { text: 'Khẩn cấp', color: 'bg-red-100 text-red-800' }
        };
        return priorityMap[priority] || { text: priority, color: 'bg-gray-100 text-gray-800' };
    }

    /**
     * Lấy text hiển thị cho status
     */
    getStatusText(status: string): { text: string, color: string } {
        const statusMap: Record<string, { text: string, color: string }> = {
            'open': { text: 'Đang mở', color: 'bg-yellow-100 text-yellow-800' },
            'in_progress': { text: 'Đang xử lý', color: 'bg-blue-100 text-blue-800' },
            'resolved': { text: 'Đã giải quyết', color: 'bg-green-100 text-green-800' },
            'closed': { text: 'Đã đóng', color: 'bg-gray-100 text-gray-800' }
        };
        return statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    }

    /**
     * Lấy icon cho priority
     */
    getPriorityIcon(priority: string): string {
        const iconMap: Record<string, string> = {
            'low': '📄',
            'medium': '📋',
            'high': '⚠️',
            'urgent': '🚨'
        };
        return iconMap[priority] || '📌';
    }

    /**
     * Lấy icon cho status
     */
    getStatusIcon(status: string): string {
        const iconMap: Record<string, string> = {
            'open': '🟡',
            'in_progress': '🔵',
            'resolved': '🟢',
            'closed': '⚫'
        };
        return iconMap[status] || '⚪';
    }

    // ========== PRIVATE METHODS ==========
    
    /**
     * Lưu mock data vào localStorage (tùy chọn)
     */
    private saveToLocalStorage(): void {
        try {
            localStorage.setItem('mock_support_tickets', JSON.stringify(this.mockTickets));
            localStorage.setItem('mock_support_replies', JSON.stringify(this.mockReplies));
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
        }
    }

    /**
     * Load mock data từ localStorage (tùy chọn)
     */
    private loadFromLocalStorage(): void {
        try {
            const savedTickets = localStorage.getItem('mock_support_tickets');
            const savedReplies = localStorage.getItem('mock_support_replies');
            
            if (savedTickets) {
                this.mockTickets = JSON.parse(savedTickets);
            }
            if (savedReplies) {
                this.mockReplies = JSON.parse(savedReplies);
            }
        } catch (error) {
            console.warn('Could not load from localStorage:', error);
        }
    }

    constructor() {
        // Tải data từ localStorage khi khởi tạo
        this.loadFromLocalStorage();
    }
}

// Export singleton instance
export const supportService = new SupportService();