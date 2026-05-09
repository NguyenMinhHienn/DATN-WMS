import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { productVariantService } from '../../services/productVariantService';
import { Inventory, PaginationInfo } from '../../interface';
import { Pagination } from '../../components/Pagination';
import * as XLSX from 'xlsx';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

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

    // Report State
    const getDefaultFromDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    };
    const getDefaultToDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const [reportFromDate, setReportFromDate] = useState(getDefaultFromDate());
    const [reportToDate, setReportToDate] = useState(getDefaultToDate());
    const [report, setReport] = useState<{ ton_dau: number; nhap_trong_ky: number; xuat_trong_ky: number; ton_cuoi: number } | null>(null);
    const [reportLoading, setReportLoading] = useState(false);

    // Expanded State
    
    const [expandedProducts, setExpandedProducts] = useState<number[]>([]);

    // Overall Report State
    const [overallReportData, setOverallReportData] = useState<any[]>([]);
    const [overallLoading, setOverallLoading] = useState(false);
    const [overallFromDate, setOverallFromDate] = useState(getDefaultFromDate());
    const [overallToDate, setOverallToDate] = useState(getDefaultToDate());
    const [activeMainTab, setActiveMainTab] = useState<'details' | 'overall'>('details');

    const loadOverallReport = async () => {
        try {
            setOverallLoading(true);
            const toDateEnd = overallToDate + ' 23:59:59';
            const data = await inventoryService.getOverallReport(overallFromDate, toDateEnd);
            setOverallReportData(data);
        } catch (error) {
            console.error('Failed to load overall report:', error);
            alert('Lỗi tải báo cáo tổng hợp');
        } finally {
            setOverallLoading(false);
        }
    };

    useEffect(() => {
        if (activeMainTab === 'overall' && overallReportData.length === 0) {
            loadOverallReport();
        }
    }, [activeMainTab]);

    const exportOverallReportToExcel = () => {
        if (overallReportData.length === 0) return;
        
        const wb = XLSX.utils.book_new();
        
        const data = [
            ['BÁO CÁO TỔNG HỢP XUẤT NHẬP TỒN TOÀN KHO'],
            ['Thời gian:', `${overallFromDate} đến ${overallToDate}`],
            [''],
            ['STT', 'Sản phẩm', 'Biến thể', 'SKU', 'Kho', 'Tồn đầu kỳ', 'Nhập trong kỳ', 'Xuất trong kỳ', 'Tồn cuối kỳ']
        ];

        overallReportData.forEach((item, index) => {
            data.push([
                index + 1,
                item.product_name,
                item.variant_label || 'Bản tiêu chuẩn',
                item.sku,
                item.warehouse_name,
                item.ton_dau,
                item.nhap_trong_ky,
                item.xuat_trong_ky,
                item.ton_cuoi
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);

        const wscols = [
            { wch: 5 },
            { wch: 30 },
            { wch: 20 },
            { wch: 15 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 }
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, 'Tổng hợp XNT');
        XLSX.writeFile(wb, `Bao-cao-Tong-hop-XNT_${overallFromDate}.xlsx`);
    };

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
        const fromDate = getDefaultFromDate();
        const toDate = getDefaultToDate();
        
        setSelectedInventoryForHistory(item);
        setShowHistoryModal(true);
        setReport(null);
        setReportFromDate(fromDate);
        setReportToDate(toDate);
        
        loadHistory(item.id, 1, fromDate, toDate);
        loadMetrics(item.id);
        loadReport(item.id, fromDate, toDate);
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

    const loadHistory = async (inventoryId: number, page: number, from?: string, to?: string) => {
        try {
            setHistoryLoading(true);
            const startDate = from || reportFromDate;
            const endDateString = to || reportToDate;
            const toDateEnd = endDateString ? endDateString + ' 23:59:59' : undefined;
            
            const result = await inventoryService.getMovements(page, 10, inventoryId, undefined, undefined, startDate, toDateEnd);
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

    const loadReport = async (inventoryId: number, from: string, to: string) => {
        try {
            setReportLoading(true);
            const toDateEnd = to + ' 23:59:59';
            const data = await inventoryService.getReport(inventoryId, from, toDateEnd);
            setReport(data);
        } catch (error) {
            console.error('Failed to load report:', error);
            setReport(null);
        } finally {
            setReportLoading(false);
        }
    };

    const handleReportDateChange = () => {
        if (selectedInventoryForHistory && reportFromDate && reportToDate) {
            loadReport(selectedInventoryForHistory.id, reportFromDate, reportToDate);
            loadHistory(selectedInventoryForHistory.id, 1, reportFromDate, reportToDate);
        }
    };

    const exportReportToExcel = () => {
        if (!report || !selectedInventoryForHistory) return;
        const item = selectedInventoryForHistory;
        
        // 1. Create a new workbook
        const wb = XLSX.utils.book_new();
        
        // 2. Prepare data for the sheet
        const data = [
            ['BÁO CÁO CHI TIẾT NHẬP - XUẤT - TỒN'],
            [''],
            ['Thông tin sản phẩm'],
            ['Sản phẩm:', item.product_name],
            ['Biến thể:', item.variant_label || 'Mặc định'],
            ['SKU:', item.variant_sku || item.sku],
            ['Kho:', item.warehouse_name || 'Tất cả'],
            ['Thời gian:', `${reportFromDate} đến ${reportToDate}`],
            [''],
            ['Tóm tắt Nhập - Xuất - Tồn'],
            ['Tồn đầu kỳ', 'Nhập trong kỳ', 'Xuất trong kỳ', 'Tồn cuối kỳ'],
            [report.ton_dau, report.nhap_trong_ky, report.xuat_trong_ky, report.ton_cuoi],
            [''],
            ['Chi tiết lịch sử biến động'],
            ['Thời gian', 'Nghiệp vụ', 'Mã tham chiếu', 'Thay đổi', 'Tồn sau', 'Người thực hiện']
        ];

        // 3. Add history rows
        historyLogs.forEach(log => {
            const getLabel = (type: string) => {
                switch (type) {
                    case 'goods_receipt': return 'Nhập hàng';
                    case 'goods_issue': return 'Xuất hàng';
                    case 'transfer_in': return 'Nhập chuyển kho';
                    case 'transfer_out': return 'Xuất chuyển kho';
                    case 'adjustment_in': return 'Điều chỉnh tăng';
                    case 'adjustment_out': return 'Điều chỉnh giảm';
                    case 'return_in': return 'Khách trả hàng';
                    case 'return_out': return 'Trả hàng NCC';
                    case 'damage': return 'Hàng hỏng';
                    case 'expired': return 'Hàng hết hạn';
                    case 'stock_take': return 'Kiểm kê';
                    case 'IMPORT': return 'Nhập kho';
                    case 'EXPORT': return 'Xuất kho';
                    default: return type || 'Hệ thống';
                }
            };
            
            data.push([
                new Date(log.created_at).toLocaleString('vi-VN'),
                getLabel(log.movement_type),
                log.reference_number || log.reference_id || '-',
                log.quantity_change,
                log.quantity_after,
                log.performer_name || log.performed_by || 'Hệ thống'
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);

        // 4. Style: Set column widths
        const wscols = [
            { wch: 25 }, // Thời gian / Label
            { wch: 20 }, // Nghiệp vụ / Value
            { wch: 20 }, // Mã tham chiếu
            { wch: 15 }, // Thay đổi
            { wch: 15 }, // Tồn sau
            { wch: 25 }  // Người thực hiện
        ];
        ws['!cols'] = wscols;

        // 5. Add sheet to workbook and save
        XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo tồn kho');
        XLSX.writeFile(wb, `Bao-cao-ton-kho_${item.variant_sku || item.sku}_${reportFromDate}.xlsx`);
    };

    const getChartData = () => {
        if (historyLogs.length === 0) return null;
        const sortedLogs = [...historyLogs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        return {
            labels: sortedLogs.map(log => new Date(log.created_at).toLocaleString('vi-VN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })),
            datasets: [{
                label: 'Số tồn thực tế',
                data: sortedLogs.map(log => log.quantity_after),
                fill: true,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                pointBackgroundColor: 'rgb(59, 130, 246)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
            }]
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'white',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                    label: (context: any) => ` Tồn kho: ${context.parsed.y}`
                }
            }
        },
        scales: {
            x: { display: false },
            y: {
                beginAtZero: false,
                grid: { color: 'rgba(0,0,0,0.03)' },
                ticks: { font: { size: 10 } }
            }
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
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold">
                        <span className="gradient-text">Tồn kho</span>
                    </h1>
                    <p className="text-slate-600 mt-1">Theo dõi tồn kho tại các kho hàng</p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
                <button
                    onClick={() => setActiveMainTab('details')}
                    className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeMainTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                >
                    Chi tiết Tồn kho
                </button>
                <button
                    onClick={() => setActiveMainTab('overall')}
                    className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeMainTab === 'overall' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                >
                    Tổng hợp Xuất Nhập Tồn
                </button>
            </div>

            {activeMainTab === 'details' && (
                <>


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
                                    <thead className="bg-blue-50/30 sticky top-0 z-10">
                                        <tr>
                                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-700 font-medium uppercase">Sản phẩm</th>
                                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-700 font-medium uppercase">SKU</th>
                                            <th className="text-right py-3 px-5 text-xs font-medium text-slate-700 font-medium uppercase">Tồn kho</th>
                                            <th className="text-right py-3 px-5 text-xs font-medium text-slate-700 font-medium uppercase">Mức tối thiểu</th>
                                            <th className="text-right py-3 px-5 text-xs font-medium text-slate-700 font-medium uppercase">Mức đặt lại</th>
                                            <th className="text-center py-3 px-5 text-xs font-medium text-slate-700 font-medium uppercase">Mức độ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowStock.map((item: any) => {
                                            const severity = getStockSeverity(item.total_quantity, item.min_stock_level);
                                            return (
                                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-100/20 transition-colors">
                                                    <td className="py-3 px-5">
                                                        <span className="font-medium text-blue-900">{item.name}</span>
                                                    </td>
                                                    <td className="py-3 px-5">
                                                        <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">{item.sku}</span>
                                                    </td>
                                                    <td className="py-3 px-5 text-right">
                                                        <span className={`font-bold ${item.total_quantity === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                                                            {item.total_quantity}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-5 text-right text-slate-600">{item.min_stock_level}</td>
                                                    <td className="py-3 px-5 text-right text-slate-600">{item.reorder_point}</td>
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
                                    <thead className="bg-blue-50/30 sticky top-0 z-10">
                                        <tr>
                                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-700 font-medium uppercase">Sản phẩm</th>
                                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-700 font-medium uppercase">SKU</th>
                                            <th className="text-right py-3 px-5 text-xs font-medium text-slate-700 font-medium uppercase">Tồn kho</th>
                                            <th className="text-center py-3 px-5 text-xs font-medium text-slate-700 font-medium uppercase">Mức độ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {underTenStock.map((item: any) => (
                                            <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-100/20 transition-colors">
                                                <td className="py-3 px-5">
                                                    <span className="font-medium text-blue-900">{item.name}</span>
                                                    {item.variant_label && (
                                                        <span className="text-xs text-blue-600 block mt-0.5">
                                                            ↳ {item.variant_label}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-5">
                                                    <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">{item.sku}</span>
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
                                <thead className="bg-blue-50/30 border-b border-blue-100">
                                    <tr>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Sản phẩm</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Kho</th>
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-700 font-medium">Tồn kho</th>
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-700 font-medium">Đã giữ</th>
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-700 font-medium">Có sẵn</th>
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-700 font-medium">Giá bán</th>
                                        <th className="text-center py-4 px-6 text-sm font-medium text-slate-700 font-medium">Trạng thái</th>
                                        <th className="text-center py-4 px-6 text-sm font-medium text-slate-700 font-medium">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.values(inventory.reduce((groups, item: any) => {
                                        if (!groups[item.product_id]) {
                                            groups[item.product_id] = {
                                                product_id: item.product_id,
                                                product_name: item.product_name,
                                                sku: item.sku,
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
                                        
                                        // Calculate distinct variants and warehouses
                                        const distinctVariants = new Set(group.variants.map((v: any) => v.product_variant_id)).size;
                                        const distinctWarehouses = new Set<string>(group.variants.map((v: any) => v.warehouse_name));
                                        const warehouseDisplay = distinctWarehouses.size > 1 ? 'Nhiều kho' : Array.from(distinctWarehouses)[0] || '-';

                                        return (
                                            <React.Fragment key={`group-${group.product_id}`}>
                                                {/* Summary Row for Product */}
                                                <tr 
                                                    className="border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer"
                                                    onClick={() => setExpandedProducts(prev => 
                                                        prev.includes(group.product_id) ? prev.filter(id => id !== group.product_id) : [...prev, group.product_id]
                                                    )}
                                                >
                                                    <td className="py-4 px-6 flex items-center gap-3">
                                                        <span className={`text-slate-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                            ▶
                                                        </span>
                                                        <div>
                                                            <p className="font-medium text-blue-900">{group.product_name}</p>
                                                            <p className="text-xs text-blue-600 font-mono flex gap-2 items-center">
                                                                <span>{group.sku}</span>
                                                                <span className="text-slate-500">• {distinctVariants || 1} biến thể</span>
                                                                <span className="text-slate-500">• {group.variants.length} lô</span>
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-slate-700 font-medium">{warehouseDisplay}</td>
                                                    <td className="py-4 px-6 text-sm text-right font-medium text-blue-900">{group.total_on_hand.toLocaleString()}</td>
                                                    <td className="py-4 px-6 text-sm text-right text-amber-400">{group.total_reserved > 0 ? group.total_reserved.toLocaleString() : '0'}</td>
                                                    <td className="py-4 px-6 text-sm text-right font-bold text-blue-600">{group.total_available.toLocaleString()}</td>
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
                                                    <tr key={variant.id} className="border-b border-slate-200/10 bg-white/30 hover:bg-slate-100 transition-colors">
                                                        <td className="py-3 px-6 pl-12 flex items-center gap-3">
                                                            <div className="flex flex-col">
                                                                <p className="text-sm font-medium text-blue-700">
                                                                    ↳ {variant.variant_label ? variant.variant_label : 'Bản tiêu chuẩn'}
                                                                </p>
                                                                {variant.variant_sku && (
                                                                    <p className="text-xs text-slate-500 font-mono mt-0.5">Mã: {variant.variant_sku}</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-6 text-xs text-slate-600">
                                                            <div className="font-medium text-indigo-700">{variant.warehouse_name}</div>
                                                            {variant.location_code && (
                                                                <div className="text-[10px] uppercase text-slate-500 mt-0.5 whitespace-nowrap">Vị trí: {variant.location_code}</div>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-6 text-sm text-right font-medium text-slate-700 font-medium">{variant.onHand.toLocaleString()}</td>
                                                        <td className="py-3 px-6 text-sm text-right text-amber-500/80">{variant.reserved > 0 ? variant.reserved.toLocaleString() : '0'}</td>
                                                        <td className="py-3 px-6 text-sm text-right font-bold text-blue-600">{variant.available.toLocaleString()}</td>
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
                                                                        className="p-1 bg-emerald-500/20 text-emerald-600 font-bold hover:bg-emerald-500/30 rounded"
                                                                    >
                                                                        ✓
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setEditingPriceId(null); }} 
                                                                        className="p-1 bg-slate-500/20 text-slate-600 hover:bg-slate-500/30 rounded"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="group flex items-center justify-end gap-2">
                                                                    <span className="font-medium text-emerald-600 font-bold">
                                                                        {variant.variant_price ? new Intl.NumberFormat('vi-VN').format(variant.variant_price) + '₫' : '-'}
                                                                    </span>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleEditPrice(variant); }}
                                                                        className="p-1 text-slate-500 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                                                className="p-1.5 text-blue-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                        <div className="px-6 py-4 border-t border-blue-100">
                            <Pagination pagination={pagination} onPageChange={(page) => setPagination(p => ({ ...p, page }))} />
                        </div>
                    </>
                )}
            </div>

            
                </>
            )}

            {activeMainTab === 'overall' && (
                <div className="animate-fadeIn">
                    {/* Filters */}
                    <div className="chart-container mb-6 p-5 flex flex-wrap items-end gap-4">
                        <div className="flex flex-col">
                            <label className="text-xs font-medium text-slate-500 mb-1">Từ ngày</label>
                            <input
                                type="date"
                                value={overallFromDate}
                                onChange={(e) => setOverallFromDate(e.target.value)}
                                className="px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs font-medium text-slate-500 mb-1">Đến ngày</label>
                            <input
                                type="date"
                                value={overallToDate}
                                onChange={(e) => setOverallToDate(e.target.value)}
                                className="px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <button
                            onClick={loadOverallReport}
                            disabled={overallLoading}
                            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {overallLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            )}
                            Xem báo cáo
                        </button>
                        <div className="flex-1"></div>
                        <button
                            onClick={exportOverallReportToExcel}
                            disabled={overallReportData.length === 0}
                            className="px-6 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Xuất Excel
                        </button>
                    </div>

                    
                    {/* Summary Cards Area */}
                    {!overallLoading && overallReportData.length > 0 && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="chart-container !p-4 flex flex-col justify-center items-center border-l-4 border-slate-400">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 mb-2">
                                    <span className="text-lg">📋</span>
                                </div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tổng Tồn đầu kỳ</p>
                                <p className="text-2xl font-bold text-slate-800 mt-1">{overallReportData.reduce((sum, item) => sum + item.ton_dau, 0).toLocaleString('vi-VN')}</p>
                            </div>
                            <div className="chart-container !p-4 flex flex-col justify-center items-center border-l-4 border-emerald-500">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 mb-2">
                                    <span className="text-lg">📥</span>
                                </div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Tổng Nhập trong kỳ</p>
                                <p className="text-2xl font-bold text-emerald-600 mt-1">+{overallReportData.reduce((sum, item) => sum + item.nhap_trong_ky, 0).toLocaleString('vi-VN')}</p>
                            </div>
                            <div className="chart-container !p-4 flex flex-col justify-center items-center border-l-4 border-rose-500">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 mb-2">
                                    <span className="text-lg">📤</span>
                                </div>
                                <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide">Tổng Xuất trong kỳ</p>
                                <p className="text-2xl font-bold text-rose-500 mt-1">-{overallReportData.reduce((sum, item) => sum + item.xuat_trong_ky, 0).toLocaleString('vi-VN')}</p>
                            </div>
                            <div className="chart-container !p-4 flex flex-col justify-center items-center border-l-4 border-blue-600 bg-blue-50/30">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-2">
                                    <span className="text-lg">📊</span>
                                </div>
                                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Tổng Tồn cuối kỳ</p>
                                <p className="text-2xl font-bold text-blue-700 mt-1">{overallReportData.reduce((sum, item) => sum + item.ton_cuoi, 0).toLocaleString('vi-VN')}</p>
                            </div>
                        </div>
                    )}

                    {/* Chart Area */}
                    {!overallLoading && overallReportData.length > 0 && (
                        <div className="chart-container mb-6 p-5">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Top 10 Sản phẩm biến động lớn nhất</h3>
                            <div className="h-72">
                                <Line 
                                    data={{
                                        labels: overallReportData.sort((a,b) => (b.nhap_trong_ky + b.xuat_trong_ky) - (a.nhap_trong_ky + a.xuat_trong_ky)).slice(0, 10).map(i => i.product_name),
                                        datasets: [
                                            {
                                                label: 'Nhập trong kỳ',
                                                data: overallReportData.sort((a,b) => (b.nhap_trong_ky + b.xuat_trong_ky) - (a.nhap_trong_ky + a.xuat_trong_ky)).slice(0, 10).map(i => i.nhap_trong_ky),
                                                backgroundColor: 'rgba(16, 185, 129, 0.5)',
                                                borderColor: 'rgb(16, 185, 129)',
                                                borderWidth: 2,
                                                tension: 0.4
                                            },
                                            {
                                                label: 'Xuất trong kỳ',
                                                data: overallReportData.sort((a,b) => (b.nhap_trong_ky + b.xuat_trong_ky) - (a.nhap_trong_ky + a.xuat_trong_ky)).slice(0, 10).map(i => i.xuat_trong_ky),
                                                backgroundColor: 'rgba(244, 63, 94, 0.5)',
                                                borderColor: 'rgb(244, 63, 94)',
                                                borderWidth: 2,
                                                tension: 0.4
                                            }
                                        ]
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'top' } },
                                        scales: { y: { beginAtZero: true } }
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Table Area */}
                    <div className="chart-container p-0 overflow-hidden">
                        {overallLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : overallReportData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <span className="text-4xl opacity-50 mb-3">📊</span>
                                <p className="text-slate-500">Không có dữ liệu trong khoảng thời gian này</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                        <tr>
                                            <th className="text-left py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Sản phẩm</th>
                                            <th className="text-left py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Kho</th>
                                            <th className="text-right py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap border-l border-slate-200">Tồn đầu kỳ</th>
                                            <th className="text-right py-4 px-6 text-xs font-bold text-emerald-700 uppercase tracking-wider whitespace-nowrap bg-emerald-50/50">Nhập trong kỳ</th>
                                            <th className="text-right py-4 px-6 text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap bg-rose-50/50">Xuất trong kỳ</th>
                                            <th className="text-right py-4 px-6 text-xs font-bold text-blue-700 uppercase tracking-wider whitespace-nowrap border-l border-slate-200 bg-blue-50/50">Tồn cuối kỳ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {overallReportData.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3 px-6">
                                                    <p className="font-medium text-slate-900">{item.product_name}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{item.variant_label || 'Bản tiêu chuẩn'} • {item.sku}</p>
                                                </td>
                                                <td className="py-3 px-6 text-sm text-slate-600">{item.warehouse_name}</td>
                                                <td className="py-3 px-6 text-sm text-right font-medium text-slate-700 border-l border-slate-100">{item.ton_dau.toLocaleString('vi-VN')}</td>
                                                <td className="py-3 px-6 text-sm text-right font-bold text-emerald-600 bg-emerald-50/10">+{item.nhap_trong_ky.toLocaleString('vi-VN')}</td>
                                                <td className="py-3 px-6 text-sm text-right font-bold text-rose-600 bg-rose-50/10">-{item.xuat_trong_ky.toLocaleString('vi-VN')}</td>
                                                <td className="py-3 px-6 text-sm text-right font-bold text-blue-700 border-l border-slate-100 bg-blue-50/10">{item.ton_cuoi.toLocaleString('vi-VN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* History Modal */}

            {showHistoryModal && selectedInventoryForHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-scaleIn">
                        <div className="flex items-center justify-between p-5 border-b border-blue-100 bg-white/80">
                            <div>
                                <h3 className="text-lg font-bold text-blue-900">Lịch sử biến động</h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    {selectedInventoryForHistory.product_name} 
                                    {selectedInventoryForHistory.variant_label ? ` - ${selectedInventoryForHistory.variant_label}` : ''} 
                                    <span className="text-blue-600 ml-2">({selectedInventoryForHistory.warehouse_name})</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="p-2 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1 bg-blue-50/30">
                            {/* Báo cáo Nhập – Xuất – Tồn */}
                            <div className="mb-6 border border-blue-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                <div className="px-5 py-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">📦</span>
                                        <h3 className="font-semibold text-blue-900">Báo cáo Nhập – Xuất – Tồn</h3>
                                    </div>
                                    {report && (
                                        <button
                                            onClick={exportReportToExcel}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                                            title="Xuất báo cáo Excel"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Xuất Excel
                                        </button>
                                    )}
                                </div>

                                {/* Date Filter */}
                                <div className="px-5 py-3 border-b border-blue-50 bg-white flex flex-wrap items-end gap-3">
                                    <div className="flex flex-col">
                                        <label className="text-xs font-medium text-slate-500 mb-1">Từ ngày</label>
                                        <input
                                            type="date"
                                            value={reportFromDate}
                                            onChange={(e) => setReportFromDate(e.target.value)}
                                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-xs font-medium text-slate-500 mb-1">Đến ngày</label>
                                        <input
                                            type="date"
                                            value={reportToDate}
                                            onChange={(e) => setReportToDate(e.target.value)}
                                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={handleReportDateChange}
                                        disabled={reportLoading}
                                        className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {reportLoading ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        )}
                                        Xem báo cáo
                                    </button>
                                </div>

                                {/* Report Cards */}
                                {reportLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : report ? (
                                    <div className="grid grid-cols-2 lg:grid-cols-4">
                                        <div className="p-4 text-center border-r border-b lg:border-b-0 border-blue-50">
                                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 mb-2">
                                                <span className="text-lg">📋</span>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tồn đầu kỳ</p>
                                            <p className="text-2xl font-bold text-slate-800 mt-1">{report.ton_dau.toLocaleString('vi-VN')}</p>
                                        </div>
                                        <div className="p-4 text-center border-b lg:border-b-0 lg:border-r border-blue-50">
                                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 mb-2">
                                                <span className="text-lg">📥</span>
                                            </div>
                                            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Nhập trong kỳ</p>
                                            <p className="text-2xl font-bold text-emerald-600 mt-1">+{report.nhap_trong_ky.toLocaleString('vi-VN')}</p>
                                        </div>
                                        <div className="p-4 text-center border-r border-blue-50">
                                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 mb-2">
                                                <span className="text-lg">📤</span>
                                            </div>
                                            <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide">Xuất trong kỳ</p>
                                            <p className="text-2xl font-bold text-rose-500 mt-1">-{report.xuat_trong_ky.toLocaleString('vi-VN')}</p>
                                        </div>
                                        <div className="p-4 text-center bg-blue-50/50">
                                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-2">
                                                <span className="text-lg">📊</span>
                                            </div>
                                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Tồn cuối kỳ</p>
                                            <p className="text-2xl font-bold text-blue-700 mt-1">{report.ton_cuoi.toLocaleString('vi-VN')}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-sm text-slate-400">
                                        Chọn khoảng thời gian và nhấn "Xem báo cáo" để xem dữ liệu
                                    </div>
                                )}
                            </div>

                            {/* Báo cáo Hiệu quả Sản phẩm */}
                            <div className="mb-6 border border-blue-100 rounded-xl overflow-hidden bg-white/30 shadow-sm">
                                <div className="px-5 py-3 border-b border-blue-100 bg-white flex items-center gap-2">
                                    <span className="text-xl">📊</span>
                                    <h3 className="font-semibold text-slate-700">Hiệu quả kinh doanh</h3>
                                </div>
                                
                                {metricsLoading ? (
                                    <div className="flex justify-center py-6">
                                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : metrics ? (
                                    <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-blue-50 bg-white">
                                        <div className="p-4 text-center">
                                            <p className="text-xs font-semibold text-slate-500 uppercase">Đơn hoàn thành</p>
                                            <p className="text-xl font-bold text-slate-800 mt-1">{metrics.totalCompletedOrders}</p>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="text-xs font-semibold text-slate-500 uppercase">Doanh thu</p>
                                            <p className="text-xl font-bold text-blue-600 mt-1">{metrics.totalRevenue.toLocaleString()} ₫</p>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="text-xs font-semibold text-slate-500 uppercase">Giá vốn (MAC)</p>
                                            <p className="text-xl font-bold text-rose-500 mt-1">{metrics.totalCost.toLocaleString()} ₫</p>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="text-xs font-semibold text-slate-500 uppercase">Lợi nhuận</p>
                                            <p className={`text-xl font-bold mt-1 ${metrics.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                {metrics.totalProfit > 0 ? '+' : ''}{metrics.totalProfit.toLocaleString()} ₫
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-sm text-slate-500">Chưa có dữ liệu thống kê</div>
                                )}
                            </div>

                            {/* Biểu đồ xu hướng tồn kho */}
                            <div className="mb-6">
                                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <span className="text-lg">📉</span> Biểu đồ xu hướng tồn kho
                                </h3>
                                <div className="bg-white/50 border border-blue-50 rounded-xl p-4 h-48 shadow-sm">
                                    {historyLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    ) : historyLogs.length > 0 ? (
                                        <Line data={getChartData()!} options={chartOptions} />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-2">
                                            <span>📊</span>
                                            <span>Chưa có dữ liệu biến động để vẽ biểu đồ</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Lịch sử Biến động */}
                            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <span className="text-lg">⏱️</span> Lịch sử biến động
                            </h3>
                            {historyLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-blue-100">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b border-blue-100 italic">
                                            <tr>
                                                <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">Thời gian</th>
                                                <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Nghiệp vụ & Chứng từ</th>
                                                <th className="text-center py-3 px-4 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Biến động (Trước → Sau)</th>
                                                <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Diễn giải / Ghi chú</th>
                                                <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Người thực hiện</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyLogs.map((log: any) => (
                                                <tr key={log.id} className="border-b border-slate-50 hover:bg-blue-50/50 transition-colors group">
                                                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                                                        <div className="font-medium text-slate-700">{new Date(log.created_at).toLocaleDateString('vi-VN')}</div>
                                                        <div className="text-[10px] opacity-70">{new Date(log.created_at).toLocaleTimeString('vi-VN')}</div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {(() => {
                                                            const type = log.movement_type;
                                                            const refType = log.reference_type;
                                                            
                                                            let label = 'Hệ thống';
                                                            let icon = '⚙️';
                                                            let color = 'bg-slate-100 text-slate-600';

                                                            if (type === 'goods_receipt' || type === 'IMPORT') {
                                                                label = 'Nhập hàng';
                                                                icon = '📥';
                                                                color = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                                            } else if (type === 'goods_issue' || type === 'EXPORT') {
                                                                label = 'Xuất hàng';
                                                                icon = '📤';
                                                                color = 'bg-rose-50 text-rose-700 border-rose-100';
                                                            } else if (type === 'transfer_in') {
                                                                label = 'Nhập chuyển kho';
                                                                icon = '🚚↓';
                                                                color = 'bg-blue-50 text-blue-700 border-blue-100';
                                                            } else if (type === 'transfer_out') {
                                                                label = 'Xuất chuyển kho';
                                                                icon = '🚚↑';
                                                                color = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                                                            } else if (type === 'adjustment_in' || type === 'adjustment_out') {
                                                                label = 'Điều chỉnh kho';
                                                                icon = '🔧';
                                                                color = 'bg-amber-50 text-amber-700 border-amber-100';
                                                            } else if (type === 'return_in') {
                                                                label = 'Khách trả hàng';
                                                                icon = '🔄';
                                                                color = 'bg-teal-50 text-teal-700 border-teal-100';
                                                            } else if (type === 'stock_take') {
                                                                label = 'Kiểm kê';
                                                                icon = '📝';
                                                                color = 'bg-purple-50 text-purple-700 border-purple-100';
                                                            }

                                                            const refLabel = 
                                                                refType === 'import_receipt' ? 'Phiếu nhập' :
                                                                refType === 'export_receipt' ? 'Phiếu xuất' :
                                                                refType === 'order' ? 'Đơn hàng' :
                                                                refType === 'transfer' ? 'Lệnh chuyển' : 'Chứng từ';

                                                            return (
                                                                <div className="flex flex-col gap-1">
                                                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border ${color} w-fit`}>
                                                                        <span>{icon}</span> {label}
                                                                    </div>
                                                                    {log.reference_number && (
                                                                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                            <span className="font-medium text-blue-500/70">{refLabel}:</span>
                                                                            <span className="font-mono">{log.reference_number}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="text-[11px] text-slate-400 w-8 text-right">{log.quantity_before}</div>
                                                            <div className={`flex items-center justify-center min-w-[60px] px-2 py-1 rounded-full text-xs font-bold ${
                                                                log.quantity_change > 0 ? 'bg-emerald-500 text-white' : 
                                                                log.quantity_change < 0 ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500'
                                                            }`}>
                                                                {log.quantity_change > 0 ? '↑' : log.quantity_change < 0 ? '↓' : ''} {Math.abs(log.quantity_change)}
                                                            </div>
                                                            <div className="text-[11px] font-bold text-blue-600 w-8">{log.quantity_after}</div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="text-xs text-slate-600 italic max-w-[150px] line-clamp-2" title={log.reason || log.notes || '-'}>
                                                            {log.reason || log.notes || <span className="text-slate-300">Không có ghi chú</span>}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {log.performed_by_name ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-700 font-bold border border-blue-200">
                                                                    {log.performed_by_name.charAt(0)}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-medium text-slate-700 leading-tight">{log.performed_by_name}</span>
                                                                    <span className="text-[9px] text-slate-400 leading-tight uppercase">Nhân viên</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 italic">Hệ thống auto</span>
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
                        <div className="p-4 border-t border-blue-100 bg-white/80">
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
