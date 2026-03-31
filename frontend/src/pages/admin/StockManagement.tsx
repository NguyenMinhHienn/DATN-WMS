import React, { useState, useEffect, useCallback } from 'react';
import { stockTransferService } from '../../services/stockTransferService';
import { StockTransfer, PaginationInfo } from '../../interface';
import { Pagination } from '../../components/Pagination';
import { numberToWords } from '../../utils/numberToWords';

/**
 * Unified Stock Management Page
 * Gộp 3 trang: Nhập kho / Xuất kho / Chuyển kho
 * Duyệt trực tiếp trên từng phiếu
 * 
 * NOTE: Export Slip (phiếu xuất kho đơn hàng) được quản lý riêng
 * qua StaffOrders.tsx (staff) và export-slip endpoints (admin)
 */

type TabType = 'IMPORT' | 'EXPORT';

const TAB_CONFIG: Record<string, { label: string; icon: string; activeColor: string; textColor: string; borderColor: string; emptyText: string; warehouseLabel: string }> = {
    IMPORT: { label: 'Nhập kho', icon: '📥', activeColor: '#10b981', textColor: '#34d399', borderColor: '#10b981', emptyText: 'Không tìm thấy phiếu nhập kho', warehouseLabel: 'Kho nhập' },
    EXPORT: { label: 'Xuất kho', icon: '📤', activeColor: '#f97316', textColor: '#fb923c', borderColor: '#f97316', emptyText: 'Không tìm thấy phiếu xuất kho', warehouseLabel: 'Kho xuất' },
};

const StockManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('IMPORT');

    // ========== STOCK TRANSFERS STATE ==========
    const [transfers, setTransfers] = useState<StockTransfer[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState('');

    // ========== LOAD TRANSFERS ==========
    const loadTransfers = useCallback(async () => {
        setLoading(true);
        try {
            const result = await stockTransferService.getTransfers(
                pagination.page, pagination.limit,
                selectedStatus || undefined,
                activeTab
            );
            setTransfers(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error('Failed to load transfers:', error);
        } finally {
            setLoading(false);
        }
    }, [activeTab, pagination.page, pagination.limit, selectedStatus]);

    useEffect(() => {
        loadTransfers();
    }, [loadTransfers]);

    // Reset state when switching tabs
    const switchTab = (tab: TabType) => {
        setActiveTab(tab);
        setSelectedStatus('');
        setPagination(p => ({ ...p, page: 1 }));
        setSelectedTransfer(null);
        setShowDetailModal(false);
    };

    // ========== TRANSFER ACTIONS ==========
    const handleViewDetail = async (id: number) => {
        try {
            const detail = await stockTransferService.getTransferById(id);
            setSelectedTransfer(detail);
            setShowDetailModal(true);
        } catch {
            alert('Không thể tải chi tiết phiếu');
        }
    };

    const handleApprove = async (id: number) => {
        if (!confirm('Xác nhận duyệt phiếu?\n\nSau khi duyệt, tồn kho sẽ được cập nhật tự động.')) return;
        setActionLoading(`approve-${id}`);
        try {
            await stockTransferService.approveTransfer(id);
            alert('✅ Đã duyệt phiếu! Tồn kho đã được cập nhật.');
            loadTransfers();
            setShowDetailModal(false);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Lỗi khi duyệt phiếu');
        } finally {
            setActionLoading('');
        }
    };

    const handleReject = async () => {
        if (!selectedTransfer) return;
        setActionLoading(`reject-${selectedTransfer.id}`);
        try {
            await stockTransferService.rejectTransfer(selectedTransfer.id, rejectReason);
            alert('❌ Đã từ chối phiếu.');
            loadTransfers();
            setShowRejectModal(false);
            setShowDetailModal(false);
            setRejectReason('');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Lỗi khi từ chối phiếu');
        } finally {
            setActionLoading('');
        }
    };

    // ========== HELPERS ==========
    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
        };
        const labels: Record<string, string> = {
            pending: '⏳ Chờ duyệt', approved: '✅ Đã duyệt', rejected: '❌ Từ chối',
        };
        return <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-slate-500/20 text-slate-400'}`}>{labels[status] || status}</span>;
    };

    const config = TAB_CONFIG[activeTab];
    const approvedCount = transfers.filter(t => t.status === 'approved').length;
    const pendingCount = transfers.filter(t => t.status === 'pending').length;

    return (
        <div className="animate-fadeIn">
            {/* ==================== HEADER ==================== */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">
                        <span className="gradient-text">📦 Quản lý phiếu kho</span>
                    </h1>
                    <p className="text-slate-400 mt-1">Nhập kho, xuất kho & chuyển kho</p>
                </div>
                <button onClick={() => loadTransfers()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium transition-colors">
                    🔄 Làm mới
                </button>
            </div>

            {/* ==================== TAB NAVIGATION ==================== */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {(Object.keys(TAB_CONFIG) as TabType[]).map(tab => {
                    const tc = TAB_CONFIG[tab];
                    const isActive = activeTab === tab;
                    return (
                        <button key={tab} onClick={() => switchTab(tab)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                                ${isActive
                                    ? 'text-white shadow-lg'
                                    : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700/50'
                                }`}
                            style={isActive ? { backgroundColor: tc.activeColor, boxShadow: `0 10px 15px -3px ${tc.activeColor}40` } : {}}>
                            <span>{tc.icon}</span> {tc.label}
                        </button>
                    );
                })}
            </div>

            {/* ==================== STATS ==================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="chart-container border-l-4 border-emerald-500">
                    <p className="text-sm text-slate-400">Đã duyệt</p>
                    <p className="text-2xl font-bold text-emerald-400">{approvedCount}</p>
                </div>
                <div className="chart-container border-l-4 border-amber-500">
                    <p className="text-sm text-slate-400">Chờ duyệt</p>
                    <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
                </div>
                <div className="chart-container border-l-4" style={{ borderColor: config.borderColor }}>
                    <p className="text-sm text-slate-400">Tổng phiếu</p>
                    <p className="text-2xl font-bold" style={{ color: config.textColor }}>{pagination.total}</p>
                </div>
            </div>

            {/* ==================== STATUS FILTER ==================== */}
            <div className="chart-container mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <select value={selectedStatus}
                        onChange={(e) => { setSelectedStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="input max-w-xs">
                        <option value="">Tất cả trạng thái</option>
                        <option value="pending">⏳ Chờ duyệt</option>
                        <option value="approved">✅ Đã duyệt</option>
                        <option value="rejected">❌ Từ chối</option>
                    </select>
                    <button onClick={() => { setSelectedStatus(''); setPagination(p => ({ ...p, page: 1 })); }}
                        className="text-slate-400 hover:text-white transition-colors">
                        Xóa bộ lọc
                    </button>
                </div>
            </div>

            {/* ==================== TRANSFER TABLE ==================== */}
            <div className="chart-container p-0 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-800/50 border-b border-slate-700/50">
                                    <tr>
                                        <th className="text-left py-4 px-5 text-sm font-medium text-slate-300">Mã phiếu</th>
                                        <th className="text-left py-4 px-5 text-sm font-medium text-slate-300">{config.warehouseLabel}</th>
                                        <th className="text-left py-4 px-5 text-sm font-medium text-slate-300">Ngày</th>
                                        <th className="text-right py-4 px-5 text-sm font-medium text-slate-300">Số SP</th>
                                        <th className="text-right py-4 px-5 text-sm font-medium text-slate-300">Tổng tiền</th>
                                        <th className="text-left py-4 px-5 text-sm font-medium text-slate-300">Người tạo</th>
                                        <th className="text-center py-4 px-5 text-sm font-medium text-slate-300">Trạng thái</th>
                                        <th className="text-center py-4 px-5 text-sm font-medium text-slate-300">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transfers.map(t => (
                                        <tr key={t.id} className={`border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors ${t.status === 'pending' ? 'bg-amber-500/5' : ''}`}>
                                            <td className="py-4 px-5 font-mono text-sm font-medium" style={{ color: config.textColor }}>{t.transfer_number}</td>
                                            <td className="py-4 px-5 text-sm text-slate-300">
                                                {activeTab === 'IMPORT' ? t.destination_warehouse_name : t.source_warehouse_name}
                                            </td>
                                            <td className="py-4 px-5 text-sm text-slate-400">{new Date(t.transfer_date).toLocaleDateString('vi-VN')}</td>
                                            <td className="py-4 px-5 text-sm text-right text-white">{t.total_items}</td>
                                            <td className="py-4 px-5 text-sm text-right font-medium" style={{ color: config.textColor }}>
                                                {new Intl.NumberFormat('vi-VN').format(t.total_value)} đ
                                            </td>
                                            <td className="py-4 px-5 text-sm text-slate-300">{t.created_by_name}</td>
                                            <td className="py-4 px-5 text-center">{getStatusBadge(t.status)}</td>
                                            <td className="py-4 px-5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleViewDetail(t.id)}
                                                        className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                                                        Chi tiết
                                                    </button>
                                                    {t.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => handleApprove(t.id)}
                                                                disabled={actionLoading === `approve-${t.id}`}
                                                                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium disabled:opacity-50 transition-colors">
                                                                {actionLoading === `approve-${t.id}` ? '...' : '✓ Duyệt'}
                                                            </button>
                                                            <button onClick={() => { setSelectedTransfer(t); setShowRejectModal(true); }}
                                                                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
                                                                ✕ Từ chối
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {transfers.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <span className="text-4xl opacity-50">{config.icon}</span>
                                                    <p className="text-slate-500">{config.emptyText}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-700/50">
                            <Pagination pagination={pagination} onPageChange={(page) => setPagination(p => ({ ...p, page }))} />
                        </div>
                    </>
                )}
            </div>

            {/* ==================== TRANSFER DETAIL MODAL ==================== */}
            {showDetailModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 m-4 border border-slate-700/50 shadow-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">{config.icon} Chi tiết phiếu: {selectedTransfer.transfer_number}</h2>
                                <div className="flex gap-2 mt-2">{getStatusBadge(selectedTransfer.status)}</div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Thông tin chung */}
                            <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-4">
                                <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><span>📄</span> Thông tin chung</h3>
                                <div className="space-y-3 text-sm">
                                    {selectedTransfer.transfer_type === 'IMPORT' && selectedTransfer.destination_warehouse_name && (
                                        <div className="flex justify-between border-b border-slate-600/50 pb-2">
                                            <span className="text-slate-400">Kho nhập:</span>
                                            <span className="font-medium text-white">{selectedTransfer.destination_warehouse_name}</span>
                                        </div>
                                    )}
                                    {selectedTransfer.transfer_type === 'EXPORT' && selectedTransfer.source_warehouse_name && (
                                        <div className="flex justify-between border-b border-slate-600/50 pb-2">
                                            <span className="text-slate-400">Kho xuất:</span>
                                            <span className="font-medium text-white">{selectedTransfer.source_warehouse_name}</span>
                                        </div>
                                    )}
                                    {selectedTransfer.transfer_type === 'TRANSFER' && (
                                        <>
                                            {selectedTransfer.source_warehouse_name && (
                                                <div className="flex justify-between border-b border-slate-600/50 pb-2">
                                                    <span className="text-slate-400">Kho nguồn:</span>
                                                    <span className="font-medium text-white">{selectedTransfer.source_warehouse_name}</span>
                                                </div>
                                            )}
                                            {selectedTransfer.destination_warehouse_name && (
                                                <div className="flex justify-between border-b border-slate-600/50 pb-2">
                                                    <span className="text-slate-400">Kho đích:</span>
                                                    <span className="font-medium text-white">{selectedTransfer.destination_warehouse_name}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div className="flex justify-between border-b border-slate-600/50 pb-2">
                                        <span className="text-slate-400">Ngày tạo:</span>
                                        <span className="font-medium text-white">{new Date(selectedTransfer.transfer_date).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-600/50 pb-2">
                                        <span className="text-slate-400">Ghi chú:</span>
                                        <span className="font-medium text-white">{selectedTransfer.reason || selectedTransfer.notes || '-'}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-600/50 mt-2">
                                        <span className="text-slate-300 font-medium">Tổng giá trị:</span>
                                        <div className="text-right">
                                            <div className="font-bold text-lg" style={{ color: config.textColor }}>{selectedTransfer.total_value.toLocaleString()} đ</div>
                                            <div className="text-xs text-slate-400 italic mt-0.5">{numberToWords(selectedTransfer.total_value)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Thông tin nghiệp vụ */}
                            <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-4">
                                <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><span>🏢</span> Thông tin nghiệp vụ</h3>
                                <div className="space-y-3 text-sm">
                                    {selectedTransfer.transfer_type === 'IMPORT' && (
                                        <div className="flex justify-between border-b border-slate-600/50 pb-2">
                                            <span className="text-slate-400">Nhà cung cấp:</span>
                                            <span className="font-medium text-white">{selectedTransfer.supplier_name || '-'}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-b border-slate-600/50 pb-2">
                                        <span className="text-slate-400">Người giao hàng:</span>
                                        <span className="font-medium text-white">{selectedTransfer.delivery_person || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-600/50 pb-2">
                                        <span className="text-slate-400">Người lập phiếu:</span>
                                        <span className="font-medium text-white">{selectedTransfer.created_by_name || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-600/50 pb-2">
                                        <span className="text-slate-400">Thủ kho:</span>
                                        <span className="font-medium text-white">{selectedTransfer.storekeeper || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Người duyệt:</span>
                                        <span className="font-medium text-white">{selectedTransfer.approved_by_name || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>



                        {selectedTransfer.status === 'rejected' && selectedTransfer.rejection_reason && (
                            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg mb-4">
                                <p className="text-red-400"><strong>Lý do từ chối:</strong> {selectedTransfer.rejection_reason}</p>
                            </div>
                        )}

                        {selectedTransfer.items && selectedTransfer.items.length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-medium mb-2 text-white">Danh sách sản phẩm ({selectedTransfer.total_items} SP)</h3>
                                <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-slate-300">SKU</th>
                                                <th className="px-4 py-3 text-left text-slate-300">Tên SP</th>
                                                <th className="px-4 py-3 text-right text-slate-300">SL</th>
                                                <th className="px-4 py-3 text-right text-slate-300">Đơn giá</th>
                                                <th className="px-4 py-3 text-right text-slate-300">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedTransfer.items.map(item => (
                                                <tr key={item.id} className="border-t border-slate-700/50">
                                                    <td className="px-4 py-3 font-mono" style={{ color: config.textColor }}>{item.sku}</td>
                                                    <td className="px-4 py-3 text-white">{item.product_name}</td>
                                                    <td className="px-4 py-3 text-right text-white">{item.quantity_requested}</td>
                                                    <td className="px-4 py-3 text-right text-slate-300">{item.unit_cost.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right font-medium" style={{ color: config.textColor }}>{item.line_total.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-700/50 font-medium">
                                            <tr>
                                                <td colSpan={2} className="px-4 py-3 text-slate-300">Tổng cộng:</td>
                                                <td className="px-4 py-3 text-right text-white">{selectedTransfer.total_quantity}</td>
                                                <td className="px-4 py-3"></td>
                                                <td className="px-4 py-3 text-right text-lg" style={{ color: config.textColor }}>{selectedTransfer.total_value.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Modal Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                            {selectedTransfer.status === 'pending' && (
                                <>
                                    <button onClick={() => setShowRejectModal(true)} className="btn btn-danger">❌ Từ chối</button>
                                    <button onClick={() => handleApprove(selectedTransfer.id)}
                                        disabled={actionLoading === `approve-${selectedTransfer.id}`}
                                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:opacity-90 font-medium shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50">
                                        ✅ Duyệt phiếu
                                    </button>
                                </>
                            )}
                            <button onClick={() => setShowDetailModal(false)} className="btn btn-secondary">Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== REJECT MODAL ==================== */}
            {showRejectModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6 m-4 border border-slate-700/50 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 text-red-400">Từ chối phiếu</h2>
                        <p className="text-slate-300 mb-4">Phiếu: <strong className="text-white">{selectedTransfer.transfer_number}</strong></p>
                        <p className="text-sm text-slate-500 mb-4">Sau khi từ chối, tồn kho sẽ KHÔNG thay đổi.</p>
                        <div className="mb-4">
                            <label className="label">Lý do từ chối *</label>
                            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                                className="input" rows={3} placeholder="Vui lòng nhập lý do từ chối..." />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} className="btn btn-secondary">Hủy</button>
                            <button onClick={handleReject} disabled={!rejectReason.trim() || actionLoading.startsWith('reject')}
                                className="btn btn-danger disabled:opacity-50">
                                {actionLoading.startsWith('reject') ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockManagement;
