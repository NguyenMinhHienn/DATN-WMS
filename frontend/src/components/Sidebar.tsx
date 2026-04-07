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
                            {menuItems.map((item) => {
                                const badgeCount = getBadgeCount(item.badgeKey);
                                return (
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
                                            <span className="text-xl group-hover:scale-110 transition-transform duration-200 relative">
                                                {item.icon}
                                                {badgeCount > 0 && (
                                                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg shadow-red-500/40 animate-pulse">
                                                        {badgeCount > 99 ? '99+' : badgeCount}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="font-medium flex-1">{item.label}</span>
                                            {badgeCount > 0 && (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
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
                    <div className="border-t border-slate-800/50 p-4 relative" ref={dropdownRef}>
                        {/* Dropdown Menu - positioned above the user card */}
                        {dropdownOpen && (
                            <div className="absolute bottom-full left-4 right-4 mb-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700/50 overflow-hidden z-50">
                                <button
                                    onClick={() => { navigate('/profile'); setDropdownOpen(false); onClose(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors text-sm"
                                >
                                    <span>👤</span> Thông tin cá nhân
                                </button>
                                <button
                                    onClick={() => { navigate('/profile?tab=password'); setDropdownOpen(false); onClose(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors text-sm"
                                >
                                    <span>🔒</span> Đổi mật khẩu
                                </button>
                                <div className="border-t border-slate-700/50"></div>
                                <button
                                    onClick={() => { handleLogout(); setDropdownOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm"
                                >
                                    <span>🚪</span> Đăng xuất
                                </button>
                            </div>
                        )}

                        {/* Clickable User Card */}
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 backdrop-blur-sm hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                            <div className="relative">
                                {user?.avatar_url ? (
                                    <img
                                        src={`http://localhost:3000${user.avatar_url}`}
                                        alt="Avatar"
                                        className="w-11 h-11 rounded-xl object-cover shadow-lg"
                                    />
                                ) : (
                                    <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
                                        {user?.full_name?.charAt(0) || 'U'}
                                    </div>
                                )}
                                {/* Online indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="font-medium text-white truncate">{user?.full_name}</p>
                                <p className="text-xs text-indigo-300/70 truncate">
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
