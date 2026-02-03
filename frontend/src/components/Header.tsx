import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
    const { isAuthenticated, user, logout, hasAnyRole } = useAuth();
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
        navigate('/');
    };

    return (
        <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/src/assets/logo.png" alt="StockFlow Logo" className="h-10 w-auto" />
                        <span className="font-bold text-xl text-slate-800">StockFlow</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/" className="text-slate-600 hover:text-primary-600 transition-colors">
                            Home
                        </Link>
                        <Link to="/products" className="text-slate-600 hover:text-primary-600 transition-colors">
                            Products
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
                                <div className="relative" ref={dropdownRef}>
                                    {/* Clickable User Info */}
                                    <button
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                    >
                                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                            {user?.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <span className="text-sm text-slate-600 hidden sm:block">
                                            {user?.full_name}
                                        </span>
                                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {dropdownOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
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
                            <Link to="/login" className="btn btn-primary text-sm">
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
