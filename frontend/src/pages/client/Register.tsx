import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';

/**
 * Register Page Component
 * Allows new users to create an account with default user role
 */
const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        phone: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(''); // Clear error on input change
    };

    const validateForm = (): string | null => {
        if (!formData.username.trim()) return 'Tên đăng nhập không được để trống';
        if (formData.username.length < 3) return 'Tên đăng nhập phải có ít nhất 3 ký tự';
        if (!formData.email.trim()) return 'Email không được để trống';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Định dạng email không hợp lệ';
        if (!formData.password) return 'Mật khẩu không được để trống';
        if (formData.password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
        if (formData.password.trim().length === 0) return 'Mật khẩu không được chỉ chứa khoảng trắng';
        if (formData.password !== formData.confirmPassword) return 'Mật khẩu xác nhận không khớp';
        if (!formData.full_name.trim()) return 'Họ và tên không được để trống';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await authService.register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name,
                phone: formData.phone || undefined,
            });

            // Store auth data
            sessionStorage.setItem('token', response.token);
            sessionStorage.setItem('user', JSON.stringify(response.user));

            // Redirect to home or dashboard
            navigate('/', { replace: true });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="w-full max-w-md">
                <div className="card">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
                            W
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">Tạo tài khoản</h1>
                        <p className="text-slate-600">Tham gia Hệ thống Quản lý Kho</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Registration Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="label">Tên đăng nhập *</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Nhập username"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="label">Họ và tên *</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Nguyễn Văn A"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="label">Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="label">Số điện thoại (không bắt buộc)</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input"
                                placeholder="0901234567"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="label">Mật khẩu *</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Tối thiểu 6 ký tự"
                                />
                            </div>
                            <div>
                                <label className="label">Xác nhận mật khẩu *</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Nhập lại mật khẩu"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary py-3 text-lg"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Đang tạo tài khoản...
                                </span>
                            ) : 'Tạo tài khoản'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center text-sm text-slate-500">
                        <p>
                            Đã có tài khoản?{' '}
                            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                                Đăng nhập tại đây
                            </Link>
                        </p>
                    </div>

                    <div className="mt-4 text-center text-xs text-slate-400">
                        <p>Sau khi đăng ký, bạn sẽ có tài khoản người dùng.</p>
                        <p>Liên hệ admin để được cấp quyền thêm.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
