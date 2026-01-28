import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * StaffLayout - Layout riêng cho STAFF
 * STAFF chỉ có thể: Tạo phiếu, Xem phiếu đã tạo
 * KHÔNG có chức năng duyệt phiếu
 */
export const StaffLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { path: '/staff/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/staff/products', label: 'Xem sản phẩm', icon: '📦' },
        { path: '/staff/orders', label: 'Đơn hàng', icon: '🛒' },
        { path: '/staff/create-transfer', label: 'Tạo phiếu', icon: '➕' },
        { path: '/staff/my-transfers', label: 'Phiếu đã tạo', icon: '📋' },
    ];

    return (
        <div className="min-h-screen bg-emerald-50">
            {/* Overlay mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl transform transition-transform duration-300
                    lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 bg-emerald-600">
                        <img src="/src/assets/logo.png" alt="StockFlow Logo" className="h-10 w-auto bg-white rounded-lg p-1" />
                        <div>
                            <h1 className="font-bold text-white">StockFlow Staff</h1>
                            <p className="text-xs text-emerald-100">Nhân viên kho</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3">
                        <ul className="space-y-1">
                            {menuItems.map((item) => (
                                <li key={item.path}>
                                    <NavLink
                                        to={item.path}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                                ? 'bg-emerald-100 text-emerald-700 font-medium'
                                                : 'text-slate-600 hover:bg-slate-100'
                                            }`
                                        }
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <span className="text-xl">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* User section */}
                    <div className="border-t border-slate-200 p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-medium">
                                {user?.full_name?.charAt(0) || 'S'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 truncate">{user?.full_name}</p>
                                <p className="text-xs text-emerald-600 font-medium">STAFF</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:ml-64 min-h-screen">
                {/* Mobile header */}
                <header className="lg:hidden bg-emerald-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-emerald-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="font-bold">StockFlow Staff</span>
                    <div className="w-10" />
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
