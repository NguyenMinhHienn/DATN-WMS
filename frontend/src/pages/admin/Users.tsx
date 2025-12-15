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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Users</h1>
                    <p className="text-slate-600">Manage user accounts and roles</p>
                </div>
                <button onClick={handleCreate} className="btn btn-primary">+ Add User</button>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">User</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Email</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Roles</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Status</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
                                                {user.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{user.full_name}</p>
                                                <p className="text-xs text-slate-500">@{user.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600">{user.email}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles.map(role => (
                                                <span key={role.id} className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded">
                                                    {role.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`text-xs px-2 py-1 rounded-full ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                            }`}>{user.status}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleEdit(user)} className="p-2 hover:bg-slate-100 rounded-lg">✏️</button>
                                            <button onClick={() => handleDelete(user)} className="p-2 hover:bg-slate-100 rounded-lg">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? 'Edit User' : 'Add User'}>
                <form onSubmit={handleSubmit}>
                    {formError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{formError}</div>}
                    <div className="space-y-4">
                        {!editingUser && (
                            <div>
                                <label className="label">Username *</label>
                                <input type="text" name="username" value={formData.username} onChange={handleInputChange} className="input" required />
                            </div>
                        )}
                        <div>
                            <label className="label">Full Name *</label>
                            <input type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} className="input" required />
                        </div>
                        <div>
                            <label className="label">Email *</label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="input" required />
                        </div>
                        {!editingUser && (
                            <div>
                                <label className="label">Password *</label>
                                <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="input" required />
                            </div>
                        )}
                        <div>
                            <label className="label">Phone</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="input" />
                        </div>
                        <div>
                            <label className="label">Roles</label>
                            <div className="flex flex-wrap gap-2">
                                {roles.map(role => (
                                    <label key={role.id} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={formData.role_ids.includes(role.id)}
                                            onChange={() => handleRoleChange(role.id)}
                                        />
                                        <span className="text-sm">{role.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={formLoading} className="btn btn-primary">
                            {formLoading ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Users;
