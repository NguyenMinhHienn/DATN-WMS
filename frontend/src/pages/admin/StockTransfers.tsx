import React, { useState, useEffect } from 'react';
import { stockTransferService } from '../../services/stockTransferService';
import { StockTransfer, PaginationInfo } from '../../interface';


const StockTransfers: React.FC = () => {
    const [transfers, setTransfers] = useState<StockTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [typeFilter, setTypeFilter] = useState<string>('');

    // Modal state
    const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadTransfers();
    }, [pagination.page, typeFilter]);

    const loadTransfers = async () => {
        setLoading(true);
        try {
            const result = await stockTransferService.getTransfers(
                pagination.page,
                pagination.limit,
                'pending',
                typeFilter || undefined
            );
            setTransfers(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error('Failed to load transfers:', error);
        } finally {
            setLoading(false);
        }
    };

    // Approve transfer - ADMIN only
    const handleApprove = async (id: number) => {
        if (!confirm('Xác nhận duyệt phiếu?\n\nSau khi duyệt, tồn kho sẽ được cập nhật tự động.')) return;
        try {
            await stockTransferService.approveTransfer(id);
            alert('✅ Đã duyệt phiếu! Tồn kho đã được cập nhật.');
            loadTransfers();
            setShowDetailModal(false);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Lỗi khi duyệt phiếu');
        }
    };

    // Reject transfer - ADMIN only
    const handleReject = async () => {
        if (!selectedTransfer) return;
        try {
            await stockTransferService.rejectTransfer(selectedTransfer.id, rejectReason);
            alert('❌ Đã từ chối phiếu. Tồn kho không thay đổi.');
            loadTransfers();
            setShowRejectModal(false);
            setShowDetailModal(false);
            setRejectReason('');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Lỗi khi từ chối phiếu');
        }
    };

    // View detail
    const handleViewDetail = async (id: number) => {
        try {
            const detail = await stockTransferService.getTransferById(id);
            setSelectedTransfer(detail);
            setShowDetailModal(true);
        } catch (error) {
            alert('Không thể tải chi tiết phiếu');
        }
    };

    const handlePrint = (id: number) => {
        window.open(`http://localhost:3000/api/print/transfer/${id}`, '_blank');
    };

    const getTypeBadge = (type: string) => {
        const configs: Record<string, { bg: string; label: string }> = {
            'IMPORT': { bg: 'bg-emerald-500/20 text-emerald-600 font-bold border-emerald-500/30', label: '📥 Nhập kho' },
            'EXPORT': { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: '📤 Xuất kho' },
            'TRANSFER': { bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: '🔄 Chuyển kho' },
        };
        const config = configs[type] || { bg: 'bg-slate-500/20', label: type };
        return <span className={`px-3 py-1 rounded-full text-sm border ${config.bg}`}>{config.label}</span>;
    };

    // Count by type
    const importCount = transfers.filter(t => t.transfer_type === 'IMPORT').length;
    const exportCount = transfers.filter(t => t.transfer_type === 'EXPORT').length;
    const transferCount = transfers.filter(t => t.transfer_type === 'TRANSFER').length;

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold">
                    <span className="gradient-text">✅ Duyệt phiếu kho</span>
                </h1>
                <p className="text-slate-600 mt-1">Xem và duyệt các phiếu nhập/xuất/chuyển kho đang chờ xử lý</p>
            </div>

            {/* Stats - Count pending by type */}
            {pagination.total > 0 && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="chart-container border-l-4 border-amber-500">
                        <p className="text-3xl font-bold text-amber-400">{pagination.total}</p>
                        <p className="text-sm text-slate-600">Tổng phiếu chờ duyệt</p>
                    </div>
                    <div className="chart-container border-l-4 border-emerald-500">
                        <p className="text-2xl font-bold text-emerald-600 font-bold">{importCount}</p>
                        <p className="text-sm text-slate-600">📥 Nhập kho</p>
                    </div>
                    <div className="chart-container border-l-4 border-orange-500">
                        <p className="text-2xl font-bold text-orange-400">{exportCount}</p>
                        <p className="text-sm text-slate-600">📤 Xuất kho</p>
                    </div>
                    <div className="chart-container border-l-4 border-purple-500">
                        <p className="text-2xl font-bold text-purple-400">{transferCount}</p>
                        <p className="text-sm text-slate-600">🔄 Chuyển kho</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="chart-container mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label">Lọc theo loại phiếu</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="input"
                        >
                            <option value="">Tất cả loại</option>
                            <option value="IMPORT">📥 Nhập kho</option>
                            <option value="EXPORT">📤 Xuất kho</option>
                            <option value="TRANSFER">🔄 Chuyển kho</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => setTypeFilter('')}
                            className="text-slate-600 hover:text-blue-900 transition-colors"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="chart-container p-0 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-blue-50/30 border-b border-blue-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 font-medium">Mã phiếu</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 font-medium">Đơn hàng</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 font-medium">Loại</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 font-medium">Kho</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 font-medium">Số lượng</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 font-medium">Người tạo</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 font-medium">Ngày tạo</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-slate-700 font-medium">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center">
                                    <div className="flex justify-center">
                                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                </td>
                            </tr>
                        ) : transfers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <span className="text-5xl">🎉</span>
                                        <p className="text-lg font-medium text-blue-900">Không có phiếu nào đang chờ duyệt</p>
                                        <p className="text-sm text-slate-500">Tất cả phiếu đã được xử lý!</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            transfers.map((transfer) => (
                                <tr key={transfer.id} className="border-b border-slate-100 hover:bg-amber-500/10 transition-colors bg-amber-500/5">
                                    <td className="px-6 py-4 font-medium text-blue-900 font-mono">
                                        {transfer.transfer_number}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        {transfer.order_id ? (
                                            <span className="text-blue-600">Đơn hàng số #{transfer.order_id}</span>
                                        ) : (
                                            <span className="text-slate-600">Xuất trực tiếp</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">{getTypeBadge(transfer.transfer_type)}</td>
                                    <td className="px-6 py-4 text-slate-700 font-medium text-sm">
                                        {transfer.transfer_type === 'IMPORT' && `→ ${transfer.destination_warehouse_name}`}
                                        {transfer.transfer_type === 'EXPORT' && `${transfer.source_warehouse_name} →`}
                                        {transfer.transfer_type === 'TRANSFER' && (
                                            <>{transfer.source_warehouse_name} → {transfer.destination_warehouse_name}</>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 font-medium">
                                        {transfer.total_quantity} ({transfer.total_items} SP)
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 font-medium">{transfer.created_by_name}</td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">
                                        {new Date(transfer.transfer_date).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleViewDetail(transfer.id)}
                                            className="text-blue-600 hover:text-blue-600 mr-3 transition-colors"
                                        >
                                            Chi tiết
                                        </button>
                                        <button onClick={() => handlePrint(transfer.id)}
                                            className="px-3 py-1 bg-slate-600 text-blue-900 rounded text-xs font-medium hover:bg-slate-500 transition-colors mr-2">
                                            🖨️ In
                                        </button>
                                        <button
                                            onClick={() => handleApprove(transfer.id)}
                                            className="text-emerald-600 font-bold hover:text-emerald-300 mr-2 font-medium transition-colors"
                                        >
                                            ✓ Duyệt
                                        </button>
                                        <button
                                            onClick={() => { setSelectedTransfer(transfer); setShowRejectModal(true); }}
                                            className="text-red-400 hover:text-red-300 font-medium transition-colors"
                                        >
                                            ✕ Từ chối
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-blue-100 flex justify-between items-center">
                        <span className="text-sm text-slate-600">
                            Hiển thị {transfers.length} / {pagination.total} phiếu
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                disabled={pagination.page === 1}
                                className="px-3 py-1 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-50 transition-colors"
                            >
                                ← Trước
                            </button>
                            <span className="px-3 py-1 text-slate-700 font-medium">{pagination.page} / {pagination.totalPages}</span>
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                disabled={pagination.page === pagination.totalPages}
                                className="px-3 py-1 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-50 transition-colors"
                            >
                                Sau →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation hint */}
            <div className="mt-6 chart-container border-l-4 border-indigo-500">
                <p className="text-blue-600 text-sm">
                    💡 <strong>Mẹo:</strong> Sau khi duyệt/từ chối, bạn có thể xem lịch sử phiếu tại:
                </p>
                <ul className="mt-2 text-sm text-slate-600 list-disc list-inside">
                    <li><strong className="text-emerald-600 font-bold">Nhập kho</strong> - Lịch sử phiếu nhập</li>
                    <li><strong className="text-orange-400">Xuất kho</strong> - Lịch sử phiếu xuất</li>
                    <li><strong className="text-purple-400">Chuyển kho</strong> - Lịch sử phiếu chuyển giữa các kho</li>
                </ul>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 m-4 border border-blue-100 shadow-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-blue-900">Chi tiết phiếu: {selectedTransfer.transfer_number}</h2>
                                <div className="flex gap-2 mt-2">
                                    {getTypeBadge(selectedTransfer.transfer_type)}
                                    <span className="px-3 py-1 rounded-full text-sm font-medium border bg-amber-500/20 text-amber-400 border-amber-500/30">
                                        ⏳ Chờ duyệt
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-slate-600 hover:text-blue-900 text-2xl transition-colors">
                                ×
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            {selectedTransfer.source_warehouse_name && (
                                <div>
                                    <span className="text-slate-500">Kho nguồn:</span>
                                    <p className="font-medium text-blue-900">{selectedTransfer.source_warehouse_name}</p>
                                </div>
                            )}
                            {selectedTransfer.destination_warehouse_name && (
                                <div>
                                    <span className="text-slate-500">Kho đích:</span>
                                    <p className="font-medium text-blue-900">{selectedTransfer.destination_warehouse_name}</p>
                                </div>
                            )}
                            <div>
                                <span className="text-slate-500">Ngày:</span>
                                <p className="font-medium text-blue-900">{new Date(selectedTransfer.transfer_date).toLocaleDateString('vi-VN')}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Người tạo:</span>
                                <p className="font-medium text-blue-900">{selectedTransfer.created_by_name}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Mã đơn hàng:</span>
                                <p className="font-medium text-blue-900">
                                    {selectedTransfer.order_id ? `Đơn hàng số #${selectedTransfer.order_id}` : 'Xuất trực tiếp'}
                                </p>
                            </div>
                            <div>
                                <span className="text-slate-500">Tổng giá trị:</span>
                                <p className="font-medium text-lg text-blue-600">{selectedTransfer.total_value.toLocaleString()} đ</p>
                            </div>
                            {selectedTransfer.reason && (
                                <div>
                                    <span className="text-slate-500">Lý do:</span>
                                    <p className="font-medium text-blue-900">{selectedTransfer.reason}</p>
                                </div>
                            )}
                        </div>

                        {/* Items table */}
                        {selectedTransfer.items && selectedTransfer.items.length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-medium mb-2 text-blue-900">Danh sách sản phẩm ({selectedTransfer.total_items} SP)</h3>
                                <div className="overflow-x-auto rounded-lg border border-blue-100">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-slate-700 font-medium">SKU</th>
                                                <th className="px-4 py-3 text-left text-slate-700 font-medium">Tên SP</th>
                                                <th className="px-4 py-3 text-right text-slate-700 font-medium">SL</th>
                                                <th className="px-4 py-3 text-right text-slate-700 font-medium">Đơn giá</th>
                                                <th className="px-4 py-3 text-right text-slate-700 font-medium">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedTransfer.items.map(item => (
                                                <tr key={item.id} className="border-t border-blue-100">
                                                    <td className="px-4 py-3 font-mono text-blue-600">{item.sku}</td>
                                                    <td className="px-4 py-3 text-blue-900">{item.product_name}</td>
                                                    <td className="px-4 py-3 text-right text-blue-900">{item.quantity_requested}</td>
                                                    <td className="px-4 py-3 text-right text-slate-700 font-medium">{item.unit_cost.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-blue-600">{item.line_total.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-100 font-medium">
                                            <tr>
                                                <td colSpan={2} className="px-4 py-3 text-slate-700 font-medium">Tổng cộng:</td>
                                                <td className="px-4 py-3 text-right text-blue-900">{selectedTransfer.total_quantity}</td>
                                                <td className="px-4 py-3"></td>
                                                <td className="px-4 py-3 text-right text-lg text-blue-600">{selectedTransfer.total_value.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-blue-100">
                            <button
                                onClick={() => setShowRejectModal(true)}
                                className="btn btn-danger"
                            >
                                ❌ Từ chối
                            </button>
                            <button
                                onClick={() => handleApprove(selectedTransfer.id)}
                                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-blue-900 rounded-xl hover:opacity-90 font-medium shadow-lg shadow-emerald-500/25 transition-all"
                            >
                                ✅ Duyệt phiếu
                            </button>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button onClick={() => handlePrint(selectedTransfer.id)} className="btn btn-primary">🖨️ In Phiếu</button>
                            <button onClick={() => setShowDetailModal(false)} className="btn btn-secondary">Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4 border border-blue-100 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 text-red-400">Từ chối phiếu</h2>
                        <p className="text-slate-700 font-medium mb-4">Phiếu: <strong className="text-blue-900">{selectedTransfer.transfer_number}</strong></p>
                        <p className="text-sm text-slate-500 mb-4">
                            Sau khi từ chối, tồn kho sẽ KHÔNG thay đổi.
                        </p>
                        <div className="mb-4">
                            <label className="label">Lý do từ chối *</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="input"
                                rows={3}
                                placeholder="Vui lòng nhập lý do từ chối..."
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                                className="btn btn-secondary"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim()}
                                className="btn btn-danger disabled:opacity-50"
                            >
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockTransfers;
