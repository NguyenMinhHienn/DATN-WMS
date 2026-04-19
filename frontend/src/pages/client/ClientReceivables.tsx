import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { receivableService, Receivable } from '../../services/receivableService';
import { Modal } from '../../components/Modal';
import { Link } from 'react-router-dom';

const ClientReceivables: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [receivables, setReceivables] = useState<Receivable[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [detailData, setDetailData] = useState<Receivable | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) return;
        loadData();
    }, [isAuthenticated]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await receivableService.getClientReceivables();
            setReceivables(data);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu công nợ:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (id: number) => {
        try {
            const data = await receivableService.getById(id);
            setDetailData(data);
            setIsDetailModalOpen(true);
        } catch (error) {
            console.error(error);
        }
    };

    const formatMoney = (amount: string | number) => {
        return new Intl.NumberFormat('vi-VN').format(Number(amount));
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Hero Header */}
            <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                </div>
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                            🧾
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                Công nợ của tôi
                            </h1>
                            <p className="text-indigo-100 mt-0.5 text-sm sm:text-base">Theo dõi lịch sử thanh toán và các khoản cần thanh toán</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10">
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : receivables.length === 0 ? (
                         <div className="text-center py-20">
                            <div className="w-24 h-24 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                                <span className="text-5xl">🎉</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Bạn không có khoản nợ nào</h2>
                            <p className="text-slate-400 max-w-sm mx-auto">
                                Tất cả các khoản phí đã được thanh toán đầy đủ.
                            </p>
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
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-500 text-center">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {receivables.map(item => {
                                        const statusInfo = receivableService.getStatusInfo(item.status);
                                        const remaining = parseFloat(item.total_amount) - parseFloat(item.paid_amount);
                                        
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{item.receivable_number}</div>
                                                    <div className="text-sm text-slate-500">Ngày: {new Date(item.issue_date).toLocaleDateString('vi-VN')}</div>
                                                    {item.source_type === 'order' && (
                                                         <Link to={`/orders/${item.source_id}`} className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                                                            Xem đơn hàng {item.source_number}
                                                         </Link>
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
                                                    <span 
                                                        className="px-3 py-1 font-medium text-xs rounded-full inline-block"
                                                        style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                                                    >
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={() => handleViewDetail(item.id)}
                                                        className="px-4 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium transition"
                                                    >
                                                        Xem
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Chi tiết Modal */}
             <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Chi tiết khoản thanh toán">
                {detailData && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-4 border-b border-slate-200 pb-3">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{detailData.receivable_number}</h3>
                                    <div className="text-sm text-slate-500 mt-1">Nguồn: {detailData.source_type === 'export_receipt' ? 'Phiếu xuất' : 'Đơn hàng'} {detailData.source_number}</div>
                                </div>
                                <span 
                                    className="px-3 py-1 text-sm font-medium rounded-full"
                                    style={{ 
                                        color: receivableService.getStatusInfo(detailData.status).color, 
                                        backgroundColor: receivableService.getStatusInfo(detailData.status).bg 
                                    }}
                                >
                                    {receivableService.getStatusInfo(detailData.status).label}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                                <div>
                                    <span className="text-slate-500">Tổng phải trả:</span>
                                    <p className="font-bold text-blue-600">{formatMoney(detailData.total_amount)} đ</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Còn nợ:</span>
                                    <p className="font-bold text-red-500">{formatMoney(parseFloat(detailData.total_amount) - parseFloat(detailData.paid_amount))} đ</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-800 mb-3">Lịch sử thanh toán</h4>
                            
                            {detailData.payment_history?.length === 0 ? (
                                <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded border border-slate-100">Chưa có giao dịch nào</p>
                            ) : (
                                <div className="space-y-3">
                                    {detailData.payment_history?.map(receipt => (
                                        <div key={receipt.id} className="border border-slate-200 rounded-lg p-3">
                                            <div className="flex justify-between mb-2">
                                                <div className="font-medium text-sm">{receipt.receipt_number}</div>
                                                <span 
                                                    className="px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                                                    style={{ 
                                                        color: receivableService.getReceiptStatusInfo(receipt.status).color, 
                                                        backgroundColor: receivableService.getReceiptStatusInfo(receipt.status).bg 
                                                    }}
                                                >
                                                    {receivableService.getReceiptStatusInfo(receipt.status).label}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="text-xs text-slate-500 space-y-1">
                                                    <div>Ngày: {new Date(receipt.payment_date).toLocaleDateString('vi-VN')}</div>
                                                    <div>Hình thức: {receivableService.getPaymentMethodLabel(receipt.payment_method)}</div>
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
        </div>
    );
};

export default ClientReceivables;
