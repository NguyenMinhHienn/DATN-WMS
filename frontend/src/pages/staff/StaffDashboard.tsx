import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stockTransferService } from '../../services/stockTransferService';
import { StockTransfer } from '../../interface';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

/**
 * StaffDashboard - Dashboard hiện đại cho STAFF
 * Hiển thị: thống kê, biểu đồ, phiếu gần đây
 */
const StaffDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
        imports: 0,
        exports: 0,
        transfers: 0
    });
    const [recentTransfers, setRecentTransfers] = useState<StockTransfer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const result = await stockTransferService.getTransfers(1, 100);
            const transfers = result.data;

            setStats({
                pending: transfers.filter(t => t.status === 'pending').length,
                approved: transfers.filter(t => t.status === 'approved').length,
                rejected: transfers.filter(t => t.status === 'rejected').length,
                total: transfers.length,
                imports: transfers.filter(t => t.transfer_type === 'IMPORT').length,
                exports: transfers.filter(t => t.transfer_type === 'EXPORT').length,
                transfers: transfers.filter(t => t.transfer_type === 'TRANSFER').length
            });

            // Get 5 recent transfers
            setRecentTransfers(transfers.slice(0, 5));
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Status Doughnut Chart
    const statusChartData = {
        labels: ['Chờ duyệt', 'Đã duyệt', 'Từ chối'],
        datasets: [{
            data: [stats.pending, stats.approved, stats.rejected],
            backgroundColor: [
                'rgba(251, 191, 36, 0.9)',  // amber
                'rgba(34, 197, 94, 0.9)',    // green  
                'rgba(239, 68, 68, 0.9)',    // red
            ],
            borderColor: [
                'rgba(251, 191, 36, 1)',
                'rgba(34, 197, 94, 1)',
                'rgba(239, 68, 68, 1)',
            ],
            borderWidth: 2,
            hoverOffset: 10,
        }],
    };

    const statusChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: '#334155',
                    usePointStyle: true,
                    padding: 20,
                    font: { size: 13, weight: 500 as const }
                },
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

    // Transfer Type Bar Chart
    const typeChartData = {
        labels: ['Nhập kho', 'Xuất kho', 'Chuyển kho'],
        datasets: [{
            label: 'Số phiếu',
            data: [stats.imports, stats.exports, stats.transfers],
            backgroundColor: [
                'rgba(34, 197, 94, 0.85)',   // green
                'rgba(249, 115, 22, 0.85)',  // orange
                'rgba(139, 92, 246, 0.85)',  // purple
            ],
            borderColor: [
                'rgba(34, 197, 94, 1)',
                'rgba(249, 115, 22, 1)',
                'rgba(139, 92, 246, 1)',
            ],
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
        }],
    };

    const typeChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
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
                grid: { display: false },
                ticks: { color: '#64748b', font: { weight: 500 as const } },
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(148, 163, 184, 0.2)' },
                ticks: { color: '#64748b', stepSize: 1 },
            },
        },
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { label: string; className: string }> = {
            pending: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
            approved: { label: 'Đã duyệt', className: 'bg-green-100 text-green-700 border border-green-200' },
            rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-700 border border-red-200' },
        };
        const c = config[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
        return <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${c.className}`}>{c.label}</span>;
    };

    const getTypeBadge = (type: string) => {
        const config: Record<string, { label: string; className: string }> = {
            IMPORT: { label: '📥 Nhập', className: 'bg-green-100 text-green-700' },
            EXPORT: { label: '📤 Xuất', className: 'bg-orange-100 text-orange-700' },
            TRANSFER: { label: '🔄 Chuyển', className: 'bg-purple-100 text-purple-700' },
        };
        const c = config[type] || { label: type, className: 'bg-gray-100 text-gray-700' };
        return <span className={`px-2 py-0.5 text-xs font-medium rounded ${c.className}`}>{c.label}</span>;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <span className="text-2xl">👤</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Dashboard Nhân viên</h1>
                        <p className="text-slate-500">Quản lý phiếu kho và theo dõi trạng thái</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards - More Colorful */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="bg-white rounded-2xl shadow-lg shadow-blue-500/10 p-6 border border-blue-100 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-600 mb-1">Tổng phiếu</p>
                            <p className="text-4xl font-bold text-slate-800">{stats.total}</p>
                            <p className="text-xs text-slate-500 mt-1">Tất cả phiếu đã tạo</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40">
                            <span className="text-2xl">📋</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg shadow-amber-500/10 p-6 border border-amber-100 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-amber-600 mb-1">Chờ duyệt</p>
                            <p className="text-4xl font-bold text-slate-800">{stats.pending}</p>
                            <p className="text-xs text-slate-500 mt-1">Đang chờ Admin xét duyệt</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/40 animate-pulse">
                            <span className="text-2xl">⏳</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg shadow-green-500/10 p-6 border border-green-100 hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-600 mb-1">Đã duyệt</p>
                            <p className="text-4xl font-bold text-slate-800">{stats.approved}</p>
                            <p className="text-xs text-slate-500 mt-1">Hoàn thành thành công</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/40">
                            <span className="text-2xl">✅</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg shadow-red-500/10 p-6 border border-red-100 hover:shadow-xl hover:shadow-red-500/20 transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-red-600 mb-1">Từ chối</p>
                            <p className="text-4xl font-bold text-slate-800">{stats.rejected}</p>
                            <p className="text-xs text-slate-500 mt-1">Không được chấp thuận</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/40">
                            <span className="text-2xl">❌</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Status Distribution Chart */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">📊</span>
                        Phân bố trạng thái phiếu
                    </h3>
                    <div className="h-64">
                        {stats.total > 0 ? (
                            <Doughnut data={statusChartData} options={statusChartOptions} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                <div className="text-center">
                                    <span className="text-4xl opacity-50">📊</span>
                                    <p className="mt-2">Chưa có dữ liệu</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transfer Type Chart */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-sm">📈</span>
                        Phân loại phiếu kho
                    </h3>
                    <div className="h-64">
                        {stats.total > 0 ? (
                            <Bar data={typeChartData} options={typeChartOptions} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                <div className="text-center">
                                    <span className="text-4xl opacity-50">📈</span>
                                    <p className="mt-2">Chưa có dữ liệu</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions + Recent Transfers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-sm">🚀</span>
                        Thao tác nhanh
                    </h3>
                    <div className="space-y-3">
                        <Link
                            to="/staff/create-transfer"
                            className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl hover:from-emerald-100 hover:to-green-100 hover:border-emerald-300 transition-all group"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform">
                                ➕
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">Tạo phiếu mới</p>
                                <p className="text-xs text-slate-500">Nhập / Xuất / Chuyển kho</p>
                            </div>
                        </Link>

                        <Link
                            to="/staff/my-transfers"
                            className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-300 transition-all group"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform">
                                📋
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">Phiếu đã tạo</p>
                                <p className="text-xs text-slate-500">Theo dõi trạng thái</p>
                            </div>
                        </Link>

                        <Link
                            to="/staff/products"
                            className="flex items-center gap-3 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl hover:from-cyan-100 hover:to-blue-100 hover:border-cyan-300 transition-all group"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform">
                                📦
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">Danh sách sản phẩm</p>
                                <p className="text-xs text-slate-500">Xem thông tin SP</p>
                            </div>
                        </Link>

                        <Link
                            to="/staff/orders"
                            className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl hover:from-pink-100 hover:to-rose-100 hover:border-pink-300 transition-all group"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform">
                                🛒
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">Đơn hàng</p>
                                <p className="text-xs text-slate-500">Theo dõi đơn hàng</p>
                            </div>
                        </Link>

                        <Link
                            to="/staff/donhang"
                            className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl hover:from-yellow-100 hover:to-amber-100 hover:border-yellow-300 transition-all group"
>
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform">
                               📦
                             </div>
                            <div>
                                <p className="font-medium text-slate-800">Đơn hàng </p>
                                <p className="text-xs text-slate-500">Xem danh sách đơn hàng</p>
                            </div>
                        </Link>
                    </div>
                </div>


                

                {/* Recent Transfers */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm">📝</span>
                            Phiếu gần đây
                        </h3>
                        <Link to="/staff/my-transfers" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                            Xem tất cả →
                        </Link>
                    </div>

                    {recentTransfers.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <span className="text-5xl opacity-50">📋</span>
                            <p className="mt-3 font-medium">Chưa có phiếu nào</p>
                            <p className="text-sm">Tạo phiếu đầu tiên của bạn ngay!</p>
                            <Link
                                to="/staff/create-transfer"
                                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                            >
                                ➕ Tạo phiếu mới
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã phiếu</th>
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Loại</th>
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày tạo</th>
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {recentTransfers.map(transfer => (
                                        <tr key={transfer.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-2">
                                                <span className="font-mono text-sm font-medium text-indigo-600">
                                                    #{transfer.id}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2">{getTypeBadge(transfer.transfer_type)}</td>
                                            <td className="py-3 px-2 text-sm text-slate-600">{formatDate(transfer.created_at)}</td>
                                            <td className="py-3 px-2">{getStatusBadge(transfer.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-md">
                        💡
                    </div>
                    <div>
                        <h3 className="font-semibold text-blue-800 mb-1">Lưu ý quan trọng</h3>
                        <p className="text-blue-700 text-sm">
                            Sau khi tạo phiếu, phiếu sẽ ở trạng thái "Chờ duyệt". ADMIN sẽ xem xét và duyệt/từ chối phiếu của bạn. Tồn kho chỉ được cập nhật khi phiếu được duyệt.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
