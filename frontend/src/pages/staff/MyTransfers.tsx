import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stockTransferService } from '../../services/stockTransferService';
import { StockTransfer, PaginationInfo } from '../../interface';
import { numberToWords } from '../../utils/numberToWords';

/**
 * MyTransfers - Xem danh sách phiếu đã tạo (cho STAFF)
 * Light theme modern với màu sắc tươi sáng
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
            'pending': 'bg-amber-100 text-amber-700 border border-amber-200',
            'approved': 'bg-green-100 text-green-700 border border-green-200',
            'rejected': 'bg-red-100 text-red-700 border border-red-200',
        };
        const labels: Record<string, string> = {
            'pending': '⏳ Chờ duyệt',
            'approved': '✅ Đã duyệt',
            'rejected': '❌ Từ chối',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const getTypeBadge = (type: string) => {
        const configs: Record<string, { className: string; label: string }> = {
            'IMPORT': { className: 'bg-green-100 text-green-700 border border-green-200', label: '📥 Nhập kho' },
            'EXPORT': { className: 'bg-orange-100 text-orange-700 border border-orange-200', label: '📤 Xuất kho' },
            'TRANSFER': { className: 'bg-purple-100 text-purple-700 border border-purple-200', label: '🔄 Chuyển kho' },
        };
        const config = configs[type] || { className: 'bg-gray-100 text-gray-700', label: type };
        return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
    };

    if (loading && transfers.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <span className="text-2xl">📋</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Phiếu đã tạo</h1>
                        <p className="text-slate-500">Theo dõi trạng thái các phiếu bạn đã gửi</p>
                    </div>
                </div>
            </div>

            {/* Filter & Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-5 mb-6 border border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-slate-600">Lọc theo trạng thái:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        >
                            <option value="">Tất cả</option>
                            <option value="pending">Chờ duyệt</option>
                            <option value="approved">Đã duyệt</option>
                            <option value="rejected">Từ chối</option>
                        </select>
                    </div>
                    <Link
                        to="/staff/create-transfer"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                    >
                        ➕ Tạo phiếu mới
                    </Link>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Mã phiếu</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Loại</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Kho</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Số lượng</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Trạng thái</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Ngày tạo</th>
                                <th className="text-right py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center">
                                        <div className="flex justify-center">
                                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : transfers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="text-5xl opacity-50">📋</span>
                                            <p className="text-slate-500 font-medium">Bạn chưa tạo phiếu nào</p>
                                            <Link
                                                to="/staff/create-transfer"
                                                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                            >
                                                ➕ Tạo phiếu đầu tiên
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                transfers.map((transfer) => (
                                    <tr key={transfer.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <span className="font-mono text-sm font-semibold text-indigo-600">
                                                {transfer.transfer_number}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">{getTypeBadge(transfer.transfer_type)}</td>
                                        <td className="py-4 px-6 text-slate-700">
                                            {transfer.transfer_type === 'IMPORT' && transfer.destination_warehouse_name}
                                            {transfer.transfer_type === 'EXPORT' && transfer.source_warehouse_name}
                                            {transfer.transfer_type === 'TRANSFER' && (
                                                <span className="flex items-center gap-2">
                                                    <span>{transfer.source_warehouse_name}</span>
                                                    <span className="text-indigo-500 font-bold">→</span>
                                                    <span>{transfer.destination_warehouse_name}</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-slate-700">
                                            <span className="font-semibold">{transfer.total_quantity}</span>
                                            <span className="text-slate-400 ml-1">({transfer.total_items} SP)</span>
                                        </td>
                                        <td className="py-4 px-6">{getStatusBadge(transfer.status)}</td>
                                        <td className="py-4 px-6 text-slate-500">
                                            {new Date(transfer.created_at).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button
                                                onClick={() => viewDetail(transfer.id)}
                                                className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-lg transition-all"
                                            >
                                                Xem chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                        <span className="text-sm text-slate-500">
                            Hiển thị {transfers.length} / {pagination.total} phiếu
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                disabled={pagination.page === 1}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                ← Trước
                            </button>
                            <span className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                disabled={pagination.page === pagination.totalPages}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Sau →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedTransfer && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4 shadow-2xl">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Phiếu: {selectedTransfer.transfer_number}</h2>
                                <div className="flex gap-2 mt-3">
                                    {getTypeBadge(selectedTransfer.transfer_type)}
                                    {getStatusBadge(selectedTransfer.status)}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTransfer(null)}
                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Thông tin chung */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><span>📄</span> Thông tin chung</h3>
                                    <div className="space-y-3 text-sm">
                                        {selectedTransfer.transfer_type === 'IMPORT' && selectedTransfer.destination_warehouse_name && (
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">Kho nhập:</span>
                                                <span className="font-medium text-slate-800">{selectedTransfer.destination_warehouse_name}</span>
                                            </div>
                                        )}
                                        {selectedTransfer.transfer_type === 'EXPORT' && selectedTransfer.source_warehouse_name && (
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">Kho xuất:</span>
                                                <span className="font-medium text-slate-800">{selectedTransfer.source_warehouse_name}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between border-b border-slate-100 pb-2">
                                            <span className="text-slate-500">📍 Địa chỉ kho:</span>
                                            <span className="font-medium text-slate-800 text-right text-sm">Số 1, Phố Trịnh Văn Bô, Phương Canh, Hà Nội</span>
                                        </div>
                                        {selectedTransfer.transfer_type === 'TRANSFER' && (
                                            <>
                                                {selectedTransfer.source_warehouse_name && (
                                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                                        <span className="text-slate-500">Kho nguồn:</span>
                                                        <span className="font-medium text-slate-800">{selectedTransfer.source_warehouse_name}</span>
                                                    </div>
                                                )}
                                                {selectedTransfer.destination_warehouse_name && (
                                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                                        <span className="text-slate-500">Kho đích:</span>
                                                        <span className="font-medium text-slate-800">{selectedTransfer.destination_warehouse_name}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        <div className="flex justify-between border-b border-slate-100 pb-2">
                                            <span className="text-slate-500">Ngày tạo:</span>
                                            <span className="font-medium text-slate-800">{new Date(selectedTransfer.transfer_date).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-100 pb-2">
                                            <span className="text-slate-500">Ghi chú:</span>
                                            <span className="font-medium text-slate-800">{selectedTransfer.reason || selectedTransfer.notes || '-'}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-slate-200 mt-2">
                                            <span className="text-slate-600 font-medium">Tổng giá trị:</span>
                                            <div className="text-right">
                                                <div className="font-bold text-green-600 text-base">{selectedTransfer.total_value.toLocaleString()} đ</div>
                                                <div className="text-xs text-slate-500 italic mt-0.5">{numberToWords(selectedTransfer.total_value)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Thông tin nghiệp vụ */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><span>🏢</span> Thông tin nghiệp vụ</h3>
                                    <div className="space-y-3 text-sm">
                                        {selectedTransfer.transfer_type === 'IMPORT' && (
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">Nhà cung cấp:</span>
                                                <span className="font-medium text-slate-800">{selectedTransfer.supplier_name || '-'}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between border-b border-slate-100 pb-2">
                                            <span className="text-slate-500">Người giao hàng:</span>
                                            <span className="font-medium text-slate-800">{selectedTransfer.delivery_person || '-'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-100 pb-2">
                                            <span className="text-slate-500">Người lập phiếu:</span>
                                            <span className="font-medium text-slate-800">{selectedTransfer.created_by_name || '-'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-100 pb-2">
                                            <span className="text-slate-500">Thủ kho:</span>
                                            <span className="font-medium text-slate-800">{selectedTransfer.storekeeper || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Người duyệt:</span>
                                            <span className="font-medium text-slate-800">{selectedTransfer.approved_by_name || '-'}</span>
                                        </div>

                                        {selectedTransfer.transfer_type === 'EXPORT' && (
                                            <>
                                                <div className="flex justify-between border-t border-slate-100 pt-3">
                                                    <span className="text-slate-500">Người nhận hàng:</span>
                                                    <span className="font-medium text-slate-800">{selectedTransfer.receiver_name || '-'}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                                    <span className="text-slate-500">📞 SĐT người nhận:</span>
                                                    <span className="font-medium text-slate-800">{selectedTransfer.receiver_phone || '-'}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                                    <span className="text-slate-500">🏠 Địa chỉ người nhận:</span>
                                                    <span className="font-medium text-slate-800 text-right">{selectedTransfer.receiver_address || '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Phòng ban (nội bộ):</span>
                                                    <span className="font-medium text-slate-800">{selectedTransfer.receiver_department || '-'}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {selectedTransfer.status === 'rejected' && selectedTransfer.rejection_reason && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                                    <p className="text-red-700">
                                        <strong className="text-red-800">Lý do từ chối:</strong> {selectedTransfer.rejection_reason}
                                    </p>
                                </div>
                            )}

                            {selectedTransfer.items && selectedTransfer.items.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <span className="w-6 h-6 bg-indigo-100 rounded flex items-center justify-center text-sm">📦</span>
                                        Danh sách sản phẩm
                                    </h3>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">SKU</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tên SP</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">SL</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Đơn giá</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedTransfer.items.map(item => (
                                                    <tr key={item.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 text-slate-500 font-mono">{item.sku}</td>
                                                        <td className="px-4 py-3 text-slate-800 font-medium">{item.product_name}</td>
                                                        <td className="px-4 py-3 text-right text-slate-800 font-semibold">{item.quantity_requested}</td>
                                                        <td className="px-4 py-3 text-right text-green-600 font-medium">{item.unit_cost.toLocaleString()} đ</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedTransfer(null)}
                                className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTransfers;
