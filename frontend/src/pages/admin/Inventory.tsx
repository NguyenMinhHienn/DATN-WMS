import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { productVariantService } from '../../services/productVariantService';
import { Inventory, PaginationInfo } from '../../interface';
import { Pagination } from '../../components/Pagination';

const InventoryPage: React.FC = () => {
    const [inventory, setInventory] = useState<Inventory[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [lowStock, setLowStock] = useState<any[]>([]);
    const [showLowStockDetail, setShowLowStockDetail] = useState(false);
    const [underTenStock, setUnderTenStock] = useState<any[]>([]);
    const [showUnderTenStockDetail, setShowUnderTenStockDetail] = useState(false);
    
    // History Modal State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedInventoryForHistory, setSelectedInventoryForHistory] = useState<any | null>(null);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyPagination, setHistoryPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [metrics, setMetrics] = useState<{ totalCompletedOrders: number, totalRevenue: number, totalCost: number, totalProfit: number } | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(false);

    // Expanded State
    const [expandedProducts, setExpandedProducts] = useState<number[]>([]);

    // Edit Price State
    const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
    const [editPriceValue, setEditPriceValue] = useState<number>(0);
    const [priceLoading, setPriceLoading] = useState(false);

    useEffect(() => { loadLowStock(); loadUnderTenStock(); }, []);
    useEffect(() => { loadInventory(); }, [pagination.page]);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const result = await inventoryService.getAll(pagination.page, pagination.limit, undefined);
            setInventory(result.data);
            setPagination(result.pagination);
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

    const handleEditPrice = (item: any) => {
        if (!item.product_variant_id) {
            alert('Không có thông tin biến thể.');
            return;
        }
        setEditingPriceId(item.id);
        setEditPriceValue(item.variant_price || 0);
    };

    const handleSavePrice = async (item: any) => {
        if (!item.product_variant_id) return;
        try {
            setPriceLoading(true);
            await productVariantService.update(item.product_variant_id, { price: editPriceValue });
            setEditingPriceId(null);
            loadInventory();
        } catch (error) {
            console.error('Failed to update price:', error);
            alert('Lỗi khi cập nhật giá bán');
        } finally {
            setPriceLoading(false);
        }
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



    const loadLowStock = async () => {
        try {
            const data = await inventoryService.getLowStock();
            setLowStock(data);
        } catch (error) {
            console.error('Failed to load low stock:', error);
        }
    };

    const loadUnderTenStock = async () => {
        try {
            const data = await inventoryService.getUnderTenStock();
            setUnderTenStock(data);
        } catch (error) {
            console.error('Failed to load under ten stock:', error);
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

            {/* Under Ten Stock Alert - Accordion */}
            {underTenStock.length > 0 && (
                <div className="chart-container mb-6 border-l-4 border-amber-500 bg-amber-500/10 !p-0 overflow-hidden">
                    {/* Header - luôn hiển thị */}
                    <button
                        onClick={() => setShowUnderTenStockDetail(!showUnderTenStockDetail)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-500/5 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-3xl animate-pulse">⚡</span>
                            <div className="text-left">
                                <h3 className="font-semibold text-amber-400">Cảnh báo số lượng ít</h3>
                                <p className="text-sm text-amber-300/80">{underTenStock.length} sản phẩm có tồn kho dưới 10</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-amber-400">
                            <span className="text-sm font-medium">{showUnderTenStockDetail ? 'Thu gọn' : 'Xem chi tiết'}</span>
                            <span className={`text-lg transition-transform duration-300 ${showUnderTenStockDetail ? 'rotate-180' : ''}`}>▼</span>
                        </div>
                    </button>

                    {/* Detail - accordion content */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showUnderTenStockDetail ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="border-t border-amber-500/20">
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-800/50 sticky top-0 z-10">
                                        <tr>
                                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-300 uppercase">Sản phẩm</th>
                                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-300 uppercase">SKU</th>
                                            <th className="text-right py-3 px-5 text-xs font-medium text-slate-300 uppercase">Tồn kho</th>
                                            <th className="text-center py-3 px-5 text-xs font-medium text-slate-300 uppercase">Mức độ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {underTenStock.map((item: any) => (
                                            <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                                                <td className="py-3 px-5">
                                                    <span className="font-medium text-white">{item.name}</span>
                                                    {item.variant_label && (
                                                        <span className="text-xs text-indigo-400 block mt-0.5">
                                                            ↳ {item.variant_label}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-5">
                                                    <span className="text-xs text-indigo-300 font-mono bg-indigo-500/10 px-2 py-1 rounded">{item.sku}</span>
                                                </td>
                                                <td className="py-3 px-5 text-right">
                                                    <span className="font-bold text-amber-500">
                                                        {item.total_quantity}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-5 text-center">
                                                    <span className="text-xs px-2.5 py-1 rounded-full border font-medium text-amber-500 bg-amber-500/20 border-amber-500/30">
                                                        Cần lưu ý
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}



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
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Giá bán</th>
                                        <th className="text-center py-4 px-6 text-sm font-medium text-slate-300">Trạng thái</th>
                                        <th className="text-center py-4 px-6 text-sm font-medium text-slate-300">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.values(inventory.reduce((groups, item: any) => {
                                        if (!groups[item.product_id]) {
                                            groups[item.product_id] = {
                                                product_id: item.product_id,
                                                product_name: item.product_name,
                                                sku: item.sku,
                                                warehouse_name: item.warehouse_name,
                                                total_on_hand: 0,
                                                total_reserved: 0,
                                                total_available: 0,
                                                variants: [],
                                                status: item.status
                                            };
                                        }
                                        const onHand = item.quantity_on_hand || 0;
                                        const reserved = item.quantity_reserved || 0;
                                        const available = item.quantity_available ?? (onHand - reserved);
                                        
                                        groups[item.product_id].total_on_hand += onHand;
                                        groups[item.product_id].total_reserved += reserved;
                                        groups[item.product_id].total_available += available;
                                        groups[item.product_id].variants.push({ ...item, onHand, reserved, available });
                                        
                                        if(item.status === 'available') groups[item.product_id].status = 'available';
                                        
                                        return groups;
                                    }, {} as Record<number, any>)).map((group: any) => {
                                        const isExpanded = expandedProducts.includes(group.product_id);
                                        return (
                                            <React.Fragment key={`group-${group.product_id}`}>
                                                {/* Summary Row for Product */}
                                                <tr 
                                                    className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors cursor-pointer"
                                                    onClick={() => setExpandedProducts(prev => 
                                                        prev.includes(group.product_id) ? prev.filter(id => id !== group.product_id) : [...prev, group.product_id]
                                                    )}
                                                >
                                                    <td className="py-4 px-6 flex items-center gap-3">
                                                        <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                            ▶
                                                        </span>
                                                        <div>
                                                            <p className="font-medium text-white">{group.product_name}</p>
                                                            <p className="text-xs text-indigo-300 font-mono">{group.sku} <span className="text-slate-500">• {group.variants.length} biến thể</span></p>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-slate-300">{group.warehouse_name}</td>
                                                    <td className="py-4 px-6 text-sm text-right font-medium text-white">{group.total_on_hand.toLocaleString()}</td>
                                                    <td className="py-4 px-6 text-sm text-right text-amber-400">{group.total_reserved > 0 ? group.total_reserved.toLocaleString() : '0'}</td>
                                                    <td className="py-4 px-6 text-sm text-right font-bold text-indigo-400">{group.total_available.toLocaleString()}</td>
                                                    <td className="py-4 px-6 text-sm text-right text-slate-500">-</td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className={`badge ${group.status === 'available' ? 'badge-success' :
                                                            group.status === 'expired' ? 'badge-danger' : 'badge-warning'
                                                            }`}>
                                                            {group.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        {/* Actions logic can be moved to variants if needed, or trigger something global */}
                                                    </td>
                                                </tr>
                                                
                                                {/* Expanded Variant Rows */}
                                                {isExpanded && group.variants.map((variant: any) => (
                                                    <tr key={variant.id} className="border-b border-slate-700/10 bg-slate-800/30 hover:bg-slate-700/50 transition-colors">
                                                        <td className="py-3 px-6 pl-12 flex items-center gap-3">
                                                            <div>
                                                                {variant.variant_label ? (
                                                                    <p className="text-sm text-indigo-400">
                                                                        ↳ {variant.variant_label}
                                                                        {variant.variant_sku && <span className="text-slate-500 ml-1">({variant.variant_sku})</span>}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-sm text-indigo-400">↳ Chi tiết</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-6 text-xs text-slate-400">{variant.warehouse_name}</td>
                                                        <td className="py-3 px-6 text-sm text-right font-medium text-slate-300">{variant.onHand.toLocaleString()}</td>
                                                        <td className="py-3 px-6 text-sm text-right text-amber-500/80">{variant.reserved > 0 ? variant.reserved.toLocaleString() : '0'}</td>
                                                        <td className="py-3 px-6 text-sm text-right font-bold text-indigo-300">{variant.available.toLocaleString()}</td>
                                                        <td className="py-3 px-6 text-sm text-right flex justify-end">
                                                            {editingPriceId === variant.id ? (
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <input 
                                                                        type="number" 
                                                                        value={editPriceValue} 
                                                                        onChange={e => setEditPriceValue(Number(e.target.value))}
                                                                        className="input text-xs w-20 px-2 py-1 h-7"
                                                                        min="0"
                                                                        step="1000"
                                                                    />
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleSavePrice(variant); }} 
                                                                        disabled={priceLoading}
                                                                        className="p-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded"
                                                                    >
                                                                        ✓
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setEditingPriceId(null); }} 
                                                                        className="p-1 bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 rounded"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="group flex items-center justify-end gap-2">
                                                                    <span className="font-medium text-emerald-400">
                                                                        {variant.variant_price ? new Intl.NumberFormat('vi-VN').format(variant.variant_price) + '₫' : '-'}
                                                                    </span>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleEditPrice(variant); }}
                                                                        className="p-1 text-slate-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        title="Chỉnh sửa giá bán"
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-6 text-center">
                                                            <span className={`badge text-xs ${variant.status === 'available' ? 'badge-success' :
                                                                variant.status === 'expired' ? 'badge-danger' : 'badge-warning'
                                                                }`}>
                                                                {variant.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-6 text-center">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleViewHistory(variant); }}
                                                                className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                                                title="Xem lịch sử biến động"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
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

            {/* History Modal */}
            {showHistoryModal && selectedInventoryForHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden animate-scaleIn">
                        <div className="flex items-center justify-between p-5 border-b border-slate-700/50 bg-slate-800/80">
                            <div>
                                <h3 className="text-lg font-bold text-white">Lịch sử biến động</h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    {selectedInventoryForHistory.product_name} 
                                    {selectedInventoryForHistory.variant_label ? ` - ${selectedInventoryForHistory.variant_label}` : ''} 
                                    <span className="text-indigo-400 ml-2">({selectedInventoryForHistory.warehouse_name})</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1 bg-slate-800/50">
                            {/* Báo cáo Hiệu quả Sản phẩm */}
                            <div className="mb-6 border border-slate-700/50 rounded-xl overflow-hidden bg-slate-800/30 shadow-sm">
                                <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-800 flex items-center gap-2">
                                    <span className="text-xl">📊</span>
                                    <h3 className="font-semibold text-slate-200">Hiệu quả kinh doanh</h3>
                                </div>
                                
                                {metricsLoading ? (
                                    <div className="flex justify-center py-6">
                                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : metrics ? (
                                    <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/50 bg-slate-800/20">
                                        <div className="p-4 text-center">
                                            <p className="text-xs font-semibold text-slate-400 uppercase">Đơn hoàn thành</p>
                                            <p className="text-xl font-bold text-slate-200 mt-1">{metrics.totalCompletedOrders}</p>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="text-xs font-semibold text-slate-400 uppercase">Doanh thu</p>
                                            <p className="text-xl font-bold text-indigo-400 mt-1">{metrics.totalRevenue.toLocaleString()} ₫</p>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="text-xs font-semibold text-slate-400 uppercase">Giá vốn (MAC)</p>
                                            <p className="text-xl font-bold text-rose-400 mt-1">{metrics.totalCost.toLocaleString()} ₫</p>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="text-xs font-semibold text-slate-400 uppercase">Lợi nhuận</p>
                                            <p className={`text-xl font-bold mt-1 ${metrics.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {metrics.totalProfit > 0 ? '+' : ''}{metrics.totalProfit.toLocaleString()} ₫
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-sm text-slate-500">Chưa có dữ liệu thống kê</div>
                                )}
                            </div>

                            {/* Lịch sử Biến động */}
                            <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                <span className="text-lg">⏱️</span> Lịch sử biến động
                            </h3>
                            {historyLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-900/50 border-b border-slate-700/50">
                                            <tr>
                                                <th className="text-left py-3 px-4 text-slate-300 font-medium whitespace-nowrap">Thời gian</th>
                                                <th className="text-left py-3 px-4 text-slate-300 font-medium">Nghiệp vụ</th>
                                                <th className="text-left py-3 px-4 text-slate-300 font-medium">Mã tham chiếu</th>
                                                <th className="text-center py-3 px-4 text-slate-300 font-medium">Thay đổi</th>
                                                <th className="text-right py-3 px-4 text-slate-300 font-medium">Tồn sau</th>
                                                <th className="text-left py-3 px-4 text-slate-300 font-medium">Người thực hiện</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyLogs.map((log: any) => (
                                                <tr key={log.id} className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors">
                                                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                                                        {new Date(log.created_at).toLocaleString('vi-VN')}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                                                            log.movement_type === 'IMPORT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                                                            log.movement_type === 'EXPORT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' :
                                                            log.movement_type === 'RESERVE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                                                            log.movement_type === 'RELEASE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                                                            'bg-slate-500/20 text-slate-400 border border-slate-500/20'
                                                        }`}>
                                                            {log.movement_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-xs text-indigo-300">
                                                        {log.reference_number || log.reference_id || '-'}
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-medium font-mono">
                                                        <span className={log.quantity_change > 0 ? 'text-emerald-400' : log.quantity_change < 0 ? 'text-rose-400' : 'text-slate-400'}>
                                                            {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-medium text-white">
                                                        {log.quantity_after}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-400 text-xs max-w-[200px] truncate" title={log.performed_by_name || 'Hệ thống'}>
                                                        {log.performed_by_name ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-medium">
                                                                    {log.performed_by_name.charAt(0)}
                                                                </div>
                                                                <span>{log.performed_by_name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-500 italic">Hệ thống</span>
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
                        <div className="p-4 border-t border-slate-700/50 bg-slate-800/80">
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

export default InventoryPage;
