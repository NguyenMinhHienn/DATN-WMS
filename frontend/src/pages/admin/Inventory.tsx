import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { warehouseService } from '../../services/warehouseService';
import { Inventory, Warehouse, PaginationInfo } from '../../interface';
import { Pagination } from '../../components/Pagination';

const InventoryPage: React.FC = () => {
    const [inventory, setInventory] = useState<Inventory[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedWarehouse, setSelectedWarehouse] = useState<number | undefined>();
    const [lowStock, setLowStock] = useState<any[]>([]);
    const [showLowStockDetail, setShowLowStockDetail] = useState(false);

    useEffect(() => { loadWarehouses(); loadLowStock(); }, []);
    useEffect(() => { loadInventory(); }, [pagination.page, selectedWarehouse]);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const result = await inventoryService.getAll(pagination.page, pagination.limit, selectedWarehouse);
            setInventory(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error('Failed to load inventory:', error);
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

    const loadLowStock = async () => {
        try {
            const data = await inventoryService.getLowStock();
            setLowStock(data);
        } catch (error) {
            console.error('Failed to load low stock:', error);
        }
    };

    // Tính mức độ nghiêm trọng: tồn kho / mức tối thiểu
    const getStockSeverity = (quantity: number, minLevel: number) => {
        if (minLevel === 0) return { label: 'Thấp', color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' };
        const ratio = quantity / minLevel;
        if (ratio === 0) return { label: 'Hết hàng', color: 'text-red-400 bg-red-500/20 border-red-500/30' };
        if (ratio <= 0.3) return { label: 'Rất thấp', color: 'text-red-400 bg-red-500/20 border-red-500/30' };
        if (ratio <= 0.6) return { label: 'Thấp', color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' };
        return { label: 'Cận mức', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' };
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold">
                    <span className="gradient-text">Tồn kho</span>
                </h1>
                <p className="text-slate-400 mt-1">Theo dõi tồn kho tại các kho hàng</p>
            </div>

            {/* Low Stock Alert - Accordion */}
            {lowStock.length > 0 && (
                <div className="chart-container mb-6 border-l-4 border-red-500 bg-red-500/10 !p-0 overflow-hidden">
                    {/* Header - luôn hiển thị */}
                    <button
                        onClick={() => setShowLowStockDetail(!showLowStockDetail)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-500/5 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-3xl animate-pulse">⚠️</span>
                            <div className="text-left">
                                <h3 className="font-semibold text-red-400">Cảnh báo sắp hết hàng</h3>
                                <p className="text-sm text-red-300/80">{lowStock.length} sản phẩm dưới mức đặt hàng lại</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-red-400">
                            <span className="text-sm font-medium">{showLowStockDetail ? 'Thu gọn' : 'Xem chi tiết'}</span>
                            <span className={`text-lg transition-transform duration-300 ${showLowStockDetail ? 'rotate-180' : ''}`}>▼</span>
                        </div>
                    </button>

                    {/* Detail - accordion content */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showLowStockDetail ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="border-t border-red-500/20">
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-800/50 sticky top-0 z-10">
                                        <tr>
                                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-300 uppercase">Sản phẩm</th>
                                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-300 uppercase">SKU</th>
                                            <th className="text-right py-3 px-5 text-xs font-medium text-slate-300 uppercase">Tồn kho</th>
                                            <th className="text-right py-3 px-5 text-xs font-medium text-slate-300 uppercase">Mức tối thiểu</th>
                                            <th className="text-right py-3 px-5 text-xs font-medium text-slate-300 uppercase">Mức đặt lại</th>
                                            <th className="text-center py-3 px-5 text-xs font-medium text-slate-300 uppercase">Mức độ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowStock.map((item: any) => {
                                            const severity = getStockSeverity(item.total_quantity, item.min_stock_level);
                                            return (
                                                <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                                                    <td className="py-3 px-5">
                                                        <span className="font-medium text-white">{item.name}</span>
                                                    </td>
                                                    <td className="py-3 px-5">
                                                        <span className="text-xs text-indigo-300 font-mono bg-indigo-500/10 px-2 py-1 rounded">{item.sku}</span>
                                                    </td>
                                                    <td className="py-3 px-5 text-right">
                                                        <span className={`font-bold ${item.total_quantity === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                                                            {item.total_quantity}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-5 text-right text-slate-400">{item.min_stock_level}</td>
                                                    <td className="py-3 px-5 text-right text-slate-400">{item.reorder_point}</td>
                                                    <td className="py-3 px-5 text-center">
                                                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${severity.color}`}>
                                                            {severity.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="chart-container mb-6">
                <div className="flex gap-4">
                    <select
                        value={selectedWarehouse || ''}
                        onChange={(e) => { setSelectedWarehouse(e.target.value ? parseInt(e.target.value) : undefined); setPagination(p => ({ ...p, page: 1 })); }}
                        className="input max-w-xs"
                    >
                        <option value="">Tất cả các kho</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
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
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Sản phẩm</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kho</th>
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Tồn kho</th>
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Đã giữ</th>
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Có sẵn</th>
                                        <th className="text-center py-4 px-6 text-sm font-medium text-slate-300">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventory.map(item => (
                                        <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors">
                                            <td className="py-4 px-6">
                                                <p className="font-medium text-white">{item.product_name}</p>
                                                <p className="text-xs text-indigo-300 font-mono">{item.sku}</p>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-slate-300">{item.warehouse_name}</td>
                                            <td className="py-4 px-6 text-sm text-right font-medium text-white">{item.quantity_on_hand}</td>
                                            <td className="py-4 px-6 text-sm text-right text-amber-400">{item.quantity_reserved}</td>
                                            <td className="py-4 px-6 text-sm text-right font-bold text-indigo-400">{item.quantity_available}</td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`badge ${item.status === 'available' ? 'badge-success' :
                                                    item.status === 'expired' ? 'badge-danger' : 'badge-warning'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {inventory.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <span className="text-4xl opacity-50">📦</span>
                                                    <p className="text-slate-500">Không có dữ liệu tồn kho</p>
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
        </div>
    );
};

export default InventoryPage;
