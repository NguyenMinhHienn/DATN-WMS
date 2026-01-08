import React, { useState, useEffect } from 'react';
import { stockTransferService } from '../../services/stockTransferService';
import { StockTransfer, PaginationInfo } from '../../interface';

/**
 * MyTransfers - Xem danh sách phiếu đã tạo (cho STAFF)
 * STAFF chỉ xem được phiếu của mình, KHÔNG có nút duyệt/từ chối
 */
const MyTransfers: React.FC = () => {
    const [transfers, setTransfers] = useState<StockTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

    useEffect(() => {
        loadTransfers();
    }, [pagination.page, statusFilter]);

    const loadTransfers = async () => {
        setLoading(true);
        try {
            const result = await stockTransferService.getTransfers(
                pagination.page,
                pagination.limit,
                statusFilter || undefined
            );
            setTransfers(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error('Failed to load transfers:', error);
        } finally {
            setLoading(false);
        }
    };

    const viewDetail = async (id: number) => {
        try {
            const detail = await stockTransferService.getTransferById(id);
            setSelectedTransfer(detail);
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

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Phiếu đã tạo</h1>
                <p className="text-slate-600">Theo dõi trạng thái các phiếu bạn đã gửi</p>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-xl shadow p-4 mb-6">
                <div className="flex items-center gap-4">
                    <label className="text-sm text-slate-600">Lọc theo trạng thái:</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                    >
                        <option value="">Tất cả</option>
                        <option value="pending">Chờ duyệt</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="rejected">Từ chối</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Mã phiếu</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Loại</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Kho</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Số lượng</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Trạng thái</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ngày tạo</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Chi tiết</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                    <div className="flex justify-center">
                                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                </td>
                            </tr>
                        ) : transfers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                    Bạn chưa tạo phiếu nào
                                </td>
                            </tr>
                        ) : (
                            transfers.map((transfer) => (
                                <tr key={transfer.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {transfer.transfer_number}
                                    </td>
                                    <td className="px-6 py-4">{getTypeBadge(transfer.transfer_type)}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {transfer.transfer_type === 'IMPORT' && transfer.destination_warehouse_name}
                                        {transfer.transfer_type === 'EXPORT' && transfer.source_warehouse_name}
                                        {transfer.transfer_type === 'TRANSFER' && (
                                            <>{transfer.source_warehouse_name} → {transfer.destination_warehouse_name}</>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {transfer.total_quantity} ({transfer.total_items} SP)
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(transfer.status)}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {new Date(transfer.created_at).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => viewDetail(transfer.id)}
                                            className="text-emerald-600 hover:text-emerald-800 font-medium"
                                        >
                                            Xem
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex justify-between items-center">
                        <span className="text-sm text-slate-600">
                            Hiển thị {transfers.length} / {pagination.total} phiếu
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                disabled={pagination.page === 1}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                                Trước
                            </button>
                            <span className="px-3 py-1">{pagination.page} / {pagination.totalPages}</span>
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                disabled={pagination.page === pagination.totalPages}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedTransfer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 m-4">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold">Phiếu: {selectedTransfer.transfer_number}</h2>
                                <div className="flex gap-2 mt-2">
                                    {getTypeBadge(selectedTransfer.transfer_type)}
                                    {getStatusBadge(selectedTransfer.status)}
                                </div>
                            </div>
                            <button onClick={() => setSelectedTransfer(null)} className="text-slate-400 hover:text-slate-600 text-2xl">
                                ×
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            {selectedTransfer.source_warehouse_name && (
                                <div>
                                    <span className="text-slate-500">Kho nguồn:</span>
                                    <p className="font-medium">{selectedTransfer.source_warehouse_name}</p>
                                </div>
                            )}
                            {selectedTransfer.destination_warehouse_name && (
                                <div>
                                    <span className="text-slate-500">Kho đích:</span>
                                    <p className="font-medium">{selectedTransfer.destination_warehouse_name}</p>
                                </div>
                            )}
                            <div>
                                <span className="text-slate-500">Ngày:</span>
                                <p className="font-medium">{new Date(selectedTransfer.transfer_date).toLocaleDateString('vi-VN')}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Tổng giá trị:</span>
                                <p className="font-medium">{selectedTransfer.total_value.toLocaleString()} đ</p>
                            </div>
                        </div>

                        {selectedTransfer.status === 'rejected' && selectedTransfer.rejection_reason && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                                <p className="text-red-700">
                                    <strong>Lý do từ chối:</strong> {selectedTransfer.rejection_reason}
                                </p>
                            </div>
                        )}

                        {selectedTransfer.items && selectedTransfer.items.length > 0 && (
                            <div>
                                <h3 className="font-medium mb-2">Danh sách sản phẩm</h3>
                                <table className="w-full border text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left border">SKU</th>
                                            <th className="px-3 py-2 text-left border">Tên SP</th>
                                            <th className="px-3 py-2 text-right border">SL</th>
                                            <th className="px-3 py-2 text-right border">Đơn giá</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTransfer.items.map(item => (
                                            <tr key={item.id}>
                                                <td className="px-3 py-2 border">{item.sku}</td>
                                                <td className="px-3 py-2 border">{item.product_name}</td>
                                                <td className="px-3 py-2 text-right border">{item.quantity_requested}</td>
                                                <td className="px-3 py-2 text-right border">{item.unit_cost.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTransfers;
