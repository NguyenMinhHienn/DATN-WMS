import React, { useState, useEffect } from 'react';
import { orderService, UserWithOrderCount, OrderSummary, OrderItem } from '../../services/orderService';


/**
 * Staff Orders Page
 * Layout Master-Detail: Users list (left) + Orders (right)
 * Collapsible order cards để xử lý nhiều đơn hàng
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
            // Reset expanded state
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
        if (orderItems[orderId]) return; // Already loaded


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
            // Load items if not loaded yet
            if (!orderItems[orderId]) {
                await loadOrderItems(orderId);
            }
        }
        setExpandedOrders(newExpanded);
    };


    const expandAll = async () => {
        const allIds = new Set(orders.map(o => o.id));
        setExpandedOrders(allIds);
        // Load all items
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
        const config: Record<string, { label: string; color: string }> = {
            pending: { label: 'Chờ thanh toán', color: 'bg-yellow-100 text-yellow-800' },
            paid: { label: 'Đã thanh toán', color: 'bg-green-100 text-green-800' },
            failed: { label: 'Thất bại', color: 'bg-red-100 text-red-800' },
            refunded: { label: 'Hoàn tiền', color: 'bg-purple-100 text-purple-800' },
        };
        const c = config[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
        return <span className={`px-2 py-0.5 text-xs rounded-full ${c.color}`}>{c.label}</span>;
    };


    const selectedUser = users.find(u => u.id === selectedUserId);


    return (
        <div className="p-6 h-full">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Theo dõi đơn hàng</h1>
                <p className="text-gray-600 text-sm mt-1">Xem đơn hàng theo từng khách hàng (Chỉ xem - Không chỉnh sửa)</p>
            </div>


            {/* Main Layout: Master-Detail */}
            <div className="flex gap-6 h-[calc(100vh-180px)]">
                {/* === LEFT COLUMN: User List === */}
                <div className="w-80 flex-shrink-0 bg-white rounded-lg shadow overflow-hidden flex flex-col">
                    {/* Search */}
                    <div className="p-4 border-b">
                        <input
                            type="text"
                            placeholder="🔍 Tìm kiếm user..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                    </div>


                    {/* User List */}
                    <div className="flex-1 overflow-y-auto">
                        {usersLoading ? (
                            <div className="flex justify-center items-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                <div className="text-4xl mb-2">📦</div>
                                <p className="font-medium">Chưa có user nào phát sinh đơn hàng</p>
                                <p className="text-sm mt-1">Đơn hàng sẽ xuất hiện khi có user đặt hàng</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {users.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => setSelectedUserId(user.id)}
                                        className={`p-4 cursor-pointer transition-colors ${selectedUserId === user.id
                                                ? 'bg-blue-50 border-l-4 border-blue-500'
                                                : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="font-medium text-gray-900">
                                            {user.full_name || user.username}
                                        </div>
                                        <div className="text-sm text-gray-500 truncate">{user.email}</div>
                                        <div className="mt-1 text-xs text-blue-600 font-medium">
                                            {user.order_count} đơn hàng
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>


                {/* === RIGHT COLUMN: Orders === */}
                <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b flex items-center justify-between">
                        <div>
                            {selectedUser ? (
                                <>
                                    <h2 className="font-medium text-gray-900">
                                        Đơn hàng của {selectedUser.full_name || selectedUser.username}
                                    </h2>
                                    <p className="text-sm text-gray-500">{orders.length} đơn hàng</p>
                                </>
                            ) : (
                                <h2 className="text-gray-500">Chọn một user để xem đơn hàng</h2>
                            )}
                        </div>


                        {orders.length > 0 && (
                            <div className="flex gap-2">
                                <button
                                    onClick={expandAll}
                                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                >
                                    ▼ Mở tất cả
                                </button>
                                <button
                                    onClick={collapseAll}
                                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                >
                                    ▶ Thu gọn
                                </button>
                            </div>
                        )}
                    </div>


                    {/* Orders List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {!selectedUserId ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <div className="text-6xl mb-4">👈</div>
                                <p>Chọn một user từ danh sách bên trái</p>
                            </div>
                        ) : ordersLoading ? (
                            <div className="flex justify-center items-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center text-gray-500 py-12">
                                <div className="text-4xl mb-2">📋</div>
                                <p>User này chưa có đơn hàng nào</p>
                            </div>
                        ) : (
                            orders.map(order => (
                                <div
                                    key={order.id}
                                    className="border rounded-lg overflow-hidden"
                                >
                                    {/* Order Header (Always visible) */}
                                    <div
                                        onClick={() => toggleOrderExpand(order.id)}
                                        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-lg">
                                                {expandedOrders.has(order.id) ? '▼' : '▶'}
                                            </span>
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {order.order_number}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {formatDate(order.order_date)}
                                                </div>
                                            </div>
                                        </div>


                                        <div className="flex items-center gap-4 text-sm">
                                            <span
                                                className="px-3 py-1 rounded-full text-xs font-medium"
                                                style={{ backgroundColor: order.status_color + '20', color: order.status_color }}
                                            >
                                                {order.status_name}
                                            </span>
                                            {getPaymentStatusBadge(order.payment_status)}
                                            <span className="font-medium text-gray-900">
                                                {formatCurrency(order.total_amount)}
                                            </span>
                                        </div>
                                    </div>


                                    {/* Order Details (Expandable) */}
                                    {expandedOrders.has(order.id) && (
                                        <div className="p-4 bg-white border-t">
                                            <div className="mb-3 text-sm text-gray-600">
                                                <span className="font-medium">Người nhận:</span> {order.shipping_name}
                                            </div>


                                            {/* Items */}
                                            <div className="text-sm font-medium text-gray-700 mb-2">Sản phẩm:</div>
                                            {loadingItems.has(order.id) ? (
                                                <div className="text-center py-4">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                                                </div>
                                            ) : orderItems[order.id]?.length > 0 ? (
                                                <div className="space-y-2">
                                                    {orderItems[order.id].map(item => (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg">📦</span>
                                                                <div>
                                                                    <div className="font-medium text-gray-900">
                                                                        {item.product_name}
                                                                    </div>
                                                                    {item.variant_attributes && (
                                                                        <div className="text-xs text-gray-500">
                                                                            {item.variant_attributes}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-right text-sm">
                                                                <div className="text-gray-600">
                                                                    x{item.quantity} @ {formatCurrency(item.unit_price)}
                                                                </div>
                                                                <div className="font-medium text-gray-900">
                                                                    {formatCurrency(item.line_total)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 text-sm italic">Không có chi tiết sản phẩm</p>
                                            )}


                                            {/* Summary */}
                                            <div className="mt-4 pt-3 border-t flex justify-between items-center">
                                                <span className="text-sm text-gray-600">
                                                    {order.total_items} sản phẩm
                                                </span>
                                                <span className="font-bold text-lg text-green-600">
                                                    {formatCurrency(order.total_amount)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default StaffOrders;