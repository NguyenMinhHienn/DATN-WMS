import React, { useState, useEffect } from 'react';
import { stockTransferService } from '../../services/stockTransferService';
import { StockTransfer, PaginationInfo } from '../../interface';
import { Pagination } from '../../components/Pagination';


const InterWarehouseTransfer: React.FC = () => {
    const [transfers, setTransfers] = useState<StockTransfer[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState('');

    // Modal state
    const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => { loadTransfers(); }, [pagination.page, selectedStatus]);

    const loadTransfers = async () => {
        try {
            setLoading(true);
            const result = await stockTransferService.getTransfers(
                pagination.page,
                pagination.limit,
                selectedStatus || undefined,
                'TRANSFER'
            );
            setTransfers(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error('Failed to load transfers:', error);
        } finally {
            setLoading(false);
        }
    };

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

    // Đếm theo trạng thái
    const approvedCount = transfers.filter(t => t.status === 'approved').length;
    const pendingCount = transfers.filter(t => t.status === 'pending').length;

    return (
        <div className="animate-fadeIn p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">🔄 Phiếu Chuyển Kho</h1>
                    <p className="text-slate-600">Lịch sử và trạng thái các phiếu chuyển hàng giữa các kho</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                    <p className="text-sm text-gray-500">Đã chuyển</p>
                    <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-500">Chờ duyệt</p>
                    <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                    <p className="text-sm text-gray-500">Tổng phiếu</p>
                    <p className="text-2xl font-bold text-purple-600">{pagination.total}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-wrap gap-4">
                    <select
                        value={selectedStatus}
                        onChange={(e) => { setSelectedStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="input max-w-xs"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="pending">⏳ Chờ duyệt</option>
                        <option value="approved">✅ Đã duyệt</option>
                        <option value="rejected">❌ Từ chối</option>
                    </select>
                    <button
                        onClick={() => { setSelectedStatus(''); setPagination(p => ({ ...p, page: 1 })); }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Xóa bộ lọc
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Mã phiếu</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Kho nguồn</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Kho đích</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Ngày</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Số SP</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Người tạo</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Trạng thái</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transfers.map(transfer => (
                                    <tr key={transfer.id} className={`border-b border-slate-100 hover:bg-slate-50 ${transfer.status === 'pending' ? 'bg-yellow-50' : ''}`}>
                                        <td className="py-3 px-4 font-mono text-sm font-medium text-primary-600">{transfer.transfer_number}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{transfer.source_warehouse_name}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{transfer.destination_warehouse_name}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{new Date(transfer.transfer_date).toLocaleDateString('vi-VN')}</td>
                                        <td className="py-3 px-4 text-sm text-right">{transfer.total_items}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{transfer.created_by_name}</td>
                                        <td className="py-3 px-4 text-center">
                                            {getStatusBadge(transfer.status)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button
                                                onClick={() => handleViewDetail(transfer.id)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                Chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {transfers.length === 0 && (
                                    <tr><td colSpan={8} className="py-12 text-center text-slate-500">Không tìm thấy phiếu chuyển kho</td></tr>
                                )}
                            </tbody>
                        </table>
                        <div className="px-4 pb-4">
                            <Pagination pagination={pagination} onPageChange={(page) => setPagination(p => ({ ...p, page }))} />
                        </div>
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 m-4">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold">🔄 Chi tiết phiếu chuyển: {selectedTransfer.transfer_number}</h2>
                                <div className="flex gap-2 mt-2">
                                    {getStatusBadge(selectedTransfer.status)}
                                </div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                                ×
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                                <span className="text-gray-500">Kho nguồn:</span>
                                <p className="font-medium">{selectedTransfer.source_warehouse_name}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Kho đích:</span>
                                <p className="font-medium">{selectedTransfer.destination_warehouse_name}</p>
                            </div>
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

                        {/* Transfer Direction Visualization */}
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mb-4">
                            <div className="flex items-center justify-center gap-4">
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">Kho nguồn</p>
                                    <p className="font-bold text-purple-700">{selectedTransfer.source_warehouse_name}</p>
                                </div>
                                <div className="text-3xl text-purple-500">→</div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">Kho đích</p>
                                    <p className="font-bold text-purple-700">{selectedTransfer.destination_warehouse_name}</p>
                                </div>
                            </div>
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

                        <div className="flex justify-end pt-4 border-t">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
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

export default InterWarehouseTransfer;
