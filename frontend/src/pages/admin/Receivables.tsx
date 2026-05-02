import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { receivableService, Receivable, ReceivableSummary, PaymentReceipt } from '../../services/receivableService';
import { Modal } from '../../components/Modal';
import { auditService, FinancialAuditLog } from '../../services/auditService';
import AuditTimeline from '../../components/AuditTimeline';
import { ReceivableDetailModal } from '../../components/ReceivableDetailModal';

const Receivables: React.FC = () => {
    const [receivables, setReceivables] = useState<Receivable[]>([]);
    const [pendingReceipts, setPendingReceipts] = useState<PaymentReceipt[]>([]);
    const [summary, setSummary] = useState<ReceivableSummary | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Pagination & Filter
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal Details
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [detailData, setDetailData] = useState<Receivable | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Phieu_No_${detailData?.receivable_number || ''}`,
    });

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
    const [confirmChecked, setConfirmChecked] = useState(false);

    useEffect(() => {
        loadData();
    }, [page, filterStatus, search, startDate, endDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (filterStatus === 'has_pending') {
                const listData = await receivableService.getPaymentReceipts({
                    page, 
                    limit: 10, 
                    status: 'pending',
                    search: search || undefined,
                    start_date: startDate || undefined,
                    end_date: endDate || undefined
                });
                setPendingReceipts(listData.data);
                setTotalPages(listData.pagination?.totalPages || 1);
            } else {
                const [statsData, listData] = await Promise.all([
                    receivableService.getSummary({
                        start_date: startDate || undefined,
                        end_date: endDate || undefined
                    }),
                    receivableService.getAll({ 
                        page, 
                        limit: 10, 
                        status: filterStatus,
                        search: search || undefined,
                        start_date: startDate || undefined,
                        end_date: endDate || undefined
                    })
                ]);
                setSummary(statsData);
                setReceivables(listData.data);
                setTotalPages(listData.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu công nợ:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (id: number) => {
        setSelectedId(id);
        setAuditLogs([]); // Clear old logs
        try {
            const data = await receivableService.getById(id);
            setDetailData(data);
            setActiveTab('overview'); // Reset to first tab
            setIsDetailModalOpen(true);
            
            // Load audit logs in background or when tab clicked
            loadAuditLogs('receivable', id);
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Không thể tải chi tiết công nợ. Vui lòng kiểm tra lại kết nối hoặc dữ liệu nguồn.');
        }
    };

    const loadAuditLogs = async (type: string, id: number) => {
        setAuditLoading(true);
        try {
            const logs = await auditService.getHistory(type, id);
            setAuditLogs(logs);
        } catch (error) {
            console.error('Lỗi khi tải nhật ký thao tác:', error);
        } finally {
            setAuditLoading(false);
        }
    };

    const handleCreateReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId) return;
        if (!confirmChecked) {
            alert('Vui lòng xác nhận chịu trách nhiệm cho giao dịch này.');
            return;
        }
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
            setConfirmChecked(false);
            loadData();
            if (selectedId) handleViewDetail(selectedId); // Refresh details
        } catch (error: any) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleApproveReceipt = async (receiptId: number) => {
        if (!confirm('Duyệt phiếu thu này? Việc duyệt sẽ trừ công nợ ngay lập tức.')) return;
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
        const reason = prompt('Lý do từ chối phiếu thu:');
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
                
                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50/50 p-1">
                    <button
                        onClick={() => setFilterStatus('')}
                        className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${
                            filterStatus !== 'has_pending'
                                ? 'bg-white text-blue-700 border-blue-600 shadow-sm'
                                : 'text-slate-500 border-transparent hover:text-blue-700 hover:bg-white/50'
                        }`}
                    >
                        📑 Tất cả công nợ
                    </button>
                    <button
                        onClick={() => setFilterStatus('has_pending')}
                        className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${
                            filterStatus === 'has_pending'
                                ? 'bg-white text-orange-600 border-orange-500 shadow-sm'
                                : 'text-slate-500 border-transparent hover:text-orange-600 hover:bg-white/50'
                        }`}
                    >
                        ⏳ Phiếu chờ duyệt
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-white">
                    <div className="flex flex-wrap gap-3 flex-1">
                        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Tìm theo tên KH, SĐT, Mã CN..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input !py-1.5 !pl-9 !text-sm w-full"
                            />
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-sm text-slate-500">Từ:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="input !py-1.5 !text-sm w-[130px]"
                            />
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-sm text-slate-500">Đến:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="input !py-1.5 !text-sm w-[130px]"
                            />
                        </div>
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
                        {(search || startDate || endDate || filterStatus) && (
                            <button
                                onClick={() => {
                                    setSearch('');
                                    setStartDate('');
                                    setEndDate('');
                                    setFilterStatus('');
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-1.5"
                            >
                                Bỏ lọc
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {filterStatus === 'has_pending' ? (
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Mã Phiếu / Ngày</th>
                                        <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Khách hàng</th>
                                        <th className="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-3">Số tiền thu</th>
                                        <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Phương thức</th>
                                        <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Người lập</th>
                                        <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pendingReceipts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-500">
                                                Không có phiếu thu chờ duyệt
                                            </td>
                                        </tr>
                                    ) : (
                                        pendingReceipts.map(item => (
                                            <tr key={item.id} className="hover:bg-orange-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-800">{item.receipt_number}</div>
                                                    <div className="text-xs text-slate-500">{new Date(item.payment_date).toLocaleDateString('vi-VN')}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-800">{item.debtor_name}</div>
                                                    <div className="text-xs text-slate-500">{item.receivable_number}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="font-bold text-emerald-600">{formatMoney(item.amount)}đ</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                        {receivableService.getPaymentMethodLabel(item.payment_method)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="text-sm">{item.created_by_name || 'System'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => handleApproveReceipt(item.id)} className="btn btn-primary !py-1 !px-2 !text-xs !bg-emerald-600 hover:!bg-emerald-700">Duyệt</button>
                                                        <button onClick={() => handleRejectReceipt(item.id)} className="btn btn-danger !py-1 !px-2 !text-xs">Từ chối</button>
                                                        <button onClick={() => handleViewDetail(item.receivable_id)} className="btn btn-secondary !py-1 !px-2 !text-xs">Chi tiết</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        ) : (
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
                        )}
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

            {/* ==================== DETAIL MODAL ==================== */}
            <ReceivableDetailModal 
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                receivableId={selectedId}
                onReceiptAction={() => loadData()}
            />
        </div>
    );
};

export default Receivables;