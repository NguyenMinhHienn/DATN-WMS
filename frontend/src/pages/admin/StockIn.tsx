import React, { useState, useEffect } from 'react';
import { stockService } from '../../services/stockService';

import { productVariantService } from '../../services/productVariantService';
import { productService } from '../../services/productService';
import { supplierService, Supplier } from '../../services/supplierService';
import { useAuth } from '../../context/AuthContext';
import { Pagination } from '../../components/Pagination';
import { numberToWords } from '../../utils/numberToWords';

interface ReceiptItem {
    product_id: number;
    product_variant_id?: number;
    product_name: string;
    variant_sku: string;
    unit_name: string;
    quantity_expected: number;
    quantity_document: number;
    quantity_actual: number;
    unit_cost: number;
}

const StockIn: React.FC = () => {
    const { user } = useAuth();

    // List state
    const [receipts, setReceipts] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [isCustomSupplier, setIsCustomSupplier] = useState(false);
    const [customSupplierName, setCustomSupplierName] = useState('');

    // Detail modal
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Create modal
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [products, setProducts] = useState<any[]>([]);
    const [variants, setVariants] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<number>(0);

    // Create form
    const [formData, setFormData] = useState({
        receipt_type: 'purchase' as string,
        warehouse_id: 1,
        supplier_id: null as number | null,
        receipt_date: new Date().toISOString().split('T')[0],
        delivery_person: '',
        storekeeper: '',
        reference_document: '',
        notes: '',
    });
    const [formItems, setFormItems] = useState<ReceiptItem[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [approving, setApproving] = useState('');

    useEffect(() => { loadReceipts(); }, [pagination.page, selectedStatus]);

    const loadReceipts = async () => {
        try {
            setLoading(true);
            const result = await stockService.getReceipts(
                pagination.page,
                pagination.limit,
                undefined,
                selectedStatus || undefined
            );
            setReceipts(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error('Failed to load receipts:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = async () => {
        try {
            const [prRes, supRes] = await Promise.all([
                productService.getAll(1, 200),
                supplierService.getAll(),
            ]);
            setProducts(prRes.data || []);
            setSuppliers(supRes || []);
            setFormData({
                receipt_type: 'purchase',
                warehouse_id: 1, // Fixed warehouse
                supplier_id: null,
                receipt_date: new Date().toISOString().split('T')[0],
                delivery_person: '',
                storekeeper: user?.full_name || '', // Auto-fill storekeeper
                reference_document: '',
                notes: '',
            });
            setIsCustomSupplier(false);
            setCustomSupplierName('');
            setFormItems([]);
            setShowCreateModal(true);
        } catch (err) {
            alert('Không thể tải dữ liệu');
        }
    };

    const loadVariants = async (productId: number) => {
        setSelectedProductId(productId);
        if (!productId) { setVariants([]); return; }
        try {
            const data = await productVariantService.getByProduct(productId);
            setVariants(data || []);
        } catch { setVariants([]); }
    };

    const addItem = (variantId: number) => {
        const product = products.find((p: any) => p.id === selectedProductId);
        const variant = variants.find((v: any) => v.id === variantId);
        if (!product) return;

        if (formItems.some(i => i.product_variant_id === variantId && i.product_id === selectedProductId)) {
            alert('Sản phẩm đã có trong danh sách');
            return;
        }

        setFormItems([...formItems, {
            product_id: selectedProductId,
            product_variant_id: variantId || undefined,
            product_name: product.name,
            variant_sku: variant?.sku || product.sku,
            unit_name: product.unit_name || 'Cái',
            quantity_expected: 1,
            quantity_document: 1,
            quantity_actual: 1,
            unit_cost: product.cost_price || variant?.average_cost || 0,
        }]);
    };

    const updateItem = (index: number, field: string, value: number) => {
        const updated = [...formItems];
        (updated[index] as any)[field] = value;
        setFormItems(updated);
    };

    const removeItem = (index: number) => {
        setFormItems(formItems.filter((_, i) => i !== index));
    };

    // Check if supplier is selected
    const hasAdminSupplier = !!(formData.supplier_id || (isCustomSupplier && customSupplierName.trim()));

    const handleAdminSupplierChange = (val: string) => {
        // If items already added, confirm reset
        if (formItems.length > 0) {
            if (!confirm('Đổi nhà cung cấp sẽ xóa danh sách sản phẩm đã thêm. Bạn có chắc?')) {
                return;
            }
            setFormItems([]);
        }

        if (val === 'custom') {
            setIsCustomSupplier(true);
            setCustomSupplierName('');
            setFormData({ ...formData, supplier_id: null });
        } else if (val.startsWith('custom_')) {
            setIsCustomSupplier(true);
            setCustomSupplierName(val.replace('custom_', ''));
            setFormData({ ...formData, supplier_id: null });
        } else {
            setIsCustomSupplier(false);
            setFormData({ ...formData, supplier_id: val ? Number(val) : null });
        }
    };

    const handleCreate = async () => {
        // ===== VALIDATE THÔNG TIN CHUNG =====
        if (!hasAdminSupplier) { alert('⚠️ Vui lòng chọn Nhà cung cấp trước khi tạo phiếu nhập'); return; }
        if (!formData.receipt_date) { alert('⚠️ Vui lòng chọn Ngày lập phiếu'); return; }
        if (!formData.warehouse_id) { alert('⚠️ Vui lòng chọn kho nhập'); return; }

        // ===== VALIDATE THÔNG TIN NGHIỆP VỤ =====
        if (!formData.delivery_person.trim()) { alert('⚠️ Vui lòng nhập tên Người giao hàng'); return; }
        if (!formData.storekeeper.trim()) { alert('⚠️ Vui lòng nhập tên Thủ kho'); return; }

        // ===== VALIDATE SẢN PHẨM =====
        if (formItems.length === 0) { alert('⚠️ Vui lòng thêm ít nhất 1 sản phẩm'); return; }

        // Validate đơn giá > 0
        for (let i = 0; i < formItems.length; i++) {
            if (formItems[i].unit_cost <= 0) {
                alert(`⚠️ Sản phẩm "${formItems[i].product_name}" chưa có đơn giá. Vui lòng nhập đơn giá > 0`);
                return;
            }
            if (formItems[i].quantity_actual <= 0) {
                alert(`⚠️ Sản phẩm "${formItems[i].product_name}" có số lượng thực nhập phải > 0`);
                return;
            }
        }

        setSubmitting(true);
        try {
            let finalSupplierId = formData.supplier_id;
            if (isCustomSupplier) {
                if (!customSupplierName.trim()) {
                    alert('Vui lòng nhập tên nhà cung cấp mới');
                    setSubmitting(false);
                    return;
                }
                const newSup = await supplierService.create({ name: customSupplierName.trim(), status: 'active' });
                finalSupplierId = newSup.id;
            }

            await stockService.createReceipt({
                receipt_type: formData.receipt_type,
                warehouse_id: formData.warehouse_id,
                supplier_id: finalSupplierId || undefined,
                receipt_date: formData.receipt_date,
                delivery_person: formData.delivery_person || undefined,
                storekeeper: formData.storekeeper || undefined,
                reference_document: formData.reference_document || undefined,
                notes: formData.notes || undefined,
                items: formItems.map(item => ({
                    product_id: item.product_id,
                    product_variant_id: item.product_variant_id,
                    quantity_expected: item.quantity_expected,
                    quantity_document: item.quantity_document,
                    quantity_actual: item.quantity_actual,
                    unit_cost: item.unit_cost,
                })),
            });
            alert('✅ Tạo phiếu nhập kho thành công!');
            setShowCreateModal(false);
            loadReceipts();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Tạo phiếu thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (id: number) => {
        if (!window.confirm('Duyệt phiếu nhập kho? Tồn kho sẽ được cộng thêm.')) return;
        setApproving(String(id));
        try {
            await stockService.approveReceipt(id);
            alert('✅ Duyệt phiếu thành công! Tồn kho đã được cập nhật.');
            loadReceipts();
            setShowDetailModal(false);
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Duyệt phiếu thất bại');
        } finally {
            setApproving('');
        }
    };

    const handleViewDetail = async (id: number) => {
        try {
            const detail = await stockService.getReceiptById(id);
            setSelectedReceipt(detail);
            setShowDetailModal(true);
        } catch { alert('Không thể tải chi tiết phiếu'); }
    };

    const handlePrint = (id: number) => {
        window.open(`http://localhost:3000/api/print/import/${id}`, '_blank');
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Xóa phiếu nhập kho này?')) return;
        try {
            await stockService.deleteReceipt(id);
            alert('✅ Xóa phiếu thành công');
            loadReceipts();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Xóa phiếu thất bại');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'PENDING': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            'APPROVED': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            'CANCELLED': 'bg-red-500/20 text-red-400 border-red-500/30',
        };
        const labels: Record<string, string> = {
            'PENDING': '⏳ Chờ duyệt',
            'APPROVED': '✅ Đã duyệt',
            'CANCELLED': '❌ Đã hủy',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || 'bg-slate-500/20'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const totalFormAmount = formItems.reduce((s, i) => s + i.quantity_actual * i.unit_cost, 0);

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">
                        <span className="gradient-text">📥 Phiếu Nhập Kho</span>
                    </h1>
                    <p className="text-slate-400 mt-1">Quản lý phiếu nhập kho theo nghiệp vụ kế toán</p>
                </div>
                <button onClick={openCreateModal}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium shadow-lg shadow-indigo-500/30 transition-all">
                    ➕ Tạo phiếu nhập
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="chart-container border-l-4 border-amber-500">
                    <p className="text-sm text-slate-400">Chờ duyệt</p>
                    <p className="text-2xl font-bold text-amber-400">{receipts.filter(r => r.status === 'PENDING').length}</p>
                </div>
                <div className="chart-container border-l-4 border-emerald-500">
                    <p className="text-sm text-slate-400">Đã duyệt</p>
                    <p className="text-2xl font-bold text-emerald-400">{receipts.filter(r => r.status === 'APPROVED').length}</p>
                </div>
                <div className="chart-container border-l-4 border-indigo-500">
                    <p className="text-sm text-slate-400">Tổng phiếu</p>
                    <p className="text-2xl font-bold text-indigo-400">{pagination.total}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="chart-container mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <select value={selectedStatus}
                        onChange={(e) => { setSelectedStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="input max-w-xs">
                        <option value="">Tất cả trạng thái</option>
                        <option value="PENDING">⏳ Chờ duyệt</option>
                        <option value="APPROVED">✅ Đã duyệt</option>
                        <option value="CANCELLED">❌ Đã hủy</option>
                    </select>
                    <button onClick={() => { setSelectedStatus(''); setPagination(p => ({ ...p, page: 1 })); }}
                        className="text-slate-400 hover:text-white transition-colors">
                        Xóa bộ lọc
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="chart-container p-0 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-800/50 border-b border-slate-700/50">
                                    <tr>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Mã phiếu</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kho nhập</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Nhà cung cấp</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Ngày lập</th>
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Số SP</th>
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Tổng tiền</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Người lập</th>
                                        <th className="text-center py-4 px-6 text-sm font-medium text-slate-300">Trạng thái</th>
                                        <th className="text-center py-4 px-6 text-sm font-medium text-slate-300">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receipts.map(r => (
                                        <tr key={r.id} className={`border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors ${r.status === 'PENDING' ? 'bg-amber-500/5' : ''}`}>
                                            <td className="py-4 px-6 font-mono text-sm font-medium text-indigo-400">{r.receipt_number}</td>
                                            <td className="py-4 px-6 text-sm text-slate-300">{r.warehouse_name}</td>
                                            <td className="py-4 px-6 text-sm text-slate-300">{r.supplier_name || '-'}</td>
                                            <td className="py-4 px-6 text-sm text-slate-400">{new Date(r.receipt_date).toLocaleDateString('vi-VN')}</td>
                                            <td className="py-4 px-6 text-sm text-right text-white">{r.total_items}</td>
                                            <td className="py-4 px-6 text-sm text-right font-medium text-emerald-400">{Number(r.total_amount || 0).toLocaleString('vi-VN')} đ</td>
                                            <td className="py-4 px-6 text-sm text-slate-300">{r.created_by_name}</td>
                                            <td className="py-4 px-6 text-center">{getStatusBadge(r.status)}</td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleViewDetail(r.id)}
                                                        className="text-indigo-400 hover:text-indigo-300 font-medium text-sm transition-colors">
                                                        Chi tiết
                                                    </button>
                                                    <button onClick={() => handlePrint(r.id)}
                                                        className="px-3 py-1 bg-slate-600 text-white rounded text-xs font-medium hover:bg-slate-500 transition-colors">
                                                        🖨️ In
                                                    </button>
                                                    {r.status === 'PENDING' && (
                                                        <>
                                                            <button onClick={() => handleApprove(r.id)}
                                                                disabled={approving === String(r.id)}
                                                                className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
                                                                ✅ Duyệt
                                                            </button>
                                                            <button onClick={() => handleDelete(r.id)}
                                                                className="text-red-400 hover:text-red-300 text-sm transition-colors">
                                                                🗑️
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {receipts.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <span className="text-4xl opacity-50">📥</span>
                                                    <p className="text-slate-500">Không tìm thấy phiếu nhập kho</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-700/50">
                            <Pagination pagination={pagination} onPageChange={(page) => setPagination(p => ({ ...p, page }))} />
                        </div>
                    </>
                )}
            </div>

            {/* ==================== CREATE MODAL ==================== */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto p-6 m-4 border border-slate-700/50 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-bold text-white">📥 Tạo Phiếu Nhập Kho</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
                        </div>

                        {/* Form fields grouped into sections */}
                        {/* Section 1: Thông tin chung */}
                        <div className="mb-6 p-4 rounded-xl border border-slate-700/50 bg-slate-800/50">
                            <h3 className="font-medium text-white mb-4 flex items-center gap-2"><span>📄</span> Thông tin chung</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Số phiếu</label>
                                    <input type="text" value="(Tự động tạo)" disabled className="input w-full bg-slate-700/50 text-slate-400 cursor-not-allowed italic" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Trạng thái phiếu</label>
                                    <div className="input w-full bg-slate-700/50 text-amber-400 cursor-not-allowed font-medium flex items-center h-[42px]">
                                        ⏳ Chưa duyệt
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Ngày lập *</label>
                                    <input type="date" value={formData.receipt_date} onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })} className="input w-full" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Kho nhập</label>
                                    <div className="input w-full bg-slate-700/50 cursor-not-allowed text-slate-300 flex items-center h-[42px]">🏭 Kho tổng</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-red-400 mb-1">🏢 Nhà cung cấp <span className="text-red-500">*</span></label>
                                    <select
                                        value={isCustomSupplier ? 'custom' : (formData.supplier_id || '')}
                                        onChange={(e) => handleAdminSupplierChange(e.target.value)}
                                        className={`input w-full border-2 ${hasAdminSupplier ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}
                                    >
                                        <option value="">-- Chọn nhà cung cấp (bắt buộc) --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        <optgroup label="Thương hiệu nổi tiếng (Chọn để tạo)">
                                            <option value="custom_Zara">Zara</option>
                                            <option value="custom_H&M">H&M</option>
                                            <option value="custom_Uniqlo">Uniqlo</option>
                                            <option value="custom_Gucci">Gucci</option>
                                            <option value="custom_Dior">Dior</option>
                                            <option value="custom_Louis Vuitton">Louis Vuitton</option>
                                        </optgroup>
                                        <option value="custom">➕ Khác (Tự nhập tên)...</option>
                                    </select>
                                    {isCustomSupplier && (
                                        <input
                                            type="text"
                                            value={customSupplierName}
                                            onChange={e => setCustomSupplierName(e.target.value)}
                                            placeholder="Nhập tên NCC mới..."
                                            className="input w-full mt-2 border-indigo-500 bg-indigo-500/10 text-white"
                                            autoFocus
                                        />
                                    )}
                                    {!hasAdminSupplier && (
                                        <p className="mt-1 text-xs text-red-400 font-medium">⚠️ Bắt buộc chọn NCC trước khi thêm sản phẩm</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">📍 Địa chỉ kho</label>
                                    <div className="input w-full bg-slate-700/50 cursor-not-allowed text-slate-300 flex items-center h-[42px] text-sm">
                                        Số 1, Phố Trịnh Văn Bô, Phương Canh, Hà Nội
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm text-slate-400 mb-1">Ghi chú phiếu</label>
                                    <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input w-full" rows={2} placeholder="Nhập ghi chú (không bắt buộc)..." />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Thông tin nghiệp vụ */}
                        <div className="mb-6 p-4 rounded-xl border border-slate-700/50 bg-slate-800/50">
                            <h3 className="font-medium text-white mb-4 flex items-center gap-2"><span>🏢</span> Thông tin nghiệp vụ</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* NCC đã được di chuyển lên phần Thông tin chung */}
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Loại chứng từ *</label>
                                    <select value={formData.receipt_type} onChange={(e) => setFormData({ ...formData, receipt_type: e.target.value })} className="input w-full">
                                        <option value="purchase">Mua hàng</option>
                                        <option value="return">Trả hàng</option>
                                        <option value="other">Khác</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Số chứng từ gốc</label>
                                    <input type="text" value={formData.reference_document} onChange={(e) => setFormData({ ...formData, reference_document: e.target.value })} className="input w-full" placeholder="Mã chứng từ (nếu có)" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Người giao hàng *</label>
                                    <input type="text" value={formData.delivery_person} onChange={(e) => setFormData({ ...formData, delivery_person: e.target.value })} className="input w-full" placeholder="Họ tên người giao" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Người lập phiếu</label>
                                    <input type="text" value={user?.full_name || ''} readOnly className="input w-full bg-slate-700/50 text-slate-300 cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Thủ kho *</label>
                                    <input type="text" value={formData.storekeeper || ''} onChange={(e) => setFormData({...formData, storekeeper: e.target.value})} className="input w-full" placeholder="Họ tên thủ kho" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Người duyệt</label>
                                    <input type="text" value="" disabled placeholder="(Chỉ thêm khi admin duyệt)" className="input w-full bg-slate-700/50 text-slate-300 cursor-not-allowed" />
                                </div>
                            </div>
                        </div>

                        {/* Add items */}
                        <div className={`border-t border-slate-700/50 pt-4 mb-4 ${!hasAdminSupplier ? 'opacity-50 pointer-events-none' : ''}`}>
                            {!hasAdminSupplier && (
                                <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-sm flex items-center gap-2">
                                    <span>⚠️</span>
                                    <span>Vui lòng chọn <strong>Nhà cung cấp</strong> ở phần Thông tin chung trước khi thêm sản phẩm.</span>
                                </div>
                            )}
                            <h3 className="font-medium text-white mb-3">📦 Thêm sản phẩm</h3>
                            
                            {/* Product selector */}
                            <select value={selectedProductId} onChange={(e) => loadVariants(Number(e.target.value))} className="input w-full mb-3">
                                <option value={0}>-- Chọn sản phẩm --</option>
                                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>

                            {/* Visual variant picker */}
                            {selectedProductId > 0 && variants.length > 0 && (
                                <div className="bg-slate-700/20 rounded-xl border border-slate-600/50 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-slate-300">
                                            Chọn biến thể ({variants.length} có sẵn)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Add all variants not yet in formItems
                                                const product = products.find((p: any) => p.id === selectedProductId);
                                                if (!product) return;
                                                const newItems: ReceiptItem[] = [];
                                                variants.forEach((v: any) => {
                                                    if (!formItems.some(i => i.product_variant_id === v.id && i.product_id === selectedProductId)) {
                                                        newItems.push({
                                                            product_id: selectedProductId,
                                                            product_variant_id: v.id,
                                                            product_name: product.name,
                                                            variant_sku: v.sku,
                                                            unit_name: product.unit_name || 'Cái',
                                                            quantity_expected: 1,
                                                            quantity_document: 1,
                                                            quantity_actual: 1,
                                                            unit_cost: product.cost_price || v.average_cost || 0,
                                                        });
                                                    }
                                                });
                                                if (newItems.length > 0) setFormItems([...formItems, ...newItems]);
                                            }}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            + Thêm tất cả
                                        </button>
                                    </div>

                                    {/* Variant cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                                        {variants.map((v: any) => {
                                            const alreadyAdded = formItems.some(i => i.product_variant_id === v.id && i.product_id === selectedProductId);
                                            const attrs = v.attribute_values || [];
                                            
                                            return (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    disabled={alreadyAdded}
                                                    onClick={() => addItem(v.id)}
                                                    className={`text-left p-3 rounded-lg border-2 transition-all ${alreadyAdded
                                                        ? 'border-emerald-500/30 bg-emerald-500/10 opacity-60 cursor-not-allowed'
                                                        : 'border-slate-600/50 bg-slate-700/30 hover:border-indigo-500 hover:bg-indigo-500/10 cursor-pointer'
                                                    }`}
                                                >
                                                    {/* Attribute chips */}
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {attrs.length > 0 ? attrs.map((attr: any) => (
                                                            <span
                                                                key={attr.id}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-600/50 text-slate-200"
                                                            >
                                                                {attr.color_code && (
                                                                    <span
                                                                        className="w-3 h-3 rounded-full border border-slate-400"
                                                                        style={{ backgroundColor: attr.color_code }}
                                                                    />
                                                                )}
                                                                <span className="text-slate-400">{attr.attribute_display_name || attr.attribute_name}:</span>
                                                                {attr.display_value}
                                                            </span>
                                                        )) : (
                                                            <span className="text-xs text-slate-400">Mặc định</span>
                                                        )}
                                                    </div>
                                                    {/* SKU + Stock */}
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-500 font-mono truncate max-w-[160px]" title={v.sku}>{v.sku}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${v.stock > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/50 text-slate-400'}`}>
                                                            Tồn: {v.stock || 0}
                                                        </span>
                                                    </div>
                                                    {alreadyAdded && (
                                                        <div className="text-[10px] text-emerald-400 mt-1">✓ Đã thêm</div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* No variants */}
                            {selectedProductId > 0 && variants.length === 0 && (
                                <button onClick={() => addItem(0)} className="btn btn-secondary text-sm w-full">
                                    + Thêm sản phẩm (không có biến thể)
                                </button>
                            )}
                        </div>

                        {/* Items table */}
                        {formItems.length > 0 && (
                            <div className="overflow-x-auto rounded-lg border border-slate-700/50 mb-4">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-700/50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-slate-300">Sản phẩm</th>
                                            <th className="px-3 py-2 text-left text-slate-300">SKU</th>
                                            <th className="px-3 py-2 text-left text-slate-300">ĐVT</th>
                                            <th className="px-3 py-2 text-right text-slate-300">SL chứng từ</th>
                                            <th className="px-3 py-2 text-right text-slate-300">SL thực nhập</th>
                                            <th className="px-3 py-2 text-right text-slate-300">Đơn giá</th>
                                            <th className="px-3 py-2 text-right text-slate-300">Thành tiền</th>
                                            <th className="px-3 py-2 text-center text-slate-300">Xóa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formItems.map((item, idx) => (
                                            <tr key={idx} className="border-t border-slate-700/50">
                                                <td className="px-3 py-2 text-white">{item.product_name}</td>
                                                <td className="px-3 py-2 font-mono text-indigo-300">{item.variant_sku}</td>
                                                <td className="px-3 py-2 text-slate-400">{item.unit_name}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <input type="number" min={1} value={item.quantity_document}
                                                        onChange={(e) => updateItem(idx, 'quantity_document', Number(e.target.value))}
                                                        className="input w-20 text-right text-sm" />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input type="number" min={1} value={item.quantity_actual}
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value);
                                                            updateItem(idx, 'quantity_actual', val);
                                                            updateItem(idx, 'quantity_expected', val);
                                                        }}
                                                        className="input w-20 text-right text-sm" />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input type="number" min={0} value={item.unit_cost}
                                                        onChange={(e) => updateItem(idx, 'unit_cost', Number(e.target.value))}
                                                        className="input w-28 text-right text-sm" />
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-emerald-400">
                                                    {(item.quantity_actual * item.unit_cost).toLocaleString('vi-VN')} đ
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300">✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-700/50 font-medium">
                                        <tr>
                                            <td colSpan={6} className="px-3 py-2 text-right text-slate-300">Tổng cộng:</td>
                                            <td className="px-3 py-2 text-right text-lg text-emerald-400">{totalFormAmount.toLocaleString('vi-VN')} đ</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                            <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Hủy</button>
                            <button onClick={handleCreate} disabled={submitting}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all">
                                {submitting ? '⏳ Đang tạo...' : '📥 Tạo phiếu nhập'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== DETAIL MODAL ==================== */}
            {showDetailModal && selectedReceipt && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 m-4 border border-slate-700/50 shadow-2xl shadow-indigo-500/10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">📥 Chi tiết phiếu nhập: {selectedReceipt.receipt_number}</h2>
                                <div className="flex gap-2 mt-2">{getStatusBadge(selectedReceipt.status)}</div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-white text-2xl transition-colors">×</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Thông tin chung */}
                            <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-700/50">
                                <h3 className="font-medium text-white mb-3 text-sm flex items-center gap-2"><span>📄</span> Thông tin chung</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Kho nhập:</span>
                                        <span className="font-medium text-white">{selectedReceipt.warehouse_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">📍 Địa chỉ kho:</span>
                                        <span className="font-medium text-white text-right">Số 1, Phố Trịnh Văn Bô, Phương Canh, Hà Nội</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Ngày lập:</span>
                                        <span className="font-medium text-white">{new Date(selectedReceipt.receipt_date).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Chứng từ kèm theo:</span>
                                        <span className="font-medium text-white">{selectedReceipt.reference_document || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Ghi chú phiếu:</span>
                                        <span className="font-medium text-white">{selectedReceipt.notes || '-'}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-700/50 mt-2">
                                        <span className="text-slate-500">Tổng tiền:</span>
                                        <div className="text-right">
                                            <div className="font-medium text-lg text-emerald-400">{Number(selectedReceipt.total_amount || 0).toLocaleString('vi-VN')} đ</div>
                                            <div className="text-xs text-slate-400 italic mt-0.5">{numberToWords(Number(selectedReceipt.total_amount || 0))}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Thông tin nghiệp vụ */}
                            <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-700/50">
                                <h3 className="font-medium text-white mb-3 text-sm flex items-center gap-2"><span>🏢</span> Thông tin nghiệp vụ</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Nhà cung cấp:</span>
                                        <span className="font-medium text-white">{selectedReceipt.supplier_name || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Người giao hàng:</span>
                                        <span className="font-medium text-white">{selectedReceipt.delivery_person || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Người lập:</span>
                                        <span className="font-medium text-white">{selectedReceipt.created_by_name || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Thủ kho:</span>
                                        <span className="font-medium text-white">{selectedReceipt.storekeeper || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Người duyệt:</span>
                                        <span className="font-medium text-white">{selectedReceipt.approved_by_name || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {selectedReceipt.notes && (
                            <div className="p-3 bg-slate-700/30 rounded-lg mb-4 text-sm text-slate-300">
                                📝 {selectedReceipt.notes}
                            </div>
                        )}

                        {/* Items */}
                        {selectedReceipt.items && selectedReceipt.items.length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-medium mb-2 text-white">Danh sách sản phẩm ({selectedReceipt.items.length})</h3>
                                <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-slate-300">SKU</th>
                                                <th className="px-4 py-3 text-left text-slate-300">Tên SP</th>
                                                <th className="px-4 py-3 text-right text-slate-300">SL chứng từ</th>
                                                <th className="px-4 py-3 text-right text-slate-300">SL thực nhập</th>
                                                <th className="px-4 py-3 text-right text-slate-300">Đơn giá</th>
                                                <th className="px-4 py-3 text-right text-slate-300">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedReceipt.items.map((item: any) => (
                                                <tr key={item.id} className="border-t border-slate-700/50">
                                                    <td className="px-4 py-3 font-mono text-indigo-300">{item.variant_sku || item.sku}</td>
                                                    <td className="px-4 py-3 text-white">{item.product_name}</td>
                                                    <td className="px-4 py-3 text-right text-slate-400">{item.quantity_document || item.quantity_expected}</td>
                                                    <td className="px-4 py-3 text-right text-white">{item.quantity_actual || item.quantity_expected}</td>
                                                    <td className="px-4 py-3 text-right text-slate-300">{Number(item.unit_cost || 0).toLocaleString('vi-VN')} đ</td>
                                                    <td className="px-4 py-3 text-right font-medium text-emerald-400">{Number(item.line_total || 0).toLocaleString('vi-VN')} đ</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-700/50 font-medium">
                                            <tr>
                                                <td colSpan={5} className="px-4 py-3 text-right text-slate-300">Tổng cộng:</td>
                                                <td className="px-4 py-3 text-right text-lg text-emerald-400">{Number(selectedReceipt.total_amount || 0).toLocaleString('vi-VN')} đ</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                            {selectedReceipt.status === 'PENDING' && (
                                <button onClick={() => handleApprove(selectedReceipt.id)}
                                    disabled={approving === String(selectedReceipt.id)}
                                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
                                    {approving === String(selectedReceipt.id) ? '⏳ Đang duyệt...' : '✅ Duyệt phiếu (cộng tồn kho)'}
                                </button>
                            )}
                            <button onClick={() => handlePrint(selectedReceipt.id)} className="btn btn-primary">🖨️ In Phiếu</button>
                            <button onClick={() => setShowDetailModal(false)} className="btn btn-secondary">Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockIn;
