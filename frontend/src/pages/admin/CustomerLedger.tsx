import React, { useState, useEffect } from 'react';
import { receivableService, Receivable, ConsolidatedLedgerEntry, ReceivableSummary } from '../../services/receivableService';
import { Modal } from '../../components/Modal';

const CustomerLedger: React.FC = () => {
    const [ledger, setLedger] = useState<ConsolidatedLedgerEntry[]>([]);
    const [summary, setSummary] = useState<ReceivableSummary | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Pagination & Filter
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal Bulk Payment
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<ConsolidatedLedgerEntry | null>(null);
    const [bulkForm, setBulkForm] = useState({
        amount: '',
        payment_method: 'cash',
        bank_name: '',
        bank_account: '',
        bank_reference: '',
        notes: ''
    });
    const [confirmChecked, setConfirmChecked] = useState(false);

    // Detail history modal
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [customerHistory, setCustomerHistory] = useState<Receivable[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [page]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsData, ledgerData] = await Promise.all([
                receivableService.getSummary(),
                receivableService.getConsolidatedLedger({ page, limit: 10, search: searchTerm })
            ]);
            setSummary(statsData);
            setLedger(ledgerData.data);
            setTotalPages(ledgerData.pagination.totalPages);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu sổ nợ:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewHistory = async (customer: ConsolidatedLedgerEntry) => {
        setSelectedCustomer(customer);
        setIsDetailModalOpen(true);
        setHistoryLoading(true);
        try {
            // Lấy toàn bộ danh sách nợ (cả đã trả và chưa trả) của SĐT này
            const result = await receivableService.getAll({ 
                debtor_phone: customer.debtor_phone,
                limit: 100 // Lấy tối đa 100 bản ghi gần nhất
            });
            setCustomerHistory(result.data);
        } catch (error) {
            console.error('Lỗi tải lịch sử nợ:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const openBulkPayment = (customer: ConsolidatedLedgerEntry) => {
        setSelectedCustomer(customer);
        setBulkForm({
            amount: Math.round(customer.remaining_debt).toString(),
            payment_method: 'cash',
            bank_name: '',
            bank_account: '',
            bank_reference: '',
            notes: `Thu tiền nợ gộp khách hàng ${customer.debtor_name}`
        });
        setIsBulkModalOpen(true);
    };

    const handleProcessBulkPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) return;
        if (!confirmChecked) {
            alert('Vui lòng xác nhận chịu trách nhiệm cho giao dịch này.');
            return;
        }

        const amountNum = parseFloat(bulkForm.amount.replace(/,/g, ''));
        if (isNaN(amountNum) || amountNum <= 0) {
            alert('Số tiền không hợp lệ');
            return;
        }

        if (amountNum > selectedCustomer.remaining_debt) {
            alert(`Số tiền nhập (${formatMoney(amountNum)}đ) vượt quá tổng nợ (${formatMoney(selectedCustomer.remaining_debt)}đ)`);
            return;
        }

        try {
            await receivableService.createConsolidatedPayment({
                debtor_phone: selectedCustomer.debtor_phone,
                amount: amountNum,
                payment_method: bulkForm.payment_method,
                payment_date: new Date().toISOString().split('T')[0],
                bank_name: bulkForm.bank_name,
                bank_account: bulkForm.bank_account,
                bank_reference: bulkForm.bank_reference,
                notes: bulkForm.notes
            });
            
            alert('Thanh toán gộp và gạch nợ thành công!');
            setIsBulkModalOpen(false);
            setConfirmChecked(false);
            loadData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi xử lý thanh toán');
        }
    };

    const formatMoney = (amount: string | number) => {
        return new Intl.NumberFormat('vi-VN').format(Number(amount));
    };

    const handlePrintStatement = () => {
        window.print(); // Đơn giản là in toàn bộ trang hoặc modal
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="p-2 bg-blue-100 text-blue-600 rounded-xl">📘</span>
                        Sổ Nợ Khách Hàng
                    </h1>
                    <p className="text-slate-600 mt-1">Gộp & Theo dõi công nợ theo Khách hàng (Số điện thoại)</p>
                </div>
                <div className="flex gap-2">
                    <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="relative">
                        <input 
                            type="text" 
                            className="input !pl-10 !py-2.5 w-full md:w-[300px] border-blue-100 focus:border-blue-400"
                            placeholder="Tìm tên hoặc số điện thoại..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-3 top-2.5 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                    </form>
                    <button onClick={() => loadData()} className="btn btn-secondary !p-2.5" title="Tải lại">
                        🔄
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                   <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg p-5 text-white col-span-1 md:col-span-2">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-blue-100 text-xs font-bold uppercase tracking-wider">Tổng dư nợ toàn hệ thống</div>
                                <div className="text-3xl font-black">{formatMoney(summary.total_remaining)} đ</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">Đã thu hồi</div>
                        <div className="text-xl font-bold text-emerald-600 font-mono">{formatMoney(summary.total_paid)} đ</div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 border-l-4 border-l-red-500">
                        <div className="text-red-400 text-[10px] font-bold uppercase mb-1">Quá hạn (Cảnh báo)</div>
                        <div className="text-xl font-bold text-red-600 font-mono">{formatMoney(summary.overdue_amount)} đ</div>
                    </div>
                </div>
            )}

            {/* Main Ledger Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                         <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-slate-500 font-medium">Đang đối soát sổ nợ...</span>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50/80 border-b border-slate-200">
                                <tr>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-6 py-4 tracking-wider">Khách hàng</th>
                                    <th className="text-center text-xs font-bold text-slate-500 uppercase px-6 py-4 tracking-wider">Tình trạng</th>
                                    <th className="text-right text-xs font-bold text-slate-500 uppercase px-6 py-4 tracking-wider">Tổng nợ</th>
                                    <th className="text-right text-xs font-bold text-slate-500 uppercase px-6 py-4 tracking-wider">Đã trả</th>
                                    <th className="text-right text-xs font-bold text-slate-500 uppercase px-6 py-4 tracking-wider">CÒN LẠI</th>
                                    <th className="text-center text-xs font-bold text-slate-500 uppercase px-6 py-4 tracking-wider">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ledger.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center text-slate-300">
                                                <span className="text-6xl mb-4 opacity-20">😶‍🌫️</span>
                                                <p className="font-bold">Không có dữ liệu công nợ thỏa mãn</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    ledger.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => handleViewHistory(item)}
                                                    className="text-left group-hover:translate-x-1 transition-transform"
                                                >
                                                    <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                                                        {item.debtor_name}
                                                        <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100">Click xem chi tiết</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono mt-1">📞 {item.debtor_phone}</div>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                                        {item.total_slips} phiếu
                                                    </span>
                                                    {item.unpaid_slips > 0 && (
                                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-red-50 text-red-500 border border-red-100">
                                                            {item.unpaid_slips} chưa thanh tra
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-600">
                                                {formatMoney(item.total_debt)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-emerald-600">
                                                {formatMoney(item.total_paid)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`text-lg font-black ${item.remaining_debt > 0 ? 'text-red-500' : 'text-slate-300 line-through'}`}>
                                                    {formatMoney(item.remaining_debt)} đ
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleViewHistory(item)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                        title="Xem lịch sử nợ"
                                                    >
                                                        👁️
                                                    </button>
                                                    {item.remaining_debt > 0 && (
                                                        <button 
                                                            onClick={() => openBulkPayment(item)}
                                                            className="px-3 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200 transition-all hover:scale-105 active:scale-95"
                                                        >
                                                            💳 THU NỢ GỘP
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="text-xs text-slate-500 font-medium">Trang {page} trên {totalPages}</div>
                        <div className="flex gap-2">
                            <button 
                                disabled={page === 1} 
                                onClick={() => setPage(p => p - 1)}
                                className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            > ⬅ Quay lại </button>
                            <button 
                                disabled={page === totalPages} 
                                onClick={() => setPage(p => p + 1)}
                                className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            > Tiếp theo ➡ </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ==================== CUSTOMER DETAIL MODAL ==================== */}
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="📜 Bảng Kê Chi Tiết Nợ Khách Hàng">
                {selectedCustomer && (
                    <div className="flex flex-col gap-6 max-h-[80vh]">
                        {/* Header Section */}
                        <div className="flex justify-between items-start bg-slate-50 p-4 rounded-xl border border-slate-200">
                             <div>
                                <h3 className="text-xl font-black text-slate-800">{selectedCustomer.debtor_name}</h3>
                                <p className="text-sm text-slate-500 font-mono mt-1">📞 {selectedCustomer.debtor_phone}</p>
                                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">📍 {selectedCustomer.debtor_address || '-- Chưa có địa chỉ --'}</p>
                             </div>
                             <div className="text-right">
                                <div className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Dư nợ hiện tại</div>
                                <div className="text-2xl font-black text-red-600">{formatMoney(selectedCustomer.remaining_debt)}đ</div>
                                <div className="text-[10px] text-slate-400 mt-1 italic">Lần trả cuối: {selectedCustomer.last_payment_at ? new Date(selectedCustomer.last_payment_at).toLocaleDateString('vi-VN') : 'Chưa có'}</div>
                             </div>
                        </div>

                        {/* List of Slips */}
                        <div className="flex-1 overflow-y-auto">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Lịch sử các phiếu phát sinh</h4>
                            {historyLoading ? (
                                <div className="py-12 text-center text-slate-400 animate-pulse">Đang truy xuất lịch sử...</div>
                            ) : (
                                <table className="w-full text-sm border-collapse">
                                    <thead className="sticky top-0 bg-white border-b border-slate-200 font-bold text-slate-600">
                                        <tr>
                                            <th className="py-2 px-3 text-left">Mã phiếu</th>
                                            <th className="py-2 px-3 text-left">Ngày tạo</th>
                                            <th className="py-2 px-3 text-left">Người lập</th>
                                            <th className="py-2 px-3 text-right">Giá trị</th>
                                            <th className="py-2 px-3 text-right">Còn nợ</th>
                                            <th className="py-2 px-3 text-center">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {customerHistory.map(slip => (
                                            <tr key={slip.id} className="hover:bg-slate-50">
                                                <td className="py-3 px-3 font-bold text-blue-600">{slip.receivable_number}</td>
                                                <td className="py-3 px-3 text-slate-500 text-xs">{new Date(slip.issue_date).toLocaleDateString('vi-VN')}</td>
                                                <td className="py-3 px-3 text-slate-500 text-xs">{slip.created_by_name || 'Hệ thống'}</td>
                                                <td className="py-3 px-3 text-right font-medium">{formatMoney(slip.total_amount)}</td>
                                                <td className="py-3 px-3 text-right font-bold text-red-500">{formatMoney(parseFloat(slip.total_amount) - parseFloat(slip.paid_amount))}</td>
                                                <td className="py-3 px-3">
                                                    <div className="flex justify-center">
                                                        <span 
                                                            className="text-[10px] px-2 py-0.5 rounded font-bold uppercase border shadow-sm"
                                                            style={{ 
                                                                color: receivableService.getStatusInfo(slip.status).color, 
                                                                backgroundColor: receivableService.getStatusInfo(slip.status).bg,
                                                                borderColor: receivableService.getStatusInfo(slip.status).color + '30'
                                                            }}
                                                        >
                                                            {receivableService.getStatusInfo(slip.status).label}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-between items-center pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                            <button 
                                onClick={handlePrintStatement}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-bold text-xs transition-all flex items-center gap-2"
                            >
                                🖨️ TRÍCH XUẤT BẢNG KÊ (PDF)
                            </button>
                            <div className="flex gap-3">
                                <button className="btn btn-secondary" onClick={() => setIsDetailModalOpen(false)}>Đóng</button>
                                {selectedCustomer.remaining_debt > 0 && (
                                    <button 
                                        className="btn btn-primary shadow-lg shadow-blue-100"
                                        onClick={() => { setIsDetailModalOpen(false); openBulkPayment(selectedCustomer); }}
                                    >
                                        💳 THU TIỀN NGAY
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Bulk Payment Modal (FIFO Logic) */}
            <Modal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title="Lập Phiếu Thu Gộp (FIFO Strategy)">
                {selectedCustomer && (
                    <form onSubmit={handleProcessBulkPayment} className="space-y-5">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-2">
                             <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-blue-900">{selectedCustomer.debtor_name}</h4>
                                    <p className="text-sm text-blue-700">{selectedCustomer.debtor_phone}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-blue-600 uppercase font-bold tracking-wider">Tổng dư nợ</div>
                                    <div className="text-xl font-black text-blue-900">{formatMoney(selectedCustomer.remaining_debt)}đ</div>
                                </div>
                             </div>
                             <div className="mt-3 text-xs text-blue-600 italic border-t border-blue-200/50 pt-2">
                                * Hệ thống sẽ tự động phân bổ số tiền bạn nhập vào các phiếu nợ cũ nhất trước (FIFO).
                             </div>
                        </div>

                        <div>
                            <label className="label text-slate-700 font-bold">Số tiền khách trả hôm nay</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    required
                                    autoFocus
                                    className="input !text-2xl font-black !py-4 !pl-6 text-blue-600 border-2 border-blue-200 focus:border-blue-500 transition-all rounded-2xl"
                                    value={bulkForm.amount}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val) {
                                            setBulkForm({...bulkForm, amount: new Intl.NumberFormat('en-US').format(parseInt(val))});
                                        } else {
                                            setBulkForm({...bulkForm, amount: ''});
                                        }
                                    }}
                                />
                                <span className="absolute right-6 top-5 text-xl font-bold text-slate-300">VNĐ</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="label">Hình thức thanh toán</label>
                                <select 
                                    className="input !py-3"
                                    value={bulkForm.payment_method}
                                    onChange={(e) => setBulkForm({...bulkForm, payment_method: e.target.value})}
                                >
                                    <option value="cash">💵 Tiền mặt</option>
                                    <option value="bank_transfer">🏦 Chuyển khoản ngân hàng</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Ngày thu tiền</label>
                                <input type="date" disabled className="input !py-3 bg-slate-50" value={new Date().toISOString().split('T')[0]} />
                            </div>
                        </div>

                        {bulkForm.payment_method === 'bank_transfer' && (
                             <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-slideIn">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="label text-[10px] uppercase text-slate-500 font-bold">Ngân hàng thụ hưởng</label>
                                        <input type="text" className="input !py-2" placeholder="Ví dụ: MB Bank, Vietcom..." value={bulkForm.bank_name} onChange={e => setBulkForm({...bulkForm, bank_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="label text-[10px] uppercase text-slate-500 font-bold">Mã GD / Tham chiếu</label>
                                        <input type="text" className="input !py-2" placeholder="Nhập mã giao dịch..." value={bulkForm.bank_reference} onChange={e => setBulkForm({...bulkForm, bank_reference: e.target.value})} />
                                    </div>
                                </div>
                             </div>
                        )}

                        <div>
                            <label className="label">Ghi chú phiếu thu</label>
                            <textarea 
                                className="input min-h-[80px]"
                                placeholder="Nội dung ghi chú..."
                                value={bulkForm.notes}
                                onChange={(e) => setBulkForm({...bulkForm, notes: e.target.value})}
                            />
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                            <p className="font-bold text-amber-800 text-sm flex items-center gap-1">
                                ⚠️ Bạn đang tự tạo và duyệt giao dịch thu nợ gộp.
                            </p>
                            <ul className="text-xs text-amber-700 mt-2 space-y-1 ml-4 list-disc">
                                <li>Các phiếu nợ cũ nhất sẽ được gạch nợ ngay lập tức.</li>
                                <li>Không có sự kiểm tra chéo từ người thứ hai.</li>
                            </ul>
                            <label className="flex items-center gap-2 mt-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                                    checked={confirmChecked}
                                    onChange={(e) => setConfirmChecked(e.target.checked)}
                                />
                                <span className="text-sm font-bold text-amber-900">Tôi xác nhận chịu trách nhiệm cho giao dịch này</span>
                            </label>
                        </div>

                        <div className="flex gap-4 justify-end pt-4 border-t border-slate-100">
                            <button type="button" className="btn btn-secondary !px-8" onClick={() => setIsBulkModalOpen(false)}>Hủy bỏ</button>
                            <button type="submit" className={`btn btn-primary !px-10 shadow-lg shadow-blue-200 transition-all ${confirmChecked ? 'hover:scale-105 active:scale-95' : 'opacity-50 cursor-not-allowed'}`} disabled={!confirmChecked}>
                                Xác nhận Thu tiền
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default CustomerLedger;
