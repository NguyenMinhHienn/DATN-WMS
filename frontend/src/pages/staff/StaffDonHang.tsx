import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService, OrderSummary, OrderDetail } from '../../services/orderService';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Staff Orders Page - Quản lý yêu cầu nhập đầy đủ cho Staff
 * Staff có thể: xem, duyệt, xử lý, hoàn thành, hủy yêu cầu
 */

// ==================== STATUS CONFIG ====================
const STATUS_CONFIG: Record<string, {
    label: string; icon: string; color: string; bgLight: string; borderLight: string; step: number;
}> = {
    pending: { label: 'Chờ duyệt', icon: '⏳', color: '#f59e0b', bgLight: 'bg-amber-50', borderLight: 'border-amber-200', step: 0 },
    confirmed: { label: 'Đã duyệt', icon: '✅', color: '#3b82f6', bgLight: 'bg-blue-50', borderLight: 'border-blue-200', step: 1 },
    shipping: { label: 'Đang xử lý', icon: '🚚', color: '#8b5cf6', bgLight: 'bg-violet-50', borderLight: 'border-violet-200', step: 2 },
    delivered: { label: 'Hoàn thành', icon: '📦', color: '#10b981', bgLight: 'bg-emerald-50', borderLight: 'border-emerald-200', step: 3 },
    failed: { label: 'Xử lý thất bại', icon: '❌', color: '#ef4444', bgLight: 'bg-red-50', borderLight: 'border-red-200', step: -1 },
    cancelled: { label: 'Đã hủy', icon: '🚫', color: '#6b7280', bgLight: 'bg-slate-50', borderLight: 'border-slate-200', step: -1 },
};

