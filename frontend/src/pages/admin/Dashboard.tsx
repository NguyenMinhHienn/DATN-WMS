import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../../services/reportService';
import { DashboardStats, SalesSummary, MonthlyReportItem } from '../../interface';
import { receivableService } from '../../services/receivableService';
import { payableService } from '../../services/payableService';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const CHART_COLORS = [
    'rgba(99, 102, 241, 0.85)',
    'rgba(168, 85, 247, 0.85)',
    'rgba(236, 72, 153, 0.85)',
    'rgba(34, 197, 94, 0.85)',
    'rgba(251, 191, 36, 0.85)',
    'rgba(20, 184, 166, 0.85)',
];

const CHART_BORDERS = [
    'rgba(99, 102, 241, 1)',
    'rgba(168, 85, 247, 1)',
    'rgba(236, 72, 153, 1)',
    'rgba(34, 197, 94, 1)',
    'rgba(251, 191, 36, 1)',
    'rgba(20, 184, 166, 1)',
];

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
    const [monthlyReport, setMonthlyReport] = useState<MonthlyReportItem[]>([]);
    const [categoryData, setCategoryData] = useState<{ name: string; count: number }[]>([]);
    const [topProducts, setTopProducts] = useState<{ name: string; quantity: number }[]>([]);
    const [debtSummary, setDebtSummary] = useState({
        receivable: 0,
        payable: 0
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [dashData, salesData, monthlyData, catData, topData, receivableResult, payableResult] = await Promise.all([
                reportService.getDashboard(),
                reportService.getSalesSummary().catch(() => null),
                reportService.getMonthlyReport(new Date().getFullYear()).catch(() => []),
                reportService.getCategoryDistribution().catch(() => []),
                reportService.getTopProducts().catch(() => []),
                receivableService.getSummary({}).catch(() => null),
                payableService.getSummary({}).catch(() => null)
            ]);
            setStats(dashData);
            setSalesSummary(salesData);
            setMonthlyReport(monthlyData);
            setCategoryData(catData);
            setTopProducts(topData);
            if (receivableResult || payableResult) {
                setDebtSummary({
                    receivable: receivableResult ? Number(receivableResult.total_remaining) : 0,
                    payable: payableResult ? Number(payableResult.total_remaining) : 0
                });
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const formatCompact = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value);
    };

    const monthLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const revenueData = monthlyReport.map(m => m.revenue);
    const profitData = monthlyReport.map(m => m.profit);

    const lineChartData = {
        labels: monthLabels,
        datasets: [
            {
                label: 'Doanh thu (VND)',
                data: revenueData,
                borderColor: 'rgba(99, 102, 241, 1)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
            {
                label: 'Lợi nhuận (VND)',
                data: profitData,
                borderColor: 'rgba(34, 197, 94, 1)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(34, 197, 94, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
        ],
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: '#334155',
                    usePointStyle: true,
                    padding: 20,
                    font: { weight: 500 as const }
                },
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: function (context: any) {
                        const value = formatCurrency(context.parsed.y);
                        return `${context.dataset.label}: ${value}`;
                    }
                }
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#64748b', font: { weight: 500 as const } },
            },
            y: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: {
                    color: '#64748b',
                    callback: function (value: any) {
                        return new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(value);
                    }
                },
            },
        },
    };

    const doughnutChartData = {
        labels: categoryData.map(c => c.name),
        datasets: [{
            data: categoryData.map(c => c.count),
            backgroundColor: CHART_COLORS.slice(0, categoryData.length),
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 8,
        }],
    };

    const doughnutChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: { color: '#334155', usePointStyle: true, padding: 15, font: { weight: 500 as const } },
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                borderWidth: 1,
                padding: 12,
            },
        },
        cutout: '65%',
    };

    const barChartData = {
        labels: topProducts.map(p => p.name),
        datasets: [{
            label: 'Số lượng bán',
            data: topProducts.map(p => p.quantity),
            backgroundColor: CHART_COLORS.slice(0, topProducts.length),
            borderColor: CHART_BORDERS.slice(0, topProducts.length),
            borderWidth: 2,
            borderRadius: 8,
        }],
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                borderWidth: 1,
                padding: 12,
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#64748b' },
            },
            y: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { weight: 500 as const } },
            },
        },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-50/40">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-blue-600 font-medium">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    const currentDate = new Date().toLocaleDateString('vi-VN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="animate-fadeIn min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-50/40 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
                            <span className="text-2xl">📊</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                                Bảng điều khiển
                            </h1>
                            <p className="text-blue-600/70 mt-1 font-medium">Tổng quan doanh thu & lợi nhuận của hệ thống.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-blue-700 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm border border-blue-100">
                        <span className="text-xl">📅</span>
                        <span className="font-medium">{currentDate}</span>
                    </div>
                </div>
            </div>

            {/* Revenue / Cost / Profit / Orders Cards */}
            {salesSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-lg shadow-blue-500/10 p-6 border border-blue-100 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => navigate('/admin/financial-report')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 mb-1">Tổng doanh thu</p>
                                <p className="text-3xl font-bold text-slate-800">{formatCompact(salesSummary.total_revenue)}</p>
                                <p className="text-xs text-blue-500 mt-2 font-medium">Xem chi tiết →</p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/40 text-white">
                                💰
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg shadow-amber-500/10 p-6 border border-amber-100 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => navigate('/admin/financial-report')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-600 mb-1">Tổng giá vốn</p>
                                <p className="text-3xl font-bold text-slate-800">{formatCompact(salesSummary.total_cost)}</p>
                                <p className="text-xs text-amber-500 mt-2 font-medium">Xem chi tiết →</p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/40 text-white">
                                📊
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg shadow-emerald-500/10 p-6 border border-emerald-100 hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => navigate('/admin/financial-report')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-600 mb-1">Tổng lợi nhuận</p>
                                <p className="text-3xl font-bold text-slate-800">{formatCompact(salesSummary.total_profit)}</p>
                                <p className="text-xs text-emerald-500 mt-2 font-medium">Xem chi tiết →</p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/40 text-white">
                                📈
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg shadow-purple-500/10 p-6 border border-purple-100 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 hover:-translate-y-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600 mb-1">Đơn hoàn thành</p>
                                <p className="text-3xl font-bold text-slate-800">{salesSummary.total_orders}</p>
                                <p className="text-xs text-slate-500 mt-2">Đã giao thành công</p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-purple-500/40 text-white">
                                📦
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg shadow-emerald-500/10 p-6 border border-emerald-100 hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => navigate('/admin/receivables')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-600 mb-1">Khách hàng còn nợ</p>
                                <p className="text-3xl font-bold text-slate-800">{formatCompact(debtSummary.receivable)}</p>
                                <p className="text-xs text-emerald-500 mt-2 font-medium">Quản lý công nợ →</p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/40 text-white">
                                💳
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg shadow-rose-500/10 p-6 border border-rose-100 hover:shadow-xl hover:shadow-rose-500/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => navigate('/admin/payables')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-rose-600 mb-1">Còn nợ nhà cung cấp</p>
                                <p className="text-3xl font-bold text-slate-800">{formatCompact(debtSummary.payable)}</p>
                                <p className="text-xs text-rose-500 mt-2 font-medium">Quản lý công nợ →</p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-red-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-rose-500/40 text-white">
                                💸
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Stats from DashboardStats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Revenue & Profit Line Chart (REAL DATA) */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-blue-900/5 border border-blue-100 p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm">📈</span>
                                Doanh thu & Lợi nhuận theo tháng
                            </h2>
                            <p className="text-sm text-blue-500/70 mt-1 ml-10">Thống kê theo tháng trong năm {new Date().getFullYear()}</p>
                        </div>
                        <div className="flex gap-2">
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Real Data</span>
                        </div>
                    </div>
                    <div className="h-80">
                        <Line data={lineChartData} options={lineChartOptions} />
                    </div>
                </div>

                {/* Category Doughnut Chart */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-blue-900/5 border border-blue-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-sm">🍩</span>
                                Phân bố Danh mục
                            </h2>
                            <p className="text-sm text-blue-500/70 mt-1 ml-10">Tỷ lệ sản phẩm theo danh mục</p>
                        </div>
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Real Data</span>
                    </div>
                    <div className="h-64">
                        {categoryData.length > 0 ? (
                            <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <span className="text-4xl mb-2">📭</span>
                                <p className="font-medium">Chưa có dữ liệu danh mục</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Products Bar Chart */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-blue-900/5 border border-blue-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                <span className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-sm">🏆</span>
                                Top Sản phẩm Bán chạy
                            </h2>
                            <p className="text-sm text-blue-500/70 mt-1 ml-10">5 sản phẩm bán chạy nhất</p>
                        </div>
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Real Data</span>
                    </div>
                    <div className="h-64">
                        {topProducts.length > 0 ? (
                            <Bar data={barChartData} options={barChartOptions} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <span className="text-4xl mb-2">📭</span>
                                <p className="font-medium">Chưa có đơn hàng nào hoàn thành</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Movements - Redesigned */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-blue-900/5 border border-blue-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm">📋</span>
                            Biến động tồn kho gần đây
                        </h2>
                        <p className="text-sm text-blue-500/70 mt-1 ml-10">Lịch sử nhập/xuất kho mới nhất</p>
                    </div>
                    <button onClick={() => navigate('/admin/reports')} className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-all hover:shadow-sm">
                        Xem tất cả →
                    </button>
                </div>
                <div className="space-y-2.5">
                    {stats?.recentMovements?.map((m: any, index: number) => {
                        const isIn = m.quantity_change > 0;
                        const typeMap: Record<string, { label: string; icon: string; color: string }> = {
                            'goods_receipt': { label: 'Nhập kho', icon: '📥', color: 'emerald' },
                            'stock_in': { label: 'Nhập kho', icon: '📥', color: 'emerald' },
                            'stock_out': { label: 'Xuất kho', icon: '📤', color: 'rose' },
                            'order_deduct': { label: 'Đơn hàng', icon: '🛒', color: 'amber' },
                            'order_return': { label: 'Hoàn hàng', icon: '↩️', color: 'blue' },
                            'order_cancel': { label: 'Hủy đơn', icon: '❌', color: 'slate' },
                            'adjustment': { label: 'Điều chỉnh', icon: '⚙️', color: 'purple' },
                            'transfer_in': { label: 'Chuyển đến', icon: '🔄', color: 'teal' },
                            'transfer_out': { label: 'Chuyển đi', icon: '🔄', color: 'orange' },
                            'reserve': { label: 'Đặt trước', icon: '🔒', color: 'slate' },
                            'release': { label: 'Mở giữ', icon: '🔓', color: 'slate' },
                        };
                        const typeInfo = typeMap[m.movement_type] || { label: m.movement_type, icon: '📦', color: 'slate' };
                        const timeAgo = (() => {
                            const diff = Date.now() - new Date(m.created_at).getTime();
                            const mins = Math.floor(diff / 60000);
                            if (mins < 1) return 'Vừa xong';
                            if (mins < 60) return `${mins} phút trước`;
                            const hours = Math.floor(mins / 60);
                            if (hours < 24) return `${hours} giờ trước`;
                            const days = Math.floor(hours / 24);
                            return `${days} ngày trước`;
                        })();

                        return (
                            <div key={index} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group">
                                {/* Movement type icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm ${
                                    isIn ? 'bg-emerald-100 shadow-emerald-200/50' : 'bg-rose-100 shadow-rose-200/50'
                                }`}>
                                    {typeInfo.icon}
                                </div>

                                {/* Product info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-slate-800 text-sm truncate max-w-[250px]">{m.product_name}</span>
                                        {m.variant_label && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded font-medium border border-indigo-100 shrink-0">{m.variant_label}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                            isIn ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                                        }`}>
                                            {typeInfo.label}
                                        </span>
                                        <span className="text-[10px] text-slate-400">🏭 {m.warehouse_name}</span>
                                        {m.reference_number && (
                                            <span className="text-[10px] text-indigo-400 font-mono">#{m.reference_number}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Quantity change */}
                                <div className="text-right shrink-0">
                                    <div className={`text-sm font-black ${isIn ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {isIn ? '+' : ''}{m.quantity_change}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                        {m.quantity_before != null ? `${m.quantity_before} → ${m.quantity_after}` : `Tồn: ${m.quantity_after}`}
                                    </div>
                                </div>

                                {/* Time + actor */}
                                <div className="text-right shrink-0 w-24">
                                    <div className="text-[11px] text-slate-500 font-medium">{timeAgo}</div>
                                    {m.performed_by_name && (
                                        <div className="text-[10px] text-slate-400 truncate">👤 {m.performed_by_name}</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {(!stats?.recentMovements || stats.recentMovements.length === 0) && (
                        <div className="flex flex-col items-center gap-3 py-12">
                            <span className="text-4xl opacity-50">📭</span>
                            <p className="text-slate-500 font-medium">Chưa có biến động nào</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
