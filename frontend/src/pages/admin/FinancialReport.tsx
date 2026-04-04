import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    receipts: any[];
    issues: any[];
}

const FinancialReport: React.FC = () => {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [monthlyData, setMonthlyData] = useState<MonthlyReportItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Detail Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [detailData, setDetailData] = useState<MonthlyDetailData | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'orders' | 'receipts' | 'issues'>('orders');

    // Generate year options (current year and 5 years back)
    const yearOptions: number[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) yearOptions.push(y);

    useEffect(() => {
        loadData();
    }, [selectedYear]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await reportService.getMonthlyReport(selectedYear);
            setMonthlyData(data);
        } catch (error) {
            console.error('Failed to load monthly report:', error);
            setMonthlyData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleMonthClick = async (month: number) => {
        setSelectedMonth(month);
        setIsModalOpen(true);
        setDetailLoading(true);
        setActiveTab('orders');
        setDetailData(null); // Reset dữ liệu cũ
        try {
            const data = await reportService.getMonthlyDetail(selectedYear, month);
            if (data) {
                setDetailData(data);
            } else {
                setDetailData({ orders: [], receipts: [], issues: [] });
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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const formatCompact = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string, class: string }> = {
            'pending': { label: 'Chờ duyệt', class: 'bg-amber-500/20 text-amber-400' },
            'approved': { label: 'Đã duyệt', class: 'bg-emerald-500/20 text-emerald-400' },
            'completed': { label: 'Hoàn thành', class: 'bg-blue-500/20 text-blue-400' },
            'delivered': { label: 'Đã giao', class: 'bg-emerald-500/20 text-emerald-400' },
            'cancelled': { label: 'Đã hủy', class: 'bg-red-500/20 text-red-400' },
        };
        const s = status.toLowerCase();
        const config = statusMap[s] || { label: status, class: 'bg-slate-700/50 text-slate-400' };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.class}`}>{config.label}</span>;
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
                labels: { color: '#e2e8f0', usePointStyle: true, padding: 20 },
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
        onClick: (event: any, elements: any) => {
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
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mb-2 transition-colors"
                        >
                            ← Quay lại Dashboard
                        </button>
                        <h1 className="text-3xl font-bold">
                            <span className="gradient-text">Báo cáo tài chính</span>
                        </h1>
                        <p className="text-slate-400 mt-1">Chi tiết doanh thu, giá vốn & lợi nhuận theo từng tháng</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-slate-400 text-sm">Năm:</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-slate-800/80 text-white border border-slate-700/50 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition-all cursor-pointer"
                        >
                            {yearOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
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
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
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
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
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
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
                            {totalProfit < 0 ? '📉' : '📈'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="chart-container mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white">📊 Biểu đồ tài chính theo tháng</h2>
                        <p className="text-sm text-slate-400 mt-1">So sánh doanh thu, giá vốn và lợi nhuận năm {selectedYear} (Click vào cột để xem chi tiết)</p>
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
                    <h2 className="text-xl font-semibold text-white">📋 Chi tiết theo từng tháng</h2>
                    <p className="text-sm text-slate-400 mt-1">Bảng tổng hợp doanh thu, giá vốn, lợi nhuận năm {selectedYear} (Click để xem chi tiết tháng)</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-400">Đang tải dữ liệu...</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-400">Tháng</th>
                                    <th className="text-right py-4 px-4 text-sm font-medium text-slate-400">Doanh thu</th>
                                    <th className="text-right py-4 px-4 text-sm font-medium text-slate-400">Giá vốn</th>
                                    <th className="text-right py-4 px-4 text-sm font-medium text-slate-400">Lợi nhuận</th>
                                    <th className="text-right py-4 px-4 text-sm font-medium text-slate-400">Biên LN</th>
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
                                            className={`border-b border-slate-700/30 transition-colors cursor-pointer ${isNegative
                                                    ? 'bg-red-500/10 hover:bg-red-500/20'
                                                    : 'hover:bg-slate-700/30'
                                                }`}
                                        >
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isNegative
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : hasData
                                                                ? 'bg-indigo-500/20 text-indigo-400'
                                                                : 'bg-slate-700/50 text-slate-500'
                                                        }`}>
                                                        {item.month}
                                                    </div>
                                                    <span className="text-slate-200 font-medium">
                                                        {MONTH_LABELS[item.month - 1]}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className={`font-medium ${hasData ? 'text-blue-400' : 'text-slate-600'}`}>
                                                    {formatCurrency(item.revenue)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className={`font-medium ${hasData ? 'text-amber-400' : 'text-slate-600'}`}>
                                                    {formatCurrency(item.cost)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className={`font-bold ${isNegative
                                                        ? 'text-red-400'
                                                        : hasData
                                                            ? 'text-emerald-400'
                                                            : 'text-slate-600'
                                                    }`}>
                                                    {isNegative && '⚠️ '}
                                                    {formatCurrency(profit)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className={`text-sm px-2 py-1 rounded-lg ${isNegative
                                                        ? 'bg-red-500/20 text-red-300'
                                                        : hasData
                                                            ? 'bg-emerald-500/20 text-emerald-300'
                                                            : 'bg-slate-700/30 text-slate-500'
                                                    }`}>
                                                    {margin}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-indigo-500/50 bg-slate-800/50">
                                    <td className="py-4 px-4">
                                        <span className="text-white font-bold text-base">📊 TỔNG CỘNG</span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className="text-blue-300 font-bold text-base">{formatCurrency(totalRevenue)}</span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className="text-amber-300 font-bold text-base">{formatCurrency(totalCost)}</span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className={`font-bold text-base ${totalProfit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {totalProfit < 0 && '⚠️ '}
                                            {formatCurrency(totalProfit)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className={`font-bold text-sm px-3 py-1.5 rounded-lg ${totalProfit < 0
                                                ? 'bg-red-500/30 text-red-300'
                                                : 'bg-emerald-500/30 text-emerald-300'
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <span className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                                        {selectedMonth}
                                    </span>
                                    Chi tiết tài chính {MONTH_LABELS[selectedMonth! - 1]} {selectedYear}
                                </h2>
                                <p className="text-slate-400 mt-1">Danh sách các giao dịch phát sinh trong tháng</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex px-6 pt-4 bg-slate-900/50">
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'orders' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                            >
                                📦 Đơn hàng (Web)
                            </button>
                            <button
                                onClick={() => setActiveTab('receipts')}
                                className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'receipts' ? 'border-amber-500 text-amber-400 bg-amber-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                            >
                                📥 Phiếu nhập kho
                            </button>
                            <button
                                onClick={() => setActiveTab('issues')}
                                className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'issues' ? 'border-red-500 text-red-400 bg-red-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                            >
                                📤 Phiếu xuất nội bộ
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
                            {detailLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-400">Đang truy xuất dữ liệu...</p>
                                </div>
                            ) : (
                                <div className="animate-fadeIn">
                                    {activeTab === 'orders' && (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-800">
                                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã đơn</th>
                                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày tạo</th>
                                                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng tiền</th>
                                                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {!detailData || !detailData.orders || detailData.orders.length === 0 ? (
                                                    <tr><td colSpan={4} className="py-10 text-center text-slate-500 italic">Không có đơn hàng nào trong tháng này</td></tr>
                                                ) : detailData.orders.map((o: any) => (
                                                    <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-4 px-4 font-mono text-indigo-400 font-medium">{o.code}</td>
                                                        <td className="py-4 px-4 text-slate-300">{formatDate(o.date)}</td>
                                                        <td className="py-4 px-4 text-right text-white font-medium">{formatCurrency(o.total_amount)}</td>
                                                        <td className="py-4 px-4 text-center">{getStatusBadge(o.status)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {activeTab === 'receipts' && (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-800">
                                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã phiếu</th>
                                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày nhập</th>
                                                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Giá trị nhập</th>
                                                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {!detailData || !detailData.receipts || detailData.receipts.length === 0 ? (
                                                    <tr><td colSpan={4} className="py-10 text-center text-slate-500 italic">Không có phiếu nhập kho nào trong tháng này</td></tr>
                                                ) : detailData.receipts.map((r: any) => (
                                                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-4 px-4 font-mono text-amber-400 font-medium">{r.code}</td>
                                                        <td className="py-4 px-4 text-slate-300">{formatDate(r.date)}</td>
                                                        <td className="py-4 px-4 text-right text-white font-medium">{formatCurrency(r.total_amount)}</td>
                                                        <td className="py-4 px-4 text-center">{getStatusBadge(r.status)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {activeTab === 'issues' && (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-800">
                                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã phiếu</th>
                                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày xuất</th>
                                                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Giá trị xuất</th>
                                                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {!detailData || !detailData.issues || detailData.issues.length === 0 ? (
                                                    <tr><td colSpan={4} className="py-10 text-center text-slate-500 italic">Không có phiếu xuất kho nào trong tháng này</td></tr>
                                                ) : detailData.issues.map((i: any) => (
                                                    <tr key={i.id} className="hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-4 px-4 font-mono text-red-400 font-medium">{i.code}</td>
                                                        <td className="py-4 px-4 text-slate-300">{formatDate(i.date)}</td>
                                                        <td className="py-4 px-4 text-right text-white font-medium">{formatCurrency(i.total_amount)}</td>
                                                        <td className="py-4 px-4 text-center">{getStatusBadge(i.status)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-medium"
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
