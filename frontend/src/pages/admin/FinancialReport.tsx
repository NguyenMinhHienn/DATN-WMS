import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import { MonthlyReportItem } from '../../interface';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTH_LABELS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

interface MonthlyDetailData {
    orders: any[];
    products: any[];
}

const FinancialReport: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [monthlyData, setMonthlyData] = useState<MonthlyReportItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Detail Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [detailData, setDetailData] = useState<MonthlyDetailData | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'orders' | 'products'>('products');

    // Order detail expansion
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
    const [orderItemsLoading, setOrderItemsLoading] = useState<string | null>(null);

    // Generate year options (current year and 5 years back)
    const yearOptions: number[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) yearOptions.push(y);

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await reportService.getMonthlyReport(selectedYear);
                if (isMounted && data && Array.isArray(data)) {
                    setMonthlyData(data);
                }
            } catch (error) {
                console.error('Failed to load monthly report:', error);
                if (isMounted) setMonthlyData([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, [selectedYear]);

    const handleMonthClick = async (month: number) => {
        setSelectedMonth(month);
        setIsModalOpen(true);
        setDetailLoading(true);
        setActiveTab('products');
        setDetailData(null);
        setExpandedOrderId(null);
        setOrderItems({});
        try {
            const data = await reportService.getMonthlyDetail(selectedYear, month);
            if (data) {
                setDetailData(data);
            } else {
                setDetailData({ orders: [], products: [] });
            }
        } catch (error: any) {
            console.error('Failed to load monthly detail:', error);
            const errorMsg = error.response?.data?.message || 'Không thể tải chi tiết tháng. Có thể bạn không có quyền Admin.';
            alert(errorMsg);
            setIsModalOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleExpandOrder = async (order: any) => {
        const key = `${order.order_type}-${order.id}`;
        if (expandedOrderId === key) {
            setExpandedOrderId(null);
            return;
        }
        setExpandedOrderId(key);

        // Load items if not cached
        if (!orderItems[key]) {
            setOrderItemsLoading(key);
            try {
                const items = await reportService.getOrderItems(order.id, order.order_type);
                setOrderItems(prev => ({ ...prev, [key]: items }));
            } catch (e) {
                console.error('Failed to load order items:', e);
                setOrderItems(prev => ({ ...prev, [key]: [] }));
            } finally {
                setOrderItemsLoading(null);
            }
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const formatCompact = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value);
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '--/--/----';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '--/--/----';
        return date.toLocaleDateString('vi-VN');
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string, class: string }> = {
            'pending': { label: 'Chờ duyệt', class: 'bg-amber-100 text-amber-700' },
            'confirmed': { label: 'Đã xác nhận', class: 'bg-blue-100 text-blue-700' },
            'approved': { label: 'Đã duyệt', class: 'bg-emerald-100 text-emerald-700 font-bold' },
            'completed': { label: 'Hoàn thành', class: 'bg-blue-100 text-blue-700' },
            'shipping': { label: 'Đang giao', class: 'bg-sky-100 text-sky-700' },
            'delivered': { label: 'Đã giao', class: 'bg-emerald-100 text-emerald-700 font-bold' },
            'cancelled': { label: 'Đã hủy', class: 'bg-red-100 text-red-600' },
            'failed': { label: 'Thất bại', class: 'bg-red-100 text-red-600' },
        };
        const s = status.toLowerCase();
        const config = statusMap[s] || { label: status, class: 'bg-slate-100 text-slate-600' };
        return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.class}`}>{config.label}</span>;
    };

    const getOrderTypeBadge = (type: string) => {
        if (type === 'online') {
            return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700">🌐 Online</span>;
        }
        return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-700">🏢 Nội bộ</span>;
    };

    const getPaymentBadge = (method: string, paymentStatus: string) => {
        const isPaid = paymentStatus === 'paid';
        if (method === 'BANKING') {
            return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                🏦 {isPaid ? 'Đã thanh toán' : 'Chờ thanh toán'}
            </span>;
        }
        return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${isPaid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            💵 COD {isPaid ? '(Đã thu)' : ''}
        </span>;
    };

    // Totals
    const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalCost = monthlyData.reduce((sum, m) => sum + m.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

    // Chart data
    const chartData = {
        labels: MONTH_LABELS.map((_, i) => `T${i + 1}`),
        datasets: [
            {
                label: 'Doanh thu',
                data: monthlyData.map(m => m.revenue),
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'Giá vốn',
                data: monthlyData.map(m => m.cost),
                backgroundColor: 'rgba(251, 191, 36, 0.7)',
                borderColor: 'rgba(251, 191, 36, 1)',
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'Lợi nhuận',
                data: monthlyData.map(m => m.profit),
                backgroundColor: monthlyData.map(m =>
                    m.profit < 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(34, 197, 94, 0.7)'
                ),
                borderColor: monthlyData.map(m =>
                    m.profit < 0 ? 'rgba(239, 68, 68, 1)' : 'rgba(34, 197, 94, 1)'
                ),
                borderWidth: 1,
                borderRadius: 4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { color: '#475569', usePointStyle: true, padding: 20 },
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#fff',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(99, 102, 241, 0.5)',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: function (context: any) {
                        return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                    }
                }
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#64748b' },
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
        onClick: (_event: any, elements: any) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                handleMonthClick(index + 1);
            }
        }
    };

    return (
        <div className="animate-fadeIn min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">
                            <span className="gradient-text">Báo cáo tài chính</span>
                        </h1>
                        <p className="text-slate-600 mt-1">Chi tiết doanh thu, giá vốn & lợi nhuận theo từng tháng</p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3">
                            <label className="text-slate-600 text-sm">Năm:</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="bg-blue-50/80 text-blue-900 border border-blue-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition-all cursor-pointer"
                            >
                                {yearOptions.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="stat-card stat-card-blue">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm text-blue-100 mb-1 opacity-80">Tổng doanh thu {selectedYear}</p>
                            <p className="text-2xl font-bold">{formatCompact(totalRevenue)}</p>
                        </div>
                        <div className="w-14 h-14 bg-blue-50/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
                            💰
                        </div>
                    </div>
                </div>

                <div className="stat-card stat-card-amber">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm text-amber-100 mb-1 opacity-80">Tổng giá vốn {selectedYear}</p>
                            <p className="text-2xl font-bold">{formatCompact(totalCost)}</p>
                        </div>
                        <div className="w-14 h-14 bg-blue-50/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
                            📊
                        </div>
                    </div>
                </div>

                <div className={`stat-card ${totalProfit < 0 ? 'stat-card-red' : 'stat-card-emerald'}`}>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className={`text-sm mb-1 opacity-80 ${totalProfit < 0 ? 'text-red-100' : 'text-emerald-100'}`}>
                                Tổng lợi nhuận {selectedYear}
                            </p>
                            <p className="text-2xl font-bold">{formatCompact(totalProfit)}</p>
                            <p className={`text-xs mt-1 opacity-70 ${totalProfit < 0 ? 'text-red-200' : 'text-emerald-200'}`}>
                                Biên LN: {profitMargin}%
                            </p>
                        </div>
                        <div className="w-14 h-14 bg-blue-50/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
                            {totalProfit < 0 ? '📉' : '📈'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="chart-container mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-blue-900">📊 Biểu đồ tài chính theo tháng</h2>
                        <p className="text-sm text-slate-600 mt-1">So sánh doanh thu, giá vốn và lợi nhuận năm {selectedYear} (Click vào cột để xem chi tiết)</p>
                    </div>
                    <span className="badge badge-success">Real Data</span>
                </div>
                <div className="h-80">
                    {!loading && <Bar data={chartData} options={chartOptions} />}
                </div>
            </div>

            {/* Monthly Table */}
            <div className="chart-container">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-blue-900">📋 Chi tiết theo từng tháng</h2>
                    <p className="text-sm text-slate-600 mt-1">Bảng tổng hợp doanh thu, giá vốn, lợi nhuận năm {selectedYear} (Click để xem chi tiết tháng)</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-600">Đang tải dữ liệu...</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-blue-100">
                                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-600">Tháng</th>
                                    <th className="text-right py-4 px-4 text-sm font-medium text-slate-600">Doanh thu</th>
                                    <th className="text-right py-4 px-4 text-sm font-medium text-slate-600">Giá vốn</th>
                                    <th className="text-right py-4 px-4 text-sm font-medium text-slate-600">Lợi nhuận</th>
                                    <th className="text-right py-4 px-4 text-sm font-medium text-slate-600">Biên LN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyData.map((item) => {
                                    const profit = item.revenue - item.cost;
                                    const margin = item.revenue > 0
                                        ? ((profit / item.revenue) * 100).toFixed(1)
                                        : '0.0';
                                    const isNegative = profit < 0;
                                    const hasData = item.revenue > 0 || item.cost > 0;

                                    return (
                                        <tr
                                            key={item.month}
                                            onClick={() => handleMonthClick(item.month)}
                                            className={`border-b border-slate-100 transition-colors cursor-pointer ${isNegative
                                                    ? 'bg-red-500/10 hover:bg-red-500/20'
                                                    : 'hover:bg-blue-50'
                                                }`}
                                        >
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isNegative
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : hasData
                                                                ? 'bg-blue-100 text-blue-600'
                                                                : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {item.month}
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-700 font-medium block">
                                                            {MONTH_LABELS[item.month - 1]}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className={`font-medium ${hasData ? 'text-blue-600' : 'text-slate-400'}`}>
                                                    {formatCurrency(item.revenue)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className={`font-medium ${hasData ? 'text-amber-600' : 'text-slate-400'}`}>
                                                    {formatCurrency(item.cost)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className={`font-bold ${isNegative
                                                        ? 'text-red-500'
                                                        : hasData
                                                            ? 'text-emerald-600'
                                                            : 'text-slate-400'
                                                    }`}>
                                                    {isNegative && '⚠️ '}
                                                    {formatCurrency(profit)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className={`text-sm px-2 py-1 rounded-lg ${isNegative
                                                        ? 'bg-red-100 text-red-600'
                                                        : hasData
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'text-slate-400'
                                                    }`}>
                                                    {margin}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-indigo-500/50 bg-blue-50/30">
                                    <td className="py-4 px-4">
                                        <span className="text-blue-900 font-bold text-base">📊 TỔNG CỘNG</span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className="text-blue-600 font-bold text-base">{formatCurrency(totalRevenue)}</span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className="text-amber-600 font-bold text-base">{formatCurrency(totalCost)}</span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className={`font-bold text-base ${totalProfit < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {totalProfit < 0 && '⚠️ '}
                                            {formatCurrency(totalProfit)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className={`font-bold text-sm px-3 py-1.5 rounded-lg ${totalProfit < 0
                                                ? 'bg-red-100 text-red-600'
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {profitMargin}%
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Monthly Detail Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-blue-100 flex items-center justify-between bg-blue-50/50">
                            <div>
                                <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                                        {selectedMonth}
                                    </span>
                                    Chi tiết tài chính {MONTH_LABELS[selectedMonth! - 1]} {selectedYear}
                                </h2>
                                <p className="text-slate-600 mt-1">Danh sách các giao dịch phát sinh trong tháng</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-slate-600 hover:text-blue-900 hover:bg-slate-100 transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Tabs - chỉ 2 tab */}
                        <div className="flex px-6 pt-2 bg-blue-50/50 overflow-x-auto border-b border-blue-100">
                            <button
                                onClick={() => setActiveTab('products')}
                                className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'products' ? 'border-indigo-500 text-blue-600 bg-indigo-500/5' : 'border-transparent text-slate-600 hover:text-slate-700'}`}
                            >
                                ✨ Theo sản phẩm
                            </button>
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'orders' ? 'border-emerald-500 text-emerald-600 font-bold bg-emerald-500/5' : 'border-transparent text-slate-600 hover:text-slate-700'}`}
                            >
                                📦 Đơn hàng ({detailData?.orders?.length || 0})
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
                            {detailLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-600">Đang truy xuất dữ liệu...</p>
                                </div>
                            ) : (
                                <div className="animate-fadeIn">
                                    {/* TAB: Theo sản phẩm */}
                                    {activeTab === 'products' && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-blue-900 mb-4">Bảng chi tiết theo sản phẩm trong tháng</h3>
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b border-blue-100">
                                                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Sản phẩm</th>
                                                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">SL bán</th>
                                                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Doanh thu</th>
                                                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Giá vốn</th>
                                                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Lợi nhuận</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-blue-50">
                                                        {!detailData || !detailData.products || detailData.products.length === 0 ? (
                                                            <tr><td colSpan={5} className="py-10 text-center text-slate-500 italic">Không có dữ liệu bán hàng trong tháng này</td></tr>
                                                        ) : detailData.products.map((p: any, idx: number) => (
                                                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                                <td className="py-4 px-4 text-slate-700 font-medium">{p.product_name}</td>
                                                                <td className="py-4 px-4 text-right text-slate-700 font-medium">{p.quantity_sold}</td>
                                                                <td className="py-4 px-4 text-right text-blue-600 font-medium">{formatCurrency(p.revenue)}</td>
                                                                <td className="py-4 px-4 text-right text-amber-600">{formatCurrency(p.cost)}</td>
                                                                <td className={`py-4 px-4 text-right font-bold ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                    {formatCurrency(p.profit)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB: Đơn hàng */}
                                    {activeTab === 'orders' && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-blue-900 mb-4">
                                                Danh sách đơn hàng trong tháng
                                                <span className="text-sm font-normal text-slate-500 ml-2">(Bấm vào đơn để xem chi tiết sản phẩm)</span>
                                            </h3>
                                            {!detailData || !detailData.orders || detailData.orders.length === 0 ? (
                                                <div className="py-16 text-center text-slate-500">
                                                    <span className="text-4xl block mb-3">📭</span>
                                                    <p className="italic">Không có đơn hàng nào trong tháng này</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {detailData.orders.map((o: any) => {
                                                        const key = `${o.order_type}-${o.id}`;
                                                        const isExpanded = expandedOrderId === key;
                                                        const items = orderItems[key];
                                                        const isLoadingItems = orderItemsLoading === key;

                                                        return (
                                                            <div key={key} className={`rounded-xl border transition-all ${isExpanded ? 'border-indigo-300 shadow-md shadow-indigo-100' : 'border-blue-100 hover:border-blue-200 hover:shadow-sm'}`}>
                                                                {/* Order Header Row */}
                                                                <div
                                                                    onClick={() => handleExpandOrder(o)}
                                                                    className={`p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'bg-white hover:bg-blue-50/30'} rounded-t-xl`}
                                                                >
                                                                    <div className="flex items-center justify-between gap-4">
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-transform ${isExpanded ? 'rotate-90 bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                                ▶
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <span className="font-mono font-bold text-blue-700 text-sm">{o.code}</span>
                                                                                    {getOrderTypeBadge(o.order_type)}
                                                                                    {getStatusBadge(o.status)}
                                                                                </div>
                                                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                                                    <span>📅 {formatDate(o.date)}</span>
                                                                                    {o.customer_name && <span>👤 {o.customer_name}</span>}
                                                                                    <span>📦 {o.item_count} SP • {o.total_qty} SL</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right shrink-0">
                                                                            <p className="text-lg font-bold text-blue-900">{formatCurrency(o.total_amount)}</p>
                                                                            <div className="mt-0.5">
                                                                                {getPaymentBadge(o.payment_method, o.payment_status)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Expanded Detail */}
                                                                {isExpanded && (
                                                                    <div className="border-t border-blue-100 bg-white rounded-b-xl animate-fadeIn">
                                                                        {/* Customer Info */}
                                                                        {(o.customer_phone || o.shipping_address || o.user_email) && (
                                                                            <div className="px-4 py-3 bg-slate-50/50 border-b border-blue-50">
                                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                                                                    {o.customer_name && (
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-slate-400">👤</span>
                                                                                            <span className="text-slate-700 font-medium">{o.customer_name}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {o.customer_phone && (
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-slate-400">📞</span>
                                                                                            <span className="text-slate-700">{o.customer_phone}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {o.user_email && (
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-slate-400">✉️</span>
                                                                                            <span className="text-slate-700">{o.user_email}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {o.shipping_address && (
                                                                                        <div className="flex items-center gap-2 sm:col-span-3">
                                                                                            <span className="text-slate-400">📍</span>
                                                                                            <span className="text-slate-600 text-xs">{o.shipping_address}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Items Table */}
                                                                        <div className="p-4">
                                                                            {isLoadingItems ? (
                                                                                <div className="flex items-center justify-center py-6 gap-3">
                                                                                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                                                    <span className="text-slate-500 text-sm">Đang tải sản phẩm...</span>
                                                                                </div>
                                                                            ) : items && items.length > 0 ? (
                                                                                <table className="w-full text-sm">
                                                                                    <thead>
                                                                                        <tr className="border-b border-blue-100">
                                                                                            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Sản phẩm</th>
                                                                                            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Biến thể</th>
                                                                                            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-400 uppercase">SL</th>
                                                                                            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Đơn giá</th>
                                                                                            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Thành tiền</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-blue-50">
                                                                                        {items.map((item: any, idx: number) => (
                                                                                            <tr key={idx} className="hover:bg-blue-50/20">
                                                                                                <td className="py-2.5 px-3 text-slate-700 font-medium">{item.product_name}</td>
                                                                                                <td className="py-2.5 px-3 text-slate-500 text-xs">
                                                                                                    {item.variant_label && item.variant_label.replace(/\s*\/\s*$/g, '').trim()
                                                                                                        ? item.variant_label.replace(/\s*\/\s*$/g, '').trim()
                                                                                                        : <span className="text-slate-300">Mặc định</span>}
                                                                                                </td>
                                                                                                <td className="py-2.5 px-3 text-right font-medium text-slate-700">{item.quantity}</td>
                                                                                                <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                                                                                                <td className="py-2.5 px-3 text-right font-bold text-blue-700">{formatCurrency(item.line_total)}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                    <tfoot>
                                                                                        <tr className="border-t-2 border-blue-200">
                                                                                            <td colSpan={4} className="py-2.5 px-3 text-right font-bold text-slate-600 text-xs uppercase">Tổng cộng:</td>
                                                                                            <td className="py-2.5 px-3 text-right font-bold text-blue-800 text-base">
                                                                                                {formatCurrency(items.reduce((s: number, i: any) => s + Number(i.line_total || 0), 0))}
                                                                                            </td>
                                                                                        </tr>
                                                                                    </tfoot>
                                                                                </table>
                                                                            ) : (
                                                                                <p className="py-4 text-center text-slate-400 italic text-sm">Không có chi tiết sản phẩm</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-blue-100 bg-blue-50/50 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 bg-blue-50 text-blue-900 rounded-xl hover:bg-slate-100 transition-all font-medium"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialReport;
