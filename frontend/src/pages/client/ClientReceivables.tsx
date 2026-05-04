import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { receivableService, Receivable } from '../../services/receivableService';
import { creditService, CreditInfo } from '../../services/creditService';
import { Modal } from '../../components/Modal';
import { Link } from 'react-router-dom';

const ClientReceivables: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [receivables, setReceivables] = useState<Receivable[]>([]);
    const [loading, setLoading] = useState(true);
    const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
    const [creditLoading, setCreditLoading] = useState(true);
    const [error, setError] = useState('');

    const [detailData, setDetailData] = useState<Receivable | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Payment modal
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [payTarget, setPayTarget] = useState<Receivable | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payLoading, setPayLoading] = useState(false);
    const [payError, setPayError] = useState('');

    useEffect(() => {
        if (!isAuthenticated) return;
        loadAll();
    }, [isAuthenticated]);

    const loadAll = async () => {
        setCreditLoading(true);
        setLoading(true);
        setError('');
        try {
            const info = await creditService.getCreditInfo();
            setCreditInfo(info);
        } catch (err: any) {
            console.error('Credit info error:', err);
            setCreditInfo(null);
        } finally {
            setCreditLoading(false);
        }

        try {
            const data = await receivableService.getClientReceivables();
            setReceivables(data || []);
        } catch (err: any) {
            console.error('Receivables error:', err);
            setError(err?.response?.data?.message || 'Lỗi tải dữ liệu');
            setReceivables([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (id: number) => {
        try {
            const data = await receivableService.getClientReceivableById(id);
            setDetailData(data);
            setIsDetailModalOpen(true);
        } catch (err) { console.error(err); }
    };

    const handleOpenPayModal = (item: Receivable) => {
        const remaining = parseFloat(item.total_amount) - parseFloat(item.paid_amount);
        setPayTarget(item);
        setPayAmount(String(remaining));
        setPayError('');
        setIsPayModalOpen(true);
    };

    const handlePayOnline = async () => {
        if (!payTarget) return;
        const remaining = parseFloat(payTarget.total_amount) - parseFloat(payTarget.paid_amount);
        const amount = Number(payAmount);
        const minPayment = Math.ceil(remaining * 0.35);

        if (!amount || amount <= 0) { setPayError('Vui lòng nhập số tiền hợp lệ'); return; }
        if (amount < minPayment) { setPayError(`Tối thiểu ${formatMoney(minPayment)} (35%)`); return; }
        if (amount > remaining) { setPayError(`Tối đa ${formatMoney(remaining)}`); return; }

        setPayLoading(true);
        setPayError('');
        try {
            const result = await receivableService.createDebtPaymentLink(payTarget.id, amount);
            if (result.success && result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
            } else {
                setPayError(result.message || 'Không thể tạo link thanh toán');
            }
        } catch (err: any) {
            setPayError(err?.response?.data?.message || 'Lỗi tạo link thanh toán');
        } finally { setPayLoading(false); }
    };

    const formatMoney = (amount: string | number) => new Intl.NumberFormat('vi-VN').format(Number(amount));

    // Credit not registered/enabled
    const creditNotAvailable = !creditLoading && (!creditInfo || !creditInfo.is_registered);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                </div>
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl shadow-lg">💳</div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Thanh toán công nợ</h1>
                            <p className="text-indigo-100 mt-0.5 text-sm sm:text-base">Quản lý và thanh toán các khoản công nợ trực tuyến</p>
                        </div>
                    </div>
                    {creditInfo && creditInfo.is_registered && (
                        <div className="mt-4 flex gap-4 flex-wrap">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                                <p className="text-xs text-indigo-200">Hạn mức</p>
                                <p className="font-bold text-white">{formatMoney(creditInfo.credit_limit)}đ</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                                <p className="text-xs text-indigo-200">Đã dùng</p>
                                <p className="font-bold text-amber-300">{formatMoney(creditInfo.credit_used)}đ</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                                <p className="text-xs text-indigo-200">Còn lại</p>
                                <p className="font-bold text-emerald-300">{formatMoney(creditInfo.credit_available)}đ</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10">
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    {creditLoading || loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : creditNotAvailable ? (
                        /* Chưa mở công nợ */
                        <div className="text-center py-16 px-6">
                            <div className="w-20 h-20 mx-auto mb-4 bg-amber-50 rounded-full flex items-center justify-center">
                                <span className="text-4xl">🔒</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Tài khoản chưa kích hoạt công nợ</h2>
                            <p className="text-slate-500 max-w-md mx-auto mb-6">
                                Bạn cần đăng ký và được phê duyệt tính năng mua hàng công nợ trước khi sử dụng chức năng này.
                                Vui lòng liên hệ quản trị viên hoặc đăng ký qua trang cá nhân.
                            </p>
                            <div className="flex justify-center gap-3">
                                <Link to="/profile" className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 hover:shadow-xl transition">
                                    Đăng ký công nợ
                                </Link>
                                <Link to="/products" className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition">
                                    Tiếp tục mua sắm
                                </Link>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-16">
                            <span className="text-4xl block mb-3">⚠️</span>
                            <p className="text-red-500">{error}</p>
                            <button onClick={loadAll} className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm">Thử lại</button>
                        </div>
                    ) : receivables.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                                <span className="text-4xl">🎉</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Không có khoản nợ nào</h2>
                            <p className="text-slate-400 max-w-sm mx-auto">Tất cả đã được thanh toán đầy đủ.</p>
                            <Link to="/products" className="mt-6 inline-block px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-200">
                                Mua sắm tiếp
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-500">Mã CN / Đơn hàng</th>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-500 text-right">Tổng tiền</th>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-500 text-right">Còn nợ</th>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-500 text-center">Trạng thái</th>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-500 text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {receivables.map(item => {
                                        const statusInfo = receivableService.getStatusInfo(item.status);
                                        const remaining = parseFloat(item.total_amount) - parseFloat(item.paid_amount);
                                        const canPay = ['unpaid', 'partial', 'overdue'].includes(item.status) && remaining > 0;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{item.receivable_number}</div>
                                                    <div className="text-sm text-slate-500">Ngày: {new Date(item.issue_date).toLocaleDateString('vi-VN')}</div>
                                                    {item.due_date && (
                                                        <div className="text-xs text-amber-600">Hạn: {new Date(item.due_date).toLocaleDateString('vi-VN')}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-bold text-slate-800">{formatMoney(item.total_amount)}đ</div>
                                                    <div className="text-xs text-emerald-600">Đã thu: {formatMoney(item.paid_amount)}đ</div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-red-500">
                                                    {remaining > 0 ? `${formatMoney(remaining)}đ` : '---'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 font-medium text-xs rounded-full inline-block"
                                                        style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => handleViewDetail(item.id)}
                                                            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium transition">
                                                            Xem
                                                        </button>
                                                        {canPay && (
                                                            <button onClick={() => handleOpenPayModal(item)}
                                                                className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-semibold transition shadow-sm shadow-emerald-200">
                                                                💳 Thanh toán
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Chi tiết công nợ">
                {detailData && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-4 border-b border-slate-200 pb-3">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{detailData.receivable_number}</h3>
                                    <div className="text-sm text-slate-500 mt-1">Nguồn: {detailData.source_number}</div>
                                </div>
                                <span className="px-3 py-1 text-sm font-medium rounded-full"
                                    style={{ color: receivableService.getStatusInfo(detailData.status).color, backgroundColor: receivableService.getStatusInfo(detailData.status).bg }}>
                                    {receivableService.getStatusInfo(detailData.status).label}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                                <div><span className="text-slate-500">Tổng phải trả:</span><p className="font-bold text-blue-600">{formatMoney(detailData.total_amount)} đ</p></div>
                                <div><span className="text-slate-500">Còn nợ:</span><p className="font-bold text-red-500">{formatMoney(parseFloat(detailData.total_amount) - parseFloat(detailData.paid_amount))} đ</p></div>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 mb-3">Lịch sử thanh toán</h4>
                            {!detailData.payment_history?.length ? (
                                <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded border border-slate-100">Chưa có giao dịch nào</p>
                            ) : (
                                <div className="space-y-3">
                                    {detailData.payment_history.map(receipt => (
                                        <div key={receipt.id} className="border border-slate-200 rounded-lg p-3">
                                            <div className="flex justify-between mb-2">
                                                <div className="font-medium text-sm">{receipt.receipt_number}</div>
                                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                                                    style={{ color: receivableService.getReceiptStatusInfo(receipt.status).color, backgroundColor: receivableService.getReceiptStatusInfo(receipt.status).bg }}>
                                                    {receivableService.getReceiptStatusInfo(receipt.status).label}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="text-xs text-slate-500 space-y-1">
                                                    <div>Ngày: {new Date(receipt.payment_date).toLocaleDateString('vi-VN')}</div>
                                                    <div>Hình thức: {receivableService.getPaymentMethodLabel(receipt.payment_method)}</div>
                                                    {receipt.payment_method === 'online_payos' && (
                                                        <div className="text-emerald-600 font-medium">✅ Xác nhận tự động</div>
                                                    )}
                                                </div>
                                                <div className="font-bold text-emerald-600">+{formatMoney(receipt.amount)}đ</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Payment Modal */}
            <Modal isOpen={isPayModalOpen} onClose={() => { setIsPayModalOpen(false); setPayError(''); }} title="💳 Thanh toán công nợ online">
                {payTarget && (() => {
                    const remaining = parseFloat(payTarget.total_amount) - parseFloat(payTarget.paid_amount);
                    return (
                        <div className="space-y-5">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white">
                                <div className="flex justify-between items-start mb-3">
                                    <div><p className="text-xs text-slate-400">Mã công nợ</p><p className="text-lg font-bold">{payTarget.receivable_number}</p></div>
                                    <div className="text-right"><p className="text-xs text-slate-400">Hạn</p>
                                        <p className="text-sm font-semibold text-amber-400">{payTarget.due_date ? new Date(payTarget.due_date).toLocaleDateString('vi-VN') : 'Không giới hạn'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div><p className="text-xs text-slate-400">Tổng nợ</p><p className="font-bold text-blue-300">{formatMoney(payTarget.total_amount)}đ</p></div>
                                    <div><p className="text-xs text-slate-400">Đã trả</p><p className="font-bold text-emerald-400">{formatMoney(payTarget.paid_amount)}đ</p></div>
                                    <div><p className="text-xs text-slate-400">Còn lại</p><p className="font-bold text-red-400">{formatMoney(remaining)}đ</p></div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Số tiền thanh toán <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input type="number" value={payAmount} onChange={(e) => { setPayAmount(e.target.value); setPayError(''); }}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="Nhập số tiền..." min={1} />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">VNĐ</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Tối thiểu: {formatMoney(Math.ceil(remaining * 0.35))}đ (35%)</p>
                            </div>

                            <div className="flex gap-2">
                                {[0.35, 0.5, 0.75, 1].map(pct => {
                                    const val = Math.ceil(remaining * pct);
                                    return (
                                        <button key={pct} type="button" onClick={() => { setPayAmount(String(val)); setPayError(''); }}
                                            className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${Number(payAmount) === val ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                                            {pct === 1 ? '100%' : `${pct * 100}%`}
                                        </button>
                                    );
                                })}
                            </div>

                            {payError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">⚠️ {payError}</div>}

                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-600">
                                <p className="font-semibold mb-1">ℹ️ Thông tin</p>
                                <ul className="space-y-0.5">
                                    <li>• Bạn sẽ được chuyển đến cổng thanh toán PayOS</li>
                                    <li>• Phiếu thu sẽ tự động xác nhận sau khi thanh toán</li>
                                    <li>• Thông báo sẽ gửi cho nhân viên và quản trị viên</li>
                                </ul>
                            </div>

                            <button onClick={handlePayOnline} disabled={payLoading}
                                className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                {payLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Đang tạo link...
                                    </span>
                                ) : `💳 Thanh toán ${payAmount ? formatMoney(Number(payAmount)) + 'đ' : ''} qua PayOS`}
                            </button>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
};

export default ClientReceivables;
