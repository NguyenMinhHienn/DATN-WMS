import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import { User, Role, UserFormData } from '../../interface';
import { Modal } from '../../components/Modal';

const Users: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<UserFormData>({
        username: '', email: '', password: '', full_name: '', phone: '', role_ids: []
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        loadUsers();
        loadRoles();
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

    const loadRoles = async () => {
        try {
            const data = await userService.getRoles();
            setRoles(data);
        } catch (error) {
            console.error('Failed to load roles:', error);
        }
    };

    const handleCreate = () => {
        setEditingUser(null);
        setFormData({ username: '', email: '', password: '', full_name: '', phone: '', role_ids: [] });
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
        if (!confirm(`Delete user "${user.full_name}"?`)) return;
        try {
            await userService.delete(user.id);
            loadUsers();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleChange = (roleId: number) => {
        setFormData(prev => ({
            ...prev,
            role_ids: prev.role_ids.includes(roleId)
                ? prev.role_ids.filter(id => id !== roleId)
                : [...prev.role_ids, roleId]
        }));
    };

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
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Email</th>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Vai trò</th>
                                    <th className="text-center py-4 px-6 text-sm font-medium text-slate-700 font-medium">Trạng thái</th>
                                    <th className="text-center py-4 px-6 text-sm font-medium text-slate-700 font-medium">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b border-slate-100 hover:bg-blue-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-blue-900 font-medium shadow-lg shadow-indigo-500/20">
                                                    {user.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-blue-900">{user.full_name}</p>
                                                    <p className="text-xs text-slate-600">@{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-700 font-medium">{user.email}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.map(role => (
                                                    <span key={role.id} className="badge badge-info">
                                                        {role.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* Hide Edit/Delete buttons for admin users */}
                                                {!user.roles.some(r => r.name === 'admin') ? (
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
                                                    <span className="text-xs text-slate-500 italic">Được bảo vệ</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center">
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
                        <div>
                            <label className="label">Vai trò</label>
                            <div className="flex flex-wrap gap-2">
                                {roles.map(role => (
                                    <label key={role.id} className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-300/50 rounded-lg cursor-pointer hover:bg-slate-600/50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.role_ids.includes(role.id)}
                                            onChange={() => handleRoleChange(role.id)}
                                            className="accent-indigo-500"
                                        />
                                        <span className="text-sm text-slate-200">{role.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-blue-100">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Hủy</button>
                        <button type="submit" disabled={formLoading} className="btn btn-primary">
                            {formLoading ? 'Đang lưu...' : (editingUser ? 'Cập nhật' : 'Thêm mới')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Users;
