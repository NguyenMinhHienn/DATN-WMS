import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { receivableService, Receivable, ReceivableSummary } from '../../services/receivableService';
import { Modal } from '../../components/Modal';
import { auditService, FinancialAuditLog } from '../../services/auditService';
import AuditTimeline from '../../components/AuditTimeline';

const Receivables: React.FC = () => {
    const [receivables, setReceivables] = useState<Receivable[]>([]);
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

    useEffect(() => {
        loadData();
    }, [page, filterStatus, search, startDate, endDate]);

    const loadData = async () => {
        setLoading(true);
        try {
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
            setTotalPages(listData.pagination.totalPages);
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
            if (selectedId) handleViewDetail(selectedId); // Refresh details
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
            {/* ==================== DETAIL MODAL ==================== */}
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="📋 Chi tiết Công nợ (Phát sinh)">
                {detailData && (
                    <div className="flex flex-col h-full max-h-[75vh]" ref={printRef}>
                        {/* Tabs Header */}
                        <div className="flex border-b border-slate-200 mb-4 bg-slate-50/50 rounded-t-xl sticky top-0 z-10 p-1 gap-1 print:hidden">
                            {['overview', 'items', 'history', 'audit'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        if (tab === 'audit' && selectedId) loadAuditLogs('receivable', selectedId);
                                    }}
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
                                            {/* Khách hàng */}
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

                                            {/* Tài chính */}
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
                                                onClick={() => handleSendReminder(detailData!.id)}
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
                                                                        className="px-4 p-1.5 bg-emerald-600 text-blue-900 rounded-lg hover:bg-emerald-700 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
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
