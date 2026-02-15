import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderService, OrderSummary } from '../../services/orderService';
import { formatCurrency, formatDate } from '../../utils/formatters';

const OrdersPage: React.FC = () => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const navigate = useNavigate();
    
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('');

    // DEBUG: Log trạng thái
    console.log('OrdersPage - Auth State:', { 
        isAuthenticated, 
        isLoading,
        user,
        ordersCount: orders?.length || 0 
    });

    useEffect(() => {
        // Nếu đang loading auth, chờ
        if (isLoading) {
            console.log('Auth is still loading...');
            return;
        }

        // Nếu chưa đăng nhập, chuyển hướng
        if (!isAuthenticated) {
            console.log('Not authenticated, redirecting to login');
            navigate('/login');
            return;
        }

        console.log('Fetching orders for authenticated user');
        fetchOrders();
    }, [page, statusFilter, isAuthenticated, isLoading, navigate]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching orders with params:', { page, statusFilter });
            
            const result = await orderService.getClientOrders(page, 10, statusFilter);
            console.log('Orders result:', result);
            
            // FIX: Đảm bảo orders luôn là mảng
            const ordersData = result?.data || [];
            setOrders(Array.isArray(ordersData) ? ordersData : []);
            
            // FIX: Đảm bảo pagination tồn tại
            if (result?.pagination) {
                setTotalPages(result.pagination.totalPages || 1);
            } else {
                setTotalPages(1);
            }
            
            console.log('Orders set successfully:', ordersData.length);
        } catch (err: any) {
            console.error('Fetch orders error:', err);
            
            let errorMessage = 'Không thể tải danh sách đơn hàng';
            if (err.response?.status === 401) {
                errorMessage = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
                localStorage.removeItem('token');
                setTimeout(() => navigate('/login'), 2000);
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }
            
            setError(errorMessage);
            setOrders([]); // Đặt orders thành mảng rỗng khi có lỗi
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (orderId: number) => {
        navigate(`/orders/${orderId}`);
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value);
        setPage(1);
    };

    const handleRefresh = () => {
        fetchOrders();
    };

    // Hiển thị loading
    if (loading && orders.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4">
                    <div className="flex justify-center items-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Đang tải đơn hàng...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Đơn Hàng Của Tôi</h1>
                            <p className="text-gray-600 mt-2">
                                Xin chào, <span className="font-medium">{user?.full_name}</span>! 
                                Đây là danh sách đơn hàng của bạn.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/products')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Tiếp tục mua sắm
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                        <div>
                            <strong>Lỗi:</strong> {error}
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {/* Filters */}
                <div className="mb-6 bg-white rounded-lg shadow p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Lọc theo trạng thái
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={handleStatusChange}
                                    className="w-full md:w-48 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Tất cả trạng thái</option>
                                    <option value="pending">Chờ xác nhận</option>
                                    <option value="confirmed">Đã xác nhận</option>
                                    <option value="processing">Đang xử lý</option>
                                    <option value="shipped">Đã giao hàng</option>
                                    <option value="delivered">Đã nhận hàng</option>
                                    <option value="cancelled">Đã hủy</option>
                                </select>
                            </div>
                            
                            <div className="text-sm text-gray-600">
                                Hiển thị {orders.length} đơn hàng
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
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
                </div>

                {/* Orders List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {/* FIX: Kiểm tra orders tồn tại trước khi dùng .length */}
                    {!orders || orders.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-6xl mb-4">📦</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có đơn hàng nào</h3>
                            <p className="text-gray-500 mb-6">
                                {statusFilter 
                                    ? `Không tìm thấy đơn hàng với trạng thái "${statusFilter}"`
                                    : 'Bạn chưa có đơn hàng nào trong hệ thống.'}
                            </p>
                            <button
                                onClick={() => navigate('/products')}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Mua sắm ngay
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Mã đơn hàng
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Ngày đặt
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tổng tiền
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Số lượng
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Trạng thái
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Thanh toán
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Thao tác
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {orders.map((order) => {
                                            const status = order.status_code || order.status || 'pending';
                                            const statusInfo = orderService.getOrderStatusInfo(status);
                                            const paymentInfo = orderService.getPaymentStatusInfo(order.payment_status || 'pending');
                                            
                                            return (
                                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            #{order.order_number || `ORD${order.id.toString().padStart(6, '0')}`}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {formatDate(order.order_date || order.created_at || new Date().toISOString())}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {formatCurrency(order.total_amount || order.final_amount || 0)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {order.total_items || 0} sản phẩm
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                                            {statusInfo.text}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentInfo.color}`}>
                                                            {paymentInfo.text}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <button
                                                            onClick={() => handleViewDetails(order.id)}
                                                            className="text-blue-600 hover:text-blue-900 mr-4 hover:underline"
                                                        >
                                                            Xem chi tiết
                                                        </button>
                                                        {(status === 'pending' || status === 'confirmed') && (
                                                            <button 
                                                                className="text-red-600 hover:text-red-900 hover:underline"
                                                                onClick={() => {
                                                                    if (window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
                                                                        alert('Tính năng hủy đơn hàng đang được phát triển');
                                                                    }
                                                                }}
                                                            >
                                                                Hủy đơn
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-700">
                                            Trang <span className="font-medium">{page}</span> /{' '}
                                            <span className="font-medium">{totalPages}</span>
                                            <span className="ml-4">
                                                Tổng cộng: {orders.length} đơn hàng
                                            </span>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className={`px-4 py-2 border rounded-lg ${page === 1 ? 'text-gray-400 cursor-not-allowed bg-gray-100' : 'text-gray-700 hover:bg-gray-50 hover:border-gray-300'}`}
                                            >
                                                ← Trước
                                            </button>
                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page === totalPages}
                                                className={`px-4 py-2 border rounded-lg ${page === totalPages ? 'text-gray-400 cursor-not-allowed bg-gray-100' : 'text-gray-700 hover:bg-gray-50 hover:border-gray-300'}`}
                                            >
                                                Sau →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Help Section */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-800 mb-2">Cần hỗ trợ?</h3>
                    <p className="text-blue-700 mb-4">
                        Nếu bạn có thắc mắc về đơn hàng, vui lòng liên hệ với chúng tôi.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => navigate('/support')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            📞 Liên hệ hỗ trợ
                        </button>
                        <button
                            onClick={() => window.open('mailto:support@stockflow.com', '_blank')}
                            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            ✉️ Gửi email
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrdersPage;