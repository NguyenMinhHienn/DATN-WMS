import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { reportService } from '../../services/reportService';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title,
    Tooltip as ChartTooltip, Legend, ArcElement, PointElement, LineElement, Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend, ArcElement, PointElement, LineElement, Filler);

// ==================== HELPERS ====================
const formatVND = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
const formatVNDCompact = (value: number) => {
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' tỷ';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + ' tr';
    if (value >= 1_000) return (value / 1_000).toFixed(0) + 'k';
    return value.toString();
};

const getToday = () => new Date().toISOString().split('T')[0];
const getDaysAgo = (n: number) => {
    const d = new Date(); d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
};
const getMonthStart = () => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0];
};

type TabKey = 'movements' | 'topSelling' | 'inventory' | 'stockValue';

// ==================== CHART COLORS ====================
const COLORS = [
    'rgba(99, 102, 241, 0.85)', 'rgba(16, 185, 129, 0.85)', 'rgba(244, 63, 94, 0.85)',
    'rgba(245, 158, 11, 0.85)', 'rgba(14, 165, 233, 0.85)', 'rgba(168, 85, 247, 0.85)',
    'rgba(236, 72, 153, 0.85)', 'rgba(20, 184, 166, 0.85)', 'rgba(251, 146, 60, 0.85)',
    'rgba(100, 116, 139, 0.85)',
];

