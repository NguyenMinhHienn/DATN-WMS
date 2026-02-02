import React, { useState, useEffect } from 'react';
import { orderService, UserWithOrderCount, OrderSummary, OrderItem } from '../../services/orderService';


/**
 * Staff Orders Page
 * Light theme modern với layout Master-Detail
 */
const StaffOrders: React.FC = () => {
    // User list state
    const [users, setUsers] = useState<UserWithOrderCount[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [usersLoading, setUsersLoading] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);


    // Orders state
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);


    // Expand/Collapse state
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
    const [orderItems, setOrderItems] = useState<Record<number, OrderItem[]>>({});
    const [loadingItems, setLoadingItems] = useState<Set<number>>(new Set());


    // Load users with orders
    useEffect(() => {
        loadUsers();
    }, [userSearch]);


    // Load orders when user selected
    useEffect(() => {
        if (selectedUserId) {
            loadOrders(selectedUserId);
        } else {
            setOrders([]);
        }
    }, [selectedUserId]);


    const loadUsers = async () => {
        try {
            setUsersLoading(true);
            const data = await orderService.getUsersWithOrders(userSearch || undefined);
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
            setUsers([]);
        } finally {
            setUsersLoading(false);
        }
    };


    const loadOrders = async (userId: number) => {
        try {
            setOrdersLoading(true);
            const data = await orderService.getOrdersByUserId(userId);
            setOrders(data);
            setExpandedOrders(new Set());
            setOrderItems({});
        } catch (error) {
            console.error('Failed to load orders:', error);
            setOrders([]);
        } finally {
            setOrdersLoading(false);
        }
    };


    const loadOrderItems = async (orderId: number) => {
        if (orderItems[orderId]) return;

        try {
            setLoadingItems(prev => new Set(prev).add(orderId));
            const items = await orderService.getOrderItems(orderId);
            setOrderItems(prev => ({ ...prev, [orderId]: items }));
        } catch (error) {
            console.error('Failed to load order items:', error);
        } finally {
            setLoadingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(orderId);
                return newSet;
            });
        }
    };


    const toggleOrderExpand = async (orderId: number) => {
        const newExpanded = new Set(expandedOrders);
        if (newExpanded.has(orderId)) {
            newExpanded.delete(orderId);
        } else {
            newExpanded.add(orderId);
            if (!orderItems[orderId]) {
                await loadOrderItems(orderId);
            }
        }
        setExpandedOrders(newExpanded);
    };


    const expandAll = async () => {
        const allIds = new Set(orders.map(o => o.id));
        setExpandedOrders(allIds);
        for (const order of orders) {
            if (!orderItems[order.id]) {
                await loadOrderItems(order.id);
            }
        }
    };


    const collapseAll = () => {
        setExpandedOrders(new Set());
    };


    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(value);
    };


    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };


    const getPaymentStatusBadge = (status: string) => {
        const config: Record<string, { label: string; className: string }> = {
            pending: { label: 'Chờ thanh toán', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
            paid: { label: 'Đã thanh toán', className: 'bg-green-100 text-green-700 border border-green-200' },
            failed: { label: 'Thất bại', className: 'bg-red-100 text-red-700 border border-red-200' },
            refunded: { label: 'Hoàn tiền', className: 'bg-purple-100 text-purple-700 border border-purple-200' },
        };
        const c = config[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
        return <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${c.className}`}>{c.label}</span>;
    };


    const getOrderStatusBadge = (statusCode: string, statusName?: string) => {
        const config: Record<string, { label: string; className: string }> = {
            pending: { label: 'Chờ xử lý', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
            confirmed: { label: 'Đã xác nhận', className: 'bg-blue-100 text-blue-700 border border-blue-200' },
            processing: { label: 'Đang xử lý', className: 'bg-cyan-100 text-cyan-700 border border-cyan-200' },
            shipped: { label: 'Đang giao', className: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
            delivered: { label: 'Đã giao', className: 'bg-green-100 text-green-700 border border-green-200' },
            cancelled: { label: 'Đã hủy', className: 'bg-red-100 text-red-700 border border-red-200' },
        };
        const c = config[statusCode] || { label: statusName || statusCode, className: 'bg-gray-100 text-gray-700' };
        return <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${c.className}`}>{c.label}</span>;
    };


    const selectedUser = users.find(u => u.id === selectedUserId);


    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/30">
                        <span className="text-2xl">🛒</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Theo dõi đơn hàng</h1>
                        <p className="text-slate-500">Xem đơn hàng theo từng khách hàng (Chỉ xem - Không chỉnh sửa)</p>
                    </div>
                </div>
            </div>


            {/* Main Layout: Master-Detail */}
            <div className="flex gap-6 h-[calc(100vh-180px)]">
                {/* === LEFT COLUMN: User List === */}
                <div className="w-80 flex-shrink-0 bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col overflow-hidden">
                    {/* Search */}
                    <div className="p-4 border-b border-slate-100">
                        <input
                            type="text"
                            placeholder="🔍 Tìm kiếm user..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>


                    {/* User List */}
                    <div className="flex-1 overflow-y-auto">
                        {usersLoading ? (
                            <div className="flex justify-center items-center h-32">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="p-6 text-center">
                                <div className="text-5xl mb-3 opacity-50">📦</div>
                                <p className="font-medium text-slate-600">Chưa có user nào phát sinh đơn hàng</p>
                                <p className="text-sm mt-1 text-slate-400">Đơn hàng sẽ xuất hiện khi có user đặt hàng</p>
                            </div>
                        ) : (
                            users.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUserId(user.id)}
                                    className={`p-4 cursor-pointer transition-all border-b border-slate-100 last:border-b-0 ${selectedUserId === user.id
                                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-l-indigo-500'
                                        : 'hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${selectedUserId === user.id
                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                                            : 'bg-gradient-to-br from-slate-100 to-slate-200'
                                            }`}>
                                            👤
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold truncate ${selectedUserId === user.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                {user.full_name || user.username}
                                            </p>
                                            <p className="text-sm text-slate-400 truncate">{user.email}</p>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${selectedUserId === user.id
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-slate-200 text-slate-600'
                                            }`}>
                                            {user.order_count}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>


                {/* === RIGHT COLUMN: Orders === */}
                <div className="flex-1 bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col overflow-hidden">
                    {/* Right Header */}
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100">
                        {selectedUser ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                                    <span className="text-lg">👤</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">{selectedUser.full_name || selectedUser.username}</h3>
                                    <p className="text-sm text-slate-500">{orders.length} đơn hàng</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-500 font-medium">Chọn một user để xem đơn hàng</p>
                        )}

                        {orders.length > 0 && (
                            <div className="flex gap-2">
                                <button
                                    onClick={expandAll}
                                    className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    📂 Mở tất cả
                                </button>
                                <button
                                    onClick={collapseAll}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    📁 Thu gọn
                                </button>
                            </div>
                        )}
                    </div>


                    {/* Orders List */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {!selectedUserId ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <span className="text-6xl opacity-50 mb-4">👈</span>
                                <p className="font-medium">Chọn một user từ danh sách bên trái</p>
                                <p className="text-sm">để xem chi tiết đơn hàng</p>
                            </div>
                        ) : ordersLoading ? (
                            <div className="flex justify-center items-center h-32">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <span className="text-5xl opacity-50 mb-3">📭</span>
                                <p className="font-medium">User này chưa có đơn hàng</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map(order => (
                                    <div key={order.id} className="rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-200 hover:shadow-md transition-all">
                                        {/* Order Header - Click to expand */}
                                        <div
                                            onClick={() => toggleOrderExpand(order.id)}
                                            className="p-4 bg-gradient-to-r from-slate-50 to-white cursor-pointer hover:from-indigo-50 hover:to-purple-50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <span className={`transform transition-transform ${expandedOrders.has(order.id) ? 'rotate-90' : ''}`}>
                                                        ▶
                                                    </span>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-indigo-600 font-mono">#{order.id}</span>
                                                            {getOrderStatusBadge(order.status_code, order.status_name)}
                                                            {getPaymentStatusBadge(order.payment_status)}
                                                        </div>
                                                        <p className="text-sm text-slate-500 mt-1">{formatDate(order.order_date)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-lg text-green-600">{formatCurrency(order.total_amount)}</p>
                                                    <p className="text-sm text-slate-400">{order.total_items} sản phẩm</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Content */}
                                        {expandedOrders.has(order.id) && (
                                            <div className="px-4 pb-4 bg-white border-t border-slate-100">
                                                {/* Shipping Info */}
                                                {order.shipping_name && (
                                                    <div className="p-4 my-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                                        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                                            <span>📍</span> Thông tin giao hàng
                                                        </h4>
                                                        <div className="text-sm">
                                                            <div>
                                                                <span className="text-blue-600">Người nhận:</span>
                                                                <span className="ml-2 text-slate-700 font-medium">{order.shipping_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Order Items */}
                                                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                                    <span>📦</span> Sản phẩm
                                                </h4>
                                                {loadingItems.has(order.id) ? (
                                                    <div className="flex justify-center py-4">
                                                        <div className="w-6 h-6 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                ) : orderItems[order.id] ? (
                                                    <div className="space-y-2">
                                                        {orderItems[order.id].map(item => (
                                                            <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                                {item.image_url ? (
                                                                    <img src={item.image_url} alt={item.product_name} className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                                                                ) : (
                                                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xl">📦</div>
                                                                )}
                                                                <div className="flex-1">
                                                                    <p className="font-medium text-slate-800">{item.product_name}</p>
                                                                    <p className="text-sm text-slate-500">{formatCurrency(item.unit_price)} × {item.quantity}</p>
                                                                    {item.variant_sku && <p className="text-xs text-slate-400">SKU: {item.variant_sku}</p>}
                                                                </div>
                                                                <p className="font-bold text-green-600">{formatCurrency(item.line_total)}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : null}

                                                {/* Order Summary */}
                                                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                                                    <span className="text-slate-600">Tổng cộng:</span>
                                                    <span className="text-xl font-bold text-green-600">{formatCurrency(order.total_amount)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffOrders;