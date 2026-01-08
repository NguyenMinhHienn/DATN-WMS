import React, { useState, useEffect } from 'react';
import { stockService } from '../../services/stockService';
import { warehouseService } from '../../services/warehouseService';
import { GoodsIssue, Warehouse, PaginationInfo } from '../../interface';
import { Pagination } from '../../components/Pagination';

const StockOut: React.FC = () => {
    const [issues, setIssues] = useState<GoodsIssue[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedWarehouse, setSelectedWarehouse] = useState<number | undefined>();
    const [selectedStatus, setSelectedStatus] = useState('');

    useEffect(() => { loadWarehouses(); }, []);
    useEffect(() => { loadIssues(); }, [pagination.page, selectedWarehouse, selectedStatus]);

    const loadIssues = async () => {
        try {
            setLoading(true);
            const result = await stockService.getIssues(pagination.page, pagination.limit, selectedWarehouse, selectedStatus || undefined);
            setIssues(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error('Failed to load issues:', error);
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

    const handleShip = async (id: number) => {
        if (!confirm('Ship this issue and deduct from inventory?')) return;
        try {
            await stockService.shipIssue(id);
            loadIssues();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to ship issue');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'shipped': case 'delivered': return 'bg-emerald-100 text-emerald-700';
            case 'pending': case 'picking': return 'bg-amber-100 text-amber-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-700';
            case 'high': return 'bg-orange-100 text-orange-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Phiếu xuất kho</h1>
                    <p className="text-slate-600">Quản lý xuất hàng</p>
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
                        <option value="picking">Đang lấy hàng</option>
                        <option value="shipped">Đã gửi</option>
                        <option value="delivered">Đã giao</option>
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
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Khách hàng</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Ngày</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Ưu tiên</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Trạng thái</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {issues.map(issue => (
                                    <tr key={issue.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-3 px-4 font-mono text-sm font-medium text-primary-600">{issue.issue_number}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600 capitalize">{issue.issue_type}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{issue.warehouse_name}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{issue.customer_name || '-'}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{new Date(issue.issue_date).toLocaleDateString()}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(issue.priority)}`}>{issue.priority}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(issue.status)}`}>{issue.status}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {(issue.status === 'draft' || issue.status === 'pending' || issue.status === 'picking') && (
                                                <button onClick={() => handleShip(issue.id)} className="btn btn-primary text-xs px-3 py-1">Xuất kho</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {issues.length === 0 && (
                                    <tr><td colSpan={8} className="py-12 text-center text-slate-500">Không tìm thấy phiếu xuất</td></tr>
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

export default StockOut;