const STEPS = ['Chờ duyệt', 'Đã duyệt', 'Đang xử lý', 'Hoàn thành'];
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
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${config.borderLight}`}
                    style={{ color: config.color, backgroundColor: `${config.color}10` }}>
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
                        <div className="flex items-center gap-1.5">
                            <div className={`
                                w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                                ${isCompleted ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-300' : ''}
                                ${isCurrent ? 'bg-emerald-500 text-white border-2 border-emerald-400 ring-2 ring-emerald-200 scale-110' : ''}
                                ${isUpcoming ? 'bg-slate-100 text-slate-400 border border-slate-200' : ''}
                            `}>
                                {isCompleted ? '✓' : <span className="text-[10px]">{STEP_ICONS[idx]}</span>}
                            </div>
                            <span className={`text-[10px] font-medium hidden sm:inline ${isCompleted ? 'text-emerald-600' :
                                isCurrent ? 'text-emerald-700 font-semibold' :
                                    'text-slate-400'
                                }`}>{step}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 min-w-[12px] rounded-full mx-0.5 transition-all duration-300 ${idx < currentStep ? 'bg-emerald-300' : 'bg-slate-200'
                                }`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// ==================== MAIN COMPONENT ====================
const StaffDonHang: React.FC = () => {
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [exportLoading, setExportLoading] = useState<number | null>(null);
    const navigate = useNavigate();

    useEffect(() => { fetchOrders(); }, [statusFilter, page]);

    const fetchOrders = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await orderService.getStaffOrders(page, 15, statusFilter || undefined);
            setOrders(result.data);
            setTotalPages(result.pagination?.totalPages || 1);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Không thể tải yêu cầu nhập');
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
            alert('Không thể tải chi tiết yêu cầu');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleAction = async (orderId: number, action: string) => {
        const labels: Record<string, string> = {
            confirm: 'Duyệt yêu cầu',
            cancel: 'Hủy yêu cầu',
            shipping: 'Chuyển sang Đang xử lý',
            delivered: 'Xác nhận Hoàn thành',
            failed: 'Đánh dấu Xử lý thất bại',
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

    const handleCreateExportSlip = async (orderId: number) => {
        setExportLoading(orderId);
        try {
            const detail = await orderService.getOrderById(orderId);
            // Build order items for pre-filling CreateTransfer form
            const orderItems = detail.items.map(item => ({
                product_id: item.product_id,
                product_name: item.product_name,
                variant_id: item.variant_id,
                variant_sku: item.variant_sku,
                quantity: item.quantity,
                unit_price: item.unit_price,
            }));
            navigate('/staff/create-transfer', {
                state: {
                    fromOrder: true,
                    orderId: detail.id,
                    orderItems,
                    reason: `Xuất kho cho yêu cầu #${detail.id} - ${detail.shipping_name}`,
                    shippingName: detail.shipping_name,
                    shippingAddress: detail.shipping_address,
                    shippingPhone: detail.shipping_phone,
                    paymentMethod: detail.payment_method,
                }
            });
        } catch (err) {
            alert('Không thể tải chi tiết yêu cầu để tạo phiếu xuất');
        } finally {
            setExportLoading(null);
        }
    };

    const statusTabs = [
        { value: '', label: 'Tất cả', icon: '📋' },
        { value: 'pending', label: 'Chờ duyệt', icon: '⏳' },
        { value: 'confirmed', label: 'Đã duyệt', icon: '✅' },
        { value: 'shipping', label: 'Đang xử lý', icon: '🚚' },
        { value: 'delivered', label: 'Hoàn thành', icon: '📦' },
        { value: 'failed', label: 'Thất bại', icon: '❌' },
        { value: 'cancelled', label: 'Đã hủy', icon: '🚫' },
    ];

    // ==================== NEXT ACTION BUTTON ====================
    const getNextAction = (order: OrderSummary): { action: string; label: string; icon: string; className: string } | null => {
        switch (order.status) {
            case 'pending':
                return { action: 'confirm', label: 'Duyệt yêu cầu', icon: '✅', className: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25' };
            case 'confirmed':
                return { action: 'shipping', label: 'Bắt đầu xử lý', icon: '🚚', className: 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/25' };
            case 'shipping':
                return { action: 'delivered', label: 'Hoàn thành', icon: '📦', className: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25' };
            default:
                return null;
        }
    };

    const getSecondaryActions = (order: OrderSummary): { action: string; label: string; icon: string; className: string }[] => {
        const actions: { action: string; label: string; icon: string; className: string }[] = [];
        if (['pending', 'confirmed'].includes(order.status)) {
            actions.push({ action: 'cancel', label: 'Hủy', icon: '✕', className: 'text-red-500 hover:bg-red-50 border-red-200' });
        }
        if (order.status === 'shipping') {
            actions.push({ action: 'failed', label: 'Thất bại', icon: '✕', className: 'text-red-500 hover:bg-red-50 border-red-200' });
        }
        return actions;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 p-4 lg:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <span className="text-2xl">🛒</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Quản lý Yêu cầu nhập</h1>
                        <p className="text-slate-500 text-sm">Theo dõi và xử lý các yêu cầu nhập hàng</p>
                    </div>
                </div>
                <button onClick={fetchOrders}
                    className="group flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 rounded-xl hover:bg-emerald-50 text-sm font-medium border border-slate-200 transition-all hover:border-emerald-300 shadow-sm">
                    <span className="group-hover:animate-spin inline-block">🔄</span> Làm mới
                </button>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-thin">
                {statusTabs.map(tab => {
                    const isActive = statusFilter === tab.value;
                    const tabConfig = tab.value ? STATUS_CONFIG[tab.value] : null;
                    return (
                        <button key={tab.value} onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 border
                                ${isActive
                                    ? 'text-white shadow-lg border-transparent'
                                    : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-slate-200'
                                }`}
                            style={isActive ? {
                                background: tabConfig ? tabConfig.color : '#10b981',
                                boxShadow: `0 4px 15px ${tabConfig ? tabConfig.color : '#10b981'}33`,
                            } : {}}>
                            <span className="text-base">{tab.icon}</span> {tab.label}
                        </button>
                    );
                })}
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 mb-4">{error}</div>}

            {loading ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative w-12 h-12 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-200"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-slate-500 text-sm">Đang tải yêu cầu...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-6xl mb-4 opacity-50">📭</div>
                    <p className="text-slate-600 font-medium">Không có yêu cầu nào</p>
                    <p className="text-slate-400 text-sm mt-1">Thử thay đổi bộ lọc trạng thái</p>
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
                                className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md
                                    ${isExpanded
                                        ? `bg-white ${config.borderLight} shadow-md`
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}>
                                {/*test*/}
                                {/* Status accent line on left */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-300"
                                    style={{ backgroundColor: config.color, opacity: isExpanded ? 1 : 0.5 }} />

                                {/* Main row */}
                                <div className="pl-5 pr-4 py-4 cursor-pointer" onClick={() => handleViewDetail(order.id)}>
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Left: Order info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                                    Yêu cầu số #{order.id}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase border ${config.borderLight}`}
                                                    style={{ color: config.color, backgroundColor: `${config.color}10` }}>
                                                    {config.icon} {config.label}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                                                    style={{ color: payInfo.color, backgroundColor: payInfo.bg }}>
                                                    {payInfo.text}
                                                </span>
                                            </div>
                                            <div className="mt-2.5 flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs text-white font-bold">
                                                        {order.shipping_name === '-' ? 'N' : (order.shipping_name?.charAt(0)?.toUpperCase() || '?')}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">{order.shipping_name === '-' ? 'Xuất trực tiếp' : order.shipping_name}</p>
                                                        <p className="text-xs text-slate-400">{order.shipping_phone === '-' ? 'Nội bộ' : order.shipping_phone}</p>
                                                    </div>
                                                </div>
                                                {order.user_email && (
                                                    <span className="text-xs text-slate-400 hidden md:inline">📧 {order.user_email}</span>
                                                )}
                                            </div>
                                            {/* Progress stepper */}
                                            <OrderStepper status={order.status} />
                                        </div>

                                        {/* Right: Price + Actions */}
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <p className="text-lg font-bold text-emerald-600">
                                                {formatCurrency(order.total_amount)}
                                            </p>
                                            <span className="text-[11px] text-slate-400">{formatDate(order.created_at)}</span>

                                            {/* Action buttons */}
                                            <div className="flex items-center gap-1.5 mt-1">
                                                {order.status === 'confirmed' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCreateExportSlip(order.id); }}
                                                        disabled={exportLoading === order.id || actionLoading !== ''}
                                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                                    >
                                                        {exportLoading === order.id ? <span className="inline-block animate-spin">⏳</span> : <>📝 Tạo phiếu xuất</>}
                                                    </button>
                                                )}
                                                {nextAction && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAction(order.id, nextAction.action); }}
                                                        disabled={actionLoading === `${order.id}-${nextAction.action}`}
                                                        className={`px-3.5 py-1.5 ${nextAction.className} text-white rounded-lg text-xs font-semibold shadow-lg
                                                            transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100`}
                                                    >
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
                                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border
                                                            ${sa.className} disabled:opacity-50 bg-white`}
                                                        title={sa.label}
                                                    >
                                                        {sa.icon} {sa.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && selectedOrder && (
                                    <div className="border-t border-slate-100 bg-slate-50/50">
                                        {detailLoading ? (
                                            <div className="text-center py-8 text-slate-400">
                                                <span className="inline-block animate-spin text-lg">⏳</span>
                                                <p className="text-sm mt-2">Đang tải chi tiết...</p>
                                            </div>
                                        ) : (
                                            <div className="p-5">
                                                {/* Info grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                                                    <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
                                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">📍 Địa chỉ / Phòng ban</p>
                                                        <p className="text-sm text-slate-700 leading-relaxed">{selectedOrder.shipping_address === '-' ? 'Nội bộ' : selectedOrder.shipping_address}</p>
                                                    </div>
                                                    <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
                                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">💳 Thanh toán</p>
                                                        <p className="text-sm text-slate-700">{orderService.getPaymentMethodText(selectedOrder.payment_method)}</p>
                                                    </div>
                                                    {selectedOrder.notes && (
                                                        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
                                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">📝 Ghi chú</p>
                                                            <p className="text-sm text-slate-700 italic">{selectedOrder.notes}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Products */}
                                                <div>
                                                    <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3 flex items-center gap-2">
                                                        <span className="w-5 h-0.5 bg-emerald-400 rounded-full"></span>
                                                        Hàng hóa ({selectedOrder.items.length})
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {selectedOrder.items.map(item => (
                                                            <div key={item.id} className="flex items-center justify-between bg-white hover:bg-emerald-50/30 p-3 rounded-xl border border-slate-100 transition-colors shadow-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center border border-emerald-200">
                                                                        <span className="text-xs">📦</span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-slate-800">{item.product_name}</p>
                                                                        {item.variant_sku && <p className="text-[11px] text-slate-400 font-mono">SKU: {item.variant_sku}</p>}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xs text-slate-500">×{item.quantity}</p>
                                                                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(item.unit_price * item.quantity)}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Total */}
                                                    <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                                                        <span className="text-sm text-slate-500 font-medium">Tổng cộng</span>
                                                        <span className="text-lg font-bold text-emerald-600">
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
                                className="px-4 py-2.5 rounded-xl bg-white text-slate-600 text-sm disabled:opacity-30 hover:bg-emerald-50 border border-slate-200 transition-all hover:border-emerald-300 shadow-sm">
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
                                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                                    : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                                                }`}>
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                className="px-4 py-2.5 rounded-xl bg-white text-slate-600 text-sm disabled:opacity-30 hover:bg-emerald-50 border border-slate-200 transition-all hover:border-emerald-300 shadow-sm">
                                Tiếp →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StaffDonHang;
