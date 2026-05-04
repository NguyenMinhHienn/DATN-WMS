import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import { creditService, CreditInfo } from '../../services/creditService';
import { User, Role, UserFormData } from '../../interface';
import { Modal } from '../../components/Modal';

const StaffUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<UserFormData>({
        username: '', email: '', password: '', full_name: '', phone: '', role_ids: [],
        enable_credit: false, credit_limit: 50000000, credit_payment_terms: 30
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    // Credit management state
    const [creditModalOpen, setCreditModalOpen] = useState(false);
    const [creditUser, setCreditUser] = useState<User | null>(null);
    const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
    const [creditLoadingId, setCreditLoadingId] = useState<number | null>(null);
    const [newCreditLimit, setNewCreditLimit] = useState('');
    const [newPaymentTerms, setNewPaymentTerms] = useState(30);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await userService.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingUser(null);
        setFormData({ username: '', email: '', password: '', full_name: '', phone: '', role_ids: [], enable_credit: false, credit_limit: 50000000, credit_payment_terms: 30 });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone || '',
            role_ids: user.roles.map(r => r.id),
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        try {
            if (editingUser) {
                await userService.update(editingUser.id, formData);
            } else {
                await userService.create(formData);
            }
            setIsModalOpen(false);
            loadUsers();
        } catch (error: any) {
            setFormError(error.response?.data?.message || 'An error occurred');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (user: User) => {
        const isStaff = user.roles.some(r => r.name === 'staff');
        
        if (isStaff) {
            const reason = window.prompt(`CẢNH BÁO: Bạn đang chuẩn bị xóa nhân viên (Staff) "${user.full_name}".\nVui lòng nhập lý do xóa để tiếp tục:`);
            if (reason === null) return; // User clicked Cancel
            if (reason.trim() === '') {
                alert('Lỗi: Bắt buộc phải nhập lý do khi xóa nhân viên.');
                return;
            }
            // In a real app, reason might be sent to backend. We just enforce input locally here.
        } else {
            const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.full_name}" không?`);
            if (!confirmDelete) return;
        }

        try {
            await userService.delete(user.id);
            loadUsers();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi xóa người dùng');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Credit management
    const openCreditModal = async (user: User) => {
        setCreditUser(user);
        setCreditModalOpen(true);
        setCreditLoadingId(user.id);
        try {
            const info = await creditService.getAdminUserCredit(user.id);
            setCreditInfo(info);
            setNewCreditLimit(String(info.credit_limit));
            setNewPaymentTerms(info.credit_payment_terms);
        } catch (err) {
            console.error('Failed to load credit info:', err);
            setCreditInfo(null);
        } finally {
            setCreditLoadingId(null);
        }
    };

    const handleEnableCredit = async () => {
        if (!creditUser) return;
        try {
            await creditService.enableCredit(creditUser.id);
            alert('Đã kích hoạt công nợ cho user!');
            const info = await creditService.getAdminUserCredit(creditUser.id);
            setCreditInfo(info);
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Lỗi kích hoạt');
        }
    };

    const handleDisableCredit = async () => {
        if (!creditUser) return;
        if (!window.confirm('Bạn có chắc muốn tắt công nợ cho user này?')) return;
        try {
            await creditService.disableCredit(creditUser.id);
            alert('Đã tắt công nợ!');
            const info = await creditService.getAdminUserCredit(creditUser.id);
            setCreditInfo(info);
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Lỗi tắt công nợ');
        }
    };

    const handleUpdateCreditLimit = async () => {
        if (!creditUser) return;
        try {
            await creditService.updateCreditLimit(creditUser.id, parseFloat(newCreditLimit));
            alert('Đã cập nhật hạn mức!');
            const info = await creditService.getAdminUserCredit(creditUser.id);
            setCreditInfo(info);
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Lỗi cập nhật');
        }
    };

    const handleUpdatePaymentTerms = async () => {
        if (!creditUser) return;
        try {
            await creditService.updatePaymentTerms(creditUser.id, newPaymentTerms);
            alert('Đã cập nhật hạn thanh toán!');
            const info = await creditService.getAdminUserCredit(creditUser.id);
            setCreditInfo(info);
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Lỗi cập nhật');
        }
    };

    const fmtMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">
                        <span className="gradient-text">Quản lý người dùng</span>
                    </h1>
                    <p className="text-slate-600 mt-1">Quản lý tài khoản và phân quyền hệ thống</p>
                </div>
                <button onClick={handleCreate} className="btn btn-primary">
                    <span className="mr-2">+</span> Thêm người dùng
                </button>
            </div>

            {/* Table */}
            <div className="chart-container p-0 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-blue-50/30 border-b border-blue-100">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Người dùng</th>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Liên hệ</th>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Thống kê mua hàng</th>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Vai trò</th>
                                    <th className="text-center py-4 px-6 text-sm font-medium text-slate-700 font-medium">Công nợ</th>
                                    <th className="text-center py-4 px-6 text-sm font-medium text-slate-700 font-medium">Trạng thái</th>
                                    <th className="text-center py-4 px-6 text-sm font-medium text-slate-700 font-medium">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b border-slate-100 hover:bg-blue-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md ${
                                                    user.roles.some(r => r.name === 'admin') ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/30' :
                                                    user.roles.some(r => r.name === 'staff') ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-500/30' :
                                                    'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 shadow-slate-500/20'
                                                }`}>
                                                    {user.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-blue-900">{user.full_name}</p>
                                                        {(user.total_spent || 0) >= 100000000 && (
                                                            <span className="bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm shadow-yellow-500/20 border border-yellow-300">⭐ VIP</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-600">@{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-1 text-sm">
                                                <span className="font-medium text-slate-700">{user.email}</span>
                                                {user.phone && <span className="text-xs text-slate-500">{user.phone}</span>}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-1 bg-blue-50/50 p-2 rounded-lg border border-blue-100 w-max">
                                                <span className="text-sm font-medium text-blue-800">📦 {user.total_orders || 0} đơn</span>
                                                <span className="text-xs font-bold text-emerald-600">💰 {(user.total_spent || 0).toLocaleString('vi-VN')} đ</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.map(role => {
                                                    const roleColor = role.name === 'admin' 
                                                        ? 'bg-red-100 text-red-800 border-red-200' 
                                                        : role.name === 'staff'
                                                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                                                        : 'bg-emerald-100 text-emerald-800 border-emerald-200';
                                                    
                                                    return (
                                                        <span key={role.id} className={`px-2.5 py-0.5 rounded-md text-xs font-bold border shadow-sm ${roleColor}`}>
                                                            {role.name.toUpperCase()}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {user.roles.length === 1 && user.roles[0].name === 'user' ? (
                                                <button onClick={() => openCreditModal(user)}
                                                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                                                    {creditLoadingId === user.id ? '⏳' : '🏦'} Quản lý
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">Không khả dụng</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-2">
                                                {user.roles.length === 1 && user.roles[0].name === 'user' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(user)}
                                                            className="p-2 hover:bg-blue-100 rounded-lg text-slate-600 hover:text-blue-600 transition-colors"
                                                            title="Sửa"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user)}
                                                            className="p-2 hover:bg-red-500/20 rounded-lg text-slate-600 hover:text-red-400 transition-colors"
                                                            title="Xóa"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-slate-500 italic">Chỉ xem</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <span className="text-4xl opacity-50">👥</span>
                                                <p className="text-slate-500">Chưa có người dùng nào</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? 'Sửa người dùng' : 'Thêm người dùng'}>
                <form onSubmit={handleSubmit}>
                    {formError && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-500/30">{formError}</div>}
                    <div className="space-y-4">
                        {!editingUser && (
                            <div>
                                <label className="label">Tên đăng nhập *</label>
                                <input type="text" name="username" value={formData.username} onChange={handleInputChange} className="input" required />
                            </div>
                        )}
                        <div>
                            <label className="label">Họ và tên *</label>
                            <input type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} className="input" required />
                        </div>
                        <div>
                            <label className="label">Email *</label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="input" required />
                        </div>
                        {!editingUser && (
                            <div>
                                <label className="label">Mật khẩu *</label>
                                <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="input" required />
                            </div>
                        )}
                        <div>
                            <label className="label">Số điện thoại</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="input" />
                        </div>
                        {/* Hidden role selection for staff */}
                        
                        {!editingUser && (
                            <div className="pt-4 border-t border-slate-200">
                                <label className="flex items-center gap-2 cursor-pointer mb-3">
                                    <input 
                                        type="checkbox" 
                                        name="enable_credit"
                                        checked={formData.enable_credit} 
                                        onChange={(e) => setFormData(prev => ({ ...prev, enable_credit: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                                    />
                                    <span className="text-sm font-bold text-emerald-700">Kích hoạt Công nợ ngay lập tức</span>
                                </label>
                                
                                {formData.enable_credit && (
                                    <div className="space-y-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mt-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-emerald-800 mb-1">Số CMND/CCCD *</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.credit_id_number || ''} 
                                                    onChange={(e) => setFormData(prev => ({ ...prev, credit_id_number: e.target.value }))}
                                                    className="input w-full text-sm" 
                                                    required={formData.enable_credit}
                                                    placeholder="Nhập tối thiểu 9 số..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-emerald-800 mb-1">Địa chỉ thường trú *</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.credit_address || ''} 
                                                    onChange={(e) => setFormData(prev => ({ ...prev, credit_address: e.target.value }))}
                                                    className="input w-full text-sm" 
                                                    required={formData.enable_credit}
                                                    placeholder="Nhập địa chỉ hợp lệ..."
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-emerald-800 mb-1">Hạn mức công nợ (VNĐ)</label>
                                                <input 
                                                    type="number" 
                                                    value={formData.credit_limit} 
                                                    onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: Number(e.target.value) }))}
                                                    className="input w-full text-sm font-medium" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-emerald-800 mb-1">Kỳ hạn thanh toán (Ngày)</label>
                                                <div className="flex gap-2">
                                                    {[15, 30, 45].map(days => (
                                                        <button 
                                                            type="button"
                                                            key={days} 
                                                            onClick={() => setFormData(prev => ({ ...prev, credit_payment_terms: days }))}
                                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                                formData.credit_payment_terms === days 
                                                                    ? 'bg-emerald-500 text-white shadow-md' 
                                                                    : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                                            }`}
                                                        >
                                                            {days}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-blue-100">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Hủy</button>
                        <button type="submit" disabled={formLoading} className="btn btn-primary">
                            {formLoading ? 'Đang lưu...' : (editingUser ? 'Cập nhật' : 'Thêm mới')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Credit Management Modal */}
            <Modal isOpen={creditModalOpen} onClose={() => setCreditModalOpen(false)} title={`🏦 Quản lý Công nợ - ${creditUser?.full_name || ''}`}>
                {!creditInfo ? (
                    <div className="text-center py-8">
                        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-slate-400">Đang tải...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Status */}
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                            <span className="text-sm font-medium text-slate-600">Trạng thái:</span>
                            {(() => {
                                const st = creditService.getCreditStatusInfo(creditInfo);
                                return <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ color: st.color, backgroundColor: st.bg }}>{st.icon} {st.label}</span>;
                            })()}
                        </div>

                        {/* Info */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-blue-50 p-3 rounded-xl">
                                <p className="text-xs text-blue-500">Tổng đã chi</p>
                                <p className="font-bold text-blue-800">{fmtMoney(creditInfo.total_spent)}</p>
                            </div>
                            <div className="bg-emerald-50 p-3 rounded-xl">
                                <p className="text-xs text-emerald-500">Ngưỡng yêu cầu</p>
                                <p className="font-bold text-emerald-800">{fmtMoney(creditInfo.min_required)}</p>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-xl">
                                <p className="text-xs text-amber-500">Đang nợ</p>
                                <p className="font-bold text-amber-800">{fmtMoney(creditInfo.credit_used)}</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-xl">
                                <p className="text-xs text-purple-500">Còn lại</p>
                                <p className="font-bold text-purple-800">{fmtMoney(creditInfo.credit_available)}</p>
                            </div>
                        </div>

                        {/* Credit Limit */}
                        <div className="border border-slate-200 rounded-xl p-3">
                            <label className="text-sm font-medium text-slate-700">Hạn mức công nợ</label>
                            <div className="flex gap-2 mt-1">
                                <input type="number" value={newCreditLimit}
                                    onChange={e => setNewCreditLimit(e.target.value)}
                                    className="input flex-1 text-sm" />
                                <button onClick={handleUpdateCreditLimit}
                                    className="btn btn-primary text-sm px-4">Cập nhật</button>
                            </div>
                        </div>

                        {/* Payment Terms */}
                        <div className="border border-slate-200 rounded-xl p-3">
                            <label className="text-sm font-medium text-slate-700">Hạn thanh toán (ngày)</label>
                            <div className="flex gap-2 mt-1">
                                {[15, 30, 45].map(d => (
                                    <button key={d} onClick={() => setNewPaymentTerms(d)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${newPaymentTerms === d ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
                                        {d} ngày
                                    </button>
                                ))}
                                <button onClick={handleUpdatePaymentTerms}
                                    className="btn btn-primary text-sm px-3">Lưu</button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            {creditInfo.is_eligible ? (
                                <button onClick={handleDisableCredit}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                                    🚫 Tắt công nợ
                                </button>
                            ) : creditInfo.is_registered ? (
                                <button onClick={handleEnableCredit}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                                    ✅ Kích hoạt công nợ
                                </button>
                            ) : (
                                <p className="flex-1 text-center py-2.5 text-sm text-slate-400 italic">User chưa đăng ký sử dụng công nợ</p>
                            )}
                            <button onClick={() => setCreditModalOpen(false)}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                                Đóng
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};


export default StaffUsers;
