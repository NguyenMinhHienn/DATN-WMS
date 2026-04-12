import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
            'rgba(99, 102, 241, 0.85)',
            'rgba(168, 85, 247, 0.85)',
            'rgba(236, 72, 153, 0.85)',
            'rgba(34, 197, 94, 0.85)',
            'rgba(251, 191, 36, 0.85)',
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
    const navigate = useNavigate();

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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const formatCompact = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value);
    };

    const categoryDemo = generateDemoCategoryData();
    const topProductsDemo = generateDemoTopProducts();

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
        labels: categoryDemo.labels,
        datasets: [{
            data: categoryDemo.data,
            backgroundColor: categoryDemo.colors,
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
        labels: topProductsDemo.labels,
        datasets: [{
            label: 'Số lượng bán',
            data: topProductsDemo.data,
            backgroundColor: [
                'rgba(99, 102, 241, 0.85)', 'rgba(168, 85, 247, 0.85)',
                'rgba(236, 72, 153, 0.85)', 'rgba(34, 197, 94, 0.85)',
                'rgba(251, 191, 36, 0.85)',
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
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-blue-900">
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
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/40 text-blue-900">
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
                            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/40 text-blue-900">
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
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/40 text-blue-900">
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
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-purple-500/40 text-blue-900">
                                ✅
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section */}
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
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                            <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-sm">🍩</span>
                            Phân bố Danh mục
                        </h2>
                        <p className="text-sm text-blue-500/70 mt-1 ml-10">Tỷ lệ sản phẩm theo danh mục</p>
                    </div>
                    <div className="h-64">
                        <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
                    </div>
                </div>

                {/* Top Products Bar Chart */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-blue-900/5 border border-blue-100 p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                            <span className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-sm">🏆</span>
                            Top Sản phẩm Bán chạy
                        </h2>
                        <p className="text-sm text-blue-500/70 mt-1 ml-10">5 sản phẩm bán chạy nhất</p>
                    </div>
                    <div className="h-64">
                        <Bar data={barChartData} options={barChartOptions} />
                    </div>
                </div>
            </div>

            {/* Recent Movements */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-blue-900/5 border border-blue-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm">📋</span>
                            Biến động tồn kho gần đây
                        </h2>
                        <p className="text-sm text-blue-500/70 mt-1 ml-10">Các giao dịch nhập/xuất kho mới nhất</p>
                    </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-blue-50">
                    <table className="w-full text-left">
                        <thead className="bg-blue-50/50 border-b border-blue-100">
                            <tr>
                                <th className="py-3 px-4 text-xs font-bold text-blue-800 uppercase tracking-wider">Sản phẩm</th>
                                <th className="py-3 px-4 text-xs font-bold text-blue-800 uppercase tracking-wider">Kho</th>
                                <th className="py-3 px-4 text-xs font-bold text-blue-800 uppercase tracking-wider">Loại</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-blue-800 uppercase tracking-wider">Thay đổi</th>
                                <th className="py-3 px-4 text-xs font-bold text-blue-800 uppercase tracking-wider">Ngày</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stats?.recentMovements?.map((movement: any, index: number) => (
                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4 text-sm font-medium text-slate-800">{movement.product_name}</td>
                                    <td className="py-3 px-4 text-sm text-slate-600">{movement.warehouse_name}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${movement.movement_type.includes('in') || movement.movement_type === 'goods_receipt'
                                            ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {movement.movement_type.replace(/_/g, ' ').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className={`py-3 px-4 text-sm text-right font-bold ${movement.quantity_change > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-500">
                                        {new Date(movement.created_at).toLocaleDateString('vi-VN')}
                                    </td>
                                </tr>
                            ))}
                            {(!stats?.recentMovements || stats.recentMovements.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="text-4xl opacity-50">📭</span>
                                            <p className="text-slate-500 font-medium">Chưa có biến động nào</p>
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
