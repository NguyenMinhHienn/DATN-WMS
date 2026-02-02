import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { Warehouse, WarehouseFormData } from '../../interface';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

const Warehouses: React.FC = () => {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    const [formData, setFormData] = useState<WarehouseFormData>({
        code: '', name: '', description: '', address: '', city: '', phone: '', email: '', status: 'active'
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const { hasRole } = useAuth();
    const isAdmin = hasRole('admin');

    useEffect(() => { loadWarehouses(); }, []);

    const loadWarehouses = async () => {
        try {
            const data = await warehouseService.getAll();
            setWarehouses(data);
        } catch (error) {
            console.error('Failed to load warehouses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingWarehouse(null);
        setFormData({ code: '', name: '', description: '', address: '', city: '', phone: '', email: '', status: 'active' });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleEdit = (warehouse: Warehouse) => {
        setEditingWarehouse(warehouse);
        setFormData({
            code: warehouse.code, name: warehouse.name, description: warehouse.description || '',
            address: warehouse.address || '', city: warehouse.city || '', phone: warehouse.phone || '',
            email: warehouse.email || '', status: warehouse.status
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        try {
            if (editingWarehouse) {
                await warehouseService.update(editingWarehouse.id, formData);
            } else {
                await warehouseService.create(formData);
            }
            setIsModalOpen(false);
            loadWarehouses();
        } catch (error: any) {
            setFormError(error.response?.data?.message || 'An error occurred');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (warehouse: Warehouse) => {
        if (!confirm(`Delete warehouse "${warehouse.name}"?`)) return;
        try {
            await warehouseService.delete(warehouse.id);
            loadWarehouses();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete warehouse');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">
                        <span className="gradient-text">Quản lý kho</span>
                    </h1>
                    <p className="text-slate-400 mt-1">Quản lý các vị trí kho hàng</p>
                </div>
                {isAdmin && <button onClick={handleCreate} className="btn btn-primary">+ Thêm kho</button>}
            </div>

            {/* Warehouse Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : warehouses.map(warehouse => (
                    <div key={warehouse.id} className="chart-container hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30">
                                🏭
                            </div>
                            <span className={`badge ${warehouse.status === 'active' ? 'badge-success' :
                                    warehouse.status === 'maintenance' ? 'badge-warning' : 'badge-danger'
                                }`}>
                                {warehouse.status}
                            </span>
                        </div>
                        <h3 className="font-semibold text-lg text-white mb-1">{warehouse.name}</h3>
                        <p className="text-sm text-indigo-300 mb-1 font-mono">{warehouse.code}</p>
                        {warehouse.address && (
                            <p className="text-sm text-slate-400 mb-4 flex items-center gap-1">
                                <span>📍</span> {warehouse.address}, {warehouse.city}
                            </p>
                        )}
                        {isAdmin && (
                            <div className="flex gap-2 pt-4 border-t border-slate-700/50">
                                <button onClick={() => handleEdit(warehouse)} className="btn btn-secondary text-sm flex-1">✏️ Sửa</button>
                                <button onClick={() => handleDelete(warehouse)} className="btn btn-danger text-sm">🗑️ Xóa</button>
                            </div>
                        )}
                    </div>
                ))}
                {!loading && warehouses.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                            <span className="text-5xl opacity-50">🏭</span>
                            <p className="text-slate-500">Không tìm thấy kho nào</p>
                        </div>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingWarehouse ? 'Sửa kho' : 'Thêm kho mới'} size="lg">
                <form onSubmit={handleSubmit}>
                    {formError && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-500/30">{formError}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="label">Mã kho *</label><input type="text" name="code" value={formData.code} onChange={handleInputChange} className="input" required /></div>
                        <div><label className="label">Tên kho *</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="input" required /></div>
                        <div className="md:col-span-2"><label className="label">Mô tả</label><textarea name="description" value={formData.description} onChange={handleInputChange} className="input" rows={2} /></div>
                        <div className="md:col-span-2"><label className="label">Địa chỉ</label><input type="text" name="address" value={formData.address} onChange={handleInputChange} className="input" /></div>
                        <div><label className="label">Thành phố</label><input type="text" name="city" value={formData.city} onChange={handleInputChange} className="input" /></div>
                        <div><label className="label">Số điện thoại</label><input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="input" /></div>
                        <div><label className="label">Email</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} className="input" /></div>
                        <div><label className="label">Trạng thái</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} className="input">
                                <option value="active">Hoạt động</option>
                                <option value="inactive">Tạm ngừng</option>
                                <option value="maintenance">Bảo trì</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700/50">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Hủy</button>
                        <button type="submit" disabled={formLoading} className="btn btn-primary">{formLoading ? 'Đang lưu...' : (editingWarehouse ? 'Cập nhật' : 'Thêm mới')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Warehouses;
