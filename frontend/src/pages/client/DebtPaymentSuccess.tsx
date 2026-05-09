import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const DebtPaymentSuccess = () => {
    const location = useLocation();
    const [info, setInfo] = useState({ receivableId: '', amount: '' });

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setInfo({
            receivableId: params.get('receivableId') || '',
            amount: params.get('amount') || '',
        });
    }, [location]);

    const formatMoney = (val: string) => {
        const num = Number(val);
        return isNaN(num) ? val : new Intl.NumberFormat('vi-VN').format(num);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {/* Success animation */}
                <div className="relative w-28 h-28 mx-auto mb-6">
                    <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-30"></div>
                    <div className="relative w-28 h-28 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-200">
                        <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Thanh toán thành công!</h1>
                <p className="text-slate-500 mb-6">
                    Khoản thanh toán của bạn đã được ghi nhận và xác nhận tự động.
                </p>

                {/* Payment info */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-6 text-left">
                    <div className="space-y-3">
                        {info.amount && (
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-sm text-slate-500">Số tiền thanh toán</span>
                                <span className="text-lg font-bold text-emerald-600">{formatMoney(info.amount)}đ</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Hình thức</span>
                            <span className="text-sm font-medium text-slate-700">💳 PayOS Online</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-slate-500">Trạng thái</span>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                                ✅ Đã xác nhận
                            </span>
                        </div>
                    </div>
                </div>

                {/* Info note */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
                    <p className="text-xs text-blue-600">
                        <span className="font-semibold">ℹ️ Lưu ý:</span> Phiếu thu đã được tự động tạo và xác nhận. 
                        Nhân viên và quản trị viên đã nhận được thông báo về giao dịch này. 
                        Bạn có thể xem chi tiết trong trang công nợ.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        to="/my-receivables"
                        className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200 hover:shadow-xl hover:from-emerald-600 hover:to-teal-600 transition-all text-center"
                    >
                        📋 Xem công nợ
                    </Link>
                    <Link
                        to="/products"
                        className="flex-1 py-3 px-6 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all text-center"
                    >
                        🛍️ Tiếp tục mua sắm
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DebtPaymentSuccess;
