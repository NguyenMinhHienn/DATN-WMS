import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Admin Sidebar - CHỈ DÀNH CHO ADMIN
 * STAFF sử dụng StaffLayout với sidebar riêng
 */
const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'Quản lý Users', icon: '👥' },
    { path: '/admin/products', label: 'Sản phẩm', icon: '📦' },
    { path: '/admin/product-config', label: 'Cấu hình SP', icon: '⚙️' },
    { path: '/admin/warehouses', label: 'Kho hàng', icon: '🏭' },
    { path: '/admin/inventory', label: 'Tồn kho', icon: '📋' },
    { path: '/admin/stock-in', label: 'Nhập kho', icon: '📥' },
    { path: '/admin/stock-out', label: 'Xuất kho', icon: '📤' },
    { path: '/admin/inter-warehouse-transfer', label: 'Chuyển kho', icon: '🔄' },
    { path: '/admin/stock-transfers', label: 'Duyệt phiếu', icon: '✅' },
    { path: '/admin/reports', label: 'Báo cáo', icon: '📈' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Admin sidebar - không cần filter roles vì đã có AdminRoute guard

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 z-50 h-full w-64 
                    bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950
                    shadow-2xl shadow-indigo-900/20
                    transform transition-transform duration-300 ease-in-out
                    lg:translate-x-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    border-r border-slate-800/50
                `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="relative flex items-center gap-3 px-6 py-6 border-b border-slate-800/50">
                        {/* Glow effect behind logo */}
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/10 blur-2xl"></div>
                        <div className="relative flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <span className="text-xl">📦</span>
                            </div>
                            <div>
                                <h1 className="font-bold text-white text-lg">StockFlow</h1>
                                <p className="text-xs text-indigo-300/70">Smart Inventory</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 mb-3">Menu chính</p>
                        <ul className="space-y-1">
                            {menuItems.map((item) => (
                                <li key={item.path}>
                                    <NavLink
                                        to={item.path}
                                        end={item.path === '/admin'}
                                        className={({ isActive }) =>
                                            `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                                                ? 'bg-gradient-to-r from-indigo-600/80 to-purple-600/60 text-white shadow-lg shadow-indigo-500/20'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`
                                        }
                                        onClick={onClose}
                                    >
                                        <span className="text-xl group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                                        <span className="font-medium">{item.label}</span>
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* User section */}
                    <div className="border-t border-slate-800/50 p-4">
                        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-slate-800/30 backdrop-blur-sm">
                            <div className="relative">
                                <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
                                    {user?.full_name?.charAt(0) || 'U'}
                                </div>
                                {/* Online indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-white truncate">{user?.full_name}</p>
                                <p className="text-xs text-indigo-300/70 truncate">
                                    {user?.roles?.map(r => r.name).join(', ')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl 
                                       bg-slate-800/50 text-slate-300 hover:bg-red-500/20 hover:text-red-400 
                                       border border-slate-700/50 hover:border-red-500/30
                                       transition-all duration-300 font-medium"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};
