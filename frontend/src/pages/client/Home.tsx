import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Home Page - Client/Public
 * Trang chủ với UI hiện đại, premium cho CLIENT và khách
 */
const Home: React.FC = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const [currentSlide, setCurrentSlide] = useState(0);

    // Auto slide cho banner
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % 3);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    // Stats hiển thị - UI only placeholder
    const stats = [
        { value: '10K+', label: 'Sản phẩm', icon: '📦' },
        { value: '500+', label: 'Đối tác', icon: '🤝' },
        { value: '99.9%', label: 'Uptime', icon: '⚡' },
        { value: '24/7', label: 'Hỗ trợ', icon: '🎧' },
    ];

    // Banner slides
    const bannerSlides = [
        {
            title: 'Warehouse Management',
            subtitle: 'STOCKFLOW',
            desc: 'Hệ thống quản lý kho hàng thông minh, hiệu quả, nhanh chóng.',
            gradient: 'from-blue-600 via-blue-700 to-indigo-800',
        },
        {
            title: 'Quản lý thông minh',
            subtitle: 'Tự động hóa',
            desc: 'Tối ưu quy trình nhập xuất kho với công nghệ AI tiên tiến.',
            gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
        },
        {
            title: 'Báo cáo chi tiết',
            subtitle: 'Real-time Analytics',
            desc: 'Theo dõi tồn kho, phân tích xu hướng theo thời gian thực.',
            gradient: 'from-purple-600 via-violet-600 to-indigo-700',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ========== HEADER NAVIGATION ========== */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            SF
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-800 text-lg leading-tight">StockFlow</h1>
                            <p className="text-xs text-slate-500">Warehouse Management</p>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Trang chủ</Link>
                        <Link to="/products" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Sản phẩm</Link>
                        <a href="#features" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Tính năng</a>
                        <a href="#about" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Giới thiệu</a>
                    </nav>

                    {/* User/Auth */}
                    {isAuthenticated ? (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
                                    {user?.full_name?.charAt(0) || 'U'}
                                </div>
                                <div className="hidden sm:block">
                                    <p className="font-medium text-slate-800 text-sm">{user?.full_name}</p>
                                    <p className="text-xs text-slate-500">{user?.roles?.map(r => r.name).join(', ')}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-3 py-1.5 text-slate-600 hover:text-red-600 text-sm border border-slate-200 rounded-lg hover:border-red-200 transition-all"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link to="/login" className="px-4 py-2 text-slate-600 hover:text-blue-600 font-medium transition-colors">
                                Đăng nhập
                            </Link>
                            <Link to="/register" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                                Đăng ký
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            {/* ========== HERO BANNER SLIDER ========== */}
            <section className={`relative bg-gradient-to-br ${bannerSlides[currentSlide].gradient} text-white py-24 overflow-hidden transition-all duration-1000`}>
                {/* Background decorations */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="text-center animate-fadeIn">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm mb-6">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            Hệ thống đang hoạt động
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold mb-4">
                            {bannerSlides[currentSlide].title}
                            <span className="block text-white/80 mt-2">{bannerSlides[currentSlide].subtitle}</span>
                        </h1>
                        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                            {bannerSlides[currentSlide].desc}
                        </p>
                        <div className="flex justify-center gap-4 flex-wrap">
                            <Link to="/products" className="bg-white text-slate-800 px-8 py-3 rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2">
                                <span>🛒</span> Xem sản phẩm
                            </Link>
                            {!isAuthenticated && (
                                <Link to="/register" className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-all flex items-center gap-2">
                                    <span>🚀</span> Bắt đầu ngay
                                </Link>
                            )}
                        </div>

                        {/* Slide indicators */}
                        <div className="flex justify-center gap-2 mt-8">
                            {bannerSlides.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentSlide(idx)}
                                    className={`w-3 h-3 rounded-full transition-all ${idx === currentSlide ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/60'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ========== STATS BAR ========== */}
            <section className="bg-white border-b shadow-sm -mt-8 relative z-10">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-3xl mb-1">{stat.icon}</div>
                                <div className="text-2xl md:text-3xl font-bold text-slate-800">{stat.value}</div>
                                <div className="text-sm text-slate-500">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== WELCOME MESSAGE (Logged in users) ========== */}
            {isAuthenticated && (
                <section className="py-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">👋</div>
                                <div>
                                    <p className="text-emerald-800 font-medium">
                                        Xin chào, <strong>{user?.full_name}</strong>!
                                    </p>
                                    <p className="text-sm text-emerald-600">Chúc bạn một ngày làm việc hiệu quả.</p>
                                </div>
                            </div>
                            <Link to="/products" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                                Xem sản phẩm →
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ========== FEATURES SECTION ========== */}
            <section id="features" className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">Tính năng</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Tại sao chọn StockFlow?</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto">Giải pháp quản lý kho hàng toàn diện với công nghệ hiện đại</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: '📦', title: 'Quản lý tồn kho', desc: 'Theo dõi số lượng tồn kho theo thời gian thực với dashboard trực quan', color: 'blue' },
                            { icon: '📊', title: 'Báo cáo thông minh', desc: 'Tạo báo cáo chi tiết, biểu đồ phân tích để hỗ trợ quyết định', color: 'emerald' },
                            { icon: '🔄', title: 'Nhập/Xuất kho', desc: 'Quản lý phiếu nhập xuất kho hiệu quả với quy trình tự động', color: 'violet' },
                            { icon: '🏭', title: 'Nhiều kho hàng', desc: 'Quản lý nhiều kho từ một nền tảng duy nhất, đồng bộ dữ liệu', color: 'amber' },
                            { icon: '⚠️', title: 'Cảnh báo tự động', desc: 'Thông báo khi hàng sắp hết, hết hạn hoặc có bất thường', color: 'red' },
                            { icon: '👥', title: 'Phân quyền', desc: 'Kiểm soát truy cập theo vai trò: Admin, Staff, User', color: 'indigo' },
                        ].map((feature, i) => (
                            <div
                                key={i}
                                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-blue-200 hover:-translate-y-1"
                            >
                                <div className={`w-14 h-14 bg-${feature.color}-100 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">{feature.title}</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== HOW IT WORKS ========== */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <span className="inline-block px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">Quy trình</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Cách thức hoạt động</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {[
                            { step: '01', title: 'Đăng ký tài khoản', desc: 'Tạo tài khoản miễn phí trong 30 giây', icon: '📝' },
                            { step: '02', title: 'Thiết lập kho', desc: 'Thêm kho hàng và danh mục sản phẩm', icon: '🏪' },
                            { step: '03', title: 'Nhập sản phẩm', desc: 'Import sản phẩm từ file hoặc thêm thủ công', icon: '📥' },
                            { step: '04', title: 'Quản lý & Báo cáo', desc: 'Theo dõi và xuất báo cáo dễ dàng', icon: '📈' },
                        ].map((item, i) => (
                            <div key={i} className="text-center relative">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg">
                                    {item.icon}
                                </div>
                                <div className="text-xs font-bold text-blue-600 mb-2">BƯỚC {item.step}</div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">{item.title}</h3>
                                <p className="text-slate-600 text-sm">{item.desc}</p>
                                {i < 3 && (
                                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-slate-200"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== ABOUT SECTION ========== */}
            <section id="about" className="py-20 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <span className="inline-block px-4 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium mb-4">Về chúng tôi</span>
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">
                                Đồ án tốt nghiệp<br />
                                <span className="text-blue-400">Hệ thống quản lý kho hàng</span>
                            </h2>
                            <p className="text-slate-300 mb-6 leading-relaxed">
                                StockFlow là đồ án tốt nghiệp, xây dựng trên nền tảng công nghệ hiện đại với React, TypeScript, Node.js và MySQL.
                                Hệ thống cung cấp giải pháp quản lý kho hàng toàn diện cho doanh nghiệp vừa và nhỏ.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <span className="px-3 py-1 bg-white/10 rounded-full text-sm">React</span>
                                <span className="px-3 py-1 bg-white/10 rounded-full text-sm">TypeScript</span>
                                <span className="px-3 py-1 bg-white/10 rounded-full text-sm">Node.js</span>
                                <span className="px-3 py-1 bg-white/10 rounded-full text-sm">MySQL</span>
                                <span className="px-3 py-1 bg-white/10 rounded-full text-sm">TailwindCSS</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                                <div className="text-4xl font-bold text-blue-400 mb-2">100%</div>
                                <div className="text-sm text-slate-300">Open Source</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                                <div className="text-4xl font-bold text-emerald-400 mb-2">3+</div>
                                <div className="text-sm text-slate-300">Vai trò người dùng</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                                <div className="text-4xl font-bold text-violet-400 mb-2">RESTful</div>
                                <div className="text-sm text-slate-300">API Architecture</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                                <div className="text-4xl font-bold text-amber-400 mb-2">JWT</div>
                                <div className="text-sm text-slate-300">Authentication</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========== CTA SECTION ========== */}
            {!isAuthenticated && (
                <section className="py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    </div>
                    <div className="max-w-4xl mx-auto text-center px-4 relative">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Sẵn sàng bắt đầu?</h2>
                        <p className="text-xl text-white/80 mb-8">
                            Đăng ký ngay để trải nghiệm hệ thống quản lý kho hàng thông minh.
                        </p>
                        <div className="flex justify-center gap-4 flex-wrap">
                            <Link to="/register" className="bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl transition-all">
                                Đăng ký miễn phí →
                            </Link>
                            <Link to="/login" className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all">
                                Đã có tài khoản?
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ========== FOOTER ========== */}
            <footer className="bg-slate-900 text-slate-400 py-12">
                <div className="max-w-7xl mx-auto px-4">
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
                                Đồ án tốt nghiệp - 2026
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Liên kết</h4>
                            <ul className="space-y-2 text-sm">
                                <li><Link to="/" className="hover:text-white transition-colors">Trang chủ</Link></li>
                                <li><Link to="/products" className="hover:text-white transition-colors">Sản phẩm</Link></li>
                                <li><a href="#features" className="hover:text-white transition-colors">Tính năng</a></li>
                                <li><a href="#about" className="hover:text-white transition-colors">Giới thiệu</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Tài khoản</h4>
                            <ul className="space-y-2 text-sm">
                                <li><Link to="/login" className="hover:text-white transition-colors">Đăng nhập</Link></li>
                                <li><Link to="/register" className="hover:text-white transition-colors">Đăng ký</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-800 pt-8 text-center text-sm">
                        <p>© 2026 StockFlow - Smart Inventory Management System</p>
                        <p className="mt-1 text-slate-500">Made with ❤️ for Graduation Project</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
