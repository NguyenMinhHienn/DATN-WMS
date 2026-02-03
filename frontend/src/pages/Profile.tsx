import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

/**
 * Profile Page - Dùng chung cho admin/staff/user
 * Gồm 2 tab: Thông tin cá nhân & Đổi mật khẩu
 */
const Profile: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<'info' | 'password'>(
        searchParams.get('tab') === 'password' ? 'password' : 'info'
    );

    // Form states
    const [profileForm, setProfileForm] = useState({
        full_name: '',
        email: '',
        phone: ''
    });
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    // UI states
    const [loading, setLoading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (user) {
            setProfileForm({
                full_name: user.full_name || '',
                email: user.email || '',
                phone: user.phone || ''
            });
        }
    }, [user]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Ảnh không được quá 5MB' });
            return;
        }

        // Validate file type
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
            setMessage({ type: 'error', text: 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP' });
            return;
        }

        setAvatarLoading(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            await api.post('/auth/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
            if (refreshUser) await refreshUser();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Lỗi khi upload ảnh' });
        } finally {
            setAvatarLoading(false);
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            await api.put('/auth/profile', profileForm);
            setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
            if (refreshUser) await refreshUser();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Có lỗi xảy ra' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        // Validate
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
            setLoading(false);
            return;
        }

        if (passwordForm.new_password.length < 6) {
            setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
            setLoading(false);
            return;
        }

        try {
            await api.put('/auth/password', {
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password
            });
            setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Có lỗi xảy ra' });
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadge = () => {
        const roles = user?.roles?.map(r => r.name).join(', ') || 'user';
        const config: Record<string, { label: string; className: string }> = {
            admin: { label: 'ADMIN', className: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30' },
            staff: { label: 'STAFF', className: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30' },
            user: { label: 'USER', className: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/30' }
        };
        const c = config[roles] || config.user;
        return <span className={`px-4 py-1.5 text-xs font-bold rounded-full ${c.className}`}>{c.label}</span>;
    };

    // Get avatar URL with backend base URL
    const getAvatarUrl = () => {
        if (user?.avatar_url) {
            // If it's a relative path, prepend the API base URL
            if (user.avatar_url.startsWith('/')) {
                return `http://localhost:3000${user.avatar_url}`;
            }
            return user.avatar_url;
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="group flex items-center gap-2 text-slate-600 hover:text-indigo-600 mb-4 transition-colors font-medium"
                    >
                        <span className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center group-hover:shadow-lg transition-all">
                            ←
                        </span>
                        <span>Quay lại</span>
                    </button>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Thông tin tài khoản
                    </h1>
                    <p className="text-slate-600 mt-1">Quản lý thông tin cá nhân và bảo mật</p>
                </div>

                {/* User Card with Avatar Upload */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 mb-6 border border-white/50 relative overflow-hidden">
                    {/* Decorative gradient */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="flex items-center gap-5 relative">
                        {/* Avatar with Upload */}
                        <div className="relative group">
                            {/* Hidden file input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarUpload}
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                className="hidden"
                            />

                            {/* Avatar display */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-24 h-24 rounded-2xl cursor-pointer relative overflow-hidden shadow-xl transform hover:scale-105 transition-all"
                            >
                                {getAvatarUrl() ? (
                                    <img
                                        src={getAvatarUrl()!}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
                                        {user?.full_name?.charAt(0) || 'U'}
                                    </div>
                                )}

                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    {avatarLoading ? (
                                        <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <div className="text-center">
                                            <span className="text-2xl">📷</span>
                                            <p className="text-white text-xs mt-1">Đổi ảnh</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Online indicator */}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-slate-800">{user?.full_name}</h2>
                            <p className="text-slate-500 flex items-center gap-2">
                                <span>📧</span> {user?.email}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Click vào ảnh để thay đổi ảnh đại diện</p>
                        </div>
                        {getRoleBadge()}
                    </div>
                </div>

                {/* Tabs Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 overflow-hidden">
                    <div className="flex border-b border-slate-200/50">
                        <button
                            onClick={() => { setActiveTab('info'); setMessage(null); }}
                            className={`flex-1 px-6 py-5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'info'
                                ? 'text-indigo-600 bg-gradient-to-b from-indigo-50 to-white border-b-3 border-indigo-600'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
                                }`}
                        >
                            <span className="text-lg">👤</span> Thông tin cá nhân
                        </button>
                        <button
                            onClick={() => { setActiveTab('password'); setMessage(null); }}
                            className={`flex-1 px-6 py-5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'password'
                                ? 'text-indigo-600 bg-gradient-to-b from-indigo-50 to-white border-b-3 border-indigo-600'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
                                }`}
                        >
                            <span className="text-lg">🔒</span> Đổi mật khẩu
                        </button>
                    </div>

                    <div className="p-8">
                        {/* Message */}
                        {message && (
                            <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success'
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200'
                                : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                                }`}>
                                <span className="text-xl">{message.type === 'success' ? '✅' : '❌'}</span>
                                <span className="font-medium">{message.text}</span>
                            </div>
                        )}

                        {/* Tab Content */}
                        {activeTab === 'info' ? (
                            <form onSubmit={handleProfileSubmit} className="space-y-6">
                                <div className="group">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">👤</span>
                                        Họ và tên
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.full_name}
                                        onChange={e => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 text-slate-800 font-medium text-base focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                                        placeholder="Nhập họ và tên"
                                    />
                                </div>

                                <div className="group">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                                        <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs">📧</span>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={profileForm.email}
                                        onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 text-slate-800 font-medium text-base focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                                        placeholder="Nhập email"
                                    />
                                </div>

                                <div className="group">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">📱</span>
                                        Số điện thoại
                                    </label>
                                    <input
                                        type="tel"
                                        value={profileForm.phone}
                                        onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 text-slate-800 font-medium text-base focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                                        placeholder="Nhập số điện thoại"
                                    />
                                </div>

                                <div className="pt-4 flex items-center gap-4 border-t border-slate-100">
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-400 flex items-center gap-2">
                                            <span>📅</span>
                                            Ngày tạo: <span className="font-medium text-slate-600">{user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : 'N/A'}</span>
                                        </p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Đang lưu...
                                            </span>
                                        ) : '💾 Cập nhật thông tin'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handlePasswordSubmit} className="space-y-6">
                                <div className="group">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                                        <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-xs">🔐</span>
                                        Mật khẩu hiện tại
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordForm.current_password}
                                        onChange={e => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 text-slate-800 font-medium text-base focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                                        placeholder="Nhập mật khẩu hiện tại"
                                        required
                                    />
                                </div>

                                <div className="group">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">🔑</span>
                                        Mật khẩu mới
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordForm.new_password}
                                        onChange={e => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 text-slate-800 font-medium text-base focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                                        placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                                        required
                                    />
                                </div>

                                <div className="group">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                                        <span className="w-6 h-6 rounded-lg bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
                                        Xác nhận mật khẩu mới
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordForm.confirm_password}
                                        onChange={e => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 text-slate-800 font-medium text-base focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                                        placeholder="Nhập lại mật khẩu mới"
                                        required
                                    />
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Đang xử lý...
                                            </span>
                                        ) : '🔐 Đổi mật khẩu'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Footer hint */}
                <p className="text-center text-sm text-slate-400 mt-6">
                    Thông tin cá nhân của bạn được bảo mật an toàn 🔒
                </p>
            </div>
        </div>
    );
};

export default Profile;
