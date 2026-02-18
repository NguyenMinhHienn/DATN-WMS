import React, { useState, useEffect } from 'react';
import { orderService, OrderSummary, OrderDetail } from '../../services/orderService';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Admin Orders Page - Modern UI
 * Quản lý đơn hàng với progress stepper và glassmorphism design
 */

// ==================== STATUS CONFIG ====================
const STATUS_CONFIG: Record<string, {
    label: string; icon: string; color: string; gradient: string; border: string; bg: string; step: number;
}> = {
    pending: { label: 'Chờ duyệt', icon: '⏳', color: '#f59e0b', gradient: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/40', bg: 'bg-amber-500/10', step: 0 },
    confirmed: { label: 'Đã duyệt', icon: '✅', color: '#3b82f6', gradient: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/40', bg: 'bg-blue-500/10', step: 1 },
    shipping: { label: 'Đang giao', icon: '🚚', color: '#8b5cf6', gradient: 'from-violet-500/20 to-violet-600/5', border: 'border-violet-500/40', bg: 'bg-violet-500/10', step: 2 },
    delivered: { label: 'Đã giao', icon: '📦', color: '#10b981', gradient: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', step: 3 },
    failed: { label: 'Giao thất bại', icon: '❌', color: '#ef4444', gradient: 'from-red-500/20 to-red-600/5', border: 'border-red-500/40', bg: 'bg-red-500/10', step: -1 },
    cancelled: { label: 'Đã hủy', icon: '🚫', color: '#6b7280', gradient: 'from-slate-500/20 to-slate-600/5', border: 'border-slate-500/40', bg: 'bg-slate-500/10', step: -1 },
};

const STEPS = ['Chờ duyệt', 'Đã duyệt', 'Đang giao', 'Đã giao'];
const STEP_ICONS = ['📝', '✅', '🚚', '📦'];

// ==================== PROGRESS STEPPER COMPONENT ====================
const OrderStepper: React.FC<{ status: string }> = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const currentStep = config.step;
    const isFailed = status === 'failed';
    const isCancelled = status === 'cancelled';

    if (isFailed || isCancelled) {
        return (
            <div className="flex items-center gap-2 mt-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${config.bg} border ${config.border}`}
                    style={{ color: config.color }}>
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 mt-3">
            {STEPS.map((step, idx) => {
                const isCompleted = idx < currentStep;
                const isCurrent = idx === currentStep;
                const isUpcoming = idx > currentStep;

                return (
                    <React.Fragment key={step}>
                        {/* Step circle */}
                        <div className="flex items-center gap-1.5">
                            <div className={`
                                w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                                ${isCompleted ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50' : ''}
                                ${isCurrent ? 'bg-indigo-500/20 text-indigo-300 border-2 border-indigo-400/60 ring-2 ring-indigo-500/20 scale-110' : ''}
                                ${isUpcoming ? 'bg-slate-700/30 text-slate-600 border border-slate-600/30' : ''}
                            `}>
                                {isCompleted ? '✓' : <span className="text-[10px]">{STEP_ICONS[idx]}</span>}
                            </div>
                            <span className={`text-[10px] font-medium hidden sm:inline ${isCompleted ? 'text-emerald-400/70' :
                                    isCurrent ? 'text-indigo-300' :
                                        'text-slate-600'
                                }`}>{step}</span>
                        </div>
                        {/* Connector line */}
                        {idx < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 min-w-[12px] rounded-full mx-0.5 transition-all duration-300 ${idx < currentStep ? 'bg-emerald-500/40' : 'bg-slate-700/40'
                                }`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// ==================== MAIN COMPONENT ====================
const AdminOrders: React.FC = () => {
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState('');

    useEffect(() => { fetchOrders(); }, [statusFilter, page]);

    const fetchOrders = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await orderService.getAllOrders(page, 15, statusFilter || undefined);
            setOrders(result.data);
            setTotalPages(result.pagination?.totalPages || 1);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Không thể tải đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (orderId: number) => {
        if (selectedOrder?.id === orderId) { setSelectedOrder(null); return; }
        setDetailLoading(true);
        try {
            const detail = await orderService.getOrderById(orderId);
            setSelectedOrder(detail);
        } catch (err) {
            alert('Không thể tải chi tiết đơn hàng');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleAction = async (orderId: number, action: string) => {
        const labels: Record<string, string> = {
            confirm: 'Duyệt đơn hàng',
            cancel: 'Hủy đơn hàng',
            shipping: 'Chuyển sang Đang giao',
            delivered: 'Xác nhận Đã giao',
            failed: 'Đánh dấu Giao thất bại',
        };
        if (!window.confirm(`Bạn chắc chắn muốn ${labels[action]?.toLowerCase()}?`)) return;
        setActionLoading(`${orderId}-${action}`);
        try {
            switch (action) {
                case 'confirm': await orderService.confirmOrder(orderId); break;
                case 'cancel': await orderService.cancelOrder(orderId); break;
                case 'shipping': await orderService.markShipping(orderId); break;
                case 'delivered': await orderService.markDelivered(orderId); break;
                case 'failed': await orderService.markFailed(orderId); break;
            }
            alert(`✅ ${labels[action]} thành công`);
            setSelectedOrder(null);
            fetchOrders();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setActionLoading('');
        }
    };

    const statusTabs = [
        { value: '', label: 'Tất cả', icon: '📋' },
        { value: 'pending', label: 'Chờ duyệt', icon: '⏳' },
        { value: 'confirmed', label: 'Đã duyệt', icon: '✅' },
        { value: 'shipping', label: 'Đang giao', icon: '🚚' },
        { value: 'delivered', label: 'Đã giao', icon: '📦' },
        { value: 'failed', label: 'Thất bại', icon: '❌' },
        { value: 'cancelled', label: 'Đã hủy', icon: '🚫' },
    ];

    // ==================== NEXT ACTION BUTTON ====================
    const getNextAction = (order: OrderSummary): { action: string; label: string; icon: string; className: string } | null => {
        switch (order.status) {
            case 'pending':
                return { action: 'confirm', label: 'Duyệt đơn', icon: '✅', className: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25' };
            case 'confirmed':
                return { action: 'shipping', label: 'Bắt đầu giao', icon: '🚚', className: 'from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-violet-500/25' };
            case 'shipping':
                return { action: 'delivered', label: 'Đã giao xong', icon: '📦', className: 'from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/25' };
            default:
                return null;
        }
    };

    const getSecondaryActions = (order: OrderSummary): { action: string; label: string; icon: string; className: string }[] => {
        const actions: { action: string; label: string; icon: string; className: string }[] = [];
        if (['pending', 'confirmed'].includes(order.status)) {
            actions.push({ action: 'cancel', label: 'Hủy', icon: '✕', className: 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' });
        }
        if (order.status === 'shipping') {
            actions.push({ action: 'failed', label: 'Thất bại', icon: '✕', className: 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' });
        }
        return actions;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20">🛒</span>
                        Quản lý Đơn hàng
                    </h1>
                    <p className="text-slate-400 mt-1 ml-[52px]">Theo dõi và xử lý tất cả đơn hàng</p>
                </div>
                <button onClick={fetchOrders}
                    className="group px-4 py-2.5 bg-slate-800/60 text-slate-300 rounded-xl hover:bg-slate-700/60 text-sm font-medium border border-slate-700/50 transition-all hover:border-indigo-500/30">
                    <span className="group-hover:animate-spin inline-block mr-1.5">🔄</span> Làm mới
                </button>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {statusTabs.map(tab => {
                    const isActive = statusFilter === tab.value;
                    const tabConfig = tab.value ? STATUS_CONFIG[tab.value] : null;
                    return (
                        <button key={tab.value} onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200
                                ${isActive
                                    ? 'text-white shadow-lg border border-transparent'
                                    : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 border border-slate-700/30'
                                }`}
                            style={isActive ? {
                                background: tabConfig ? `linear-gradient(135deg, ${tabConfig.color}22, ${tabConfig.color}11)` : 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))',
                                borderColor: tabConfig ? `${tabConfig.color}55` : 'rgba(99,102,241,0.4)',
                                boxShadow: tabConfig ? `0 4px 15px ${tabConfig.color}15` : '0 4px 15px rgba(99,102,241,0.15)',
                                color: tabConfig?.color || '#818cf8',
                            } : {}}>
                            <span className="text-base">{tab.icon}</span> {tab.label}
                        </button>
                    );
                })}
            </div>

            {error && <div className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20 backdrop-blur-sm">{error}</div>}

            {loading ? (
                <div className="text-center py-20">
                    <div className="relative w-12 h-12 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-slate-400 text-sm">Đang tải đơn hàng...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-20 bg-slate-800/20 rounded-2xl border border-slate-700/30 backdrop-blur-sm">
                    <div className="text-6xl mb-4 opacity-50">📭</div>
                    <p className="text-slate-400">Không có đơn hàng nào</p>
                    <p className="text-slate-600 text-sm mt-1">Thử thay đổi bộ lọc trạng thái</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map(order => {
                        const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                        const payInfo = orderService.getPaymentStatusInfo(order.payment_status);
                        const isExpanded = selectedOrder?.id === order.id;
                        const nextAction = getNextAction(order);
                        const secondaryActions = getSecondaryActions(order);

                        return (
                            <div key={order.id}
                                className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 backdrop-blur-sm
                                    ${isExpanded
                                        ? `bg-gradient-to-r ${config.gradient} ${config.border} shadow-lg`
                                        : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50 hover:border-slate-600/40'
                                    }`}>

                                {/* Status accent line on left */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-300"
                                    style={{ backgroundColor: config.color, opacity: isExpanded ? 1 : 0.5 }} />

                                {/* Main row */}
                                <div className="pl-5 pr-4 py-4 cursor-pointer" onClick={() => handleViewDetail(order.id)}>
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Left: Order info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="text-sm font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg">
                                                    #{order.id}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${config.bg} border ${config.border}`}
                                                    style={{ color: config.color }}>
                                                    {config.icon} {config.label}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                                                    style={{ color: payInfo.color, backgroundColor: payInfo.bg }}>
                                                    {payInfo.text}
                                                </span>
                                            </div>
                                            <div className="mt-2.5 flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs text-white font-bold">
                                                        {order.shipping_name?.charAt(0)?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{order.shipping_name}</p>
                                                        <p className="text-xs text-slate-500">{order.shipping_phone}</p>
                                                    </div>
                                                </div>
                                                {order.user_email && (
                                                    <span className="text-xs text-slate-500 hidden md:inline">📧 {order.user_email}</span>
                                                )}
                                            </div>
                                            {/* Progress stepper */}
                                            <OrderStepper status={order.status} />
                                        </div>

                                        {/* Right: Price + Actions */}
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <p className="text-lg font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                                                {formatCurrency(order.total_amount)}
                                            </p>
                                            <span className="text-[11px] text-slate-500">{formatDate(order.created_at)}</span>

                                            {/* Action buttons */}
                                            <div className="flex items-center gap-1.5 mt-1">
                                                {nextAction && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAction(order.id, nextAction.action); }}
                                                        disabled={actionLoading === `${order.id}-${nextAction.action}`}
                                                        className={`px-3.5 py-1.5 bg-gradient-to-r ${nextAction.className} text-white rounded-lg text-xs font-semibold shadow-lg
                                                            transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100`}>
                                                        {actionLoading === `${order.id}-${nextAction.action}`
                                                            ? <span className="inline-block animate-spin">⏳</span>
                                                            : <>{nextAction.icon} {nextAction.label}</>
                                                        }
                                                    </button>
                                                )}
                                                {secondaryActions.map(sa => (
                                                    <button key={sa.action}
                                                        onClick={(e) => { e.stopPropagation(); handleAction(order.id, sa.action); }}
                                                        disabled={actionLoading === `${order.id}-${sa.action}`}
                                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border border-transparent hover:border-red-500/20
                                                            ${sa.className} disabled:opacity-50`}
                                                        title={sa.label}>
                                                        {sa.icon} {sa.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && selectedOrder && (
                                    <div className="border-t border-slate-700/30 bg-slate-900/30 backdrop-blur-sm">
                                        {detailLoading ? (
                                            <div className="text-center py-8 text-slate-400">
                                                <span className="inline-block animate-spin text-lg">⏳</span>
                                                <p className="text-sm mt-2">Đang tải chi tiết...</p>
                                            </div>
                                        ) : (
                                            <div className="p-5">
                                                {/* Info grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                                                    <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
                                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">📍 Địa chỉ giao hàng</p>
                                                        <p className="text-sm text-slate-200 leading-relaxed">{selectedOrder.shipping_address}</p>
                                                    </div>
                                                    <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
                                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">💳 Thanh toán</p>
                                                        <p className="text-sm text-slate-200">{orderService.getPaymentMethodText(selectedOrder.payment_method)}</p>
                                                    </div>
                                                    {selectedOrder.notes && (
                                                        <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
                                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">📝 Ghi chú</p>
                                                            <p className="text-sm text-slate-200 italic">{selectedOrder.notes}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Products */}
                                                <div>
                                                    <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3 flex items-center gap-2">
                                                        <span className="w-5 h-0.5 bg-indigo-500/50 rounded-full"></span>
                                                        Sản phẩm ({selectedOrder.items.length})
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {selectedOrder.items.map(item => (
                                                            <div key={item.id} className="flex items-center justify-between bg-slate-800/30 hover:bg-slate-800/50 p-3 rounded-xl border border-slate-700/20 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/20">
                                                                        <span className="text-xs">📦</span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-white">{item.product_name}</p>
                                                                        {item.variant_sku && <p className="text-[11px] text-slate-500 font-mono">SKU: {item.variant_sku}</p>}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xs text-slate-400">×{item.quantity}</p>
                                                                    <p className="text-sm font-semibold text-indigo-300">{formatCurrency(item.unit_price * item.quantity)}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Total */}
                                                    <div className="mt-3 pt-3 border-t border-slate-700/30 flex items-center justify-between">
                                                        <span className="text-sm text-slate-400 font-medium">Tổng cộng</span>
                                                        <span className="text-lg font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                                                            {formatCurrency(selectedOrder.total_amount)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-6">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                className="px-4 py-2.5 rounded-xl bg-slate-800/50 text-slate-300 text-sm disabled:opacity-30 hover:bg-slate-700/50 border border-slate-700/30 transition-all hover:border-slate-600/50">
                                ← Trước
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    const pageNum = totalPages <= 5 ? i + 1 :
                                        page <= 3 ? i + 1 :
                                            page >= totalPages - 2 ? totalPages - 4 + i :
                                                page - 2 + i;
                                    return (
                                        <button key={pageNum} onClick={() => setPage(pageNum)}
                                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
                                                ${page === pageNum
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                                }`}>
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                className="px-4 py-2.5 rounded-xl bg-slate-800/50 text-slate-300 text-sm disabled:opacity-30 hover:bg-slate-700/50 border border-slate-700/30 transition-all hover:border-slate-600/50">
                                Tiếp →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
