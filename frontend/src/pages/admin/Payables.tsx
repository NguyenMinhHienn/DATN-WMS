import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { payableService, Payable, PayableSummary } from '../../services/payableService';
import { Modal } from '../../components/Modal';
import { auditService, FinancialAuditLog } from '../../services/auditService';
import AuditTimeline from '../../components/AuditTimeline';

const Payables: React.FC = () => {
    const [payables, setPayables] = useState<Payable[]>([]);
    const [summary, setSummary] = useState<PayableSummary | null>(null);
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
    const [detailData, setDetailData] = useState<Payable | null>(null);
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Phieu_Chi_${detailData?.payable_number || ''}`,
    });

    // Modal Create Voucher
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [voucherForm, setVoucherForm] = useState({
        amount: '',
        payment_method: 'bank_transfer',
        bank_reference: '',
        notes: ''
    });
    const [confirmChecked, setConfirmChecked] = useState(false);

    useEffect(() => {
        loadData();
    }, [page, filterStatus, search, startDate, endDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsData, listData] = await Promise.all([
                payableService.getSummary({
                    start_date: startDate || undefined,
                    end_date: endDate || undefined
                }),
                payableService.getAll({ 
                    page, 
                    limit: 10, 
                    status: filterStatus,
                    search: search || undefined,
                    start_date: startDate || undefined,
                    end_date: endDate || undefined
                })
            ]);
            setSummary(statsData);
            setPayables(listData.data);
            setTotalPages(listData.pagination?.totalPages || 1);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu công nợ:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (id: number) => {
        setSelectedId(id);
        setAuditLogs([]);
        try {
            const data = await payableService.getById(id);
            setDetailData(data);
            
            // Load vouchers for this payable
            const vouchersData = await payableService.getVouchers(id);
            setVouchers(vouchersData || []);

            setActiveTab('overview');
            setIsDetailModalOpen(true);

            loadAuditLogs('payable', id);
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
            console.error('Lỗi khi tải nhật ký thao tác:', error);
        } finally {
            setAuditLoading(false);
        }
    };

    const handleCreateVoucher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId) return;
        if (!confirmChecked) {
            alert('Vui lòng xác nhận chịu trách nhiệm cho giao dịch này.');
            return;
        }
        try {
            await payableService.createVoucher(selectedId, {
                amount: parseFloat(voucherForm.amount.replace(/,/g, '')),
                payment_method: voucherForm.payment_method,
                payment_date: new Date().toISOString().split('T')[0],
                bank_reference: voucherForm.bank_reference,
                notes: voucherForm.notes
            });
            alert('Tạo phiếu chi thành công!');
            setIsVoucherModalOpen(false);
            setVoucherForm({ amount: '', payment_method: 'bank_transfer', bank_reference: '', notes: '' });
            setConfirmChecked(false);
            loadData();
            if (selectedId) handleViewDetail(selectedId);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleApproveVoucher = async (voucherId: number) => {
        if (!confirm('Duyệt phiếu chi này? Việc duyệt sẽ cập nhật số dư công nợ.')) return;
        try {
            await payableService.approveVoucher(voucherId);
            alert('Đã duyệt phiếu chi');
            loadData();
            if (selectedId) handleViewDetail(selectedId);
        } catch (error: any) {
             alert(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleRejectVoucher = async (voucherId: number) => {
        const reason = prompt('Lý do từ chối phiếu chi:');
        if (!reason) return;
        try {
            await payableService.rejectVoucher(voucherId, reason);
            alert('Đã từ chối phiếu chi');
            loadData();
            if (selectedId) handleViewDetail(selectedId);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const formatMoney = (amount: string | number) => {
        return new Intl.NumberFormat('vi-VN').format(Number(amount || 0));
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Công nợ Phải trả NCC</h1>
                <p className="text-slate-600 mt-1">Theo dõi các khoản tiền nợ, phải trả cho nhà cung cấp</p>
            </div>

            {/* Stats Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="text-slate-500 text-sm font-medium mb-1">Tổng nợ NCC</div>
                        <div className="text-2xl font-bold text-slate-800">{formatMoney(summary.total_amount)} đ</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="text-slate-500 text-sm font-medium mb-1">Đã trả NCC</div>
                        <div className="text-2xl font-bold text-emerald-600">{formatMoney(summary.total_paid)} đ</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="text-slate-500 text-sm font-medium mb-1">Còn nợ lại</div>
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
                                placeholder="Tên NCC, Mã CN..."
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
                            <option value="unpaid">Chưa trả</option>
                            <option value="partial">Trả 1 phần</option>
                            <option value="paid">Đã thanh toán</option>
                            <option value="overdue">Quá hạn</option>
                            <option value="cancelled">Đã hủy</option>
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
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Nhà cung cấp</th>
                                    <th className="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-3">Tổng nợ</th>
                                    <th className="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-3">Còn lại</th>
                                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Trạng thái</th>
                                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payables.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-500">
                                            Không có dữ liệu công nợ
                                        </td>
                                    </tr>
                                ) : (
                                    payables.map(item => {
                                        const statusInfo = payableService.getStatusInfo(item.status);
                                        const isDueSoon = item.status === 'unpaid' && item.due_date && 
                                            new Date(item.due_date).getTime() < Date.now() + 3 * 24 * 60 * 60 * 1000;
                                        
                                        return (
                                            <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-800">{item.payable_number}</div>
                                                    <div className="text-xs text-slate-500">
                                                        P/S: {new Date(item.issue_date).toLocaleDateString('vi-VN')}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-800 line-clamp-1">{item.supplier_name}</div>
                                                    <div className="text-xs text-slate-500">{item.source_number || '(N/A)'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="font-bold text-slate-800">{formatMoney(item.total_amount)}đ</div>
                                                    <div className="text-xs text-emerald-600">Đã trả: {formatMoney(item.paid_amount)}đ</div>
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
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="📋 Chi tiết Công nợ Nhà Cung Cấp">
                {detailData && (
                    <div className="flex flex-col h-full max-h-[75vh]" ref={printRef}>
                        {/* Tabs Header */}
                        <div className="flex border-b border-slate-200 mb-4 bg-slate-50/50 rounded-t-xl sticky top-0 z-10 p-1 gap-1 print:hidden">
                            {['overview', 'items', 'history', 'audit'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        if (tab === 'audit' && detailData.id) loadAuditLogs('payable', detailData.id);
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
                                                <h3 className="text-xl font-bold text-blue-900">{detailData.payable_number}</h3>
                                            </div>
                                            <span 
                                                className="px-4 py-1.5 text-xs font-bold rounded-full border shadow-sm"
                                                style={{ 
                                                    color: payableService.getStatusInfo(detailData.status).color, 
                                                    backgroundColor: payableService.getStatusInfo(detailData.status).bg,
                                                    borderColor: payableService.getStatusInfo(detailData.status).color + '40'
                                                }}
                                            >
                                                {payableService.getStatusInfo(detailData.status).label}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            {/* Nhà cung cấp */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Thông tin NCC</label>
                                                    <p className="font-bold text-slate-800 text-base">{detailData.supplier_name}</p>
                                                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                                        <span>📞</span> {detailData.supplier_phone || '---'}
                                                    </p>
                                                </div>
                                                {(detailData.bank_account || detailData.bank_name) && (
                                                    <div className="bg-slate-50 border rounded p-2 text-sm">
                                                        <div className="font-bold">Ngân hàng:</div>
                                                        <div>{detailData.bank_name || 'N/A'}</div>
                                                        <div>STK: {detailData.bank_account}</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Tài chính */}
                                            <div className="bg-white rounded-lg p-3 border border-blue-50 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-slate-500">Tổng nợ:</span>
                                                    <span className="font-bold text-blue-900">{formatMoney(detailData.total_amount)} đ</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-slate-500 font-medium">Đã trả:</span>
                                                    <span className="font-bold text-emerald-600">{formatMoney(detailData.paid_amount)} đ</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                    <span className="text-sm font-bold text-slate-700">CÒN LẠI:</span>
                                                    <span className="text-lg font-bold text-red-500">{formatMoney(parseFloat(detailData.total_amount) - parseFloat(detailData.paid_amount))} đ</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">📜 Nguồn gốc</h4>
                                            <p className="text-sm font-medium text-slate-800">
                                                {detailData.source_type === 'import_transfer' ? '📦 Phiếu nhập kho' : 
                                                 detailData.source_type === 'goods_receipt' ? '🚚 Biên bản nhận hàng' : 
                                                 'Khác'}
                                            </p>
                                            <p className="text-sm font-bold text-blue-600 mt-1">{detailData.source_number}</p>
                                            <p className="text-[10px] text-slate-400 mt-2 italic">Ngày phát sinh: {new Date(detailData.issue_date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">🕒 Thời hạn</h4>
                                            {detailData.payment_terms > 0 ? (
                                                <p className="text-sm font-medium text-slate-800">Hạn trả: {detailData.payment_terms} ngày</p>
                                            ) : (
                                                <p className="text-sm font-medium text-slate-800">Thanh toán ngay</p>
                                            )}
                                            {detailData.due_date && (
                                                <p className="text-sm text-red-600 font-bold mt-1 uppercase">
                                                    Đến hạn: {new Date(detailData.due_date).toLocaleDateString('vi-VN')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end pt-2 print:hidden">
                                        <button onClick={handlePrint} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-xs font-bold transition-all border border-slate-200">
                                            🖨️ IN PHIẾU CÔNG NỢ
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
                                                    <th className="px-4 py-3 text-left font-bold border-b border-slate-200">Hàng hóa nhập</th>
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
                                                            Không có dữ liệu mặt hàng
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            {detailData.items && detailData.items.length > 0 && (
                                                <tfoot className="bg-blue-50/20 font-bold border-t border-blue-100 text-blue-900">
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-3 text-right uppercase text-xs tracking-wider">Tổng cộng</td>
                                                        <td className="px-4 py-3 text-right text-base">{formatMoney(detailData.total_amount)} đ</td>
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* HISTORY TAB */}
                            {activeTab === 'history' && (
                                <div className="space-y-4 animate-fadeIn px-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Danh sách Phiếu Chi</h4>
                                        {['unpaid', 'partial', 'overdue'].includes(detailData.status) && (
                                            <button 
                                                onClick={() => setIsVoucherModalOpen(true)}
                                                className="btn btn-primary !py-1.5 !px-3 !text-[10px] shadow-sm uppercase tracking-tighter"
                                            >
                                                + Lập Phiếu Chi
                                            </button>
                                        )}
                                    </div>
                                    
                                    {vouchers.length === 0 ? (
                                        <div className="bg-slate-50 rounded-xl border border-slate-200 border-dashed py-12 flex flex-col items-center gap-3">
                                            <span className="text-4xl opacity-20">💸</span>
                                            <p className="text-sm text-slate-400 font-medium italic">Chưa có phiếu chi nào được lập</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pb-4">
                                            {vouchers.map(voucher => (
                                                <div key={voucher.id} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                                                    <div className="flex justify-between mb-3 border-b border-slate-50 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">💳</span>
                                                            <div className="font-bold text-sm text-slate-800">{voucher.voucher_number}</div>
                                                        </div>
                                                        <span 
                                                            className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border shadow-sm"
                                                            style={{ 
                                                                color: payableService.getVoucherStatusInfo(voucher.status).color, 
                                                                backgroundColor: payableService.getVoucherStatusInfo(voucher.status).bg,
                                                                borderColor: payableService.getVoucherStatusInfo(voucher.status).color + '30'
                                                            }}
                                                        >
                                                            {payableService.getVoucherStatusInfo(voucher.status).label}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <div className="text-[11px] text-slate-500 space-y-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-400 w-16">Ngày chi:</span> 
                                                                <span className="font-bold text-slate-700">{new Date(voucher.payment_date).toLocaleDateString('vi-VN')}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-400 w-16">Hình thức:</span> 
                                                                <span className="font-medium px-2 py-0.5 bg-slate-100 rounded text-slate-600">{payableService.getPaymentMethodLabel(voucher.payment_method)}</span>
                                                            </div>
                                                            {voucher.status === 'pending' && (
                                                                <div className="text-orange-500 mt-2 font-bold flex items-center gap-1 animate-pulse">
                                                                    ⚠️ CHỜ ADMIN DUYỆT TRỪ NỢ
                                                                </div>
                                                            )}
                                                            {voucher.status === 'approved' && voucher.approved_by_name && (
                                                                <div className="text-emerald-600 mt-1 italic">
                                                                    Đã duyệt bởi: {voucher.approved_by_name}
                                                                </div>
                                                            )}
                                                            {voucher.status === 'approved' && voucher.created_by === voucher.approved_by && (
                                                                <div className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold mt-1 inline-flex items-center gap-1">
                                                                    ⚠️ Tự lập & duyệt
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Số tiền chi</div>
                                                            <div className="font-black text-xl text-red-500">-{formatMoney(voucher.amount)} đ</div>
                                                            {voucher.status === 'pending' && (
                                                                <div className="flex gap-2 justify-end mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button 
                                                                        onClick={() => handleRejectVoucher(voucher.id)}
                                                                        className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 border border-red-100 transition-colors"
                                                                        title="Từ chối"
                                                                    >✕</button>
                                                                    <button 
                                                                        onClick={() => handleApproveVoucher(voucher.id)}
                                                                        className="px-4 p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
                                                                    >DUYỆT CHI</button>
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

            {/* Create Voucher Modal */}
            <Modal isOpen={isVoucherModalOpen} onClose={() => setIsVoucherModalOpen(false)} title="Lập Phiếu Chi">
                 <form onSubmit={handleCreateVoucher} className="space-y-4">
                    <div>
                        <label className="label">Số tiền chi</label>
                        <input 
                            type="text" 
                            required
                            className="input text-lg font-bold"
                            value={voucherForm.amount}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val) {
                                    setVoucherForm({...voucherForm, amount: new Intl.NumberFormat('en-US').format(parseInt(val))});
                                } else {
                                    setVoucherForm({...voucherForm, amount: ''});
                                }
                            }}
                            placeholder="Nhập số tiền chi..."
                        />
                        <p className="text-xs text-slate-500 mt-1">Còn nợ: {detailData && formatMoney(parseFloat(detailData.total_amount) - parseFloat(detailData.paid_amount))}đ</p>
                    </div>
                    <div>
                        <label className="label">Hình thức thanh toán</label>
                        <select 
                            className="input"
                            value={voucherForm.payment_method}
                            onChange={(e) => setVoucherForm({...voucherForm, payment_method: e.target.value})}
                        >
                            <option value="bank_transfer">Chuyển khoản</option>
                            <option value="cash">Tiền mặt</option>
                        </select>
                    </div>
                    
                    {voucherForm.payment_method === 'bank_transfer' && (
                        <div>
                            <label className="label">Mã GD / Nội dung chuyển khoản</label>
                            <input 
                                type="text" 
                                className="input" 
                                value={voucherForm.bank_reference} 
                                onChange={e => setVoucherForm({...voucherForm, bank_reference: e.target.value})} 
                                placeholder="Ví dụ: CK Tra no HD123..."
                            />
                        </div>
                    )}
                    
                    <div>
                        <label className="label">Ghi chú (Tùy chọn)</label>
                        <textarea 
                            className="input min-h-[80px]"
                            value={voucherForm.notes}
                            onChange={(e) => setVoucherForm({...voucherForm, notes: e.target.value})}
                        />
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                        <p className="font-bold text-amber-800 text-sm flex items-center gap-1">
                            ⚠️ Bạn đang tự tạo và duyệt phiếu chi này.
                        </p>
                        <ul className="text-xs text-amber-700 mt-2 space-y-1 ml-4 list-disc">
                            <li>Phiếu sẽ trừ công nợ ngay lập tức.</li>
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
                    
                    <div className="flex gap-3 justify-end pt-4">
                        <button type="button" className="btn btn-secondary" onClick={() => setIsVoucherModalOpen(false)}>Hủy</button>
                        <button type="submit" className={`btn btn-primary ${!confirmChecked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!confirmChecked}>Tạo phiếu chi</button>
                    </div>
                 </form>
            </Modal>
        </div>
    );
};

export default Payables;
