import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderService, OrderSummary, OrderDetail } from '../../services/orderService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ExportTransferViewer from './ExportTransferViewer';

/**
 * Client Orders Page - Theo dõi trạng thái đơn hàng
 * Modern redesign with visual stepper & glassmorphism
 */

// Order progress steps (normal flow)
const ORDER_STEPS = [
    { key: 'pending', label: 'Tạo yêu cầu', icon: '📝', description: 'Yêu cầu đã được tạo' },
    { key: 'confirmed', label: 'Đã duyệt', icon: '✅', description: 'Quản lý đã duyệt' },
    { key: 'shipping', label: 'Đang xử lý', icon: '🚚', description: 'Kho đang vận chuyển' },
    { key: 'delivered', label: 'Hoàn thành', icon: '📦', description: 'Nhận hàng thành công' },
];

const getStepIndex = (status: string): number => {
    const idx = ORDER_STEPS.findIndex(s => s.key === status);
    return idx >= 0 ? idx : -1;
};

const isTerminalStatus = (status: string): boolean => {
    return status === 'cancelled' || status === 'failed';
};

const OrdersPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) { navigate('/login'); return; }
        fetchOrders();
    }, [isAuthenticated, statusFilter, page]);

    const fetchOrders = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await orderService.getClientOrders(page, 10, statusFilter || undefined);
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
            const detail = await orderService.getClientOrderById(orderId);
            setSelectedOrder(detail);
        } catch (err) {
            alert('Không thể tải chi tiết yêu cầu');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCancel = async (orderId: number) => {
        if (!window.confirm('Bạn có chắc muốn hủy yêu cầu này?')) return;
        setCancelling(true);
        try {
            await orderService.cancelOrder(orderId);
            alert('Đã hủy yêu cầu thành công');
            setSelectedOrder(null);
            fetchOrders();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Hủy yêu cầu thất bại');
        } finally {
            setCancelling(false);
        }
    };

    const statusTabs = [
        { value: '', label: 'Tất cả', icon: '📋', count: null },
        { value: 'pending', label: 'Chờ xử lý', icon: '⏳', count: null },
        { value: 'confirmed', label: 'Đã duyệt', icon: '✅', count: null },
        { value: 'shipping', label: 'Đang xử lý', icon: '🚚', count: null },
        { value: 'delivered', label: 'Hoàn thành', icon: '🎉', count: null },
        { value: 'failed', label: 'Thất bại', icon: '❌', count: null },
        { value: 'cancelled', label: 'Đã hủy', icon: '🚫', count: null },
    ];

    /** Progress Stepper Component */
    const OrderStepper: React.FC<{ status: string }> = ({ status }) => {
        if (isTerminalStatus(status)) {
            const isCancelled = status === 'cancelled';
            return (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${isCancelled ? 'bg-gray-100' : 'bg-red-50'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isCancelled ? 'bg-gray-200' : 'bg-red-100'}`}>
                        {isCancelled ? '🚫' : '❌'}
                    </div>
                    <div>
                        <p className={`font-semibold text-sm ${isCancelled ? 'text-gray-600' : 'text-red-600'}`}>
                            {isCancelled ? 'Yêu cầu đã bị hủy' : 'Xử lý thất bại'}
                        </p>
                        <p className="text-xs text-gray-400">
                            {isCancelled ? 'Yêu cầu không còn hiệu lực' : 'Đã có lỗi xảy ra'}
                        </p>
                    </div>
                </div>
            );
        }

        const currentIdx = getStepIndex(status);

        return (
            <div className="px-2 py-3">
                <div className="flex items-center justify-between relative">
                    {/* Connection line behind */}
                    <div className="absolute top-5 left-[10%] right-[10%] h-[3px] bg-gray-200 rounded-full z-0">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: currentIdx >= 0 ? `${(currentIdx / (ORDER_STEPS.length - 1)) * 100}%` : '0%' }}
                        />
                    </div>

                    {ORDER_STEPS.map((step, idx) => {
                        const isCompleted = currentIdx > idx;
                        const isCurrent = currentIdx === idx;
                        const isFuture = currentIdx < idx;

                        return (
                            <div key={step.key} className="flex flex-col items-center relative z-10" style={{ width: `${100 / ORDER_STEPS.length}%` }}>
                                {/* Circle */}
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center text-base shadow-sm transition-all duration-500
                                    ${isCompleted ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-200 shadow-md scale-100' : ''}
                                    ${isCurrent ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-blue-200 shadow-lg scale-110 ring-4 ring-blue-100 animate-pulse' : ''}
                                    ${isFuture ? 'bg-white border-2 border-gray-200 text-gray-400' : ''}
                                `}>
                                    {isCompleted ? '✓' : step.icon}
                                </div>
                                {/* Label */}
                                <p className={`text-[11px] font-medium mt-2 text-center leading-tight ${isCompleted ? 'text-emerald-600' : isCurrent ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                                    {step.label}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Hero Header */}
            <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 overflow-hidden">
                {/* Floating shapes */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                    <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white/5 rounded-full" />
                </div>
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                            📦
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                Yêu cầu nhập của tôi
                            </h1>
                            <p className="text-indigo-100 mt-0.5 text-sm sm:text-base">Theo dõi tiến trình và trạng thái các yêu cầu</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10">
                {/* Status Filter Tabs */}
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 p-2 mb-6">
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                        {statusTabs.map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200
                                    ${statusFilter === tab.value
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-200'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                    }`}
                            >
                                <span className="text-base">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 flex items-center gap-3 border border-red-100">
                        <span className="text-xl">⚠️</span>
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-20">
                        <div className="relative w-16 h-16 mx-auto mb-4">
                            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-slate-400 font-medium">Đang tải yêu cầu...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                            <span className="text-5xl">📭</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Không có yêu cầu nào</h2>
                        <p className="text-slate-400 max-w-sm mx-auto">
                            {statusFilter ? 'Không tìm thấy yêu cầu nào với trạng thái này.' : 'Bạn chưa có yêu cầu nhập kho. Hãy tạo ngay!'}
                        </p>
                        {!statusFilter && (
                            <button
                                onClick={() => navigate('/products')}
                                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all"
                            >
                                📦 Tạo yêu cầu ngay
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-5 pb-8">
                        {orders.map(order => {
                            const statusInfo = orderService.getStatusInfo(order.status);
                            const payInfo = orderService.getPaymentStatusInfo(order.payment_status);
                            const isExpanded = selectedOrder?.id === order.id;

                            return (
                                <div
                                    key={order.id}
                                    className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${isExpanded
                                        ? 'shadow-xl shadow-indigo-100/50 border-indigo-200 ring-1 ring-indigo-100'
                                        : 'shadow-sm shadow-slate-100 border-slate-100 hover:shadow-md hover:border-slate-200'
                                        }`}
                                >
                                    {/* Order Header Card */}
                                    <div
                                        className="p-5 cursor-pointer group"
                                        onClick={() => handleViewDetail(order.id)}
                                    >
                                        {/* Top row: Order ID + Status + Date */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                    #YC{String(order.id).padStart(4, '0')}
                                                </span>
                                                <span
                                                    className="px-3 py-1 rounded-full text-xs font-bold"
                                                    style={{ color: statusInfo.color, backgroundColor: statusInfo.bg }}
                                                >
                                                    {statusInfo.text}
                                                </span>
                                                <span
                                                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                                                    style={{ color: payInfo.color, backgroundColor: payInfo.bg }}
                                                >
                                                    {payInfo.text}
                                                </span>
                                                {order.payment_method === 'CREDIT' && (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-red-500 shadow-sm shadow-red-200">
                                                        Công nợ (Trả sau)
                                                    </span>
                                                )}
                                                  <ExportTransferViewer
                                                    orderId={order.id}            // ✅ ID đơn hàng
                                                    
                                                    userId={order.user_id}        // ✅ ID user tạo đơn
                                                    orderDate={order.created_at}  // ✅ Ngày tạo đơn
                                                    
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400">{formatDate(order.created_at)}</span>
                                                <svg
                                                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Visual Progress Stepper */}
                                        <OrderStepper status={order.status} />

                                        {/* Bottom row: Shipping info + Total */}
                                        <div className="flex items-end justify-between mt-4 pt-4 border-t border-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-lg">
                                                    👤
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-700">{order.shipping_name}</p>
                                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                                        <span>📱</span> {order.shipping_phone}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                 {order.payment_method === 'CREDIT' ? (
                                                     <p className="text-xs font-bold text-red-500 mb-0.5">Công nợ (Trả sau)</p>
                                                 ) : (
                                                     <p className="text-xs text-slate-400 mb-0.5">{orderService.getPaymentMethodText(order.payment_method)}</p>
                                                 )}
                                                 <p className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                                     {formatCurrency(Number(order.total_amount) + Number(order.vat_amount || 0) + Number(order.shipping_fee || 0))}
                                                 </p>
                                                 {(Number(order.vat_amount) > 0 || Number(order.shipping_fee) > 0) ? (
                                                     <p className="text-[10px] text-slate-400">
                                                         Hàng: {formatCurrency(order.total_amount)}
                                                         {Number(order.vat_amount) > 0 && ` + VAT: ${formatCurrency(order.vat_amount)}`}
                                                         {Number(order.shipping_fee) > 0 && ` + Ship: ${formatCurrency(order.shipping_fee)}`}
                                                     </p>
                                                 ) : (['confirmed','shipping','delivered'].includes(order.status) && order.payment_method === 'CREDIT') ? (
                                                     <p className="text-[10px] text-amber-500 font-medium">⚠️ Chưa gồm VAT + phí ship</p>
                                                 ) : null}
                                             </div>
                                        </div>
                                    </div>

                                    {/* Expanded Detail Panel */}
                                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        {isExpanded && selectedOrder && (
                                            <div className="border-t border-slate-100">
                                                {detailLoading ? (
                                                    <div className="text-center py-8">
                                                        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                        <p className="text-sm text-slate-400">Đang tải chi tiết...</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Shipping Address */}
                                                        <div className="px-5 pt-4 pb-3">
                                                            <div className="flex items-start gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                                                                <span className="text-xl mt-0.5">📍</span>
                                                                <div>
                                                                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Địa chỉ / Phòng ban</p>
                                                                    <p className="text-sm text-slate-700 leading-relaxed">{order.shipping_address}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Product Items */}
                                                        <div className="px-5 pb-4">
                                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Hàng hóa yêu cầu</p>
                                                            <div className="space-y-2.5">
                                                                {selectedOrder.items.map(item => {
                                                                    let variantLabel = '';
                                                                    if (item.variant_attributes) {
                                                                        try {
                                                                            const attrs = JSON.parse(item.variant_attributes);
                                                                            variantLabel = Object.values(attrs).join(', ');
                                                                        } catch { variantLabel = ''; }
                                                                    }

                                                                    return (
                                                                        <div key={item.id} className="flex items-center gap-4 bg-slate-50 rounded-xl p-3.5 group/item hover:bg-slate-100 transition-colors">
                                                                            {/* Product Image */}
                                                                            <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                                                                                {item.image_url ? (
                                                                                    <img
                                                                                        src={`http://localhost:3000${item.image_url}`}
                                                                                        alt={item.product_name}
                                                                                        className="w-full h-full object-cover"
                                                                                    />
                                                                                ) : (
                                                                                    <span className="text-2xl text-slate-300">📦</span>
                                                                                )}
                                                                            </div>
                                                                            {/* Product Info */}
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-semibold text-slate-800 truncate">{item.product_name}</p>
                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                    {item.variant_sku && (
                                                                                        <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded font-mono border border-slate-200">
                                                                                            {item.variant_sku}
                                                                                        </span>
                                                                                    )}
                                                                                    {variantLabel && (
                                                                                        <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                                                                                            {variantLabel}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            {/* Quantity & Price */}
                                                                            <div className="text-right flex-shrink-0">
                                                                                <p className="text-xs text-slate-400">×{item.quantity}</p>
                                                                                <p className="text-sm font-bold text-slate-700">{formatCurrency(item.unit_price * item.quantity)}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Order Summary */}
                                                        <div className="px-5 pb-4">
                                                             <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 text-white">
                                                                 <div className="space-y-2">
                                                                     {/* Subtotal row */}
                                                                     <div className="flex items-center justify-between text-sm">
                                                                         <span className="text-slate-400">Giá hàng ({selectedOrder.items.length} mặt hàng)</span>
                                                                         <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
                                                                     </div>

                                                                     {/* VAT row - chỉ hiện khi đã có phiếu xuất */}
                                                                     {Number(order.vat_amount) > 0 ? (
                                                                         <div className="flex items-center justify-between text-sm">
                                                                             <span className="text-slate-400">Thuế VAT</span>
                                                                             <span className="font-semibold text-amber-300">+{formatCurrency(order.vat_amount)}</span>
                                                                         </div>
                                                                     ) : ['confirmed','shipping','delivered'].includes(order.status) ? (
                                                                         <div className="flex items-center justify-between text-sm">
                                                                             <span className="text-slate-400">Thuế VAT</span>
                                                                             <span className="text-slate-500 text-xs italic">Xác định khi xuất kho</span>
                                                                         </div>
                                                                     ) : null}

                                                                     {/* Shipping row - chỉ hiện khi đã có phiếu xuất */}
                                                                     {Number(order.shipping_fee) > 0 ? (
                                                                         <div className="flex items-center justify-between text-sm">
                                                                             <span className="text-slate-400">Phí vận chuyển</span>
                                                                             <span className="font-semibold text-amber-300">+{formatCurrency(order.shipping_fee)}</span>
                                                                         </div>
                                                                     ) : ['confirmed','shipping','delivered'].includes(order.status) ? (
                                                                         <div className="flex items-center justify-between text-sm">
                                                                             <span className="text-slate-400">Phí vận chuyển</span>
                                                                             <span className="text-slate-500 text-xs italic">Xác định khi xuất kho</span>
                                                                         </div>
                                                                     ) : null}

                                                                     {/* Divider + Total */}
                                                                     <div className="border-t border-slate-600 pt-2 mt-2">
                                                                         <div className="flex items-center justify-between">
                                                                             <div>
                                                                                 <p className="text-xs text-slate-400 mb-0.5">
                                                                                     {Number(order.vat_amount) > 0 || Number(order.shipping_fee) > 0 ? 'Tổng cộng (đã gồm VAT + ship)' : 'Tổng tiền hàng'}
                                                                                 </p>
                                                                                 <p className="text-2xl font-extrabold">
                                                                                     {formatCurrency(Number(order.total_amount) + Number(order.vat_amount || 0) + Number(order.shipping_fee || 0))}
                                                                                 </p>
                                                                             </div>
                                                                             <div className="text-right">
                                                                                 <p className="text-xs text-slate-400 mb-1">Hình thức</p>
                                                                                 {order.payment_method === 'CREDIT' ? (
                                                                                     <p className="text-sm font-bold text-red-400">Công nợ (Trả sau)</p>
                                                                                 ) : (
                                                                                     <p className="text-sm font-medium text-indigo-300">
                                                                                         {orderService.getPaymentMethodText(order.payment_method)}
                                                                                     </p>
                                                                                 )}
                                                                             </div>
                                                                         </div>
                                                                     </div>

                                                                     {/* Cảnh báo CREDIT khi VAT+ship chưa xác định */}
                                                                     {order.payment_method === 'CREDIT' && !['delivered','failed','cancelled'].includes(order.status) && Number(order.vat_amount) === 0 && (
                                                                         <div className="mt-2 bg-amber-500/20 border border-amber-400/40 rounded-lg px-3 py-2">
                                                                             <p className="text-xs text-amber-300 font-medium">
                                                                                 ⚠️ Giá trên chưa bao gồm thuế VAT và phí vận chuyển. Tổng tiền công nợ thực tế sẽ được xác nhận sau khi nhân viên kho tạo phiếu xuất.
                                                                             </p>
                                                                         </div>
                                                                     )}
                                                                 </div>
                                                             </div>
                                                         </div>

                                                        {/* Notes */}
                                                        {order.notes && (
                                                            <div className="px-5 pb-4">
                                                                <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3.5 border border-amber-100">
                                                                    <span className="text-base">📝</span>
                                                                    <div>
                                                                        <p className="text-xs font-semibold text-amber-700 mb-0.5">Ghi chú</p>
                                                                        <p className="text-sm text-amber-800">{order.notes}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Cancel button */}
                                                        {order.status === 'pending' && (
                                                            <div className="px-5 pb-5">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleCancel(order.id); }}
                                                                    disabled={cancelling}
                                                                    className="w-full py-3 rounded-xl font-semibold text-sm transition-all
                                                                        bg-red-50 text-red-500 border border-red-100 
                                                                        hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-lg hover:shadow-red-100
                                                                        disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {cancelling ? (
                                                                        <span className="flex items-center justify-center gap-2">
                                                                            <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin"></div>
                                                                            Đang hủy...
                                                                        </span>
                                                                    ) : (
                                                                        '🚫 Hủy yêu cầu'
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 pt-6 pb-4">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all
                                        bg-white border border-slate-200 text-slate-600
                                        hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm
                                        disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    ← Trước
                                </button>
                                <div className="flex items-center gap-1.5">
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all
                                                    ${page === pageNum
                                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-200'
                                                        : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all
                                        bg-white border border-slate-200 text-slate-600
                                        hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm
                                        disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Tiếp →
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="flex justify-center">
                <Link to="/products" className="btn btn-primary px-8 py-3 text-lg">
                    📦 Xem thêm nhiều hàng hóa khác
                </Link>
            </div>
        </div>
    );
};

export default OrdersPage;