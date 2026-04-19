import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cartService } from '../services/cartService';
import { NotificationBell } from './NotificationBell';

export const Header: React.FC = () => {
    const { isAuthenticated, user, logout, hasAnyRole } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [cartItemCount, setCartItemCount] = useState(0);

    // Load cart item count
    useEffect(() => {
        const updateCartCount = () => {
            setCartItemCount(cartService.getCartUniqueItemCount());
        };
        updateCartCount();

        // Cập nhật khi có thay đổi localStorage (từ tab khác hoặc khi thêm giỏ)
        window.addEventListener('storage', updateCartCount);
        // Cập nhật định kỳ để sync với các thay đổi cùng tab
        const interval = setInterval(updateCartCount, 1000);

        return () => {
            window.removeEventListener('storage', updateCartCount);
            clearInterval(interval);
        };
    }, []);

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
        navigate('/');
    };

    return (
        <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/src/assets/logo.png" alt="StockFlow Logo" className="h-10 w-auto" />
                        <span className="font-bold text-xl text-slate-800 dark:text-white">StockFlow</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/" className="text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                            Trang chủ
                        </Link>
                        <Link to="/products" className="text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                            Hàng hóa
                        </Link>
                    </nav>

                    {/* Auth buttons */}
                    <div className="flex items-center gap-4">
                        {isAuthenticated ? (
                            <>
                                {hasAnyRole(['admin', 'warehouse_manager', 'staff', 'user']) && (
                                    <Link to="/admin" className="btn btn-secondary text-sm">
                                        Dashboard
                                    </Link>
                                )}
                                {/* Theme Toggle Switch */}
                                <button
                                    onClick={toggleTheme}
                                    className="relative w-14 h-7 bg-slate-200 dark:bg-slate-700 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-7' : 'translate-x-0'}`}>
                                        {theme === 'dark' ? (
                                            <span className="text-xs">🌙</span>
                                        ) : (
                                            <span className="text-xs">☀️</span>
                                        )}
                                    </div>
                                </button>
                                
                                {/* Notification Bell */}
                                <NotificationBell />

                                <div className="relative" ref={dropdownRef}>
                                    {/* Clickable User Info */}
                                    <button
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                    >
                                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                            {user?.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <span className="text-sm text-slate-600 dark:text-slate-300 hidden sm:block">
                                            {user?.full_name}
                                        </span>
                                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>


                                    {/* Dropdown Menu */}
                                    {dropdownOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                                            {/* User info header */}
                                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                                <p className="font-medium text-slate-800">{user?.full_name}</p>
                                                <p className="text-xs text-slate-500">{user?.email}</p>
                                            </div>

                                            {/* Giỏ hàng */}
                                            <button
                                                onClick={() => { navigate('/cart'); setDropdownOpen(false); }}
                                                className="w-full flex items-center justify-between px-4 py-3 text-slate-600 hover:bg-primary-50 hover:text-primary-600 transition-colors text-sm"
                                            >
                                                <span className="flex items-center gap-3">
                                                    <span>📋</span> Phiếu nhập tạm
                                                </span>
                                                {cartItemCount > 0 && (
                                                    <span className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                        {cartItemCount}
                                                    </span>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => { navigate('/orders'); setDropdownOpen(false); }}
                                                className="w-full flex items-center justify-between px-4 py-3 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                                            >
                                                <span className="flex items-center gap-3">
                                                    <span>📦</span> Đơn hàng của tôi
                                                </span>
                                            </button>
                                            
                                            <button
                                                onClick={() => { navigate('/my-receivables'); setDropdownOpen(false); }}
                                                className="w-full flex items-center justify-between px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-sm"
                                            >
                                                <span className="flex items-center gap-3">
                                                    <span>🧾</span> Công nợ của tôi
                                                </span>
                                            </button>

                                            <div className="border-t border-slate-200"></div>

                                            <button
                                                onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                                            >
                                                <span>👤</span> Thông tin cá nhân
                                            </button>
                                            <button
                                                onClick={() => { navigate('/profile?tab=password'); setDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                                            >
                                                <span>🔒</span> Đổi mật khẩu
                                            </button>
                                            <div className="border-t border-slate-200"></div>
                                            <button
                                                onClick={() => { handleLogout(); setDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors text-sm"
                                            >
                                                <span>🚪</span> Đăng xuất
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Theme Toggle for unauthenticated users */}
                                <button
                                    onClick={toggleTheme}
                                    className="relative w-14 h-7 bg-slate-200 dark:bg-slate-700 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-7' : 'translate-x-0'}`}>
                                        {theme === 'dark' ? (
                                            <span className="text-xs">🌙</span>
                                        ) : (
                                            <span className="text-xs">☀️</span>
                                        )}
                                    </div>
                                </button>
                                <Link to="/login" className="btn btn-primary text-sm">
                                    Login
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
