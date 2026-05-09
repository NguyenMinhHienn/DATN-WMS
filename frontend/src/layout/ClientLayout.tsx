import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cartService } from '../services/cartService';
import { NotificationBell } from '../components/NotificationBell';

/**
 * ClientLayout - Layout chung cho tất cả trang client (trừ Home)
 * Bao gồm: Header nav + Footer + Outlet
 */
export const ClientLayout: React.FC = () => {
    const { isAuthenticated, user, logout, hasRole } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [cartItemCount, setCartItemCount] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const updateCartCount = () => setCartItemCount(cartService.getCartUniqueItemCount());
        updateCartCount();
        window.addEventListener('storage', updateCartCount);
        const interval = setInterval(updateCartCount, 1000);
        return () => { window.removeEventListener('storage', updateCartCount); clearInterval(interval); };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close mobile menu on route change
    useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const isActive = (path: string) => location.pathname === path;

    const navLinks = [
        { to: '/', label: 'Trang chủ', icon: '🏠', always: true },
        { to: '/products', label: 'Hàng hóa', icon: '📦', always: true },
        { to: '/orders', label: 'Yêu cầu nhập', icon: '📝', auth: true },
        { to: '/my-receivables', label: 'Công nợ', icon: '💳', auth: true },
        { to: '/support', label: 'Hỗ trợ', icon: '💬', auth: true },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col">
            {/* ========== HEADER ========== */}
            <header className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-sm border-b border-slate-200/80 dark:border-slate-700/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2.5 group">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                                SF
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="font-bold text-slate-800 dark:text-white text-base leading-tight">StockFlow</h1>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 -mt-0.5">Warehouse Management</p>
                            </div>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navLinks.filter(l => l.always || (l.auth && isAuthenticated)).map(link => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                        isActive(link.to)
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <span className="mr-1.5 text-xs">{link.icon}</span>
                                    {link.label}
                                </Link>
                            ))}

                            {hasRole && hasRole('admin') && (
                                <Link to="/admin/dashboard" className="px-3 py-2 rounded-lg text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all">
                                    ⚙️ Admin
                                </Link>
                            )}
                            {hasRole && hasRole('staff') && (
                                <Link to="/staff/dashboard" className="px-3 py-2 rounded-lg text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                                    👷 Staff
                                </Link>
                            )}
                        </nav>

                        {/* Right side */}
                        <div className="flex items-center gap-2">
                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
                            >
                                {theme === 'dark' ? '🌙' : '☀️'}
                            </button>

                            {isAuthenticated ? (
                                <>
                                    {/* Notification Bell */}
                                    <NotificationBell />

                                    {/* Cart */}
                                    <button
                                        onClick={() => navigate('/cart')}
                                        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        📋
                                        {cartItemCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                                                {cartItemCount}
                                            </span>
                                        )}
                                    </button>

                                    {/* User Dropdown */}
                                    <div className="relative" ref={dropdownRef}>
                                        <button
                                            onClick={() => setDropdownOpen(!dropdownOpen)}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            {user?.avatar_url ? (
                                                <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-indigo-200" />
                                            ) : (
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow">
                                                    {user?.full_name?.charAt(0) || 'U'}
                                                </div>
                                            )}
                                            <span className="hidden lg:block text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">{user?.full_name}</span>
                                            <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {dropdownOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fadeIn">
                                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                                    <p className="font-medium text-slate-800 dark:text-white text-sm truncate">{user?.full_name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                                                </div>
                                                <div className="py-1">
                                                    <button onClick={() => { navigate('/profile'); setDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                        <span>👤</span> Thông tin cá nhân
                                                    </button>
                                                    <button onClick={() => { navigate('/my-credit'); setDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                        <span>🏦</span> Tín dụng của tôi
                                                    </button>
                                                    <button onClick={() => { navigate('/profile?tab=password'); setDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                        <span>🔒</span> Đổi mật khẩu
                                                    </button>
                                                </div>
                                                <div className="border-t border-slate-100 dark:border-slate-700 py-1">
                                                    <button onClick={() => { handleLogout(); setDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                        <span>🚪</span> Đăng xuất
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Link to="/login" className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 font-medium transition-colors">
                                        Đăng nhập
                                    </Link>
                                    <Link to="/register" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                                        Đăng ký
                                    </Link>
                                </div>
                            )}

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                {mobileMenuOpen ? '✕' : '☰'}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation */}
                    {mobileMenuOpen && (
                        <div className="md:hidden pb-4 border-t border-slate-100 dark:border-slate-700 mt-2 pt-3 animate-fadeIn">
                            <div className="flex flex-col gap-1">
                                {navLinks.filter(l => l.always || (l.auth && isAuthenticated)).map(link => (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                            isActive(link.to)
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <span>{link.icon}</span> {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* ========== MAIN CONTENT ========== */}
            <main className="flex-1">
                <Outlet />
            </main>

            {/* ========== FOOTER ========== */}
            <footer className="bg-slate-900 text-slate-400 pt-12 pb-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                                    SF
                                </div>
                                <span className="font-bold text-white text-lg">StockFlow</span>
                            </div>
                            <p className="text-sm leading-relaxed mb-4">
                                Hệ thống quản lý kho hàng thông minh.<br />
                                Dự án tốt nghiệp - 2026
                            </p>
                            <div className="flex items-start gap-2 text-sm">
                                <span>📍</span>
                                <p>Số 1, Phố Trịnh Văn Bô,<br />Phương Canh, Hà Nội</p>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Liên kết</h4>
                            <ul className="space-y-2 text-sm">
                                <li><Link to="/" className="hover:text-white transition-colors">Trang chủ</Link></li>
                                <li><Link to="/products" className="hover:text-white transition-colors">Hàng hóa</Link></li>
                                <li><Link to="/support" className="hover:text-white transition-colors">Hỗ trợ</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Tài khoản</h4>
                            <ul className="space-y-2 text-sm">
                                {isAuthenticated ? (
                                    <>
                                        <li><Link to="/profile" className="hover:text-white transition-colors">Thông tin cá nhân</Link></li>
                                        <li><Link to="/orders" className="hover:text-white transition-colors">Yêu cầu nhập</Link></li>
                                        <li><Link to="/my-receivables" className="hover:text-white transition-colors">Công nợ</Link></li>
                                    </>
                                ) : (
                                    <>
                                        <li><Link to="/login" className="hover:text-white transition-colors">Đăng nhập</Link></li>
                                        <li><Link to="/register" className="hover:text-white transition-colors">Đăng ký</Link></li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-800 pt-6 text-center text-sm">
                        <p>© 2026 StockFlow - Smart Inventory Management System</p>
                        <p className="mt-1 text-slate-500">Author by Nguyen Minh Hien</p>
                    </div>
                </div>
            </footer>

            {/* Fade-in animation */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
            `}</style>
        </div>
    );
};
