import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stockTransferService } from '../../services/stockTransferService';

/**
 * StaffDashboard - Dashboard cho STAFF
 * Hiển thị tổng quan: số phiếu đã tạo, trạng thái phiếu
 */
const StaffDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            // Lấy tất cả phiếu của staff này
            const result = await stockTransferService.getTransfers(1, 100);
            const transfers = result.data;

            setStats({
                pending: transfers.filter(t => t.status === 'pending').length,
                approved: transfers.filter(t => t.status === 'approved').length,
                rejected: transfers.filter(t => t.status === 'rejected').length,
                total: transfers.length
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Dashboard Nhân viên</h1>
                <p className="text-slate-600">Xem tổng quan các phiếu bạn đã tạo</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="text-3xl mb-2">📋</div>
                    <p className="text-3xl font-bold text-slate-800">{loading ? '-' : stats.total}</p>
                    <p className="text-slate-600">Tổng phiếu</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl shadow p-6">
                    <div className="text-3xl mb-2">⏳</div>
                    <p className="text-3xl font-bold text-yellow-700">{loading ? '-' : stats.pending}</p>
                    <p className="text-yellow-600">Chờ duyệt</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl shadow p-6">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-3xl font-bold text-green-700">{loading ? '-' : stats.approved}</p>
                    <p className="text-green-600">Đã duyệt</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl shadow p-6">
                    <div className="text-3xl mb-2">❌</div>
                    <p className="text-3xl font-bold text-red-700">{loading ? '-' : stats.rejected}</p>
                    <p className="text-red-600">Từ chối</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Thao tác nhanh</h2>
                <div className="flex flex-wrap gap-4">
                    <Link
                        to="/staff/create-transfer"
                        className="flex items-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                    >
                        <span className="text-2xl">➕</span>
                        <div>
                            <p className="font-medium">Tạo phiếu mới</p>
                            <p className="text-sm text-emerald-100">Nhập / Xuất / Chuyển kho</p>
                        </div>
                    </Link>
                    <Link
                        to="/staff/my-transfers"
                        className="flex items-center gap-3 px-6 py-4 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                    >
                        <span className="text-2xl">📋</span>
                        <div>
                            <p className="font-medium">Xem phiếu đã tạo</p>
                            <p className="text-sm text-slate-500">Theo dõi trạng thái</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">
                    <strong>💡 Lưu ý:</strong> Sau khi tạo phiếu, phiếu sẽ ở trạng thái "Chờ duyệt".
                    ADMIN sẽ xem xét và duyệt/từ chối phiếu của bạn. Tồn kho chỉ được cập nhật khi phiếu được duyệt.
                </p>
            </div>
        </div>
    );
};

export default StaffDashboard;