const Reports: React.FC = () => {
    // ==================== STATE ====================
    const [activeTab, setActiveTab] = useState<TabKey>('movements');
    const [startDate, setStartDate] = useState(getDaysAgo(30));
    const [endDate, setEndDate] = useState(getToday());
    const [loading, setLoading] = useState(false);

    // Data states
    const [kpi, setKpi] = useState<any>(null);
    const [alerts, setAlerts] = useState<any>(null);
    const [movementData, setMovementData] = useState<any>(null);
    const [detailedMovements, setDetailedMovements] = useState<any[]>([]);
    const [topSelling, setTopSelling] = useState<any[]>([]);
    const [inventoryData, setInventoryData] = useState<any[]>([]);
    const [stockByProduct, setStockByProduct] = useState<any[]>([]);
    const [stockByCategory, setStockByCategory] = useState<any[]>([]);

    // Drill-down modal
    const [drillDown, setDrillDown] = useState<any>(null);
    const [drillDownLoading, setDrillDownLoading] = useState(false);
    const [showAlerts, setShowAlerts] = useState(false);

    // ==================== DATA LOADING ====================
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Always load KPI + alerts
            const [kpiData, alertsData] = await Promise.all([
                reportService.getKpiOverview(startDate, endDate).catch(() => null),
                reportService.getSmartAlerts().catch(() => null),
            ]);
            setKpi(kpiData);
            setAlerts(alertsData);

            // Load tab-specific data
            switch (activeTab) {
                case 'movements': {
                    const [data, detailedData] = await Promise.all([
                        reportService.getMovementSummary(startDate, endDate),
                        reportService.getMovementReport(startDate, endDate)
                    ]);
                    setMovementData(data);
                    setDetailedMovements(detailedData);
                    break;
                }
                case 'topSelling': {
                    const data = await reportService.getTopSellingProducts(startDate, endDate, 10);
                    setTopSelling(data);
                    break;
                }
                case 'inventory': {
                    const data = await reportService.getInventoryReport(1);
                    setInventoryData(data);
                    break;
                }
                case 'stockValue': {
                    const [byProduct, byCategory] = await Promise.all([
                        reportService.getStockValueByProduct(1),
                        reportService.getStockValueByCategory(),
                    ]);
                    setStockByProduct(byProduct);
                    setStockByCategory(byCategory);
                    break;
                }
            }
        } catch (error) {
            console.error('Failed to load report:', error);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, activeTab]);

    useEffect(() => { loadData(); }, [loadData]);

    // ==================== DRILL-DOWN ====================
    const openDrillDown = async (productId: number) => {
        setDrillDownLoading(true);
        try {
            const data = await reportService.getProductDrillDown(productId, startDate, endDate);
            setDrillDown(data);
        } catch (e) { console.error(e); }
        finally { setDrillDownLoading(false); }
    };

    // ==================== QUICK FILTERS ====================
    const quickFilters = [
        { label: 'Hôm nay', start: getToday(), end: getToday() },
        { label: '7 ngày', start: getDaysAgo(7), end: getToday() },
        { label: '30 ngày', start: getDaysAgo(30), end: getToday() },
        { label: 'Tháng này', start: getMonthStart(), end: getToday() },
    ];

    const applyQuickFilter = (start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);
    };


    // ==================== CHARTS ====================
    const movementChartData = useMemo(() => {
        if (!movementData?.daily?.length) return null;
        const labels = movementData.daily.map((d: any) => {
            const dt = typeof d.date === 'string' && d.date.includes('T') ? d.date.split('T')[0] : d.date;
            return new Date(dt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        });
        return {
            labels,
            datasets: [
                { label: 'Nhập kho', data: movementData.daily.map((d: any) => Number(d.total_in)), backgroundColor: 'rgba(16, 185, 129, 0.8)', borderRadius: 6 },
                { label: 'Xuất kho', data: movementData.daily.map((d: any) => Number(d.total_out)), backgroundColor: 'rgba(244, 63, 94, 0.8)', borderRadius: 6 },
            ]
        };
    }, [movementData]);

    const topSellingChartData = useMemo(() => {
        if (!topSelling.length) return null;
        return {
            labels: topSelling.map(p => p.product_name?.length > 25 ? p.product_name.slice(0, 25) + '...' : p.product_name),
            datasets: [{
                label: 'Số lượng đã bán',
                data: topSelling.map(p => Number(p.total_sold)),
                backgroundColor: COLORS.slice(0, topSelling.length),
                borderRadius: 8,
            }]
        };
    }, [topSelling]);

    const inventoryChartData = useMemo(() => {
        if (!inventoryData.length) return null;
        const sorted = [...inventoryData].sort((a, b) => b.quantity_on_hand - a.quantity_on_hand).slice(0, 10);
        return {
            labels: sorted.map(i => i.product_name?.length > 25 ? i.product_name.slice(0, 25) + '...' : i.product_name),
            datasets: [{
                label: 'Tồn kho',
                data: sorted.map(i => i.quantity_on_hand),
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderRadius: 6,
            }]
        };
    }, [inventoryData]);

    const categoryPieData = useMemo(() => {
        if (!stockByCategory.length) return null;
        return {
            labels: stockByCategory.map(c => c.category_name),
            datasets: [{
                data: stockByCategory.map(c => Number(c.total_value)),
                backgroundColor: COLORS.slice(0, stockByCategory.length),
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 8,
            }]
        };
    }, [stockByCategory]);

    // ==================== PRINT & EXPORT ====================
    const componentRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Bao_Cao_Phan_Tich_${getToday()}`,
    });

    const exportCurrentTabExcel = () => {
        const wb = XLSX.utils.book_new();
        let ws: XLSX.WorkSheet | null = null;
        let sheetName = 'Report';

        if (activeTab === 'movements' && movementData?.daily) {
            sheetName = 'Bien_Dong_Ton_Kho';
            const data = movementData.daily.map((d: any) => ({
                'Ngày': typeof d.date === 'string' && d.date.includes('T') ? d.date.split('T')[0] : d.date,
                'Tổng Nhập': d.total_in,
                'Tổng Xuất': d.total_out
            }));
            ws = XLSX.utils.json_to_sheet(data);

            if(detailedMovements.length > 0) {
                const detailedData = detailedMovements.map((m: any) => ({
                    'Ngày giờ': new Date(m.date || m.created_at).toLocaleString('vi-VN'),
                    'Loại phiếu': m.movement_type === 'import' ? 'Nhập kho' : m.movement_type === 'export' ? 'Xuất kho' : m.movement_type === 'transfer' ? 'Chuyển kho' : m.movement_type || (m.quantity_change > 0 ? 'Nhập' : 'Xuất'),
                    'Mã phiếu': m.reference_number || m.code || '-',
                    'Sản phẩm': m.product_name,
                    'Kho': m.warehouse_name,
                    'Biến động': m.quantity_change || m.quantity,
                    'Tồn cuối': m.quantity_after !== undefined ? m.quantity_after : '-'
                }));
                const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
                XLSX.utils.book_append_sheet(wb, wsDetailed, 'Chi_Tiet_Giao_Dich');
            }
        }
        else if (activeTab === 'topSelling' && topSelling.length > 0) {
            sheetName = 'Top_Ban_Chay';
            const data = topSelling.map(p => ({
                'Mã SP': p.sku,
                'Tên sản phẩm': p.product_name,
                'SL Bán': p.total_sold,
                'Doanh thu': p.total_revenue
            }));
            ws = XLSX.utils.json_to_sheet(data);
        }
        else if (activeTab === 'inventory' && inventoryData.length > 0) {
            sheetName = 'Bao_Cao_Ton_Kho';
            const data = inventoryData.map(i => ({
                'Mã SP': i.sku,
                'Tên sản phẩm': i.product_name,
                'Kho': i.warehouse_name,
                'Tồn kho': i.quantity_on_hand,
                'Khả dụng': i.quantity_available,
                'Giá nhập TB': i.unit_cost,
                'Tổng giá trị': i.total_value
            }));
            ws = XLSX.utils.json_to_sheet(data);
        }
        else if (activeTab === 'stockValue') {
            sheetName = 'Gia_Tri_Kho';
            // Export By Product
            if (stockByProduct.length > 0) {
                const pbData = stockByProduct.map(p => ({
                    'Mã SP': p.sku,
                    'Tên SP': p.product_name,
                    'Danh mục': p.category_name,
                    'Số lượng tồn': p.quantity,
                    'Giá nhập TB': p.avg_cost,
                    'Tổng giá trị': p.total_value
                }));
                const wsPb = XLSX.utils.json_to_sheet(pbData);
                XLSX.utils.book_append_sheet(wb, wsPb, 'GiaTri_TheoSP');
                ws = wsPb; // just to pass the check
            }
            // Add By Category to same workbook if exists
            if (stockByCategory.length > 0) {
                const catData = stockByCategory.map(c => ({
                    'Danh mục': c.category_name,
                    'Số SP Khác nhau': c.product_count,
                    'Tổng SL tồn': c.total_quantity,
                    'Tổng giá trị': c.total_value
                }));
                const wsCat = XLSX.utils.json_to_sheet(catData);
                XLSX.utils.book_append_sheet(wb, wsCat, 'GiaTri_TheoDanhMuc');
                ws = wsCat;
            }
        }

        if (!ws) {
            alert('Không có dữ liệu để xuất hoặc dữ liệu đang tải!');
            return;
        }

        if (activeTab !== 'stockValue') {
             XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
        
        XLSX.writeFile(wb, `${sheetName}_${getToday()}.xlsx`);
    };

    // ==================== RENDER ====================
    return (
        <div className="animate-fadeIn min-h-screen p-6" ref={componentRef}>
            {/* ===== HEADER + QUICK FILTERS ===== */}
            <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <span className="text-2xl">📊</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700">
                                Báo cáo & Phân tích
                            </h1>
                            <p className="text-slate-500 mt-0.5">Phân tích dữ liệu kho hàng chuyên sâu</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 print:hidden">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrint}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-2 transition-all text-sm h-10"
                            >
                                🖨️ In Báo Cáo Nhanh
                            </button>
                            <button
                                onClick={exportCurrentTabExcel}
                                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-medium flex items-center gap-2 transition-all text-sm h-10"
                            >
                                📊 Xuất Excel (Tab này)
                            </button>
                        </div>

                        {/* Quick date buttons + custom date */}
                        <div className="flex flex-wrap items-center gap-2">
                        {quickFilters.map(f => (
                            <button key={f.label} onClick={() => applyQuickFilter(f.start, f.end)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${startDate === f.start && endDate === f.end
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                    }`}>
                                {f.label}
                            </button>
                        ))}
                        <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 px-2 py-1">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className="text-sm border-none outline-none bg-transparent w-32" />
                            <span className="text-slate-400">→</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                className="text-sm border-none outline-none bg-transparent w-32" />
                        </div>
                    </div>
                    </div>
                </div>
            </div>

            {/* ===== KPI CARDS ===== */}
            {kpi && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                    {[
                        { label: 'Tổng doanh thu', value: formatVNDCompact(kpi.total_revenue), sub: formatVND(kpi.total_revenue) + ' ₫', icon: '💰', gradient: 'from-blue-500 to-indigo-600', border: 'border-blue-100', shadow: 'shadow-blue-500/10' },
                        { label: 'Tổng đơn hàng', value: kpi.total_orders, sub: 'Phiếu xuất đã duyệt', icon: '📦', gradient: 'from-purple-500 to-violet-600', border: 'border-purple-100', shadow: 'shadow-purple-500/10' },
                        { label: 'SL Nhập kho', value: formatVND(kpi.total_import), sub: 'Tổng số lượng nhập', icon: '📥', gradient: 'from-emerald-500 to-teal-600', border: 'border-emerald-100', shadow: 'shadow-emerald-500/10' },
                        { label: 'SL Xuất kho', value: formatVND(kpi.total_export), sub: 'Tổng số lượng xuất', icon: '📤', gradient: 'from-rose-500 to-pink-600', border: 'border-rose-100', shadow: 'shadow-rose-500/10' },
                    ].map((card, i) => (
                        <div key={i} className={`bg-white rounded-2xl shadow-lg ${card.shadow} p-5 border ${card.border} hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">{card.label}</p>
                                    <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                                    <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                                </div>
                                <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center text-xl shadow-lg`}>
                                    {card.icon}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ===== SMART ALERTS ===== */}
            {alerts && (alerts.low_stock_count > 0 || alerts.over_stock_count > 0) && (
                <div className="mb-6">
                    <button onClick={() => setShowAlerts(!showAlerts)}
                        className="w-full bg-white rounded-2xl border border-amber-200 p-4 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">⚠️</span>
                                <span className="font-semibold text-slate-800">Cảnh báo thông minh</span>
                                <div className="flex gap-2">
                                    {alerts.low_stock_count > 0 && (
                                        <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                            🔴 {alerts.low_stock_count} SP tồn thấp
                                        </span>
                                    )}
                                    {alerts.over_stock_count > 0 && (
                                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                                            🟡 {alerts.over_stock_count} SP ứ đọng
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className={`text-slate-400 transition-transform ${showAlerts ? 'rotate-180' : ''}`}>▼</span>
                        </div>
                    </button>

                    {showAlerts && (
                        <div className="mt-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm animate-fadeIn">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Low Stock */}
                                {alerts.low_stock?.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2"><span>🔴</span> Tồn kho thấp</h4>
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                            {alerts.low_stock.map((item: any) => (
                                                <div key={item.product_id} onClick={() => openDrillDown(item.product_id)}
                                                    className="flex items-center justify-between p-2 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer transition-colors">
                                                    <span className="text-sm font-medium text-slate-700">{item.product_name}</span>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold text-red-600">{item.current_stock}</span>
                                                        <span className="text-xs text-slate-400 ml-1">/ {item.reorder_point || item.min_stock_level}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Over Stock */}
                                {alerts.over_stock?.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-amber-700 mb-2 flex items-center gap-2"><span>🟡</span> Tồn kho ứ đọng</h4>
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                            {alerts.over_stock.map((item: any) => (
                                                <div key={item.product_id} onClick={() => openDrillDown(item.product_id)}
                                                    className="flex items-center justify-between p-2 bg-amber-50 rounded-lg hover:bg-amber-100 cursor-pointer transition-colors">
                                                    <span className="text-sm font-medium text-slate-700">{item.product_name}</span>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold text-amber-600">{item.current_stock}</span>
                                                        <span className="text-xs text-slate-400 ml-1">/ max {item.max_stock_level}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ===== TAB NAVIGATION ===== */}
            <div className="flex flex-wrap gap-2 mb-6 print:hidden">
                {([
                    { key: 'movements' as TabKey, label: '📊 Biến động', desc: 'Nhập/Xuất theo ngày' },
                    { key: 'topSelling' as TabKey, label: '🏆 Bán chạy', desc: 'Top sản phẩm' },
                    { key: 'inventory' as TabKey, label: '📋 Tồn kho', desc: 'Số lượng hiện có' },
                    { key: 'stockValue' as TabKey, label: '💰 Giá trị', desc: 'Phân tích tài sản' },
                ]).map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${activeTab === tab.key
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                            : 'bg-white text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200'
                            }`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ===== TAB CONTENT ===== */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ===== TAB: BIẾN ĐỘNG ===== */}
                        {activeTab === 'movements' && (
                            <div className="p-6 space-y-6">
                                {/* Summary cards */}
                                {movementData?.summary && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                                            <p className="text-sm text-emerald-600 font-medium">Tổng nhập</p>
                                            <p className="text-2xl font-bold text-emerald-700">{formatVND(movementData.summary.total_in)}</p>
                                        </div>
                                        <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                                            <p className="text-sm text-rose-600 font-medium">Tổng xuất</p>
                                            <p className="text-2xl font-bold text-rose-700">{formatVND(movementData.summary.total_out)}</p>
                                        </div>
                                        <div className={`rounded-xl p-4 border ${movementData.summary.delta >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                                            <p className="text-sm font-medium text-slate-600">Chênh lệch</p>
                                            <p className={`text-2xl font-bold ${movementData.summary.delta >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                                                {movementData.summary.delta >= 0 ? '+' : ''}{formatVND(movementData.summary.delta)}
                                            </p>
                                            {/* Trend badge */}
                                            <div className="mt-2">
                                                {movementData.summary.trend === 'export_heavy' && (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">⚠️ Xuất {'>'} Nhập - Cảnh báo thiếu hàng</span>
                                                )}
                                                {movementData.summary.trend === 'import_heavy' && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">📦 Nhập {'>'} Xuất - Tồn kho tăng</span>
                                                )}
                                                {movementData.summary.trend === 'balanced' && (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">✅ Cân bằng</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Chart */}
                                {movementChartData ? (
                                    <div className="space-y-8">
                                        <div className="h-80">
                                            <Bar data={movementChartData} options={{
                                                maintainAspectRatio: false, responsive: true,
                                                plugins: { legend: { labels: { color: '#334155', usePointStyle: true } } },
                                                scales: {
                                                    x: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#64748b' } },
                                                    y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#64748b' } },
                                                }
                                            }} />
                                        </div>

                                        {/* Detailed Table */}
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                    <span>📜</span> Lịch sử Giao dịch
                                                </h3>
                                                <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">
                                                    {detailedMovements.length} bản ghi
                                                </span>
                                            </div>
                                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                                        <tr>
                                                            <th className="py-3 px-4">Ngày giờ</th>
                                                            <th className="py-3 px-4">Loại phiếu</th>
                                                            <th className="py-3 px-4">Mã phiếu</th>
                                                            <th className="py-3 px-4">Sản phẩm</th>
                                                            <th className="py-3 px-4">Kho</th>
                                                            <th className="py-3 px-4 text-right">Biến động</th>
                                                            <th className="py-3 px-4 text-right">Tồn cuối</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {detailedMovements.length > 0 ? (
                                                            detailedMovements.map((m: any, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                                                                        {new Date(m.date || m.created_at).toLocaleString('vi-VN')}
                                                                    </td>
                                                                    <td className="py-2.5 px-4">
                                                                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${m.quantity > 0 || m.quantity_change > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                                            {m.movement_type === 'import' ? 'Nhập kho' : m.movement_type === 'export' ? 'Xuất kho' : m.movement_type === 'transfer' ? 'Chuyển kho' : m.movement_type || (m.quantity_change > 0 ? 'Nhập' : 'Xuất')}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2.5 px-4 font-mono text-xs text-blue-600 font-medium">{m.reference_number || m.code || '-'}</td>
                                                                    <td className="py-2.5 px-4 font-medium text-slate-700">{m.product_name}</td>
                                                                    <td className="py-2.5 px-4 text-slate-500 text-xs">{m.warehouse_name}</td>
                                                                    <td className={`py-2.5 px-4 text-right font-bold ${m.quantity_change > 0 || m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                        {m.quantity_change > 0 || m.quantity > 0 ? '+' : ''}{m.quantity_change || m.quantity}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-right text-slate-600 font-medium">
                                                                        {m.quantity_after !== undefined ? m.quantity_after : '-'}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                                                                    Không có giao dịch nào trong thời gian này
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-400">
                                        <span className="text-4xl block mb-2">📭</span>Không có dữ liệu biến động trong khoảng thời gian này
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ===== TAB: BÁN CHẠY ===== */}
                        {activeTab === 'topSelling' && (
                            <div className="p-6 space-y-6">
                                {topSellingChartData ? (
                                    <>
                                        <h3 className="text-lg font-bold text-slate-800">🏆 Top {topSelling.length} Sản phẩm bán chạy</h3>
                                        <div className="h-80">
                                            <Bar data={topSellingChartData} options={{
                                                maintainAspectRatio: false, indexAxis: 'y',
                                                plugins: { legend: { display: false } },
                                                scales: {
                                                    x: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#64748b' } },
                                                    y: { grid: { display: false }, ticks: { color: '#334155', font: { weight: 500 as const } } },
                                                }
                                            }} />
                                        </div>
                                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                    <tr>
                                                        <th className="text-left py-3 px-4 font-semibold text-slate-600">#</th>
                                                        <th className="text-left py-3 px-4 font-semibold text-slate-600">Sản phẩm</th>
                                                        <th className="text-left py-3 px-4 font-semibold text-slate-600">SKU</th>
                                                        <th className="text-right py-3 px-4 font-semibold text-slate-600">SL bán</th>
                                                        <th className="text-right py-3 px-4 font-semibold text-slate-600">Doanh thu</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {topSelling.map((p, i) => (
                                                        <tr key={p.product_id} onClick={() => openDrillDown(p.product_id)}
                                                            className="border-b border-slate-100 hover:bg-indigo-50 cursor-pointer transition-colors">
                                                            <td className="py-3 px-4 font-bold text-indigo-500">{i + 1}</td>
                                                            <td className="py-3 px-4 font-medium text-slate-800">{p.product_name}</td>
                                                            <td className="py-3 px-4 text-slate-500 font-mono text-xs">{p.sku}</td>
                                                            <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatVND(p.total_sold)}</td>
                                                            <td className="py-3 px-4 text-right font-medium text-blue-600">{formatVND(Number(p.total_revenue))} ₫</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-slate-400">
                                        <span className="text-4xl block mb-2">🏆</span>Không có dữ liệu bán hàng trong khoảng thời gian này
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ===== TAB: TỒN KHO ===== */}
                        {activeTab === 'inventory' && (
                            <div className="p-6 space-y-6">
                                {inventoryChartData ? (
                                    <>
                                        <h3 className="text-lg font-bold text-slate-800">📋 Top 10 Sản phẩm tồn kho nhiều nhất</h3>
                                        <div className="h-80">
                                            <Bar data={inventoryChartData} options={{
                                                maintainAspectRatio: false, indexAxis: 'y',
                                                plugins: { legend: { display: false } },
                                                scales: {
                                                    x: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#64748b' } },
                                                    y: { grid: { display: false }, ticks: { color: '#334155', font: { weight: 500 as const } } },
                                                }
                                            }} />
                                        </div>
                                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                    <tr>
                                                        <th className="text-left py-3 px-4 font-semibold text-slate-600">Sản phẩm</th>
                                                        <th className="text-left py-3 px-4 font-semibold text-slate-600">SKU</th>
                                                        <th className="text-right py-3 px-4 font-semibold text-slate-600">Tồn kho</th>
                                                        <th className="text-right py-3 px-4 font-semibold text-slate-600">Giá trị</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {inventoryData.filter(r => r.quantity_on_hand > 0).map(row => (
                                                        <tr key={row.product_id} onClick={() => openDrillDown(row.product_id)}
                                                            className="border-b border-slate-100 hover:bg-indigo-50 cursor-pointer transition-colors">
                                                            <td className="py-3 px-4 font-medium text-slate-800">{row.product_name}</td>
                                                            <td className="py-3 px-4 text-slate-500 font-mono text-xs">{row.sku}</td>
                                                            <td className="py-3 px-4 text-right font-bold text-indigo-600">{row.quantity_on_hand}</td>
                                                            <td className="py-3 px-4 text-right font-medium text-emerald-600">{formatVND(Number(row.total_value))} ₫</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                                                    <tr>
                                                        <td colSpan={2} className="py-3 px-4 text-right text-slate-700 uppercase text-xs tracking-wider">Tổng cộng:</td>
                                                        <td className="py-3 px-4 text-right text-indigo-700 text-base">
                                                            {inventoryData.filter(r => r.quantity_on_hand > 0).reduce((acc, curr) => acc + Number(curr.quantity_on_hand), 0)}
                                                        </td>
                                                        <td className="py-3 px-4 text-right text-emerald-700 text-base">
                                                            {formatVND(inventoryData.filter(r => r.quantity_on_hand > 0).reduce((acc, curr) => acc + Number(curr.total_value), 0))} ₫
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-slate-400">
                                        <span className="text-4xl block mb-2">📋</span>Không có dữ liệu tồn kho
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ===== TAB: GIÁ TRỊ TỒN KHO ===== */}
                        {activeTab === 'stockValue' && (
                            <div className="p-6 space-y-6">
                                {/* Summary KPI */}
                                {stockByProduct.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-xl">📦</div>
                                                <div>
                                                    <p className="text-slate-500 text-sm">Tổng mã hàng</p>
                                                    <p className="text-2xl font-bold text-indigo-700">{stockByProduct.length}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-xl border border-emerald-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-xl">📋</div>
                                                <div>
                                                    <p className="text-slate-500 text-sm">Tổng SL tồn</p>
                                                    <p className="text-2xl font-bold text-emerald-700">{formatVND(stockByProduct.reduce((s, p) => s + Number(p.quantity), 0))}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-xl">💰</div>
                                                <div>
                                                    <p className="text-slate-500 text-sm">Tổng tài sản</p>
                                                    <p className="text-xl font-bold text-amber-700">{formatVNDCompact(stockByProduct.reduce((s, p) => s + Number(p.total_value), 0))} ₫</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Chart: Pie by Category */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {categoryPieData && (
                                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                                            <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Tỷ trọng theo Danh mục</h3>
                                            <div className="h-72 flex justify-center">
                                                <Doughnut data={categoryPieData} options={{
                                                    maintainAspectRatio: false,
                                                    plugins: {
                                                        legend: { position: 'right', labels: { color: '#334155', usePointStyle: true, padding: 12 } },
                                                        tooltip: {
                                                            callbacks: {
                                                                label: (ctx: any) => `${ctx.label}: ${formatVND(ctx.parsed)} ₫`
                                                            }
                                                        }
                                                    },
                                                    cutout: '60%',
                                                }} />
                                            </div>
                                        </div>
                                    )}
                                    {/* Category Table */}
                                    {stockByCategory.length > 0 && (
                                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                                            <h3 className="text-lg font-bold text-slate-800 mb-4">Chi tiết theo Danh mục</h3>
                                            <div className="space-y-2">
                                                {stockByCategory.map((cat, i) => (
                                                    <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                            <span className="font-medium text-slate-700">{cat.category_name}</span>
                                                            <span className="text-xs text-slate-400">({cat.product_count} SP)</span>
                                                        </div>
                                                        <span className="font-bold text-slate-800">{formatVND(Number(cat.total_value))} ₫</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Product Table */}
                                {stockByProduct.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-3">Chi tiết theo Sản phẩm (theo giá trị giảm dần)</h3>
                                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                    <tr>
                                                        <th className="text-left py-3 px-4 font-semibold text-slate-600">Sản phẩm</th>
                                                        <th className="text-left py-3 px-4 font-semibold text-slate-600">Danh mục</th>
                                                        <th className="text-right py-3 px-4 font-semibold text-slate-600">Tồn kho</th>
                                                        <th className="text-right py-3 px-4 font-semibold text-slate-600">Đơn giá TB</th>
                                                        <th className="text-right py-3 px-4 font-semibold text-slate-600">Giá trị</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {stockByProduct.map(p => (
                                                        <tr key={p.product_id} onClick={() => openDrillDown(p.product_id)}
                                                            className="border-b border-slate-100 hover:bg-indigo-50 cursor-pointer transition-colors">
                                                            <td className="py-3 px-4 font-medium text-slate-800">{p.product_name}</td>
                                                            <td className="py-3 px-4 text-slate-500">{p.category_name || '-'}</td>
                                                            <td className="py-3 px-4 text-right font-bold text-indigo-600">{formatVND(Number(p.quantity))}</td>
                                                            <td className="py-3 px-4 text-right text-slate-600">{formatVND(Number(p.avg_cost))} ₫</td>
                                                            <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatVND(Number(p.total_value))} ₫</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {stockByProduct.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">
                                        <span className="text-4xl block mb-2">💰</span>Không có dữ liệu giá trị tồn kho
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ===== DRILL-DOWN MODAL ===== */}
            {(drillDown || drillDownLoading) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto m-4 shadow-2xl">
                        <button onClick={() => setDrillDown(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl">✕</button>

                        {drillDownLoading ? (
                            <div className="flex items-center justify-center h-40">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : drillDown?.product ? (
                            <>
                                {/* Product Info */}
                                <div className="flex items-center gap-4 mb-6">
                                    {drillDown.product.image_url && (
                                        <img src={drillDown.product.image_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                                    )}
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">{drillDown.product.name}</h2>
                                        <p className="text-sm text-slate-500 font-mono">{drillDown.product.sku}</p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                    <div className="bg-indigo-50 p-3 rounded-xl text-center border border-indigo-200">
                                        <p className="text-xs text-indigo-500 font-medium">Tồn kho</p>
                                        <p className="text-xl font-bold text-indigo-700">{drillDown.product.current_stock}</p>
                                    </div>
                                    <div className="bg-emerald-50 p-3 rounded-xl text-center border border-emerald-200">
                                        <p className="text-xs text-emerald-500 font-medium">Tổng nhập</p>
                                        <p className="text-xl font-bold text-emerald-700">{drillDown.summary.total_in}</p>
                                    </div>
                                    <div className="bg-rose-50 p-3 rounded-xl text-center border border-rose-200">
                                        <p className="text-xs text-rose-500 font-medium">Tổng xuất</p>
                                        <p className="text-xl font-bold text-rose-700">{drillDown.summary.total_out}</p>
                                    </div>
                                    <div className="bg-amber-50 p-3 rounded-xl text-center border border-amber-200">
                                        <p className="text-xs text-amber-500 font-medium">Giá trị tồn</p>
                                        <p className="text-lg font-bold text-amber-700">{formatVNDCompact(Number(drillDown.product.current_value))}</p>
                                    </div>
                                </div>

                                {/* Movement History Table */}
                                <h3 className="font-semibold text-slate-700 mb-3">📜 Lịch sử biến động</h3>
                                {drillDown.logs.length > 0 ? (
                                    <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-64 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                                <tr>
                                                    <th className="text-left py-2 px-3 font-semibold text-slate-600">Ngày</th>
                                                    <th className="text-left py-2 px-3 font-semibold text-slate-600">Loại</th>
                                                    <th className="text-right py-2 px-3 font-semibold text-slate-600">Thay đổi</th>
                                                    <th className="text-right py-2 px-3 font-semibold text-slate-600">Sau</th>
                                                    <th className="text-left py-2 px-3 font-semibold text-slate-600">Kho</th>
                                                    <th className="text-left py-2 px-3 font-semibold text-slate-600">Mã tham chiếu</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {drillDown.logs.map((log: any, i: number) => (
                                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                                        <td className="py-2 px-3 text-slate-600">{log.date}</td>
                                                        <td className="py-2 px-3">
                                                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${log.quantity_change > 0
                                                                ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                                }`}>
                                                                {log.movement_type?.replace(/_/g, ' ') || (log.quantity_change > 0 ? 'Nhập' : 'Xuất')}
                                                            </span>
                                                        </td>
                                                        <td className={`py-2 px-3 text-right font-bold ${log.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                            {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-slate-600">{log.quantity_after}</td>
                                                        <td className="py-2 px-3 text-slate-500 text-xs">{log.warehouse_name}</td>
                                                        <td className="py-2 px-3 text-slate-400 font-mono text-xs">{log.reference_number || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-center py-6 text-slate-400">Không có lịch sử biến động</p>
                                )}
                            </>
                        ) : (
                            <p className="text-center py-8 text-slate-400">Không tìm thấy sản phẩm</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
