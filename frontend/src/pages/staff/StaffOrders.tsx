import React, { useState, useEffect } from 'react';
import { orderService, OrderSummary, OrderDetail } from '../../services/orderService';
import { exportSlipService, ExportSlipSummary, ExportSlipFull } from '../../services/exportSlipService';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Staff Export Slips Page (replaces old StaffOrders)
 * Staff có thể:
 * 1. Xem đơn hàng đã duyệt (confirmed) → Tạo phiếu xuất kho
 * 2. Xem phiếu xuất kho mình đã tạo
 */
const StaffExportSlips: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'confirmed' | 'my-slips'>('confirmed');

    // Confirmed orders state
    const [confirmedOrders, setConfirmedOrders] = useState<OrderSummary[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [ordersPage, setOrdersPage] = useState(1);
    const [ordersTotalPages, setOrdersTotalPages] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [orderDetailLoading, setOrderDetailLoading] = useState(false);
    const [creatingSlip, setCreatingSlip] = useState<number | null>(null);

    // My export slips state
    const [mySlips, setMySlips] = useState<ExportSlipSummary[]>([]);
    const [slipsLoading, setSlipsLoading] = useState(true);
    const [slipsPage, setSlipsPage] = useState(1);
    const [slipsTotalPages, setSlipsTotalPages] = useState(1);
    const [selectedSlip, setSelectedSlip] = useState<ExportSlipFull | null>(null);
    const [slipDetailLoading, setSlipDetailLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'confirmed') fetchConfirmedOrders();
        else fetchMySlips();
    }, [activeTab, ordersPage, slipsPage]);

    const fetchConfirmedOrders = async () => {
        setOrdersLoading(true);
        try {
            const result = await orderService.getConfirmedOrders(ordersPage, 10);
            setConfirmedOrders(result.data);
            setOrdersTotalPages(result.pagination?.totalPages || 1);
        } catch (err) {
            console.error('Load confirmed orders error:', err);
        } finally {
            setOrdersLoading(false);
        }
    };

    const fetchMySlips = async () => {
        setSlipsLoading(true);
        try {
            const result = await exportSlipService.getMyExportSlips(slipsPage, 10);
            setMySlips(result.data);
            setSlipsTotalPages(result.pagination?.totalPages || 1);
        } catch (err) {
            console.error('Load my slips error:', err);
        } finally {
            setSlipsLoading(false);
        }
    };

    const handleViewOrderDetail = async (orderId: number) => {
        if (selectedOrder?.id === orderId) { setSelectedOrder(null); return; }
        setOrderDetailLoading(true);
        try {
            const detail = await orderService.getOrderById(orderId);
            setSelectedOrder(detail);
        } catch (err) {
            alert('Không thể tải chi tiết đơn hàng');
        } finally {
            setOrderDetailLoading(false);
        }
    };

    const handleCreateExportSlip = async (orderId: number) => {
        if (!window.confirm('Tạo phiếu xuất kho cho đơn hàng này?')) return;
        setCreatingSlip(orderId);
        try {
            await exportSlipService.createExportSlip(orderId);
            alert('✅ Tạo phiếu xuất kho thành công! Đang chờ admin duyệt.');
            fetchConfirmedOrders();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Tạo phiếu thất bại');
        } finally {
            setCreatingSlip(null);
        }
    };

    const handleViewSlipDetail = async (slipId: number) => {
        if (selectedSlip?.id === slipId) { setSelectedSlip(null); return; }
        setSlipDetailLoading(true);
        try {
            const detail = await exportSlipService.getExportSlipById(slipId);
            setSelectedSlip(detail);
        } catch (err) {
            alert('Không thể tải chi tiết phiếu');
        } finally {
            setSlipDetailLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <span className="text-2xl">📝</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Phiếu xuất kho</h1>
                        <p className="text-slate-500">Tạo phiếu xuất kho từ đơn đã duyệt & theo dõi phiếu đã tạo</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-3 mb-6">
                <button onClick={() => { setActiveTab('confirmed'); setOrdersPage(1); }}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all
                        ${activeTab === 'confirmed'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}>
                    <span>✅</span> Đơn đã duyệt
                </button>
                <button onClick={() => { setActiveTab('my-slips'); setSlipsPage(1); }}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all
                        ${activeTab === 'my-slips'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}>
                    <span>📋</span> Phiếu đã tạo
                </button>
            </div>

            {/* ========== TAB 1: CONFIRMED ORDERS ========== */}
            {activeTab === 'confirmed' && (
                <div>
                    {ordersLoading ? (
                        <div className="text-center py-16 bg-white rounded-2xl">
                            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-500">Đang tải đơn hàng...</p>
                        </div>
                    ) : confirmedOrders.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                            <div className="text-6xl mb-4">📭</div>
                            <p className="text-slate-600 font-medium">Chưa có đơn hàng nào đã duyệt</p>
                            <p className="text-slate-400 text-sm mt-1">Đơn hàng cần được admin duyệt trước khi tạo phiếu xuất kho</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {confirmedOrders.map(order => {
                                const isExpanded = selectedOrder?.id === order.id;
                                return (
                                    <div key={order.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all">
                                        <div className="p-4 cursor-pointer" onClick={() => handleViewOrderDetail(order.id)}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-mono font-bold text-emerald-600">Đơn #{order.id}</span>
                                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Đã duyệt</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={(e) => { e.stopPropagation(); handleCreateExportSlip(order.id); }}
                                                        disabled={creatingSlip === order.id}
                                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
                                                        {creatingSlip === order.id ? '⏳ Đang tạo...' : '📝 Tạo phiếu xuất kho'}
                                                    </button>
                                                    <span className="text-xs text-slate-500">{formatDate(order.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-slate-600">
                                                    <span className="font-medium text-slate-800">{order.shipping_name}</span>
                                                    <span className="mx-2">•</span>{order.shipping_phone}
                                                </p>
                                                <p className="text-lg font-bold text-emerald-600">{formatCurrency(order.total_amount)}</p>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 truncate">{order.shipping_address}</p>
                                        </div>

                                        {isExpanded && selectedOrder && (
                                            <div className="border-t border-slate-200 bg-slate-50 p-4">
                                                {orderDetailLoading ? (
                                                    <div className="text-center py-4"><span className="animate-spin">⏳</span> Đang tải...</div>
                                                ) : (
                                                    <>
                                                        <h4 className="font-semibold text-slate-700 mb-2 text-sm">📦 Sản phẩm cần xuất kho</h4>
                                                        <div className="space-y-2">
                                                            {selectedOrder.items.map(item => (
                                                                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100">
                                                                    <div>
                                                                        <p className="font-medium text-slate-800">{item.product_name}</p>
                                                                        {item.variant_sku && <p className="text-xs text-slate-500">SKU: {item.variant_sku}</p>}
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-sm font-semibold">x{item.quantity}</p>
                                                                        <p className="text-xs text-slate-500">{formatCurrency(item.unit_price)}/sp</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {ordersTotalPages > 1 && (
                                <div className="flex justify-center gap-2 pt-4">
                                    <button onClick={() => setOrdersPage(p => Math.max(1, p - 1))} disabled={ordersPage <= 1}
                                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm disabled:opacity-50 hover:bg-slate-100">← Trước</button>
                                    <span className="px-4 py-2 text-sm text-slate-600">Trang {ordersPage}/{ordersTotalPages}</span>
                                    <button onClick={() => setOrdersPage(p => Math.min(ordersTotalPages, p + 1))} disabled={ordersPage >= ordersTotalPages}
                                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm disabled:opacity-50 hover:bg-slate-100">Tiếp →</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ========== TAB 2: MY EXPORT SLIPS ========== */}
            {activeTab === 'my-slips' && (
                <div>
                    {slipsLoading ? (
                        <div className="text-center py-16 bg-white rounded-2xl">
                            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-500">Đang tải phiếu...</p>
                        </div>
                    ) : mySlips.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                            <div className="text-6xl mb-4">📝</div>
                            <p className="text-slate-600 font-medium">Chưa tạo phiếu xuất kho nào</p>
                            <p className="text-slate-400 text-sm mt-1">Chuyển sang tab "Đơn đã duyệt" để tạo phiếu</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {mySlips.map(slip => {
                                const statusInfo = exportSlipService.getStatusInfo(slip.status);
                                const isExpanded = selectedSlip?.id === slip.id;
                                return (
                                    <div key={slip.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all">
                                        <div className="p-4 cursor-pointer" onClick={() => handleViewSlipDetail(slip.id)}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-mono font-bold text-emerald-600">PXK #{slip.id}</span>
                                                    <span className="text-xs text-slate-500">→ Đơn #{slip.order_id}</span>
                                                    <span className="px-3 py-1 rounded-full text-xs font-semibold"
                                                        style={{ color: statusInfo.color, backgroundColor: statusInfo.bg }}>
                                                        {statusInfo.text}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-500">{formatDate(slip.created_at)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm text-slate-500">
                                                    {slip.approver_name && <span>✅ Duyệt bởi: <span className="font-medium text-slate-700">{slip.approver_name}</span></span>}
                                                </div>
                                                {slip.order_total && <p className="text-lg font-bold text-emerald-600">{formatCurrency(slip.order_total)}</p>}
                                            </div>
                                        </div>

                                        {isExpanded && selectedSlip && (
                                            <div className="border-t border-slate-200 bg-slate-50 p-4">
                                                {slipDetailLoading ? (
                                                    <div className="text-center py-4"><span className="animate-spin">⏳</span> Đang tải...</div>
                                                ) : (
                                                    <>
                                                        <h4 className="font-semibold text-slate-700 mb-2 text-sm">📦 Chi tiết phiếu</h4>
                                                        <div className="space-y-2">
                                                            {selectedSlip.details.map(item => (
                                                                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100">
                                                                    <div>
                                                                        <p className="font-medium text-slate-800">{item.product_name || `Product #${item.product_id}`}</p>
                                                                        {item.variant_sku && <p className="text-xs text-slate-500">SKU: {item.variant_sku}</p>}
                                                                    </div>
                                                                    <p className="text-sm font-semibold">x{item.quantity}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {selectedSlip.notes && <p className="mt-3 text-sm text-slate-400">📝 {selectedSlip.notes}</p>}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {slipsTotalPages > 1 && (
                                <div className="flex justify-center gap-2 pt-4">
                                    <button onClick={() => setSlipsPage(p => Math.max(1, p - 1))} disabled={slipsPage <= 1}
                                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm disabled:opacity-50 hover:bg-slate-100">← Trước</button>
                                    <span className="px-4 py-2 text-sm text-slate-600">Trang {slipsPage}/{slipsTotalPages}</span>
                                    <button onClick={() => setSlipsPage(p => Math.min(slipsTotalPages, p + 1))} disabled={slipsPage >= slipsTotalPages}
                                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm disabled:opacity-50 hover:bg-slate-100">Tiếp →</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StaffExportSlips;