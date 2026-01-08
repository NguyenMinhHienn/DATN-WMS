import React, { useState } from 'react';
import { authService } from '../../services/authService';

/**
 * Login Page
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                            W
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">Đăng nhập WMS</h1>
                        <p className="text-slate-600">Warehouse Management System</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Nhập username"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Nhập password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Đang đăng nhập...
                                </span>
                            ) : 'Đăng nhập'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        <p>
                            Chưa có tài khoản?{' '}
                            <a href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                                Đăng ký
                            </a>
                        </p>
                    </div>

                    {/* Demo credentials */}
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm">
                        <p className="font-medium text-slate-700 mb-2">Tài khoản demo:</p>
                        <table className="w-full text-slate-600">
                            <tbody>
                                <tr>
                                    <td className="py-1"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">ADMIN</span></td>
                                    <td className="font-mono">admin / admin123</td>
                                </tr>
                                <tr>
                                    <td className="py-1"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">STAFF</span></td>
                                    <td className="font-mono">staff / staff123</td>
                                </tr>
                                <tr>
                                    <td className="py-1"><span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">CLIENT</span></td>
                                    <td className="font-mono">user / user123</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
