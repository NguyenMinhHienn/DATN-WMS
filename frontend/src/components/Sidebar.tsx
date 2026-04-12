import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export interface SidebarBadges {
    lowStock?: number;
    pendingReceipts?: number;
    pendingIssues?: number;
    pendingOrders?: number;
}

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    badges?: SidebarBadges;
}

/**
 * Admin Sidebar - CHỈ DÀNH CHO ADMIN
 * STAFF sử dụng StaffLayout với sidebar riêng
 */
const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊', badgeKey: null },
    { path: '/admin/users', label: 'Quản lý Users', icon: '👥', badgeKey: null },
    { path: '/admin/products', label: 'Sản phẩm', icon: '📦', badgeKey: null },
    { path: '/admin/product-config', label: 'Cấu hình SP', icon: '⚙️', badgeKey: null },
    { path: '/admin/inventory', label: 'Tồn kho', icon: '📋', badgeKey: 'lowStock' as const },
    { path: '/admin/stock-management', label: 'Quản lý phiếu', icon: '📦', badgeKey: 'pendingSlips' as const },
    { path: '/admin/orders', label: 'Yêu cầu nhập', icon: '📋', badgeKey: 'pendingOrders' as const },
    { path: '/admin/financial-report', label: 'Báo cáo tài chính', icon: '💰', badgeKey: null },
    { path: '/admin/reports', label: 'Báo cáo', icon: '📈', badgeKey: null },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, badges }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Compute badge value for each menu item
    const getBadgeCount = (badgeKey: string | null): number => {
        if (!badges || !badgeKey) return 0;
        if (badgeKey === 'lowStock') return badges.lowStock || 0;
        if (badgeKey === 'pendingSlips') return (badges.pendingReceipts || 0) + (badges.pendingIssues || 0);
        if (badgeKey === 'pendingOrders') return badges.pendingOrders || 0;
        return 0;
    };

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
                    bg-white shadow-xl shadow-blue-900/5
                    transform transition-transform duration-300 ease-in-out
                    lg:translate-x-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    border-r border-blue-100
                `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="relative flex items-center gap-3 px-6 py-5 border-b border-blue-50 bg-blue-50/30">
                        {/* Glow effect behind logo */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 blur-xl"></div>
                        <img src="/src/assets/logo.png" alt="StockFlow Logo" className="h-10 w-auto bg-white rounded-lg p-1 relative z-10 shadow-sm" />
                        <div className="relative z-10">
                            <h1 className="font-bold text-blue-900">StockFlow Admin</h1>
                            <p className="text-xs text-blue-600 font-medium">Smart Inventory</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3">
                        <p className="text-xs text-blue-500 uppercase tracking-wider font-bold px-4 mb-3">Menu chính</p>
                        <ul className="space-y-1">
                            {menuItems.map((item) => {
                                const badgeCount = getBadgeCount(item.badgeKey);
                                return (
                                    <li key={item.path}>
                                        <NavLink
                                            to={item.path}
                                            end={item.path === '/admin'}
                                            className={({ isActive }) =>
                                                `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                                                    : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                                                }`
                                            }
                                            onClick={onClose}
                                        >
                                            <span className={`text-xl group-hover:scale-110 transition-transform duration-200 relative`}>
                                                {item.icon}
                                                {badgeCount > 0 && (
                                                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg shadow-red-500/40 animate-pulse">
                                                        {badgeCount > 99 ? '99+' : badgeCount}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="font-medium flex-1">{item.label}</span>
                                            {badgeCount > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                                    {badgeCount}
                                                </span>
                                            )}
                                        </NavLink>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* User section with dropdown */}
                    <div className="border-t border-blue-100 p-4 relative bg-blue-50/30" ref={dropdownRef}>
                        {/* Dropdown Menu - positioned above the user card */}
                        {dropdownOpen && (
                            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-xl shadow-blue-900/10 border border-blue-100 overflow-hidden z-50">
                                <button
                                    onClick={() => { navigate('/profile'); setDropdownOpen(false); onClose(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-sm font-medium"
                                >
                                    <span>👤</span> Thông tin cá nhân
                                </button>
                                <button
                                    onClick={() => { navigate('/profile?tab=password'); setDropdownOpen(false); onClose(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-sm font-medium"
                                >
                                    <span>🔒</span> Đổi mật khẩu
                                </button>
                                <div className="border-t border-slate-100"></div>
                                <button
                                    onClick={() => { handleLogout(); setDropdownOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors text-sm font-medium"
                                >
                                    <span>🚪</span> Đăng xuất
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="relative">
                                {user?.avatar_url ? (
                                    <img
                                        src={`http://localhost:3000${user.avatar_url}`}
                                        alt="Avatar"
                                        className="w-11 h-11 rounded-xl object-cover shadow-sm"
                                    />
                                ) : (
                                    <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
                                        {user?.full_name?.charAt(0) || 'U'}
                                    </div>
                                )}
                                {/* Online indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="font-bold text-slate-800 truncate">{user?.full_name}</p>
                                <p className="text-xs text-blue-600 font-medium truncate">
                                    {user?.roles?.map(r => r.name).join(', ')}
                                </p>
                            </div>
                            <svg className={`w-5 h-5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};
