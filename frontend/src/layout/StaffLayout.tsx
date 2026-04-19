import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from '../components/NotificationBell';

/**
 * StaffLayout - Layout riêng cho STAFF
 * STAFF chỉ có thể: Tạo phiếu, Xem phiếu đã tạo
 * KHÔNG có chức năng duyệt phiếu
 */
export const StaffLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
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

    const menuItems = [
        { path: '/staff/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/staff/products', label: 'Xem sản phẩm', icon: '📦' },
        { path: '/staff/donhang', label: 'Yêu cầu nhập', icon: '📋' },
        { path: '/staff/create-transfer', label: 'Tạo phiếu', icon: '➕' },
        { path: '/staff/my-transfers', label: 'Phiếu đã tạo', icon: '📋' },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
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
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-blue-50 bg-blue-50/30 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 blur-xl"></div>
                        <img src="/src/assets/logo.png" alt="StockFlow Logo" className="h-10 w-auto bg-white rounded-lg p-1 relative z-10 shadow-sm" />
                        <div className="relative z-10">
                            <h1 className="font-bold text-blue-900">StockFlow Staff</h1>
                            <p className="text-xs text-blue-600 font-medium">Nhân viên kho</p>
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
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 font-medium'
                                                : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50 font-medium flex-1'
                                            }`
                                        }
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* User section with dropdown */}
                    <div className="border-t border-blue-100 p-4 relative bg-blue-50/30" ref={dropdownRef}>
                        <div className="flex justify-between items-center mb-3 px-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tài khoản</span>
                            <NotificationBell />
                        </div>
                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-xl shadow-blue-900/10 border border-blue-100 overflow-hidden z-50">
                                <button
                                    onClick={() => { navigate('/profile'); setDropdownOpen(false); setSidebarOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-sm font-medium"
                                >
                                    <span>👤</span> Thông tin cá nhân
                                </button>
                                <button
                                    onClick={() => { navigate('/profile?tab=password'); setDropdownOpen(false); setSidebarOpen(false); }}
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

                        {/* Clickable User Card */}
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
                                {user?.full_name?.charAt(0) || 'S'}
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="font-bold text-slate-800 truncate">{user?.full_name}</p>
                                <p className="text-xs text-blue-600 font-medium">STAFF</p>
                            </div>
                            <svg className={`w-5 h-5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:ml-64 min-h-screen">
                {/* Mobile header */}
                <header className="lg:hidden bg-white/80 backdrop-blur-xl border-b border-blue-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-xl hover:bg-blue-50 text-blue-600 transition-all"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="font-bold text-blue-900">StockFlow Staff</span>
                    <div className="flex items-center gap-2">
                        <NotificationBell />
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
