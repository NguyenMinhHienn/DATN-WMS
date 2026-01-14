import React, { useState, useEffect } from 'react';
import { stockTransferService } from '../../services/stockTransferService';
import { StockTransfer, PaginationInfo } from '../../interface';

/**
 * StockTransfers - ADMIN ONLY
 * 
 * Trang duyệt phiếu cho Admin:
 * - Xem tất cả phiếu do STAFF gửi lên
 * - Duyệt hoặc từ chối phiếu
 * - KHÔNG có chức năng tạo phiếu (STAFF tạo ở /staff/create-transfer)
 * 
 * Khi duyệt phiếu → tồn kho được cập nhật tự động
 */
const StockTransfers: React.FC = () => {
    const [transfers, setTransfers] = useState<StockTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [statusFilter, setStatusFilter] = useState<string>('pending'); // Mặc định chỉ xem pending
    const [typeFilter, setTypeFilter] = useState<string>('');

    // Modal state
    const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadTransfers();
    }, [pagination.page, statusFilter, typeFilter]);

    const loadTransfers = async () => {
        setLoading(true);
        try {
            const result = await stockTransferService.getTransfers(
                pagination.page,
                pagination.limit,
                statusFilter || undefined,
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

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
            'approved': 'bg-green-100 text-green-800 border-green-300',
            'rejected': 'bg-red-100 text-red-800 border-red-300',
        };
        const labels: Record<string, string> = {
            'pending': '⏳ Chờ duyệt',
            'approved': '✅ Đã duyệt',
            'rejected': '❌ Từ chối',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || 'bg-gray-100'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const getTypeBadge = (type: string) => {
        const configs: Record<string, { bg: string; label: string }> = {
            'IMPORT': { bg: 'bg-emerald-100 text-emerald-700', label: '📥 Nhập kho' },
            'EXPORT': { bg: 'bg-orange-100 text-orange-700', label: '📤 Xuất kho' },
            'TRANSFER': { bg: 'bg-purple-100 text-purple-700', label: '🔄 Chuyển kho' },
        };
        const config = configs[type] || { bg: 'bg-gray-100', label: type };
        return <span className={`px-2 py-1 rounded text-sm ${config.bg}`}>{config.label}</span>;
    };

    const pendingCount = transfers.filter(t => t.status === 'pending').length;

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Duyệt phiếu kho</h1>
                <p className="text-gray-600">
                    Xem và duyệt các phiếu nhập/xuất/chuyển kho do nhân viên gửi
                </p>
            </div>

            {/* Stats */}
            {statusFilter === 'pending' && pendingCount > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                    <span className="text-3xl">📋</span>
                    <div>
                        <p className="font-medium text-yellow-800">
                            Có {pendingCount} phiếu đang chờ duyệt
                        </p>
                        <p className="text-sm text-yellow-600">
                            Nhấn "Duyệt" để chấp nhận hoặc "Từ chối" nếu không hợp lệ
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="">Tất cả</option>
                            <option value="pending">⏳ Chờ duyệt</option>
                            <option value="approved">✅ Đã duyệt</option>
                            <option value="rejected">❌ Từ chối</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại phiếu</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="">Tất cả</option>
                            <option value="IMPORT">📥 Nhập kho</option>
                            <option value="EXPORT">📤 Xuất kho</option>
                            <option value="TRANSFER">🔄 Chuyển kho</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => { setStatusFilter('pending'); setTypeFilter(''); }}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                            Xem phiếu chờ duyệt
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã phiếu</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kho</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tạo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center">
                                    <div className="flex justify-center">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                </td>
                            </tr>
                        ) : transfers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    {statusFilter === 'pending'
                                        ? '🎉 Không có phiếu nào đang chờ duyệt'
                                        : 'Không có phiếu nào'}
                                </td>
                            </tr>
                        ) : (
                            transfers.map((transfer) => (
                                <tr key={transfer.id} className={`hover:bg-gray-50 ${transfer.status === 'pending' ? 'bg-yellow-50' : ''}`}>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {transfer.transfer_number}
                                    </td>
                                    <td className="px-6 py-4">{getTypeBadge(transfer.transfer_type)}</td>
                                    <td className="px-6 py-4 text-gray-600 text-sm">
                                        {transfer.transfer_type === 'IMPORT' && `→ ${transfer.destination_warehouse_name}`}
                                        {transfer.transfer_type === 'EXPORT' && `${transfer.source_warehouse_name} →`}
                                        {transfer.transfer_type === 'TRANSFER' && (
                                            <>{transfer.source_warehouse_name} → {transfer.destination_warehouse_name}</>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {transfer.total_quantity} ({transfer.total_items} SP)
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{transfer.created_by_name}</td>
                                    <td className="px-6 py-4">{getStatusBadge(transfer.status)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleViewDetail(transfer.id)}
                                            className="text-blue-600 hover:text-blue-800 mr-3"
                                        >
                                            Chi tiết
                                        </button>
                                        {transfer.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(transfer.id)}
                                                    className="text-green-600 hover:text-green-800 mr-2 font-medium"
                                                >
                                                    ✓ Duyệt
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedTransfer(transfer); setShowRejectModal(true); }}
                                                    className="text-red-600 hover:text-red-800 font-medium"
                                                >
                                                    ✕ Từ chối
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                            Hiển thị {transfers.length} / {pagination.total} phiếu
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                disabled={pagination.page === 1}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                                ← Trước
                            </button>
                            <span className="px-3 py-1">{pagination.page} / {pagination.totalPages}</span>
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                disabled={pagination.page === pagination.totalPages}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                                Sau →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 m-4">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold">Chi tiết phiếu: {selectedTransfer.transfer_number}</h2>
                                <div className="flex gap-2 mt-2">
                                    {getTypeBadge(selectedTransfer.transfer_type)}
                                    {getStatusBadge(selectedTransfer.status)}
                                </div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                                ×
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            {selectedTransfer.source_warehouse_name && (
                                <div>
                                    <span className="text-gray-500">Kho nguồn:</span>
                                    <p className="font-medium">{selectedTransfer.source_warehouse_name}</p>
                                </div>
                            )}
                            {selectedTransfer.destination_warehouse_name && (
                                <div>
                                    <span className="text-gray-500">Kho đích:</span>
                                    <p className="font-medium">{selectedTransfer.destination_warehouse_name}</p>
                                </div>
                            )}
                            <div>
                                <span className="text-gray-500">Ngày:</span>
                                <p className="font-medium">{new Date(selectedTransfer.transfer_date).toLocaleDateString('vi-VN')}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Người tạo:</span>
                                <p className="font-medium">{selectedTransfer.created_by_name}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Tổng giá trị:</span>
                                <p className="font-medium text-lg">{selectedTransfer.total_value.toLocaleString()} đ</p>
                            </div>
                            {selectedTransfer.reason && (
                                <div>
                                    <span className="text-gray-500">Lý do:</span>
                                    <p className="font-medium">{selectedTransfer.reason}</p>
                                </div>
                            )}
                        </div>

                        {selectedTransfer.status === 'rejected' && selectedTransfer.rejection_reason && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                                <p className="text-red-700">
                                    <strong>Lý do từ chối:</strong> {selectedTransfer.rejection_reason}
                                </p>
                            </div>
                        )}

                        {/* Items table */}
                        {selectedTransfer.items && selectedTransfer.items.length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-medium mb-2">Danh sách sản phẩm ({selectedTransfer.total_items} SP)</h3>
                                <table className="w-full border text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left border">SKU</th>
                                            <th className="px-3 py-2 text-left border">Tên SP</th>
                                            <th className="px-3 py-2 text-right border">SL</th>
                                            <th className="px-3 py-2 text-right border">Đơn giá</th>
                                            <th className="px-3 py-2 text-right border">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTransfer.items.map(item => (
                                            <tr key={item.id}>
                                                <td className="px-3 py-2 border font-mono">{item.sku}</td>
                                                <td className="px-3 py-2 border">{item.product_name}</td>
                                                <td className="px-3 py-2 text-right border">{item.quantity_requested}</td>
                                                <td className="px-3 py-2 text-right border">{item.unit_cost.toLocaleString()}</td>
                                                <td className="px-3 py-2 text-right border font-medium">{item.line_total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-medium">
                                        <tr>
                                            <td colSpan={2} className="px-3 py-2 border">Tổng cộng:</td>
                                            <td className="px-3 py-2 text-right border">{selectedTransfer.total_quantity}</td>
                                            <td className="px-3 py-2 border"></td>
                                            <td className="px-3 py-2 text-right border text-lg">{selectedTransfer.total_value.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {/* Action buttons for pending */}
                        {selectedTransfer.status === 'pending' && (
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    ❌ Từ chối
                                </button>
                                <button
                                    onClick={() => handleApprove(selectedTransfer.id)}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    ✅ Duyệt phiếu
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-md p-6 m-4">
                        <h2 className="text-xl font-bold mb-4 text-red-600">Từ chối phiếu</h2>
                        <p className="text-gray-600 mb-4">Phiếu: <strong>{selectedTransfer.transfer_number}</strong></p>
                        <p className="text-sm text-gray-500 mb-4">
                            Sau khi từ chối, tồn kho sẽ KHÔNG thay đổi.
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lý do từ chối *</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                                rows={3}
                                placeholder="Vui lòng nhập lý do từ chối..."
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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
