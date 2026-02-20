import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import { DashboardStats, SalesSummary, MonthlyReportItem } from '../../interface';
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

// Demo data for charts that don't have real API yet
const generateDemoCategoryData = () => {
    return {
        labels: ['Điện tử', 'Thời trang', 'Gia dụng', 'Thực phẩm', 'Khác'],
        data: [35, 25, 20, 12, 8],
        colors: [
            'rgba(99, 102, 241, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(251, 191, 36, 0.8)',
        ],
    };
};

const generateDemoTopProducts = () => {
    return {
        labels: ['iPhone 15 Pro', 'Samsung TV', 'Áo Polo', 'Máy lọc nước', 'Laptop Dell'],
        data: [156, 124, 98, 87, 76],
    };
};

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
    const [monthlyReport, setMonthlyReport] = useState<MonthlyReportItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [dashData, salesData, monthlyData] = await Promise.all([
                reportService.getDashboard(),
                reportService.getSalesSummary().catch(() => null),
                reportService.getMonthlyReport().catch(() => []),
            ]);
            setStats(dashData);
            setSalesSummary(salesData);
            setMonthlyReport(monthlyData);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const formatCompact = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value);
    };

    // Demo data for charts that don't have real API
    const categoryDemo = generateDemoCategoryData();
    const topProductsDemo = generateDemoTopProducts();

    // Monthly Revenue & Profit Chart (REAL DATA)
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
                    color: '#e2e8f0',
                    usePointStyle: true,
                    padding: 20,
                },
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#fff',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(99, 102, 241, 0.5)',
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
                ticks: { color: '#94a3b8' },
            },
            y: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: {
                    color: '#94a3b8',
                    callback: function (value: any) {
                        return new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(value);
                    }
                },
            },
        },
    };

    const doughnutChartData = {
        labels: categoryDemo.labels,
        datasets: [{
            data: categoryDemo.data,
            backgroundColor: categoryDemo.colors,
            borderColor: 'rgba(15, 23, 42, 0.8)',
            borderWidth: 3,
            hoverOffset: 8,
        }],
    };

    const doughnutChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: { color: '#e2e8f0', usePointStyle: true, padding: 15 },
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#fff',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(99, 102, 241, 0.5)',
                borderWidth: 1,
                padding: 12,
            },
        },
        cutout: '65%',
    };

    const barChartData = {
        labels: topProductsDemo.labels,
        datasets: [{
            label: 'Số lượng bán',
            data: topProductsDemo.data,
            backgroundColor: [
                'rgba(99, 102, 241, 0.8)', 'rgba(168, 85, 247, 0.8)',
                'rgba(236, 72, 153, 0.8)', 'rgba(34, 197, 94, 0.8)',
                'rgba(251, 191, 36, 0.8)',
            ],
            borderColor: [
                'rgba(99, 102, 241, 1)', 'rgba(168, 85, 247, 1)',
                'rgba(236, 72, 153, 1)', 'rgba(34, 197, 94, 1)',
                'rgba(251, 191, 36, 1)',
            ],
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
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#fff',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(99, 102, 241, 0.5)',
                borderWidth: 1,
                padding: 12,
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#94a3b8' },
            },
            y: {
                grid: { display: false },
                ticks: { color: '#e2e8f0' },
            },
        },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    const currentDate = new Date().toLocaleDateString('vi-VN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Tính margin %
    const profitMargin = salesSummary && salesSummary.total_revenue > 0
        ? ((salesSummary.total_profit / salesSummary.total_revenue) * 100).toFixed(1)
        : '0';

    return (
        <div className="animate-fadeIn min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">
                            <span className="gradient-text">Bảng điều khiển</span>
                        </h1>
                        <p className="text-slate-400 mt-1">Tổng quan doanh thu & lợi nhuận của hệ thống.</p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-xl backdrop-blur-sm border border-slate-700/50">
                        <span className="text-xl">📅</span>
                        <span>{currentDate}</span>
                    </div>
                </div>
            </div>

            {/* Revenue / Cost / Profit / Orders Cards */}
            {salesSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="stat-card stat-card-blue">
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-sm text-blue-100 mb-1 opacity-80">Tổng doanh thu</p>
                                <p className="text-2xl font-bold">{formatCompact(salesSummary.total_revenue)}</p>
                                <p className="text-xs text-blue-200 mt-2 opacity-70">Đơn hoàn thành</p>
                            </div>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                                💰
                            </div>
                        </div>
                    </div>

                    <div className="stat-card stat-card-amber">
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-sm text-amber-100 mb-1 opacity-80">Tổng giá vốn</p>
                                <p className="text-2xl font-bold">{formatCompact(salesSummary.total_cost)}</p>
                                <p className="text-xs text-amber-200 mt-2 opacity-70">Chi phí hàng bán</p>
                            </div>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                                📊
                            </div>
                        </div>
                    </div>

                    <div className="stat-card stat-card-emerald">
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-sm text-emerald-100 mb-1 opacity-80">Tổng lợi nhuận</p>
                                <p className="text-2xl font-bold">{formatCompact(salesSummary.total_profit)}</p>
                                <p className="text-xs text-emerald-200 mt-2 opacity-70">Biên lợi nhuận: {profitMargin}%</p>
                            </div>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                                📈
                            </div>
                        </div>
                    </div>

                    <div className="stat-card stat-card-purple">
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-sm text-purple-100 mb-1 opacity-80">Đơn hoàn thành</p>
                                <p className="text-4xl font-bold">{salesSummary.total_orders}</p>
                                <p className="text-xs text-purple-200 mt-2 opacity-70">Đã giao thành công</p>
                            </div>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                                ✅
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Revenue & Profit Line Chart (REAL DATA) */}
                <div className="chart-container lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-white">📈 Doanh thu & Lợi nhuận theo tháng</h2>
                            <p className="text-sm text-slate-400 mt-1">Thống kê theo tháng trong năm {new Date().getFullYear()}</p>
                        </div>
                        <div className="flex gap-2">
                            <span className="badge badge-success">Real Data</span>
                        </div>
                    </div>
                    <div className="h-80">
                        <Line data={lineChartData} options={lineChartOptions} />
                    </div>
                </div>

                {/* Category Doughnut Chart */}
                <div className="chart-container">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-white">🍩 Phân bố Danh mục</h2>
                        <p className="text-sm text-slate-400 mt-1">Tỷ lệ sản phẩm theo danh mục</p>
                    </div>
                    <div className="h-64">
                        <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
                    </div>
                </div>

                {/* Top Products Bar Chart */}
                <div className="chart-container">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-white">🏆 Top Sản phẩm Bán chạy</h2>
                        <p className="text-sm text-slate-400 mt-1">5 sản phẩm bán chạy nhất</p>
                    </div>
                    <div className="h-64">
                        <Bar data={barChartData} options={barChartOptions} />
                    </div>
                </div>
            </div>

            {/* Recent Movements */}
            <div className="chart-container">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white">📋 Biến động tồn kho gần đây</h2>
                        <p className="text-sm text-slate-400 mt-1">Các giao dịch nhập/xuất kho mới nhất</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700/50">
                                <th className="text-left py-4 px-4 text-sm font-medium text-slate-400">Sản phẩm</th>
                                <th className="text-left py-4 px-4 text-sm font-medium text-slate-400">Kho</th>
                                <th className="text-left py-4 px-4 text-sm font-medium text-slate-400">Loại</th>
                                <th className="text-right py-4 px-4 text-sm font-medium text-slate-400">Thay đổi</th>
                                <th className="text-left py-4 px-4 text-sm font-medium text-slate-400">Ngày</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.recentMovements?.map((movement: any, index: number) => (
                                <tr key={index} className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors">
                                    <td className="py-4 px-4 text-sm text-slate-200 font-medium">{movement.product_name}</td>
                                    <td className="py-4 px-4 text-sm text-slate-400">{movement.warehouse_name}</td>
                                    <td className="py-4 px-4">
                                        <span className={`badge ${movement.movement_type.includes('in') || movement.movement_type === 'goods_receipt'
                                            ? 'badge-success' : 'badge-danger'}`}>
                                            {movement.movement_type.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className={`py-4 px-4 text-sm text-right font-bold ${movement.quantity_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                                    </td>
                                    <td className="py-4 px-4 text-sm text-slate-500">
                                        {new Date(movement.created_at).toLocaleDateString('vi-VN')}
                                    </td>
                                </tr>
                            ))}
                            {(!stats?.recentMovements || stats.recentMovements.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="text-4xl opacity-50">📭</span>
                                            <p className="text-slate-500">Chưa có biến động nào</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
