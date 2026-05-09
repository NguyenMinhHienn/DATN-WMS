import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Modal } from './Modal';
import { receivableService, Receivable } from '../services/receivableService';
import { auditService, FinancialAuditLog } from '../services/auditService';
import AuditTimeline from './AuditTimeline';

interface ReceivableDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    receivableId: number | null;
    onReceiptAction?: () => void; // Callback when a receipt is approved/rejected/created
}

export const ReceivableDetailModal: React.FC<ReceivableDetailModalProps> = ({ 
    isOpen, 
    onClose, 
    receivableId,
    onReceiptAction
}) => {
    const [detailData, setDetailData] = useState<Receivable | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    
    // Receipt Modal (moved from parent to handle creating receipts locally if needed, 
    // but for simplicity we can just trigger a prop or handle it here)
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [receiptForm, setReceiptForm] = useState({
        amount: '', payment_method: 'cash', bank_name: '', bank_account: '', bank_reference: '', notes: '', debtor_email: ''
    });
    const [confirmChecked, setConfirmChecked] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Phieu_No_${detailData?.receivable_number || ''}`,
    });

    useEffect(() => {
        if (isOpen && receivableId) {
            loadDetail(receivableId);
            setActiveTab('overview');
        } else {
            setDetailData(null);
            setAuditLogs([]);
        }
    }, [isOpen, receivableId]);

    const loadDetail = async (id: number) => {
        try {
            const data = await receivableService.getById(id);
            // In API it might already have payment_history or we fetch it
            setDetailData(data);
            if (activeTab === 'audit') {
                loadAuditLogs('receivable', id);
            }
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Không thể tải chi tiết công nợ.');
        }
    };

    const loadAuditLogs = async (type: string, id: number) => {
        setAuditLoading(true);
        try {
            const logs = await auditService.getHistory(type, id);
            setAuditLogs(logs);
        } catch (error) {
            console.error('Lỗi khi tải nhật ký:', error);
        } finally {
            setAuditLoading(false);
        }
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        if (tab === 'audit' && receivableId) {
            loadAuditLogs('receivable', receivableId);
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!receivableId || isSubmitting) return;
        if (!confirmChecked) {
            alert('Vui lòng xác nhận chịu trách nhiệm.');
            return;
        }
        setIsSubmitting(true);
        try {
            await receivableService.createPaymentReceipt({
                receivable_id: receivableId,
                amount: parseFloat(receiptForm.amount.replace(/,/g, '')),
                payment_method: receiptForm.payment_method,
                payment_date: new Date().toISOString().split('T')[0],
                bank_name: receiptForm.bank_name,
                bank_account: receiptForm.bank_account,
                bank_reference: receiptForm.bank_reference,
                notes: receiptForm.notes,
                debtor_email: receiptForm.debtor_email
            });
            alert('Tạo phiếu thu thành công!');
            setIsReceiptModalOpen(false);
            setReceiptForm({ amount: '', payment_method: 'cash', bank_name: '', bank_account: '', bank_reference: '', notes: '', debtor_email: '' });
            setConfirmChecked(false);
            loadDetail(receivableId);
            if (onReceiptAction) onReceiptAction();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApproveReceipt = async (receiptId: number) => {
        if (!confirm('Duyệt phiếu thu này? Việc duyệt sẽ trừ công nợ ngay lập tức.')) return;
        try {
            await receivableService.approvePaymentReceipt(receiptId);
            alert('Đã duyệt phiếu thu');
            if (receivableId) loadDetail(receivableId);
            if (onReceiptAction) onReceiptAction();
        } catch (error: any) {
             alert(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleRejectReceipt = async (receiptId: number) => {
        const reason = prompt('Lý do từ chối phiếu thu:');
        if (!reason) return;
        try {
            await receivableService.rejectPaymentReceipt(receiptId, reason);
            alert('Đã từ chối phiếu thu');
            if (receivableId) loadDetail(receivableId);
            if (onReceiptAction) onReceiptAction();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleSendReminder = async () => {
        if (!detailData) return;
        const defaultEmail = detailData.debtor_email || detailData.user_email_account || '';
        const email = prompt('Nhập địa chỉ Email nhận:', defaultEmail);
        
        if (email === null) return;
        if (!email.trim()) {
            alert('Vui lòng cung cấp địa chỉ Email!');
            return;
        }

        try {
            const res = await receivableService.sendReminder(detailData.id, email.trim());
            setDetailData({...detailData, debtor_email: email.trim()});
            alert(res.message || 'Đã gửi Email Nhắc Nợ thành công!');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const formatMoney = (amount: string | number) => {
        return new Intl.NumberFormat('vi-VN').format(Number(amount));
    };

    if (!isOpen) return null;

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="📋 Chi tiết Công nợ (Phát sinh)" size="2xl">
                {detailData && (
                    <div className="flex flex-col h-full max-h-[75vh]" ref={printRef}>
                        {/* Tabs Header */}
                        <div className="flex border-b border-slate-200 mb-4 bg-slate-50/50 rounded-t-xl sticky top-0 z-10 p-1 gap-1 print:hidden">
                            {['overview', 'items', 'history', 'audit'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => handleTabChange(tab)}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                                        activeTab === tab 
                                            ? 'bg-white text-blue-900 shadow-sm border border-blue-100' 
                                            : 'text-slate-500 hover:text-blue-900 hover:bg-white/50'
                                    }`}
                                >
                                    {tab === 'overview' ? '📑 Tổng quan' : 
                                     tab === 'items' ? '📦 Sản phẩm' : 
                                     tab === 'history' ? '💰 Thanh toán' : '🕒 Lịch sử'}
                                </button>
                            ))}
                        </div>

                        <div className="overflow-y-auto pr-1">
                            {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-blue-100">
                                            <div>
                                                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Mã công nợ</div>
                                                <h3 className="text-xl font-bold text-blue-900">{detailData.receivable_number}</h3>
                                            </div>
                                            <span 
                                                className="px-4 py-1.5 text-xs font-bold rounded-full border shadow-sm"
                                                style={{ 
                                                    color: receivableService.getStatusInfo(detailData.status).color, 
                                                    backgroundColor: receivableService.getStatusInfo(detailData.status).bg,
                                                    borderColor: receivableService.getStatusInfo(detailData.status).color + '40'
                                                }}
                                            >
                                                {receivableService.getStatusInfo(detailData.status).label}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Đối tượng nợ</label>
                                                    <p className="font-bold text-slate-800 text-base">{detailData.debtor_name}</p>
                                                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                                        <span>📞</span> {detailData.debtor_phone || '---'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Địa chỉ</label>
                                                    <p className="text-sm text-slate-600 leading-relaxed">{detailData.debtor_address || '-- Chưa cập nhật --'}</p>
                                                </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 border border-blue-50 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-slate-500">Phát sinh:</span>
                                                    <span className="font-bold text-blue-900">{formatMoney(detailData.total_amount)} đ</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-slate-500 font-medium">Đã trả:</span>
                                                    <span className="font-bold text-emerald-600">{formatMoney(detailData.paid_amount)} đ</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                    <span className="text-sm font-bold text-slate-700">CÒN NỢ:</span>
                                                    <span className="text-lg font-bold text-red-500">{formatMoney(parseFloat(detailData.total_amount) - parseFloat(detailData.paid_amount))} đ</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">📜 Nguồn tham chiếu</h4>
                                            <p className="text-sm font-medium text-slate-800">
                                                {detailData.source_type === 'export_receipt' ? '📦 Phiếu xuất bán' : 
                                                 detailData.source_type === 'export_transfer' ? '🚚 Phiếu xuất chuyển kho' : 
                                                 '🛒 Đơn hàng'}
                                            </p>
                                            <p className="text-sm font-bold text-blue-600 mt-1">{detailData.source_number}</p>
                                            <p className="text-[10px] text-slate-400 mt-2 italic">Ngày phát sinh: {new Date(detailData.issue_date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">👤 Thông tin khởi tạo</h4>
                                            <p className="text-sm font-medium text-slate-800">{detailData.created_by_name || 'Hệ thống'}</p>
                                            <p className="text-sm text-slate-600 mt-1">
                                                🕒 {new Date(detailData.created_at).toLocaleString('vi-VN')}
                                            </p>
                                            {detailData.due_date && (
                                                <p className="text-[10px] text-red-500 font-bold mt-2 uppercase">
                                                    Hạn thanh toán: {new Date(detailData.due_date).toLocaleDateString('vi-VN')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {detailData.notes && (
                                        <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                                            <label className="text-[10px] font-bold text-amber-600 uppercase">Ghi chú</label>
                                            <p className="text-sm text-slate-700 mt-1 leading-relaxed italic">{detailData.notes}</p>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-2 print:hidden">
                                        {['unpaid', 'partial', 'overdue'].includes(detailData.status) && (
                                            <button 
                                                onClick={handleSendReminder}
                                                className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-xs font-bold transition-all border border-orange-200"
                                            >
                                                🔔 GỬI NHẮC NỢ (EMAIL)
                                            </button>
                                        )}
                                        <button onClick={handlePrint} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-xs font-bold transition-all border border-slate-200">
                                            🖨️ IN PHIẾU NỢ
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ITEMS TAB */}
                            {activeTab === 'items' && (
                                <div className="animate-fadeIn">
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 text-slate-600">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-bold border-b border-slate-200">Sản phẩm</th>
                                                    <th className="px-4 py-3 text-right font-bold border-b border-slate-200 w-24">SL</th>
                                                    <th className="px-4 py-3 text-right font-bold border-b border-slate-200 w-32">Đơn giá</th>
                                                    <th className="px-4 py-3 text-right font-bold border-b border-slate-200 w-32">Thành tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {detailData.items && detailData.items.length > 0 ? (
                                                    detailData.items.map((item: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <div className="font-bold text-slate-800 line-clamp-1">{item.product_name}</div>
                                                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">{item.sku}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-slate-700 font-bold">{item.quantity}</td>
                                                            <td className="px-4 py-3 text-right text-slate-600">{formatMoney(item.unit_cost)}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-blue-900">{formatMoney(item.line_total)}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="py-12 text-center text-slate-400 italic">
                                                            Không thể nạp thông tin chi tiết mặt hàng
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            {detailData.items && detailData.items.length > 0 && (
                                                <tfoot className="bg-blue-50/20 font-bold border-t border-blue-100 text-blue-900">
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-3 text-right uppercase text-xs tracking-wider">Cộng tiền hàng</td>
                                                        <td className="px-4 py-3 text-right text-base">{formatMoney(detailData.total_amount)} đ</td>
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic px-2">
                                        * Thông tin được chiết xuất tự động từ chứng từ gốc: {detailData.source_number}
                                    </p>
                                </div>
                            )}

                            {/* HISTORY TAB */}
                            {activeTab === 'history' && (
                                <div className="space-y-4 animate-fadeIn px-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Lịch sử giao dịch tiền</h4>
                                        {['unpaid', 'partial', 'overdue'].includes(detailData.status) && (
                                            <button 
                                                onClick={() => setIsReceiptModalOpen(true)}
                                                className="btn btn-primary !py-1.5 !px-3 !text-[10px] shadow-sm uppercase tracking-tighter"
                                            >
                                                + Lập phiếu thu
                                            </button>
                                        )}
                                    </div>
                                    
                                    {detailData.payment_history?.length === 0 ? (
                                        <div className="bg-slate-50 rounded-xl border border-slate-200 border-dashed py-12 flex flex-col items-center gap-3">
                                            <span className="text-4xl opacity-20">💸</span>
                                            <p className="text-sm text-slate-400 font-medium italic">Chưa phát sinh lượt thanh toán nào</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pb-4">
                                            {detailData.payment_history?.map(receipt => (
                                                <div key={receipt.id} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                                                    <div className="flex justify-between mb-3 border-b border-slate-50 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">🏧</span>
                                                            <div className="font-bold text-sm text-slate-800">{receipt.receipt_number}</div>
                                                        </div>
                                                        <span 
                                                            className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border shadow-sm"
                                                            style={{ 
                                                                color: receivableService.getReceiptStatusInfo(receipt.status).color, 
                                                                backgroundColor: receivableService.getReceiptStatusInfo(receipt.status).bg,
                                                                borderColor: receivableService.getReceiptStatusInfo(receipt.status).color + '30'
                                                            }}
                                                        >
                                                            {receivableService.getReceiptStatusInfo(receipt.status).label}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <div className="text-[11px] text-slate-500 space-y-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-400 w-16">Ngày TT:</span> 
                                                                <span className="font-bold text-slate-700">{new Date(receipt.payment_date).toLocaleDateString('vi-VN')}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-400 w-16">Hình thức:</span> 
                                                                <span className="font-medium px-2 py-0.5 bg-slate-100 rounded text-slate-600">{receivableService.getPaymentMethodLabel(receipt.payment_method)}</span>
                                                            </div>
                                                            {receipt.status === 'pending' && (
                                                                <div className="text-orange-500 mt-2 font-bold flex items-center gap-1 animate-pulse">
                                                                    ⚠️ CHỜ DUYỆT ĐỂ KHẤU TRỪ NỢ
                                                                </div>
                                                            )}
                                                            {receipt.status === 'approved' && receipt.created_by_name && receipt.created_by_name === receipt.approved_by_name && (
                                                                <div className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold mt-1 inline-flex items-center gap-1">
                                                                    ⚠️ Tự lập & duyệt
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Số tiền thu</div>
                                                            <div className="font-black text-xl text-emerald-600">+{formatMoney(receipt.amount)} đ</div>
                                                            {receipt.status === 'pending' && (
                                                                <div className="flex gap-2 justify-end mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button 
                                                                        onClick={() => handleRejectReceipt(receipt.id)}
                                                                        className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 border border-red-100 transition-colors"
                                                                        title="Từ chối"
                                                                    >✕</button>
                                                                    <button 
                                                                        onClick={() => handleApproveReceipt(receipt.id)}
                                                                        className="px-4 p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
                                                                    >DUYỆT NGAY</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AUDIT LOGS TAB */}
                            {activeTab === 'audit' && (
                                <div className="animate-fadeIn pb-6">
                                    <div className="mb-4">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nhật ký hệ thống</h4>
                                        <p className="text-[10px] text-slate-400 italic">Mọi thao tác thay đổi dữ liệu đều được ghi lại tự động</p>
                                    </div>
                                    <AuditTimeline logs={auditLogs} loading={auditLoading} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Create Receipt Modal */}
            <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Lập phiếu thu">
                 <form onSubmit={handleCreateReceipt} className="space-y-4">
                    <div>
                        <label className="label">Số tiền thu</label>
                        <input 
                            type="text" 
                            required
                            className="input text-lg font-bold"
                            value={receiptForm.amount}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val) {
                                    setReceiptForm({...receiptForm, amount: new Intl.NumberFormat('en-US').format(parseInt(val))});
                                } else {
                                    setReceiptForm({...receiptForm, amount: ''});
                                }
                            }}
                            placeholder="Nhập số tiền..."
                        />
                        <p className="text-xs text-slate-500 mt-1">Cần thu: {detailData && formatMoney(parseFloat(detailData.total_amount) - parseFloat(detailData.paid_amount))}đ</p>
                    </div>
                    <div>
                        <label className="label">Hình thức thanh toán</label>
                        <select 
                            className="input"
                            value={receiptForm.payment_method}
                            onChange={(e) => setReceiptForm({...receiptForm, payment_method: e.target.value})}
                        >
                            <option value="cash">Tiền mặt</option>
                            <option value="bank_transfer">Chuyển khoản</option>
                        </select>
                    </div>
                    {receiptForm.payment_method === 'bank_transfer' && (
                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <label className="label text-[10px] uppercase text-slate-500">Ngân hàng thụ hưởng</label>
                                <input type="text" className="input !py-1.5" placeholder="Ví dụ: MB Bank..." value={receiptForm.bank_name} onChange={(e) => setReceiptForm({...receiptForm, bank_name: e.target.value})} />
                            </div>
                            <div>
                                <label className="label text-[10px] uppercase text-slate-500">Mã giao dịch / Tham chiếu</label>
                                <input type="text" className="input !py-1.5" placeholder="Mã GD..." value={receiptForm.bank_reference} onChange={(e) => setReceiptForm({...receiptForm, bank_reference: e.target.value})} />
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="label">Ghi chú</label>
                        <textarea className="input" placeholder="Nội dung ghi chú..." value={receiptForm.notes} onChange={(e) => setReceiptForm({...receiptForm, notes: e.target.value})}></textarea>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mt-4">
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" className="mt-1 w-4 h-4 text-emerald-600 rounded" checked={confirmChecked} onChange={e => setConfirmChecked(e.target.checked)} />
                            <span className="text-sm font-medium text-amber-900">Tôi xác nhận số tiền thu là chính xác và chịu trách nhiệm với giao dịch này.</span>
                        </label>
                    </div>
                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                        <button type="button" className="btn btn-secondary" onClick={() => setIsReceiptModalOpen(false)}>Hủy</button>
                        <button type="submit" disabled={!confirmChecked || isSubmitting} className={`btn btn-primary shadow-lg ${(!confirmChecked || isSubmitting) && 'opacity-50'}`}>
                            {isSubmitting ? 'Đang xử lý...' : 'Tạo Phiếu Thu'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
};
