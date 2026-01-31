import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import { DashboardStats } from '../../interface';
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

// Demo data for charts - easily replaceable with real API data
const generateDemoSalesData = () => {
    const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const salesData = [12500000, 19800000, 15600000, 22400000, 18900000, 25600000, 28900000, 32100000, 27800000, 35600000, 31200000, 42800000];
    const ordersData = [45, 62, 51, 78, 65, 89, 95, 112, 98, 125, 108, 145];

    return { months, salesData, ordersData };
};

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const data = await reportService.getDashboard();
            setStats(data);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get demo data
    const salesDemo = generateDemoSalesData();
    const categoryDemo = generateDemoCategoryData();
    const topProductsDemo = generateDemoTopProducts();

    // Chart configurations
    const lineChartData = {
        labels: salesDemo.months,
        datasets: [
            {
                label: 'Doanh thu (VND)',
                data: salesDemo.salesData,
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
                label: 'Đơn hàng',
                data: salesDemo.ordersData,
                borderColor: 'rgba(168, 85, 247, 1)',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                fill: true,
                tension: 0.4,
                yAxisID: 'y1',
                pointBackgroundColor: 'rgba(168, 85, 247, 1)',
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
                        if (context.dataset.label === 'Doanh thu (VND)') {
                            return `Doanh thu: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(context.parsed.y)}`;
                        }
                        return `Đơn hàng: ${context.parsed.y}`;
                    }
                }
            },
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                },
                ticks: {
                    color: '#94a3b8',
                },
            },
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                },
                ticks: {
                    color: '#94a3b8',
                    callback: function (value: any) {
                        return new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(value);
                    }
                },
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: {
                    drawOnChartArea: false,
                },
                ticks: {
                    color: '#a78bfa',
                },
            },
        },
    };

    const doughnutChartData = {
        labels: categoryDemo.labels,
        datasets: [
            {
                data: categoryDemo.data,
                backgroundColor: categoryDemo.colors,
                borderColor: 'rgba(15, 23, 42, 0.8)',
                borderWidth: 3,
                hoverOffset: 8,
            },
        ],
    };

    const doughnutChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    color: '#e2e8f0',
                    usePointStyle: true,
                    padding: 15,
                },
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
        datasets: [
            {
                label: 'Số lượng bán',
                data: topProductsDemo.data,
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                ],
                borderColor: [
                    'rgba(99, 102, 241, 1)',
                    'rgba(168, 85, 247, 1)',
                    'rgba(236, 72, 153, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(251, 191, 36, 1)',
                ],
                borderWidth: 2,
                borderRadius: 8,
            },
        ],
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        plugins: {
            legend: {
                display: false,
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
        scales: {
            x: {
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                },
                ticks: {
                    color: '#94a3b8',
                },
            },
            y: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#e2e8f0',
                },
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
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="animate-fadeIn min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">
                            <span className="gradient-text">Bảng điều khiển</span>
                        </h1>
                        <p className="text-slate-400 mt-1">Chào mừng trở lại! Đây là tổng quan hệ thống của bạn.</p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-xl backdrop-blur-sm border border-slate-700/50">
                        <span className="text-xl">📅</span>
                        <span>{currentDate}</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="stat-card stat-card-blue">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm text-blue-100 mb-1 opacity-80">Tổng sản phẩm</p>
                            <p className="text-4xl font-bold">{stats?.totalProducts || 0}</p>
                            <p className="text-xs text-blue-200 mt-2 opacity-70">+12% so với tháng trước</p>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                            📦
                        </div>
                    </div>
                </div>

                <div className="stat-card stat-card-emerald">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm text-emerald-100 mb-1 opacity-80">Số kho</p>
                            <p className="text-4xl font-bold">{stats?.totalWarehouses || 0}</p>
                            <p className="text-xs text-emerald-200 mt-2 opacity-70">Hoạt động bình thường</p>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                            🏭
                        </div>
                    </div>
                </div>

                <div className="stat-card stat-card-purple">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm text-purple-100 mb-1 opacity-80">Giá trị tồn kho</p>
                            <p className="text-3xl font-bold">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(stats?.totalInventoryValue || 0)}
                            </p>
                            <p className="text-xs text-purple-200 mt-2 opacity-70">Cập nhật real-time</p>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                            💰
                        </div>
                    </div>
                </div>

                <div className="stat-card stat-card-red">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm text-red-100 mb-1 opacity-80">Sắp hết hàng</p>
                            <p className="text-4xl font-bold">{stats?.lowStockItems || 0}</p>
                            <p className="text-xs text-red-200 mt-2 opacity-70">Cần nhập thêm hàng</p>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm animate-pulse">
                            ⚠️
                        </div>
                    </div>
                </div>

                <div className="stat-card stat-card-amber">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm text-amber-100 mb-1 opacity-80">Phiếu nhập chờ duyệt</p>
                            <p className="text-4xl font-bold">{stats?.pendingReceipts || 0}</p>
                            <p className="text-xs text-amber-200 mt-2 opacity-70">Đang chờ xử lý</p>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                            📥
                        </div>
                    </div>
                </div>

                <div className="stat-card stat-card-cyan">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm text-cyan-100 mb-1 opacity-80">Phiếu xuất chờ duyệt</p>
                            <p className="text-4xl font-bold">{stats?.pendingIssues || 0}</p>
                            <p className="text-xs text-cyan-200 mt-2 opacity-70">Đang chờ xử lý</p>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                            📤
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Sales Line Chart */}
                <div className="chart-container lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-white">📈 Biểu đồ Doanh thu & Đơn hàng</h2>
                            <p className="text-sm text-slate-400 mt-1">Thống kê theo tháng trong năm 2024 (Demo)</p>
                        </div>
                        <div className="flex gap-2">
                            <span className="badge badge-info">Demo Data</span>
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
                                            ? 'badge-success'
                                            : 'badge-danger'
                                            }`}>
                                            {movement.movement_type.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className={`py-4 px-4 text-sm text-right font-bold ${movement.quantity_change > 0 ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
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
