import { Link } from 'react-router-dom';

const DebtPaymentCancel = () => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {/* Cancel icon */}
                <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-amber-200">
                    <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>

                <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Thanh toán đã bị hủy</h1>
                <p className="text-slate-500 mb-6">
                    Bạn đã hủy quá trình thanh toán. Không có khoản nào bị trừ.
                </p>

                {/* Info */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
                    <p className="text-xs text-amber-700">
                        <span className="font-semibold">💡 Lưu ý:</span> Bạn có thể thanh toán lại bất cứ lúc nào 
                        từ trang "Công nợ của tôi". Khoản nợ vẫn giữ nguyên.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        to="/my-receivables"
                        className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-200 hover:shadow-xl hover:from-blue-600 hover:to-indigo-600 transition-all text-center"
                    >
                        📋 Quay lại công nợ
                    </Link>
                    <Link
                        to="/"
                        className="flex-1 py-3 px-6 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all text-center"
                    >
                        🏠 Về trang chủ
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DebtPaymentCancel;
