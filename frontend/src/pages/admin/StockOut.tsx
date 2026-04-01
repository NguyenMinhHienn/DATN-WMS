import React, { useState, useEffect } from 'react';
import { stockTransferService } from '../../services/stockTransferService';
import { StockTransfer, PaginationInfo } from '../../interface';
import { Pagination } from '../../components/Pagination';

const StockOut: React.FC = () => {
    // ==================== TRANSFERS STATE ====================
    const [transfers, setTransfers] = useState<StockTransfer[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // ==================== LOAD DATA ====================
    useEffect(() => {
        loadTransfers();
    }, [pagination.page, selectedStatus]);

    const loadTransfers = async () => {
        try {
            setLoading(true);
            const result = await stockTransferService.getTransfers(
                pagination.page,
                pagination.limit,
                selectedStatus || undefined,
                'EXPORT' // only export transfers
            );
            setTransfers(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error('Failed to load transfers:', error);
        } finally {
            setLoading(false);
        }
    };

    // ==================== TRANSFER ACTIONS ====================
    const handleViewDetail = async (id: number) => {
        try {
            const detail = await stockTransferService.getTransferById(id);
            setSelectedTransfer(detail);
            setShowDetailModal(true);
        } catch (error) {
            alert('Không thể tải chi tiết phiếu chuyển');
        }
    };

    const handleApproveTransfer = async (id: number) => {
        if (!window.confirm('Bạn có chắc muốn duyệt phiếu xuất luân chuyển này? Tồn kho xuất sẽ bị trừ.')) return;
        try {
            await stockTransferService.approveTransfer(id);
            alert('Duyệt thành công!');
            loadTransfers();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Duyệt thất bại');
        }
    };

    const handleRejectTransfer = async (id: number) => {
        if (!window.confirm('Từ chối phiếu luân chuyển này?')) return;
        try {
            await stockTransferService.rejectTransfer(id);
            alert('Đã từ chối');
            loadTransfers();
        } catch (error: any) {
            alert('Từ chối thất bại');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'pending': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            'approved': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            'rejected': 'bg-red-500/20 text-red-400 border-red-500/30',
        };
        const labels: Record<string, string> = {
            'pending': '⏳ Chờ duyệt xuất',
            'approved': '✅ Đã xuất',
            'rejected': '❌ Từ chối',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || 'bg-slate-500/20'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">
                        <span className="gradient-text">🚚 Phiếu Xuất Luân Chuyển</span>
                    </h1>
                    <p className="text-slate-400 mt-1">Duyệt các phiếu yêu cầu chuyển từ kho khác</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="chart-container border-l-4 border-amber-500">
                    <p className="text-sm text-slate-400">Chờ duyệt xuất</p>
                    <p className="text-2xl font-bold text-amber-400">{transfers.filter(t => t.status === 'pending').length}</p>
                </div>
                <div className="chart-container border-l-4 border-emerald-500">
                    <p className="text-sm text-slate-400">Đã duyệt xuất</p>
                    <p className="text-2xl font-bold text-emerald-400">{transfers.filter(t => t.status === 'approved').length}</p>
                </div>
                <div className="chart-container border-l-4 border-indigo-500">
                    <p className="text-sm text-slate-400">Tổng phiếu luân chuyển</p>
                    <p className="text-2xl font-bold text-indigo-400">{pagination.total}</p>
                </div>
            </div>

            {/* Content: Transfers Table */}
            <div className="chart-container p-0 overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-700/50 flex flex-wrap gap-4 items-center">
                    <select
                        value={selectedStatus}
                        onChange={(e) => { setSelectedStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="input max-w-xs"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="pending">⏳ Chờ duyệt xuất</option>
                        <option value="approved">✅ Đã xuất</option>
                        <option value="rejected">❌ Đã từ chối</option>
                    </select>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kho nguồn (Xuất)</th>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kho đích (Nhận)</th>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Người yêu cầu</th>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Đơn hàng</th>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Ngày tạo</th>
                                    <th className="text-center py-4 px-6 text-sm font-medium text-slate-300">Tổng SP</th>
                                    <th className="text-center py-4 px-6 text-sm font-medium text-slate-300">Trạng thái</th>
                                    <th className="text-center py-4 px-6 text-sm font-medium text-slate-300">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transfers.map(transfer => (
                                    <tr key={transfer.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                                        <td className="py-4 px-6 text-sm text-orange-400 font-medium">{transfer.source_warehouse_name || '-'}</td>
                                        <td className="py-4 px-6 text-sm text-emerald-400 font-medium">{transfer.destination_warehouse_name}</td>
                                        <td className="py-4 px-6 text-sm text-white">{transfer.created_by_name}</td>
                                        <td className="py-4 px-6 text-sm font-mono text-indigo-300">{transfer.order_id ? `#${transfer.order_id}` : '-'}</td>
                                        <td className="py-4 px-6 text-sm text-slate-400">{new Date(transfer.created_at).toLocaleDateString('vi-VN')}</td>
                                        <td className="py-4 px-6 text-sm text-center font-bold text-white">{transfer.total_quantity}</td>
                                        <td className="py-4 px-6 text-center">{getStatusBadge(transfer.status)}</td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleViewDetail(transfer.id)}
                                                    className="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 text-xs transition-colors"
                                                >
                                                    Chi tiết
                                                </button>
                                                {transfer.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproveTransfer(transfer.id)}
                                                            className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs transition-colors"
                                                        >
                                                            Duyệt xuất
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectTransfer(transfer.id)}
                                                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs transition-colors"
                                                        >
                                                            Từ chối
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {transfers.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-500">Không có phiếu luân chuyển nào</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="p-4 border-t border-slate-700/50">
                    <Pagination pagination={pagination} onPageChange={(page) => setPagination(p => ({ ...p, page }))} />
                </div>
            </div>

            {/* DETAIL MODAL TRANSFERS */}
            {showDetailModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowDetailModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
                        >
                            ✕
                        </button>
                        <h2 className="text-xl font-bold mb-6 text-white text-center">Chi tiết yêu cầu luân chuyển #{selectedTransfer.id}</h2>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <p className="text-slate-400 text-sm mb-1">Kho xuất (Nguồn)</p>
                                <p className="font-bold text-orange-400">{selectedTransfer.source_warehouse_name || '-'}</p>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <p className="text-slate-400 text-sm mb-1">Kho nhận (Đích)</p>
                                <p className="font-bold text-emerald-400">{selectedTransfer.destination_warehouse_name}</p>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <p className="text-slate-400 text-sm mb-1">Người yêu cầu</p>
                                <p className="font-medium text-white">{selectedTransfer.created_by_name}</p>
                            </div>
                            {selectedTransfer.order_id && (
                                <div className="bg-slate-900/50 p-4 rounded-lg">
                                    <p className="text-slate-400 text-sm mb-1">Đơn hàng</p>
                                    <p className="font-medium text-indigo-400 font-mono">#{selectedTransfer.order_id}</p>
                                </div>
                            )}
                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <p className="text-slate-400 text-sm mb-1">Trạng thái</p>
                                <div>{getStatusBadge(selectedTransfer.status)}</div>
                            </div>
                        </div>

                        {selectedTransfer.notes && (
                            <div className="mb-6 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                <span className="text-slate-400 text-sm">Ghi chú: </span>
                                <span className="text-white">{selectedTransfer.notes}</span>
                            </div>
                        )}

                        <div className="mb-6">
                            <h3 className="font-bold mb-3 text-white">Sản phẩm yêu cầu ({selectedTransfer.items?.length || 0})</h3>
                            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-900/80">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Sản phẩm</th>
                                            <th className="px-4 py-3 text-left">Phân loại</th>
                                            <th className="px-4 py-3 text-right">Số lượng</th>
                                            <th className="px-4 py-3 text-left">Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTransfer.items?.map((item) => (
                                            <tr key={item.id} className="border-t border-slate-700/50">
                                                <td className="px-4 py-3 font-medium text-white">{item.product_name}</td>
                                                <td className="px-4 py-3 text-slate-300">
                                                    {item.sku || '-'} {item.variant_name ? `- ${item.variant_name}` : ''}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-white">{item.quantity_requested}</td>
                                                <td className="px-4 py-3 text-slate-400">{item.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {selectedTransfer.status === 'pending' && (
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50 mt-4">
                                <button
                                    onClick={() => handleRejectTransfer(selectedTransfer.id)}
                                    className="px-6 py-2.5 bg-red-600/20 text-red-500 border border-red-500/50 rounded-xl hover:bg-red-600/40 transition-colors font-medium"
                                >
                                    Từ chối yêu cầu
                                </button>
                                <button
                                    onClick={() => handleApproveTransfer(selectedTransfer.id)}
                                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-lg shadow-emerald-500/30"
                                >
                                    Duyệt phiếu xuất
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockOut;
