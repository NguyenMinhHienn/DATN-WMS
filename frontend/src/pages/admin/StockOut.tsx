import React, { useState, useEffect } from 'react';
import { stockTransferService } from '../../services/stockTransferService';
import { StockTransfer, PaginationInfo } from '../../interface';
import { Pagination } from '../../components/Pagination';


const StockOut: React.FC = () => {
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
                'EXPORT'
            );
            setTransfers(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error('Failed to load exports:', error);
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
            'pending': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            'approved': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            'rejected': 'bg-red-500/20 text-red-400 border-red-500/30',
        };
        const labels: Record<string, string> = {
            'pending': '⏳ Chờ duyệt',
            'approved': '✅ Đã duyệt',
            'rejected': '❌ Từ chối',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || 'bg-slate-500/20'}`}>
                {labels[status] || status}
            </span>
        );
    };

    // Đếm theo trạng thái
    const approvedCount = transfers.filter(t => t.status === 'approved').length;
    const pendingCount = transfers.filter(t => t.status === 'pending').length;

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">
                        <span className="gradient-text">📤 Phiếu Xuất Kho</span>
                    </h1>
                    <p className="text-slate-400 mt-1">Lịch sử và trạng thái các phiếu xuất hàng từ kho</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="chart-container border-l-4 border-emerald-500">
                    <p className="text-sm text-slate-400">Đã xuất kho</p>
                    <p className="text-2xl font-bold text-emerald-400">{approvedCount}</p>
                </div>
                <div className="chart-container border-l-4 border-amber-500">
                    <p className="text-sm text-slate-400">Chờ duyệt</p>
                    <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
                </div>
                <div className="chart-container border-l-4 border-orange-500">
                    <p className="text-sm text-slate-400">Tổng phiếu</p>
                    <p className="text-2xl font-bold text-orange-400">{pagination.total}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="chart-container mb-6">
                <div className="flex flex-wrap gap-4 items-center">
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
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        Xóa bộ lọc
                    </button>
                </div>
            </div>

            {/* Table */}
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
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Mã phiếu</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kho xuất</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Ngày</th>
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Số SP</th>
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Tổng tiền</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Người tạo</th>
                                        <th className="text-center py-4 px-6 text-sm font-medium text-slate-300">Trạng thái</th>
                                        <th className="text-center py-4 px-6 text-sm font-medium text-slate-300">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transfers.map(transfer => (
                                        <tr key={transfer.id} className={`border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors ${transfer.status === 'pending' ? 'bg-amber-500/5' : ''}`}>
                                            <td className="py-4 px-6 font-mono text-sm font-medium text-orange-400">{transfer.transfer_number}</td>
                                            <td className="py-4 px-6 text-sm text-slate-300">{transfer.source_warehouse_name}</td>
                                            <td className="py-4 px-6 text-sm text-slate-400">{new Date(transfer.transfer_date).toLocaleDateString('vi-VN')}</td>
                                            <td className="py-4 px-6 text-sm text-right text-white">{transfer.total_items}</td>
                                            <td className="py-4 px-6 text-sm text-right font-medium text-red-400">{new Intl.NumberFormat('vi-VN').format(transfer.total_value)} đ</td>
                                            <td className="py-4 px-6 text-sm text-slate-300">{transfer.created_by_name}</td>
                                            <td className="py-4 px-6 text-center">
                                                {getStatusBadge(transfer.status)}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button
                                                    onClick={() => handleViewDetail(transfer.id)}
                                                    className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                                                >
                                                    Chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {transfers.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <span className="text-4xl opacity-50">📤</span>
                                                    <p className="text-slate-500">Không tìm thấy phiếu xuất kho</p>
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

            {/* Detail Modal */}
            {showDetailModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 m-4 border border-slate-700/50 shadow-2xl shadow-orange-500/10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">📤 Chi tiết phiếu xuất: {selectedTransfer.transfer_number}</h2>
                                <div className="flex gap-2 mt-2">
                                    {getStatusBadge(selectedTransfer.status)}
                                </div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-white text-2xl transition-colors">
                                ×
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                                <span className="text-slate-500">Kho xuất:</span>
                                <p className="font-medium text-white">{selectedTransfer.source_warehouse_name}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Ngày:</span>
                                <p className="font-medium text-white">{new Date(selectedTransfer.transfer_date).toLocaleDateString('vi-VN')}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Người tạo:</span>
                                <p className="font-medium text-white">{selectedTransfer.created_by_name}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Tổng giá trị:</span>
                                <p className="font-medium text-lg text-red-400">{selectedTransfer.total_value.toLocaleString()} đ</p>
                            </div>
                            {selectedTransfer.reason && (
                                <div className="col-span-2">
                                    <span className="text-slate-500">Lý do:</span>
                                    <p className="font-medium text-white">{selectedTransfer.reason}</p>
                                </div>
                            )}
                        </div>

                        {selectedTransfer.status === 'rejected' && selectedTransfer.rejection_reason && (
                            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg mb-4">
                                <p className="text-red-400">
                                    <strong>Lý do từ chối:</strong> {selectedTransfer.rejection_reason}
                                </p>
                            </div>
                        )}

                        {/* Items table */}
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
                                                    <td className="px-4 py-3 font-mono text-orange-300">{item.sku}</td>
                                                    <td className="px-4 py-3 text-white">{item.product_name}</td>
                                                    <td className="px-4 py-3 text-right text-white">{item.quantity_requested}</td>
                                                    <td className="px-4 py-3 text-right text-slate-300">{item.unit_cost.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-red-400">{item.line_total.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-700/50 font-medium">
                                            <tr>
                                                <td colSpan={2} className="px-4 py-3 text-slate-300">Tổng cộng:</td>
                                                <td className="px-4 py-3 text-right text-white">{selectedTransfer.total_quantity}</td>
                                                <td className="px-4 py-3"></td>
                                                <td className="px-4 py-3 text-right text-lg text-red-400">{selectedTransfer.total_value.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-slate-700/50">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="btn btn-secondary"
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

export default StockOut;
