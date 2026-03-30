import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supportService, SupportTicket, CreateTicketData } from '../../services/supportService';
import { formatDate, formatDateTime } from '../../utils/formatters';

const SupportTicketsPage: React.FC = () => {
    const { isAuthenticated, user, isLoading } = useAuth();
    const navigate = useNavigate();
    
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showNewTicketForm, setShowNewTicketForm] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    
    // New ticket form state
    const [newTicket, setNewTicket] = useState<CreateTicketData>({
        subject: '',
        message: '',
        priority: 'medium'
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isLoading) return;
        
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        
        fetchTickets();
    }, [isAuthenticated, isLoading, navigate]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const result = await supportService.getClientTickets();
            setTickets(result.data);
            
            console.log('✅ Tickets loaded:', result.data.length);
        } catch (err: any) {
            setError(err.message || 'Không thể tải danh sách hỗ trợ');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newTicket.subject.trim() || !newTicket.message.trim()) {
            setError('Vui lòng nhập tiêu đề và nội dung');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            
            const createdTicket = await supportService.createSupportTicket(newTicket);
            
            // Cập nhật UI
            setTickets(prev => [createdTicket, ...prev]);
            setNewTicket({ subject: '', message: '', priority: 'medium' });
            setShowNewTicketForm(false);
            
            // Hiển thị thông báo thành công
            setSuccess('Yêu cầu hỗ trợ đã được gửi thành công!');
            setTimeout(() => setSuccess(null), 3000);
            
        } catch (err: any) {
            setError(err.message || 'Không thể gửi yêu cầu hỗ trợ');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewTicket(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleViewTicketDetails = async (ticketId: number) => {
        try {
            const ticket = await supportService.getTicketById(ticketId);
            setSelectedTicket(ticket as any);
        } catch (err: any) {
            setError('Không thể tải chi tiết yêu cầu');
        }
    };

    const handleCloseTicketDetails = () => {
        setSelectedTicket(null);
    };

    const handleRefresh = () => {
        fetchTickets();
        setError(null);
        setSuccess(null);
    };

    // ========== RENDER ==========

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Vui lòng đăng nhập</h2>
                    <p className="text-gray-600">Bạn cần đăng nhập để sử dụng tính năng hỗ trợ.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4">
                    <div className="flex justify-center items-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Đang tải dữ liệu hỗ trợ...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Ticket Detail Modal
    if (selectedTicket) {
        return (
            <TicketDetailModal
                ticket={selectedTicket}
                onClose={handleCloseTicketDetails}
                supportService={supportService}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Trung Tâm Hỗ Trợ</h1>
                            <p className="text-gray-600 mt-2">
                                Xin chào, <span className="font-medium">{user?.full_name}</span>!
                            </p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Làm mới
                        </button>
                    </div>
                </div>

                {/* Messages */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        <strong>Lỗi:</strong> {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                        <strong>Thành công:</strong> {success}
                    </div>
                )}

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Contact Info */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">📞 Thông Tin Liên Hệ</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium text-gray-900">Email hỗ trợ</h3>
                                    <p className="text-gray-600">support@warehouse.com</p>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">Hotline</h3>
                                    <p className="text-gray-600">1900 1234 (8:00 - 22:00 hàng ngày)</p>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">Địa chỉ</h3>
                                    <p className="text-gray-600">Số 123, Đường ABC, Quận XYZ, TP. Hồ Chí Minh</p>
                                </div>
                            </div>
                        </div>

                        {/* New Ticket Form */}
                        {showNewTicketForm ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-6">✉️ Tạo Yêu Cầu Hỗ Trợ</h2>
                                <form onSubmit={handleSubmitTicket}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Tiêu đề *
                                            </label>
                                            <input
                                                type="text"
                                                name="subject"
                                                value={newTicket.subject}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Nhập tiêu đề yêu cầu"
                                                required
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Mức độ ưu tiên
                                            </label>
                                            <select
                                                name="priority"
                                                value={newTicket.priority}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="low">Thấp</option>
                                                <option value="medium">Trung bình</option>
                                                <option value="high">Cao</option>
                                                <option value="urgent">Khẩn cấp</option>
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nội dung *
                                            </label>
                                            <textarea
                                                name="message"
                                                value={newTicket.message}
                                                onChange={handleInputChange}
                                                rows={6}
                                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Mô tả chi tiết vấn đề..."
                                                required
                                            />
                                        </div>
                                        
                                        <div className="flex space-x-3">
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                            >
                                                {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowNewTicketForm(false)}
                                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                            >
                                                Hủy
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 text-center">
                                <div className="text-blue-600 text-6xl mb-4">💬</div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">Bạn cần hỗ trợ?</h3>
                                <p className="text-gray-600 mb-6">
                                    Tạo yêu cầu hỗ trợ và chúng tôi sẽ phản hồi sớm nhất.
                                </p>
                                <button
                                    onClick={() => setShowNewTicketForm(true)}
                                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    📝 Tạo yêu cầu hỗ trợ mới
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Ticket History */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">📋 Yêu Cầu Của Bạn</h2>
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                    {tickets.length} yêu cầu
                                </span>
                            </div>
                            
                            {tickets.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-gray-300 text-5xl mb-3">📭</div>
                                    <p className="text-gray-500 font-medium">Chưa có yêu cầu nào</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {tickets.map((ticket) => {
                                        const statusInfo = supportService.getStatusText(ticket.status);
                                        const priorityInfo = supportService.getPriorityText(ticket.priority);
                                        
                                        return (
                                            <div 
                                                key={ticket.id} 
                                                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                                                onClick={() => handleViewTicketDetails(ticket.id)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-medium text-gray-900 line-clamp-1">
                                                        {ticket.subject}
                                                    </h4>
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${statusInfo.color}`}>
                                                        {statusInfo.text}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                                    {ticket.message}
                                                </p>
                                                <div className="flex justify-between items-center text-xs text-gray-500">
                                                    <span className={`px-2 py-1 rounded ${priorityInfo.color}`}>
                                                        {priorityInfo.text}
                                                    </span>
                                                    <span>{formatDate(ticket.created_at)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Ticket Detail Modal Component
const TicketDetailModal: React.FC<{
    ticket: any;
    onClose: () => void;
    supportService: any;
}> = ({ ticket, onClose, supportService }) => {
    const [replyMessage, setReplyMessage] = useState('');
    const [replying, setReplying] = useState(false);

    const statusInfo = supportService.getStatusText(ticket.status);

    const handleSubmitReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim()) return;

        try {
            setReplying(true);
            await supportService.addTicketReply(ticket.id, replyMessage);
            setReplyMessage('');
            // Có thể refetch ticket details ở đây
        } catch (error) {
            console.error('Error adding reply:', error);
        } finally {
            setReplying(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="border-b border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                ←
                            </button>
                            <h2 className="text-2xl font-bold text-gray-900">Chi Tiết Yêu Cầu</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm ${statusInfo.color}`}>
                                {statusInfo.text}
                            </span>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {/* Ticket Info */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{ticket.subject}</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
                        </div>
                    </div>

                    {/* Replies */}
                    <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Trao Đổi</h4>
                        <div className="space-y-4">
                            {ticket.replies?.map((reply: any) => (
                                <div 
                                    key={reply.id} 
                                    className={`rounded-lg p-4 ${reply.is_staff_reply ? 'bg-blue-50' : 'bg-gray-50'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-medium">
                                            {reply.user_name} {reply.is_staff_reply && '(Hỗ trợ viên)'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {formatDateTime(reply.created_at)}
                                        </div>
                                    </div>
                                    <p className="text-gray-700">{reply.message}</p>
                                </div>
                            ))}
                        </div>

                        {/* Reply Form */}
                        <form onSubmit={handleSubmitReply} className="mt-6">
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Thêm phản hồi
                                </label>
                                <textarea
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nhập phản hồi của bạn..."
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={replying || !replyMessage.trim()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {replying ? 'Đang gửi...' : 'Gửi phản hồi'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6">
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportTicketsPage;