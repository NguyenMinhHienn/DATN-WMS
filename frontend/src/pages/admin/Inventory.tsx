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

    return (
        <div className="animate-fadeIn">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Tồn kho</h1>
                <p className="text-slate-600">Theo dõi tồn kho tại các kho hàng</p>
            </div>

            {/* Low Stock Alert */}
            {lowStock.length > 0 && (
                <div className="card mb-6 border-l-4 border-red-500 bg-red-50">
                    <h3 className="font-semibold text-red-800 mb-2">⚠️ Cảnh báo sắp hết hàng</h3>
                    <p className="text-sm text-red-700">{lowStock.length} sản phẩm dưới mức đặt hàng lại</p>
                </div>
            )}

            {/* Filters */}
            <div className="card mb-6">
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
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Sản phẩm</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Kho</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Tồn kho</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Đã giữ</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Có sẵn</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventory.map(item => (
                                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-slate-800">{item.product_name}</p>
                                            <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{item.warehouse_name}</td>
                                        <td className="py-3 px-4 text-sm text-right font-medium">{item.quantity_on_hand}</td>
                                        <td className="py-3 px-4 text-sm text-right text-amber-600">{item.quantity_reserved}</td>
                                        <td className="py-3 px-4 text-sm text-right font-bold text-primary-600">{item.quantity_available}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                                                item.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                                }`}>{item.status}</span>
                                        </td>
                                    </tr>
                                ))}
                                {inventory.length === 0 && (
                                    <tr><td colSpan={6} className="py-12 text-center text-slate-500">Không có dữ liệu tồn kho</td></tr>
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

export default InventoryPage;
