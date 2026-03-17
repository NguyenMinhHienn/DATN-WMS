// src/pages/staff/StaffInventoryView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';
import { Inventory, Warehouse, PaginationInfo, Category } from '../../interface';
import { Pagination } from '../../components/Pagination';

interface InventoryItem extends Inventory {
  product_name?: string;
  warehouse_name?: string;
  sku?: string;
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
  let timeout: NodeJS.Timeout;
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
            
            const params: any = {
                page: pagination.page,
                limit: pagination.limit
            };
            
            if (selectedWarehouse) params.warehouseId = selectedWarehouse;
            if (selectedCategory) params.categoryId = selectedCategory;
            if (alertFilter) params.alertFilter = alertFilter;
            if (searchTerm) params.search = searchTerm;

            const result = await inventoryService.getFiltered(params);
            
            setInventory(result.data || []);
            setPagination(result.pagination || {
                page: pagination.page,
                limit: pagination.limit,
                total: result.data?.length || 0,
                totalPages: Math.ceil((result.data?.length || 0) / pagination.limit)
            });
            
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
                                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase text-right">Số lượng tồn</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase text-center">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inventory.length > 0 ? inventory.map(item => {
                                        const alertLevel = getAlertLevel(item);
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <p className="font-semibold text-slate-800">{item.product_name}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                                                </td>
                                                <td className="py-4 px-6 text-sm text-slate-600">
                                                    {item.warehouse_name}
                                                </td>
                                                <td className="py-4 px-6 text-sm text-right font-bold text-slate-800">
                                                    {item.quantity_on_hand?.toLocaleString()}
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
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-slate-500">
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
        </div>
    );
};

export default StaffInventoryView;

{/* Last updated: Tue Mar 17 20:26:32 +07 2026 */}
