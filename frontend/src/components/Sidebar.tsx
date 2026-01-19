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
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200">
                        <img src="/src/assets/logo.png" alt="StockFlow Logo" className="h-10 w-auto" />
                        <div>
                            <h1 className="font-bold text-slate-800">StockFlow</h1>
                            <p className="text-xs text-slate-500">Smart Inventory Management</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3">
                        <ul className="space-y-1">
                            {menuItems.map((item) => (
                                <li key={item.path}>
                                    <NavLink
                                        to={item.path}
                                        end={item.path === '/admin'}
                                        className={({ isActive }) =>
                                            `sidebar-link ${isActive ? 'active' : ''}`
                                        }
                                        onClick={onClose}
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
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                                {user?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 truncate">{user?.full_name}</p>
                                <p className="text-xs text-slate-500 truncate">
                                    {user?.roles?.map(r => r.name).join(', ')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full btn btn-secondary text-sm"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};
