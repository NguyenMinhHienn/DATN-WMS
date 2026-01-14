import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Trang 403 - Access Denied
 * Hiển thị khi user truy cập route không có quyền
 */
const AccessDenied: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
            <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
                <div className="text-8xl mb-6">🚫</div>
                <h1 className="text-3xl font-bold text-slate-800 mb-4">403 - Access Denied</h1>
                <p className="text-slate-600 mb-6">
                    Bạn không có quyền truy cập trang này.
                    Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
                </p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                    >
                        Quay lại
                    </button>
                    <Link
                        to="/"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Về trang chủ
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;
