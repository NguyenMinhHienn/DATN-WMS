import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { creditService, CreditInfo } from '../../services/creditService';

/**
 * Client Credit Dashboard - Đăng ký & Tổng quan Tín dụng Công nợ
 */

const CreditDashboard: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
    const [error, setError] = useState('');

    // Registration form
    const [showRegister, setShowRegister] = useState(false);
    const [regLoading, setRegLoading] = useState(false);
    const [regForm, setRegForm] = useState({
        id_number: '',
        address: '',
        company: '',
        tax_code: '',
        payment_terms: 30,
    });

    useEffect(() => {
        if (!isAuthenticated) { navigate('/login'); return; }
        loadCreditInfo();
    }, [isAuthenticated]);

    const loadCreditInfo = async () => {
        setLoading(true);
        try {
            const info = await creditService.getCreditInfo();
            setCreditInfo(info);
            if (!info.is_registered) setShowRegister(true);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Không thể tải thông tin tín dụng');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!regForm.id_number.trim() || regForm.id_number.trim().length < 9) {
            alert('Vui lòng nhập số CMND/CCCD hợp lệ (tối thiểu 9 ký tự)');
            return;
        }
        if (!regForm.address.trim() || regForm.address.trim().length < 10) {
            alert('Vui lòng nhập địa chỉ hợp lệ (tối thiểu 10 ký tự)');
            return;
        }

        setRegLoading(true);
        try {
            const result = await creditService.register(regForm);
            alert(result.message);
            setCreditInfo(result.data);
            setShowRegister(false);
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Đăng ký thất bại');
        } finally {
            setRegLoading(false);
        }
    };

    const formatMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

    const usagePercent = creditInfo ? Math.min(100, (creditInfo.credit_used / creditInfo.credit_limit) * 100) : 0;
    const spentPercent = creditInfo ? Math.min(100, (creditInfo.total_spent / creditInfo.min_required) * 100) : 0;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Hero */}
            <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                </div>
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                            🏦
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                Công nợ & Tín dụng
                            </h1>
                            <p className="text-emerald-100 mt-0.5 text-sm sm:text-base">Đăng ký và quản lý hạn mức mua hàng trả sau</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10 pb-12">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="relative w-16 h-16 mx-auto mb-4">
                            <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-slate-400 font-medium">Đang tải thông tin...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl mt-6 flex items-center gap-3 border border-red-100">
                        <span className="text-xl">⚠️</span>
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                ) : creditInfo && !creditInfo.is_registered && showRegister ? (
                    /* ========== REGISTRATION FORM ========== */
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 mt-6 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-5 border-b border-emerald-100">
                            <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                                📝 Đăng ký sử dụng Công nợ
                            </h2>
                            <p className="text-sm text-emerald-600 mt-1">
                                Hoàn tất thông tin bên dưới để đăng ký mua hàng trả sau
                            </p>
                        </div>

                        {/* Conditions */}
                        <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100">
                            <p className="text-sm font-semibold text-blue-700 mb-2">📋 Điều kiện sử dụng:</p>
                            <ul className="space-y-1.5 text-sm text-blue-600">
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5">•</span>
                                    <span>Tổng thanh toán thành công đạt tối thiểu <strong>{formatMoney(creditInfo.min_required)}</strong></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5">•</span>
                                    <span>Hạn mức tối đa <strong>{formatMoney(creditInfo.credit_limit)}</strong> cho mỗi lần công nợ</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5">•</span>
                                    <span>Phải thanh toán xong khoản nợ hiện tại trước khi tạo khoản nợ mới</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5">•</span>
                                    <span>Không được có nợ quá hạn</span>
                                </li>
                            </ul>
                        </div>

                        {/* Progress to eligibility */}
                        <div className="px-6 py-4 border-b border-slate-100">
                            <p className="text-sm font-medium text-slate-600 mb-2">📊 Tiến trình đủ điều kiện:</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-700 ${spentPercent >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`}
                                        style={{ width: `${spentPercent}%` }} />
                                </div>
                                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                                    {formatMoney(creditInfo.total_spent)} / {formatMoney(creditInfo.min_required)}
                                </span>
                            </div>
                            {spentPercent >= 100 ? (
                                <p className="text-xs text-emerald-600 mt-1.5">✅ Đã đạt ngưỡng thanh toán tối thiểu!</p>
                            ) : (
                                <p className="text-xs text-amber-600 mt-1.5">
                                    Còn thiếu {formatMoney(creditInfo.min_required - creditInfo.total_spent)} để đủ điều kiện
                                </p>
                            )}
                        </div>

                        {/* Form Fields */}
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Số CMND / CCCD <span className="text-red-500">*</span></label>
                                <input type="text" value={regForm.id_number}
                                    onChange={e => setRegForm(prev => ({ ...prev, id_number: e.target.value }))}
                                    placeholder="Nhập số CMND hoặc CCCD..."
                                    className="w-full mt-1 px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Địa chỉ thường trú <span className="text-red-500">*</span></label>
                                <textarea rows={2} value={regForm.address}
                                    onChange={e => setRegForm(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Nhập địa chỉ đầy đủ..."
                                    className="w-full mt-1 px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Tên công ty <span className="text-slate-400">(tùy chọn)</span></label>
                                    <input type="text" value={regForm.company}
                                        onChange={e => setRegForm(prev => ({ ...prev, company: e.target.value }))}
                                        placeholder="Tên doanh nghiệp..."
                                        className="w-full mt-1 px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Mã số thuế <span className="text-slate-400">(tùy chọn)</span></label>
                                    <input type="text" value={regForm.tax_code}
                                        onChange={e => setRegForm(prev => ({ ...prev, tax_code: e.target.value }))}
                                        placeholder="MST..."
                                        className="w-full mt-1 px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Hạn thanh toán mong muốn</label>
                                <div className="flex gap-3 mt-1.5">
                                    {[15, 30, 45].map(d => (
                                        <button key={d} type="button"
                                            onClick={() => setRegForm(prev => ({ ...prev, payment_terms: d }))}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${regForm.payment_terms === d
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                                            {d} ngày
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                            <button onClick={handleRegister} disabled={regLoading}
                                className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50">
                                {regLoading ? '⏳ Đang xử lý...' : '📝 Đăng ký sử dụng Công nợ'}
                            </button>
                        </div>
                    </div>
                ) : creditInfo ? (
                    /* ========== CREDIT DASHBOARD ========== */
                    <div className="space-y-6 mt-6">
                        {/* Status Card */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        💳 Thông tin Tín dụng
                                    </h2>
                                    {(() => {
                                        const status = creditService.getCreditStatusInfo(creditInfo);
                                        return (
                                            <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ color: status.color, backgroundColor: status.bg }}>
                                                {status.icon} {status.label}
                                            </span>
                                        );
                                    })()}
                                </div>

                                {/* Credit Gauge */}
                                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 text-white mb-5">
                                    <div className="flex items-end justify-between mb-3">
                                        <div>
                                            <p className="text-xs text-slate-400">Hạn mức tín dụng</p>
                                            <p className="text-3xl font-extrabold">{formatMoney(creditInfo.credit_limit)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">Hạn thanh toán</p>
                                            <p className="text-lg font-bold text-emerald-400">{creditInfo.credit_payment_terms} ngày</p>
                                        </div>
                                    </div>
                                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
                                        <div className={`h-full rounded-full transition-all duration-700 ${usagePercent > 80 ? 'bg-gradient-to-r from-red-400 to-red-500' : usagePercent > 50 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-emerald-400 to-teal-400'}`}
                                            style={{ width: `${usagePercent}%` }} />
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Đã dùng: {formatMoney(creditInfo.credit_used)}</span>
                                        <span>Còn lại: {formatMoney(creditInfo.credit_available)}</span>
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                                        <p className="text-xs text-blue-600 mb-1">Tổng đã chi</p>
                                        <p className="text-sm font-bold text-blue-800">{formatMoney(creditInfo.total_spent)}</p>
                                    </div>
                                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                        <p className="text-xs text-emerald-600 mb-1">Ngưỡng yêu cầu</p>
                                        <p className="text-sm font-bold text-emerald-800">{formatMoney(creditInfo.min_required)}</p>
                                    </div>
                                    <div className={`rounded-xl p-3 text-center ${creditInfo.has_active_debt ? 'bg-amber-50' : 'bg-slate-50'}`}>
                                        <p className={`text-xs mb-1 ${creditInfo.has_active_debt ? 'text-amber-600' : 'text-slate-500'}`}>Nợ đang có</p>
                                        <p className={`text-sm font-bold ${creditInfo.has_active_debt ? 'text-amber-800' : 'text-slate-700'}`}>{creditInfo.active_debt_count} khoản</p>
                                    </div>
                                    <div className={`rounded-xl p-3 text-center ${creditInfo.has_overdue ? 'bg-red-50' : 'bg-slate-50'}`}>
                                        <p className={`text-xs mb-1 ${creditInfo.has_overdue ? 'text-red-600' : 'text-slate-500'}`}>Quá hạn</p>
                                        <p className={`text-sm font-bold ${creditInfo.has_overdue ? 'text-red-800' : 'text-slate-700'}`}>{creditInfo.has_overdue ? 'Có' : 'Không'}</p>
                                    </div>
                                </div>

                                {/* Warning messages */}
                                {creditInfo.reason_not_eligible && (
                                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                                        <span className="text-lg">⚠️</span>
                                        <div>
                                            <p className="text-sm font-semibold text-amber-800">Không thể sử dụng công nợ</p>
                                            <p className="text-xs text-amber-600 mt-0.5">{creditInfo.reason_not_eligible}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Link to="/my-receivables"
                                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all flex items-center gap-4 group">
                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                    📋
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">Danh sách công nợ</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Xem chi tiết các khoản nợ</p>
                                </div>
                            </Link>
                            <Link to="/orders"
                                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all flex items-center gap-4 group">
                                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                    📦
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">Lịch sử đơn hàng</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Xem tất cả đơn hàng đã tạo</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default CreditDashboard;
