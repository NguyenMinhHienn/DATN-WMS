import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';

/**
 * Login Page - Modern Dark Theme Design
 * 
 * Redirect theo role:
 * - ADMIN → /admin/dashboard
 * - STAFF → /staff/dashboard
 * - CLIENT (user) → / (trang chủ)
 */
const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const validateForm = (): string | null => {
        if (!username.trim()) return 'Tên đăng nhập không được để trống';
        if (!password) return 'Mật khẩu không được để trống';
        if (password.trim().length === 0) return 'Mật khẩu không được chỉ chứa khoảng trắng';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate trước khi submit
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        try {
            // Login và lấy thông tin user
            const response = await authService.login(username, password);
            const userRoles = response.user.roles.map((r: any) => r.name);

            console.log('[Login] User roles:', userRoles);

            // Lưu token và user vào sessionStorage
            sessionStorage.setItem('token', response.token);
            sessionStorage.setItem('user', JSON.stringify(response.user));

            // Redirect theo role - ưu tiên admin > staff > user
            let redirectTo = '/'; // Mặc định cho CLIENT/USER

            if (userRoles.includes('admin')) {
                redirectTo = '/admin/dashboard';
            } else if (userRoles.includes('staff')) {
                redirectTo = '/staff/dashboard';
            }
            // user role hoặc các role khác → về trang chủ /

            console.log('[Login] Redirecting to:', redirectTo);

            // Redirect - dùng window.location.href để force reload AuthContext
            window.location.href = redirectTo;
        } catch (err: any) {
            console.error('[Login] Error:', err);
            setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-fill demo account
    const fillDemoAccount = (type: 'admin' | 'staff' | 'client') => {
        const accounts = {
            admin: { username: 'admin', password: 'admin123' },
            staff: { username: 'staff', password: 'staff123' },
            client: { username: 'user', password: 'user123' },
        };
        setUsername(accounts[type].username);
        setPassword(accounts[type].password);
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8"
            style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)'
            }}>

            {/* Animated Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Main Card with Glassmorphism */}
                <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-8 relative overflow-hidden">

                    {/* Decorative corner accents */}
                    <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-br-full" />
                    <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-purple-500/20 to-transparent rounded-tl-full" />

                    {/* Header */}
                    <div className="text-center mb-8 relative">
                        <div className="relative inline-block">
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-xl shadow-indigo-500/30 transform hover:scale-105 transition-transform duration-300">
                                W
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                            Đăng nhập WMS
                        </h1>
                        <p className="text-slate-400 mt-2">Warehouse Management System</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm animate-fadeIn">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username Field */}
                        <div className="group">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Tên đăng nhập
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 hover:border-slate-500"
                                    placeholder="Nhập username"
                                    required
                                    autoFocus
                                />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-purple-500/0 group-focus-within:from-indigo-500/10 group-focus-within:to-purple-500/10 pointer-events-none transition-all duration-300" />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="group">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Mật khẩu
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 pr-12 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 hover:border-slate-500"
                                    placeholder="Nhập password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors p-1"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Đang đăng nhập...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        Đăng nhập
                                    </>
                                )}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-700/50"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-slate-800/40 text-slate-500">hoặc</span>
                        </div>
                    </div>

                    {/* Register Link */}
                    <div className="text-center">
                        <p className="text-slate-400">
                            Chưa có tài khoản?{' '}
                            <Link
                                to="/register"
                                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors hover:underline underline-offset-4"
                            >
                                Đăng ký ngay
                            </Link>
                        </p>
                    </div>

                    {/* Demo Credentials - Redesigned */}
                    <div className="mt-8 p-5 bg-slate-900/50 rounded-2xl border border-slate-700/30">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="font-medium text-slate-300">Tài khoản demo</p>
                        </div>
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => fillDemoAccount('admin')}
                                className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-all duration-300 group border border-transparent hover:border-indigo-500/30"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/30">
                                        ADMIN
                                    </span>
                                    <span className="text-slate-300 font-mono text-sm">admin / admin123</span>
                                </div>
                                <svg className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => fillDemoAccount('staff')}
                                className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-all duration-300 group border border-transparent hover:border-emerald-500/30"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/30">
                                        STAFF
                                    </span>
                                    <span className="text-slate-300 font-mono text-sm">staff / staff123</span>
                                </div>
                                <svg className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => fillDemoAccount('client')}
                                className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-all duration-300 group border border-transparent hover:border-slate-500/30"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="px-2.5 py-1 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-slate-500/30">
                                        CLIENT
                                    </span>
                                    <span className="text-slate-300 font-mono text-sm">user / user123</span>
                                </div>
                                <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    © 2026 WMS - Warehouse Management System
                </p>
            </div>
        </div>
    );
};

export default Login;
