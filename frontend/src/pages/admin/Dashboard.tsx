import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import { DashboardStats } from '../../interface';

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                <p className="text-slate-600">Welcome to Warehouse Management System</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Total Products</p>
                            <p className="text-3xl font-bold text-slate-800">{stats?.totalProducts || 0}</p>
                        </div>
                        <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                            📦
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Warehouses</p>
                            <p className="text-3xl font-bold text-slate-800">{stats?.totalWarehouses || 0}</p>
                        </div>
                        <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">
                            🏭
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Inventory Value</p>
                            <p className="text-3xl font-bold text-slate-800">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats?.totalInventoryValue || 0)}
                            </p>
                        </div>
                        <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                            💰
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Low Stock Items</p>
                            <p className="text-3xl font-bold text-red-600">{stats?.lowStockItems || 0}</p>
                        </div>
                        <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center text-2xl">
                            ⚠️
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Pending Receipts</p>
                            <p className="text-3xl font-bold text-amber-600">{stats?.pendingReceipts || 0}</p>
                        </div>
                        <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">
                            📥
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Pending Issues</p>
                            <p className="text-3xl font-bold text-orange-600">{stats?.pendingIssues || 0}</p>
                        </div>
                        <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">
                            📤
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Movements */}
            <div className="card">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Inventory Movements</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Product</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Warehouse</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Type</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Change</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.recentMovements?.map((movement: any, index: number) => (
                                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4 text-sm text-slate-800">{movement.product_name}</td>
                                    <td className="py-3 px-4 text-sm text-slate-600">{movement.warehouse_name}</td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs px-2 py-1 rounded-full ${movement.movement_type.includes('in') || movement.movement_type === 'goods_receipt'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                            {movement.movement_type.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className={`py-3 px-4 text-sm text-right font-medium ${movement.quantity_change > 0 ? 'text-emerald-600' : 'text-red-600'
                                        }`}>
                                        {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-500">
                                        {new Date(movement.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {(!stats?.recentMovements || stats.recentMovements.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-500">
                                        No recent movements
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
