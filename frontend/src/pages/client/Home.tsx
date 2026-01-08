import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Home Page - Client/Public
 * Hiển thị trang chủ cho CLIENT (user role) và khách
 */
const Home: React.FC = () => {
    const { isAuthenticated, user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <div>
            {/* Header for logged in users */}
            {isAuthenticated && (
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                {user?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">{user?.full_name}</p>
                                <p className="text-xs text-slate-500">
                                    {user?.roles?.map(r => r.name).join(', ')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Warehouse Management
                            <span className="block text-blue-200">STOCKFLOW</span>
                        </h1>
                        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                            Hệ thống nhập hàng thông minh, hiệu quả, nhanh chóng.
                        </p>
                        <div className="flex justify-center gap-4">
                            {!isAuthenticated ? (
                                <>
                                    <Link to="/login" className="bg-white text-blue-700 px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors">
                                        Đăng nhập
                                    </Link>
                                    <Link to="/products" className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                                        Xem sản phẩm
                                    </Link>
                                </>
                            ) : (
                                <Link to="/products" className="bg-white text-blue-700 px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors">
                                    Xem sản phẩm
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Welcome message for logged in users */}
            {isAuthenticated && (
                <section className="py-8 bg-green-50 border-b border-green-200">
                    <div className="max-w-7xl mx-auto px-4 text-center">
                        <p className="text-green-800 text-lg">
                            👋 Xin chào, <strong>{user?.full_name}</strong>! Bạn đã đăng nhập thành công.
                        </p>
                    </div>
                </section>
            )}

            {/* Features Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">Tính năng chính</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: '📦', title: 'Quản lý tồn kho', desc: 'Theo dõi số lượng tồn kho theo thời gian thực' },
                            { icon: '📊', title: 'Báo cáo thông minh', desc: 'Tạo báo cáo chi tiết để hỗ trợ quyết định' },
                            { icon: '🔄', title: 'Nhập/Xuất kho', desc: 'Quản lý phiếu nhập xuất kho hiệu quả' },
                            { icon: '🏭', title: 'Nhiều kho hàng', desc: 'Quản lý nhiều kho từ một nền tảng' },
                            { icon: '⚠️', title: 'Cảnh báo tồn kho thấp', desc: 'Thông báo tự động khi hàng sắp hết' },
                            { icon: '👥', title: 'Phân quyền người dùng', desc: 'Kiểm soát truy cập theo vai trò' },
                        ].map((feature, i) => (
                            <div key={i} className="bg-slate-50 rounded-xl p-6 text-center hover:shadow-lg transition">
                                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">{feature.title}</h3>
                                <p className="text-slate-600">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            {!isAuthenticated && (
                <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="max-w-4xl mx-auto text-center px-4">
                        <h2 className="text-3xl font-bold mb-4">Bắt đầu ngay hôm nay</h2>
                        <p className="text-xl text-white/80 mb-8">
                            Đăng nhập để trải nghiệm hệ thống quản lý kho hàng.
                        </p>
                        <Link to="/login" className="bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-colors inline-block">
                            Đăng nhập →
                        </Link>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="bg-slate-800 text-slate-400 py-8">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p>© 2026 WMS - Warehouse Management System</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;
