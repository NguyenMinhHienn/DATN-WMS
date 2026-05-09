// src/pages/staff/StaffInventoryView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';
import { Inventory, Warehouse, PaginationInfo, Category } from '../../interface';
import { Pagination } from '../../components/Pagination';

interface InventoryItem extends Inventory {
  category_id?: number;
  category_name?: string;
  min_stock?: number;
  reorder_point?: number;
}

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const StaffInventoryView: React.FC = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedWarehouse, setSelectedWarehouse] = useState<number | undefined>();
    const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
    const [alertFilter, setAlertFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [searchInput, setSearchInput] = useState<string>('');

    // History Modal State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedInventoryForHistory, setSelectedInventoryForHistory] = useState<any | null>(null);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyPagination, setHistoryPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [metrics, setMetrics] = useState<{ totalCompletedOrders: number, totalRevenue: number, totalCost: number, totalProfit: number } | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(false);

    // Refs
    const debounceRef = useRef<any>(null);

    // Load initial data
    useEffect(() => {
        loadWarehouses();
        loadCategories();
        
        // Initialize debounce
        debounceRef.current = debounce((value: string) => {
            setSearchTerm(value);
            setPagination(prev => ({ ...prev, page: 1 }));
        }, 500);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current.timeout);
            }
        };
    }, []);

    // Load inventory when filters or page change
    useEffect(() => {
        loadInventory();
    }, [pagination.page, selectedWarehouse, selectedCategory, alertFilter, searchTerm]);

    const loadInventory = async () => {
        try {
            setLoading(true);
            
            const result = await inventoryService.getAll(
                pagination.page,
                pagination.limit,
                selectedWarehouse,
                undefined, // productId
                alertFilter // using status for alertFilter or undefined
            );
            
            // Note: searchTerm and categoryId are not supported by the current getAll service
            // This is a view-only staff module, if those filters are needed they have to be added to the backend 
            // and the service. For now, we will do client side filtering below or just ignore them for this simple fix.
            
            let filteredData = result.data || [];
            
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filteredData = filteredData.filter(item => 
                    item.product_name?.toLowerCase().includes(term) || 
                    item.sku?.toLowerCase().includes(term)
                );
            }
            
            if (selectedCategory) {
                // @ts-ignore - category_id might be joined from backend in some views
                filteredData = filteredData.filter(item => item.category_id === selectedCategory);
            }

            setInventory(filteredData);
            setPagination(result.pagination || {
                page: pagination.page,
                limit: pagination.limit,
                total: filteredData.length,
                totalPages: Math.ceil(filteredData.length / pagination.limit)
            });
            
        } catch (error) {
            console.error('Failed to load inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewHistory = async (item: any) => {
        setSelectedInventoryForHistory(item);
        setShowHistoryModal(true);
        loadHistory(item.id, 1);
        loadMetrics(item.id);
    };

    const loadHistory = async (inventoryId: number, page: number) => {
        try {
            setHistoryLoading(true);
            const result = await inventoryService.getMovements(page, 10, inventoryId);
            setHistoryLogs(result.data);
            setHistoryPagination(result.pagination);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const loadMetrics = async (inventoryId: number) => {
        try {
            setMetricsLoading(true);
            const data = await inventoryService.getMetrics(inventoryId);
            setMetrics(data);
        } catch (error) {
            console.error('Failed to load metrics:', error);
            setMetrics(null);
        } finally {
            setMetricsLoading(false);
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

    const loadCategories = async () => {
        try {
            const data = await productService.getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const getAlertLevel = (item: InventoryItem) => {
        const quantity = item.quantity_on_hand || 0;
        const minStock = item.min_stock || 10; 
        const reorderPoint = item.reorder_point || 20; 
        
        if (quantity <= minStock) return 'critical';
        if (quantity <= reorderPoint) return 'warning';
        return 'normal';
    };

    const handleResetFilters = () => {
        setSelectedWarehouse(undefined);
        setSelectedCategory(undefined);
        setAlertFilter('');
        setSearchTerm('');
        setSearchInput('');
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchInput(value);
        if (debounceRef.current) {
            debounceRef.current(value);
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Tồn kho (View-only)</h1>
                <p className="text-slate-500 mt-1">Xem chi tiết tồn kho sản phẩm tại các kho</p>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Search Input */}
                    <div className="flex-1 min-w-[250px]">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Tìm kiếm</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm kiếm sản phẩm, SKU..."
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                value={searchInput}
                                onChange={handleSearchChange}
                            />
                            <span className="absolute right-3 top-2.5 text-slate-400">🔍</span>
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="w-full md:w-48">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Danh mục</label>
                        <select
                            value={selectedCategory || ''}
                            onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">Tất cả danh mục</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Warehouse Filter */}
                    <div className="w-full md:w-48">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Kho hàng</label>
                        <select
                            value={selectedWarehouse || ''}
                            onChange={(e) => setSelectedWarehouse(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">Tất cả kho</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={handleResetFilters}
                        className="px-4 py-2 text-emerald-600 hover:bg-emerald-50 font-medium rounded-lg transition-colors"
                    >
                        Xóa bộ lọc
                    </button>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-slate-500">Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Sản phẩm</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Kho</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase text-right">Tồn kho</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase text-right">Đã giữ</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase text-right">Có sẵn</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase text-center">Trạng thái</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inventory.length > 0 ? inventory.map(item => {
                                        const alertLevel = getAlertLevel(item);
                                        const onHand = item.quantity_on_hand || 0;
                                        const reserved = (item as any).quantity_reserved || 0;
                                        const available = (item as any).quantity_available ?? (onHand - reserved);
                                        const variantLabel = (item as any).variant_label;
                                        const variantSku = (item as any).variant_sku;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <p className="font-semibold text-slate-800">{item.product_name}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                                                    {variantLabel && (
                                                        <p className="text-xs text-indigo-500 mt-0.5">
                                                            ↳ {variantLabel}
                                                            {variantSku && <span className="text-slate-400 ml-1">({variantSku})</span>}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-sm text-slate-600">
                                                    {item.warehouse_name}
                                                </td>
                                                <td className="py-4 px-6 text-sm text-right font-bold text-slate-800">
                                                    {onHand.toLocaleString()}
                                                </td>
                                                <td className="py-4 px-6 text-sm text-right font-semibold">
                                                    {reserved > 0 ? (
                                                        <span className="text-amber-600">{reserved.toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-slate-400">0</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-sm text-right font-bold">
                                                    <span className={available > 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                        {available.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    {alertLevel === 'critical' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            Nghiêm trọng
                                                        </span>
                                                    ) : alertLevel === 'warning' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                            Cần bổ sung
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                            An toàn
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <button
                                                        onClick={() => handleViewHistory(item)}
                                                        className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Xem lịch sử biến động"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-500">
                                                Không tìm thấy dữ liệu tồn kho phù hợp
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {pagination.totalPages > 1 && (
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                                <Pagination
                                    pagination={pagination}
                                    onPageChange={(page) => setPagination(p => ({ ...p, page }))}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* History Modal */}
            {showHistoryModal && selectedInventoryForHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
                        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Lịch sử biến động</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    {selectedInventoryForHistory.product_name} 
                                    {selectedInventoryForHistory.variant_label ? ` - ${selectedInventoryForHistory.variant_label}` : ''} 
                                    <span className="text-emerald-600 ml-2">({selectedInventoryForHistory.warehouse_name})</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50">
                            {/* Báo cáo Hiệu quả Sản phẩm */}
                            <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                    <span className="text-xl">📊</span>
                                    <h3 className="font-semibold text-slate-800">Hiệu quả kinh doanh</h3>
                                </div>
                                
                                {metricsLoading ? (
                                    <div className="flex justify-center py-6">
                                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : metrics ? (
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-100">
                                        <div className="p-4 bg-white text-center">
                                            <p className="text-xs font-semibold text-slate-500 uppercase">Đơn hoàn thành</p>
                                            <p className="text-xl font-bold text-slate-800 mt-1">{metrics.totalCompletedOrders}</p>
                                        </div>
                                        <div className="p-4 bg-white text-center">
                                            <p className="text-xs font-semibold text-slate-500 uppercase">Doanh thu</p>
                                            <p className="text-xl font-bold text-indigo-600 mt-1">{metrics.totalRevenue.toLocaleString()} ₫</p>
                                        </div>
                                        <div className="p-4 bg-white text-center">
                                            <p className="text-xs font-semibold text-slate-500 uppercase">Giá vốn (MAC)</p>
                                            <p className="text-xl font-bold text-rose-500 mt-1">{metrics.totalCost.toLocaleString()} ₫</p>
                                        </div>
                                        <div className="p-4 bg-white text-center">
                                            <p className="text-xs font-semibold text-slate-500 uppercase">Lợi nhuận</p>
                                            <p className={`text-xl font-bold mt-1 ${metrics.totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {metrics.totalProfit > 0 ? '+' : ''}{metrics.totalProfit.toLocaleString()} ₫
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-sm text-slate-500">Chưa có dữ liệu thống kê</div>
                                )}
                            </div>

                            {/* Lịch sử Biến động */}
                            <h3 className="font-semibold text-slate-800 mb-3 ml-1 flex items-center gap-2">
                                <span className="text-lg">⏱️</span> Lịch sử biến động
                            </h3>
                            {historyLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 border-b border-slate-200">
                                            <tr>
                                                <th className="text-left py-3 px-4 text-slate-600 font-semibold whitespace-nowrap">Thời gian</th>
                                                <th className="text-left py-3 px-4 text-slate-600 font-semibold">Nghiệp vụ</th>
                                                <th className="text-left py-3 px-4 text-slate-600 font-semibold">Mã tham chiếu</th>
                                                <th className="text-center py-3 px-4 text-slate-600 font-semibold">Thay đổi</th>
                                                <th className="text-right py-3 px-4 text-slate-600 font-semibold">Tồn sau</th>
                                                <th className="text-left py-3 px-4 text-slate-600 font-semibold">Người thực hiện</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {historyLogs.map((log: any) => (
                                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                                        {new Date(log.created_at).toLocaleString('vi-VN')}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                                                            log.movement_type === 'IMPORT' ? 'bg-emerald-100 text-emerald-700' :
                                                            log.movement_type === 'EXPORT' ? 'bg-rose-100 text-rose-700' :
                                                            log.movement_type === 'RESERVE' ? 'bg-amber-100 text-amber-700' :
                                                            log.movement_type === 'RELEASE' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {log.movement_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                                                        {log.reference_number || log.reference_id || '-'}
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-bold font-mono">
                                                        <span className={log.quantity_change > 0 ? 'text-emerald-600' : log.quantity_change < 0 ? 'text-rose-600' : 'text-slate-500'}>
                                                            {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                                                        {log.quantity_after}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-500 text-xs max-w-[200px] truncate" title={log.performed_by_name || 'Hệ thống'}>
                                                        {log.performed_by_name ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-medium">
                                                                    {log.performed_by_name.charAt(0)}
                                                                </div>
                                                                <span>{log.performed_by_name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic">Hệ thống</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {historyLogs.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="py-8 text-center text-slate-500">
                                                        Không có lịch sử biến động nào
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-white">
                            <Pagination 
                                pagination={historyPagination} 
                                onPageChange={(page) => loadHistory(selectedInventoryForHistory.id, page)} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffInventoryView;

{/* Last updated: Tue Mar 17 20:26:32 +07 2026 */}
