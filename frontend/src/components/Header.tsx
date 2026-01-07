import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
    const { isAuthenticated, user, logout, hasAnyRole } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                            W
                        </div>
                        <span className="font-bold text-xl text-slate-800">WMS</span>
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
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-600 hidden sm:block">
                                        {user?.full_name}
                                    </span>
                                    <button onClick={handleLogout} className="btn btn-primary text-sm">
                                        Logout
                                    </button>
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
