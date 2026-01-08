import React, { useState, useEffect } from 'react';
import { stockService } from '../../services/stockService';
import { warehouseService } from '../../services/warehouseService';
import { GoodsReceipt, Warehouse, PaginationInfo } from '../../interface';
import { Pagination } from '../../components/Pagination';

const StockIn: React.FC = () => {
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedWarehouse, setSelectedWarehouse] = useState<number | undefined>();
    const [selectedStatus, setSelectedStatus] = useState('');

    useEffect(() => { loadWarehouses(); }, []);
    useEffect(() => { loadReceipts(); }, [pagination.page, selectedWarehouse, selectedStatus]);

    const loadReceipts = async () => {
        try {
            setLoading(true);
            const result = await stockService.getReceipts(pagination.page, pagination.limit, selectedWarehouse, selectedStatus || undefined);
            setReceipts(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error('Failed to load receipts:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadWarehouses = async () => {
        try {
            const data = await warehouseService.getAll();
            setWarehouses(data);
        } catch (error) {
            console.error('Failed to load warehouses:', error);
        }
    };

    const handleComplete = async (id: number) => {
        if (!confirm('Complete this receipt and update inventory?')) return;
        try {
            await stockService.completeReceipt(id);
            loadReceipts();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to complete receipt');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-100 text-emerald-700';
            case 'pending': return 'bg-amber-100 text-amber-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Phếu nhập kho</h1>
                    <p className="text-slate-600">Quản lý nhập hàng</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-wrap gap-4">
                    <select value={selectedWarehouse || ''} onChange={(e) => { setSelectedWarehouse(e.target.value ? parseInt(e.target.value) : undefined); setPagination(p => ({ ...p, page: 1 })); }} className="input max-w-xs">
                        <option value="">Tất cả các kho</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="input max-w-xs">
                        <option value="">Tất cả trạng thái</option>
                        <option value="draft">Nháp</option>
                        <option value="pending">Chờ duyệt</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
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
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Loại</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Kho</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Ngày</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Số SP</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Tổng tiền</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Trạng thái</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receipts.map(receipt => (
                                    <tr key={receipt.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-3 px-4 font-mono text-sm font-medium text-primary-600">{receipt.receipt_number}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600 capitalize">{receipt.receipt_type}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{receipt.warehouse_name}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{new Date(receipt.receipt_date).toLocaleDateString()}</td>
                                        <td className="py-3 px-4 text-sm text-right">{receipt.total_items}</td>
                                        <td className="py-3 px-4 text-sm text-right font-medium">{new Intl.NumberFormat('vi-VN').format(receipt.total_amount)}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(receipt.status)}`}>{receipt.status}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {(receipt.status === 'draft' || receipt.status === 'pending') && (
                                                <button onClick={() => handleComplete(receipt.id)} className="btn btn-success text-xs px-3 py-1">Hoàn thành</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {receipts.length === 0 && (
                                    <tr><td colSpan={8} className="py-12 text-center text-slate-500">Không tìm thấy phiếu nhập</td></tr>
                                )}
                            </tbody>
                        </table>
                        <div className="px-4 pb-4">
                            <Pagination pagination={pagination} onPageChange={(page) => setPagination(p => ({ ...p, page }))} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StockIn;
