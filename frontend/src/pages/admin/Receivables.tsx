import React, { useState, useEffect } from 'react';
import { receivableService, Receivable, ReceivableSummary } from '../../services/receivableService';
import { Modal } from '../../components/Modal';

const Receivables: React.FC = () => {
    const [receivables, setReceivables] = useState<Receivable[]>([]);
    const [summary, setSummary] = useState<ReceivableSummary | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Pagination & Filter
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterStatus, setFilterStatus] = useState('');

    // Modal Details
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [detailData, setDetailData] = useState<Receivable | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Modal Create Receipt
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [receiptForm, setReceiptForm] = useState({
        amount: '',
        payment_method: 'cash',
        bank_name: '',
        bank_account: '',
        bank_reference: '',
        notes: '',
        debtor_email: ''
    });

    useEffect(() => {
        loadData();
    }, [page, filterStatus]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsData, listData] = await Promise.all([
                receivableService.getSummary(),
                receivableService.getAll({ page, limit: 10, status: filterStatus })
            ]);
            setSummary(statsData);
            setReceivables(listData.data);
            setTotalPages(listData.pagination.totalPages);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu công nợ:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (id: number) => {
        setSelectedId(id);
        try {
            const data = await receivableService.getById(id);
            setDetailData(data);
            setIsDetailModalOpen(true);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId) return;
        try {
            await receivableService.createPaymentReceipt({
                receivable_id: selectedId,
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
            loadData();
            handleViewDetail(selectedId); // Refresh details
        } catch (error: any) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleApproveReceipt = async (receiptId: number) => {
        if (!confirm('Duyệt phiếu thu này?')) return;
        try {
            await receivableService.approvePaymentReceipt(receiptId);
            alert('Đã duyệt phiếu thu');
            loadData();
            if (selectedId) handleViewDetail(selectedId);
        } catch (error: any) {
             alert(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleRejectReceipt = async (receiptId: number) => {
        const reason = prompt('Lý do từ chối:');
        if (!reason) return;
        try {
            await receivableService.rejectPaymentReceipt(receiptId, reason);
            alert('Đã từ chối phiếu thu');
            loadData();
            if (selectedId) handleViewDetail(selectedId);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleSendReminder = async (id: number) => {
        const defaultEmail = detailData?.debtor_email || detailData?.user_email_account || '';
        const email = prompt('Hệ thống sẽ gửi Email nhắc nợ (Sắp đến hạn / Quá hạn) đến Khách hàng.\nVui lòng xác nhận hoặc nhập địa chỉ Email nhận:', defaultEmail);
        
        if (email === null) return; // User cancelled
        if (!email.trim()) {
            alert('Vui lòng cung cấp địa chỉ Email để gửi nhắc nợ!');
            return;
        }

        try {
            const res = await receivableService.sendReminder(id, email.trim());
            
            // Update local state so it doesn't need a reload
            if (detailData && detailData.id === id) {
                setDetailData({...detailData, debtor_email: email.trim()});
            }
            
            alert(res.message || 'Đã gửi Email Nhắc Nợ thành công!');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi gửi Email Nhắc Nợ');
        }
    };

    const formatMoney = (amount: string | number) => {
        return new Intl.NumberFormat('vi-VN').format(Number(amount));
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Quản lý Công Nợ</h1>
                <p className="text-slate-600 mt-1">Theo dõi các khoản phải thu từ phiếu xuất, đơn hàng</p>
            </div>

            {/* Stats Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="text-slate-500 text-sm font-medium mb-1">Tổng nợ phải thu</div>
                        <div className="text-2xl font-bold text-slate-800">{formatMoney(summary.total_amount)} đ</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="text-slate-500 text-sm font-medium mb-1">Đã thu</div>
                        <div className="text-2xl font-bold text-emerald-600">{formatMoney(summary.total_paid)} đ</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="text-slate-500 text-sm font-medium mb-1">Còn lại</div>
                        <div className="text-2xl font-bold text-blue-600">{formatMoney(summary.total_remaining)} đ</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-red-200 bg-red-50 p-4 cursor-pointer hover:bg-red-100 transition" onClick={() => setFilterStatus('overdue')}>
                        <div className="text-red-500 text-sm font-medium mb-1">Quá hạn ({summary.total_overdue})</div>
                        <div className="text-2xl font-bold text-red-600">{formatMoney(summary.overdue_amount)} đ</div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
                    <div className="flex gap-2">
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="input !py-1.5 !text-sm w-[150px]"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="unpaid">Chưa thu</option>
                            <option value="partial">Thu một phần</option>
                            <option value="paid">Đã thu đủ</option>
                            <option value="overdue">Quá hạn</option>
                            <option value="bad_debt">Nợ xấu</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Mã CN / Ngày</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Khách hàng</th>
                                    <th className="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-3">Ghi nhận</th>
                                    <th className="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-3">Còn nợ</th>
                                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Trạng thái</th>
                                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {receivables.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-500">
                                            Không có dữ liệu công nợ
                                        </td>
                                    </tr>
                                ) : (
                                    receivables.map(item => {
                                        const statusInfo = receivableService.getStatusInfo(item.status);
                                        const isDueSoon = item.status === 'unpaid' && item.due_date && 
                                            new Date(item.due_date).getTime() < Date.now() + 3 * 24 * 60 * 60 * 1000;
                                        
                                        return (
                                            <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-800">{item.receivable_number}</div>
                                                    <div className="text-xs text-slate-500">
                                                        P/S: {new Date(item.issue_date).toLocaleDateString('vi-VN')}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-800 line-clamp-1">{item.debtor_name}</div>
                                                    <div className="text-xs text-slate-500">{item.source_number || '(N/A)'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="font-bold text-slate-800">{formatMoney(item.total_amount)}đ</div>
                                                    <div className="text-xs text-emerald-600">Đã thu: {formatMoney(item.paid_amount)}đ</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className={`font-bold ${parseFloat(item.total_amount) - parseFloat(item.paid_amount) > 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                                        {formatMoney(parseFloat(item.total_amount) - parseFloat(item.paid_amount))}đ
                                                    </div>
                                                    {isDueSoon && <div className="text-[10px] text-orange-500 mt-1 font-medium bg-orange-100 rounded px-1 inline-block">Sắp đến hạn</div>}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span 
                                                        className="px-2 py-1 text-xs font-medium rounded-full"
                                                        style={{ color: statusInfo.color, backgroundColor: statusInfo.bg }}
                                                    >
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button 
                                                        onClick={() => handleViewDetail(item.id)}
                                                        className="btn btn-secondary !py-1 !text-xs"
                                                    >
                                                        Chi tiết
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex justify-center gap-2">
                        <button 
                            disabled={page === 1} 
                            onClick={() => setPage(1)}
                            className="px-3 py-1 bg-slate-100 rounded text-slate-600 disabled:opacity-50"
                        >
                            &laquo;
                        </button>
                        <button 
                            disabled={page === 1} 
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1 bg-slate-100 rounded text-slate-600 disabled:opacity-50"
                        >
                            &lsaquo;
                        </button>
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 font-medium rounded">
                            {page} / {totalPages}
                        </span>
                        <button 
                            disabled={page === totalPages} 
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 bg-slate-100 rounded text-slate-600 disabled:opacity-50"
                        >
                            &rsaquo;
                        </button>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Chi tiết Công nợ">
                {detailData && (
                    <div className="space-y-6">
                        {/* Summary Box */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-4 border-b border-slate-200 pb-3">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{detailData.receivable_number}</h3>
                                    <div className="text-sm text-slate-500 mt-1">Từ: {detailData.source_type === 'export_receipt' ? 'Phiếu xuất' : 'Đơn hàng'} {detailData.source_number}</div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span 
                                        className="px-3 py-1 text-sm font-medium rounded-full"
                                        style={{ 
                                            color: receivableService.getStatusInfo(detailData.status).color, 
                                            backgroundColor: receivableService.getStatusInfo(detailData.status).bg 
                                        }}
                                    >
                                        {receivableService.getStatusInfo(detailData.status).label}
                                    </span>
                                    {['unpaid', 'partial', 'overdue'].includes(detailData.status) && (
                                        <button 
                                            onClick={() => handleSendReminder(detailData.id)}
                                            className="text-xs text-orange-600 hover:text-orange-700 font-medium underline"
                                        >
                                            🔔 Gửi Nhắc Nợ
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                                <div>
                                    <span className="text-slate-500">Khách hàng:</span>
                                    <p className="font-medium text-slate-800">{detailData.debtor_name}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Số điện thoại:</span>
                                    <p className="font-medium text-slate-800">{detailData.debtor_phone || '---'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Tổng phát sinh:</span>
                                    <p className="font-bold text-blue-600">{formatMoney(detailData.total_amount)} đ</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Còn nợ:</span>
                                    <p className="font-bold text-red-500">{formatMoney(parseFloat(detailData.total_amount) - parseFloat(detailData.paid_amount))} đ</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-slate-800">Lịch sử thu tiền</h4>
                                {['unpaid', 'partial', 'overdue'].includes(detailData.status) && (
                                    <button 
                                        onClick={() => setIsReceiptModalOpen(true)}
                                        className="btn btn-primary !py-1.5 !text-xs"
                                    >
                                        + Lập phiếu thu
                                    </button>
                                )}
                            </div>
                            
                            {detailData.payment_history?.length === 0 ? (
                                <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded border border-slate-100">Chưa có phiếu thu nào</p>
                            ) : (
                                <div className="space-y-3">
                                    {detailData.payment_history?.map(receipt => (
                                        <div key={receipt.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition">
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
                                                    <div>Ngày TT: {new Date(receipt.payment_date).toLocaleDateString('vi-VN')}</div>
                                                    <div>HT: {receivableService.getPaymentMethodLabel(receipt.payment_method)}</div>
                                                    {receipt.status === 'pending' && <div className="text-orange-500 mt-1 italic">Vui lòng duyệt phiếu này để cập nhật công nợ</div>}
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-emerald-600 mb-2">+{formatMoney(receipt.amount)}đ</div>
                                                    {receipt.status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleRejectReceipt(receipt.id)}
                                                                className="btn btn-secondary border-red-200 text-red-500 hover:bg-red-50 !py-1 !text-xs"
                                                            >Từ chối</button>
                                                            <button 
                                                                onClick={() => handleApproveReceipt(receipt.id)}
                                                                className="btn btn-primary !py-1 !text-xs"
                                                            >Duyệt</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                                // Chỉ cho phép nhập số
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
                        <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg bg-slate-50 border-slate-200">
                             <div>
                                <label className="label text-xs">Ngân hàng</label>
                                <input type="text" className="input !py-1.5" value={receiptForm.bank_name} onChange={e => setReceiptForm({...receiptForm, bank_name: e.target.value})} />
                            </div>
                            <div>
                                <label className="label text-xs">Mã GD / Nội dung</label>
                                <input type="text" className="input !py-1.5" value={receiptForm.bank_reference} onChange={e => setReceiptForm({...receiptForm, bank_reference: e.target.value})} />
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="label">Ghi chú</label>
                        <textarea 
                            className="input min-h-[80px]"
                            value={receiptForm.notes}
                            onChange={(e) => setReceiptForm({...receiptForm, notes: e.target.value})}
                        />
                    </div>
                    
                    <div>
                        <label className="label text-indigo-700">Email nhận biên lai (Không bắt buộc)</label>
                        <input 
                            type="email" 
                            className="input"
                            value={receiptForm.debtor_email}
                            onChange={(e) => setReceiptForm({...receiptForm, debtor_email: e.target.value})}
                            placeholder="Khách sẽ nhận được email xác nhận tự động..."
                        />
                        <p className="text-xs text-slate-500 mt-1">Dùng để tự động gửi Biên lai thanh toán sau khi phiếu này được duyệt.</p>
                    </div>
                    
                    <div className="flex gap-3 justify-end pt-4">
                        <button type="button" className="btn btn-secondary" onClick={() => setIsReceiptModalOpen(false)}>Hủy</button>
                        <button type="submit" className="btn btn-primary">Tạo phiếu</button>
                    </div>
                 </form>
            </Modal>
        </div>
    );
};

export default Receivables;
