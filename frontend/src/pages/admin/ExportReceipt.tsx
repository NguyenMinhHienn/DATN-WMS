import React, { useState, useEffect } from 'react';
import { exportReceiptService, ExportReceiptSummary, ExportReceiptFull } from '../../services/exportReceiptService';

import { productVariantService } from '../../services/productVariantService';
import { productService } from '../../services/productService';
import { Pagination } from '../../components/Pagination';

interface ReceiptItem {
    product_id: number;
    product_variant_id?: number;
    product_name: string;
    variant_sku: string;
    unit_name: string;
    quantity_requested: number;
    quantity_actual: number;
    unit_price: number;
    current_stock: number;
}

const ExportReceipt: React.FC = () => {
    // List state
    const [receipts, setReceipts] = useState<ExportReceiptSummary[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState('');

    // Detail modal
    const [selectedReceipt, setSelectedReceipt] = useState<ExportReceiptFull | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Create modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [variants, setVariants] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<number>(0);

    // Create form
    const [formData, setFormData] = useState({
        receipt_date: new Date().toISOString().split('T')[0],
        export_reason: 'sale',
        warehouse_id: 1,
        receiver_name: '',
        receiver_department: '',
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
            const result = await exportReceiptService.getAllReceipts(
                pagination.page,
                pagination.limit,
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
            const prRes = await productService.getAll(1, 200);
            setProducts(prRes.data || []);
            setFormData({
                receipt_date: new Date().toISOString().split('T')[0],
                export_reason: 'sale',
                warehouse_id: 1,
                receiver_name: '',
                receiver_department: '',
                delivery_person: '',
                storekeeper: '',
                reference_document: '',
                notes: '',
            });
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
        if (!formData.warehouse_id) { alert('Vui lòng chọn Kho xuất trước'); return; }

        const product = products.find((p: any) => p.id === selectedProductId);
        const variant = variants.find((v: any) => v.id === variantId);
        if (!product) return;

        if (formItems.some(i => i.product_variant_id === variantId && i.product_id === selectedProductId)) {
            alert('Sản phẩm đã có trong danh sách');
            return;
        }

        const stockStr = variant ? variant.stock : product.total_quantity;
        const currentStock = Number(stockStr) || 0;

        setFormItems([...formItems, {
            product_id: selectedProductId,
            product_variant_id: variantId || undefined,
            product_name: product.name,
            variant_sku: variant?.sku || product.sku,
            unit_name: product.unit_name || 'Cái',
            quantity_requested: 1,
            quantity_actual: 1,
            unit_price: variant?.price || product.selling_price || 0,
            current_stock: currentStock,
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

    const checkStockWarnings = () => {
        const warnings = formItems
            .filter(item => item.quantity_actual > item.current_stock)
            .map(item => `- ${item.product_name} (${item.variant_sku}): Trừ kho ${item.quantity_actual}, nhưng tồn chỉ còn ${item.current_stock}`);

        if (warnings.length > 0) {
            return `Lưu ý: Có SP yêu cầu xuất lớn hơn tồn kho khả dụng:\n${warnings.join('\n')}\n\nBạn vẫn muốn tạo phiếu này? (Phiếu sẽ tạo ở trạng thái PENDING)`;
        }
        return null;
    };

    const handleCreate = async () => {
        if (!formData.warehouse_id) { alert('Vui lòng chọn Kho xuất'); return; }
        if (formItems.length === 0) { alert('Vui lòng thêm ít nhất 1 sản phẩm'); return; }

        const warningStr = checkStockWarnings();
        if (warningStr && !window.confirm(warningStr)) { return; }

        setSubmitting(true);
        try {
            await exportReceiptService.createReceipt({
                receipt_date: formData.receipt_date,
                warehouse_id: formData.warehouse_id,
                export_reason: formData.export_reason || 'sale',
                receiver_name: formData.receiver_name || undefined,
                receiver_department: formData.receiver_department || undefined,
                delivery_person: formData.delivery_person || undefined,
                storekeeper: formData.storekeeper || undefined,
                reference_document: formData.reference_document || undefined,
                notes: formData.notes || undefined,
                items: formItems.map(item => ({
                    product_id: item.product_id,
                    product_variant_id: item.product_variant_id,
                    quantity_requested: item.quantity_requested,
                    quantity_actual: item.quantity_actual,
                    unit_price: item.unit_price,
                })),
            });
            alert('✅ Tạo phiếu xuất kho thành công!');
            setShowCreateModal(false);
            loadReceipts();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Tạo phiếu thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (id: number) => {
        if (!window.confirm('Duyệt phiếu xuất kho? Hàng trong các kho tương ứng sẽ bị trừ đi.')) return;
        setApproving(String(id));
        try {
            await exportReceiptService.approveReceipt(id);
            alert('✅ Duyệt phiếu thành công! Tồn kho đã bị trừ.');
            loadReceipts();
            setShowDetailModal(false);
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Lỗi: Tồn kho không đủ, hoặc phiếu đã được duyệt');
        } finally {
            setApproving('');
        }
    };

    const handleViewDetail = async (id: number) => {
        try {
            const detail = await exportReceiptService.getReceiptById(id);
            setSelectedReceipt(detail);
            setShowDetailModal(true);
        } catch { alert('Không thể tải chi tiết phiếu'); }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Xóa phiếu xuất kho này? (Chỉ xóa thẻ PENDING)')) return;
        try {
            await exportReceiptService.deleteReceipt(id);
            alert('✅ Xóa phiếu thành công');
            loadReceipts();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Xóa phiếu thất bại');
        }
    };

    const totalFormAmount = formItems.reduce((s, i) => s + i.quantity_actual * i.unit_price, 0);

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">
                        <span className="gradient-text">📤 Phiếu Xuất Kho Độc Lập</span>
                    </h1>
                    <p className="text-slate-400 mt-1">Xuất kho nội bộ, phi duyệt đơn hàng, xuất trả NCC, v.v...</p>
                </div>
                <button onClick={openCreateModal}
                    className="px-5 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-sm font-medium shadow-lg shadow-orange-500/30 transition-all">
                    ➕ Tạo phiếu xuất
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="chart-container border-l-4 border-amber-500">
                    <p className="text-sm text-slate-400">Chờ duyệt trừ kho</p>
                    <p className="text-2xl font-bold text-amber-400">{receipts.filter(r => r.status === 'PENDING').length}</p>
                </div>
                <div className="chart-container border-l-4 border-emerald-500">
                    <p className="text-sm text-slate-400">Đã xuất kho</p>
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
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kho xuất</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Ngày xuất</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Lý do</th>
                                        <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Số SP</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Người nhận</th>
                                        <th className="text-center py-4 px-6 text-sm font-medium text-slate-300">Trạng thái</th>
                                        <th className="text-center py-4 px-6 text-sm font-medium text-slate-300">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receipts.map(r => {
                                        const statusInfo = exportReceiptService.getStatusInfo(r.status);
                                        return (
                                            <tr key={r.id} className={`border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors ${r.status === 'PENDING' ? 'bg-amber-500/5' : ''}`}>
                                                <td className="py-4 px-6 font-mono text-sm font-medium text-orange-400">{r.receipt_number}</td>
                                                <td className="py-4 px-6 text-sm text-slate-300">{r.warehouse_name}</td>
                                                <td className="py-4 px-6 text-sm text-slate-400">{new Date(r.receipt_date).toLocaleDateString('vi-VN')}</td>
                                                <td className="py-4 px-6 text-sm text-white">
                                                    <span className="px-2 py-1 bg-slate-700 rounded text-xs">{exportReceiptService.getExportReasonLabel(r.export_reason)}</span>
                                                </td>
                                                <td className="py-4 px-6 text-sm text-right text-white">{r.total_items}</td>
                                                <td className="py-4 px-6 text-sm text-slate-300">{r.receiver_name || '-'} {r.receiver_department ? `(${r.receiver_department})` : ''}</td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold`} style={{ color: statusInfo.color, backgroundColor: statusInfo.bg }}>
                                                        {statusInfo.text}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => handleViewDetail(r.id)}
                                                            className="text-indigo-400 hover:text-indigo-300 font-medium text-sm transition-colors">
                                                            Chi tiết
                                                        </button>
                                                        {r.status === 'PENDING' && (
                                                            <>
                                                                <button onClick={() => handleApprove(r.id)}
                                                                    disabled={approving === String(r.id)}
                                                                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
                                                                    ✅ Duyệt trừ kho
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
                                        );
                                    })}
                                    {receipts.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <span className="text-4xl opacity-50">📤</span>
                                                    <p className="text-slate-500">Không tìm thấy phiếu xuất kho</p>
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
                    <div className="bg-slate-800 rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto p-6 m-4 border border-slate-700/50 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-bold text-white">📤 Tạo Phiếu Xuất Kho (Trừ Tồn Kho)</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
                        </div>

                        {/* Form fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Kho xuất</label>
                                <div className="input w-full bg-slate-700/50 cursor-not-allowed text-slate-300">🏭 Kho tổng</div>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Lý do xuất *</label>
                                <select value={formData.export_reason} onChange={(e) => setFormData({ ...formData, export_reason: e.target.value })} className="input w-full">
                                    <option value="sale">Bán hàng ngoài</option>
                                    <option value="internal">Xuất dùng nội bộ/cho biếu</option>
                                    <option value="transfer">Xuất luân chuyển (không qua order)</option>
                                    <option value="disposal">Xuất tiêu hủy (hết hạn)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Ngày xuất *</label>
                                <input type="date" value={formData.receipt_date} onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })} className="input w-full" />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Người nhận hàng</label>
                                <input type="text" value={formData.receiver_name} onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })} className="input w-full" placeholder="Tên NV/KH" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Bộ phận nhận (nội bộ)</label>
                                <input type="text" value={formData.receiver_department} onChange={(e) => setFormData({ ...formData, receiver_department: e.target.value })} className="input w-full" placeholder="Ví dụ: Phòng Marketing" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Người lập/người giao</label>
                                <input type="text" value={formData.delivery_person} onChange={(e) => setFormData({ ...formData, delivery_person: e.target.value })} className="input w-full" placeholder="Người phụ trách" />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Thủ kho duyệt lại</label>
                                <input type="text" value={formData.storekeeper} onChange={(e) => setFormData({ ...formData, storekeeper: e.target.value })} className="input w-full" placeholder="Tên thủ kho" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Số chứng từ / Phiếu yêu cầu</label>
                                <input type="text" value={formData.reference_document} onChange={(e) => setFormData({ ...formData, reference_document: e.target.value })} className="input w-full" placeholder="Mã chứng từ" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Ghi chú thêm</label>
                                <input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input w-full" placeholder="...Ghi chú" />
                            </div>
                        </div>

                        {/* Add items */}
                        <div className="border-t border-slate-700/50 pt-4 mb-4">
                            <h3 className="font-medium text-white mb-3">📦 Thêm sản phẩm cần xuất</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                <select value={selectedProductId} onChange={(e) => loadVariants(Number(e.target.value))} className="input">
                                    <option value={0}>-- Chọn sản phẩm --</option>
                                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                </select>
                                <select onChange={(e) => { if (e.target.value) addItem(Number(e.target.value)); e.target.value = ''; }} className="input" disabled={!selectedProductId}>
                                    <option value="">-- Chọn biến thể (Xem Tồn Tổng) --</option>
                                    {variants.map((v: any) => <option key={v.id} value={v.id}>{v.sku} (Tồn hiện tại: {v.stock})</option>)}
                                </select>
                                {selectedProductId > 0 && variants.length === 0 && (
                                    <button onClick={() => addItem(0)} className="btn btn-secondary text-sm">+ Thêm SP không biến thể</button>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 italic">* Lưu ý: Đây là số tồn tổng trên hệ thống, khi duyệt, kho sẽ tự động trừ hàng theo LIFO/FIFO vào lô cũ nhất của Variant tương ứng.</p>
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
                                            <th className="px-3 py-2 text-left text-slate-300">Tồn kho</th>
                                            <th className="px-3 py-2 text-right text-slate-300">SL yêu cầu</th>
                                            <th className="px-3 py-2 text-right text-slate-300">SL thực xuất</th>
                                            <th className="px-3 py-2 text-right text-slate-300">Đơn giá</th>
                                            <th className="px-3 py-2 text-right text-slate-300">Thành tiền</th>
                                            <th className="px-3 py-2 text-center text-slate-300">Xóa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formItems.map((item, idx) => {
                                            const isWarning = item.quantity_actual > item.current_stock;
                                            return (
                                                <tr key={idx} className="border-t border-slate-700/50">
                                                    <td className="px-3 py-2 text-white">{item.product_name}</td>
                                                    <td className="px-3 py-2 font-mono text-indigo-300">{item.variant_sku}</td>
                                                    <td className="px-3 py-2 text-slate-400">{item.unit_name}</td>
                                                    <td className="px-3 py-2 font-mono text-slate-300">{item.current_stock}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        <input type="number" min={1} value={item.quantity_requested}
                                                            onChange={(e) => updateItem(idx, 'quantity_requested', Number(e.target.value))}
                                                            className="input w-20 text-right text-sm" />
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <input type="number" min={1} value={item.quantity_actual}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value);
                                                                updateItem(idx, 'quantity_actual', val);
                                                                updateItem(idx, 'quantity_requested', val); // Sync by default
                                                            }}
                                                            className={`input w-24 text-right text-sm ${isWarning ? 'border-red-500 bg-red-500/10 text-red-500 font-bold' : ''}`} />
                                                        {isWarning && <p className="text-[10px] text-red-400 mt-1">Sẽ Thiếu kho: {item.quantity_actual - item.current_stock}</p>}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <input type="number" min={0} value={item.unit_price}
                                                            onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                                                            className="input w-28 text-right text-sm" />
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-medium text-emerald-400">
                                                        {(item.quantity_actual * item.unit_price).toLocaleString('vi-VN')}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300">✕</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-slate-700/50 font-medium">
                                        <tr>
                                            <td colSpan={7} className="px-3 py-2 text-right text-slate-300">Tổng cộng:</td>
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
                                className="px-6 py-2.5 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:opacity-50 transition-all">
                                {submitting ? '⏳ Đang tạo...' : '📤 Tạo phiếu xuất (CHƯA trừ kho)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== DETAIL MODAL ==================== */}
            {showDetailModal && selectedReceipt && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 m-4 border border-slate-700/50 shadow-2xl shadow-indigo-500/10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">📤 Chi tiết phiếu xuất: {selectedReceipt.receipt_number}</h2>
                                <div className="flex gap-2 mt-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold`} style={{ color: exportReceiptService.getStatusInfo(selectedReceipt.status).color, backgroundColor: exportReceiptService.getStatusInfo(selectedReceipt.status).bg }}>
                                        {exportReceiptService.getStatusInfo(selectedReceipt.status).text}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-white text-2xl transition-colors">×</button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4 text-sm bg-slate-700/20 p-4 rounded-xl border border-slate-700/50">
                            <div>
                                <span className="text-slate-500 font-medium">Kho xuất:</span>
                                <p className="font-semibold text-white">{selectedReceipt.warehouse_name}</p>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Lý do xuất:</span>
                                <p className="font-semibold text-white"><span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs">{exportReceiptService.getExportReasonLabel(selectedReceipt.export_reason)}</span></p>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Ngày xuất:</span>
                                <p className="font-semibold text-white">{new Date(selectedReceipt.receipt_date).toLocaleDateString('vi-VN')}</p>
                            </div>

                            <div>
                                <span className="text-slate-500 font-medium">Người nhận hàng:</span>
                                <p className="font-semibold text-white">{selectedReceipt.receiver_name || '-'}</p>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Phòng ban (nội bộ):</span>
                                <p className="font-semibold text-white">{selectedReceipt.receiver_department || '-'}</p>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Tổng tiền (Q.A x Đơn giá):</span>
                                <p className="font-bold text-lg text-red-400">{Number(selectedReceipt.total_amount || 0).toLocaleString('vi-VN')} đ</p>
                            </div>

                            {selectedReceipt.delivery_person && (
                                <div>
                                    <span className="text-slate-500 font-medium">Người lập/giao:</span>
                                    <p className="font-semibold text-white">{selectedReceipt.delivery_person}</p>
                                </div>
                            )}
                            {selectedReceipt.storekeeper && (
                                <div>
                                    <span className="text-slate-500 font-medium">Thủ kho duyệt:</span>
                                    <p className="font-semibold text-white">{selectedReceipt.storekeeper}</p>
                                </div>
                            )}
                            {selectedReceipt.reference_document && (
                                <div>
                                    <span className="text-slate-500 font-medium">Số chứng từ:</span>
                                    <p className="font-semibold text-white">{selectedReceipt.reference_document}</p>
                                </div>
                            )}
                        </div>

                        {selectedReceipt.notes && (
                            <div className="p-3 bg-slate-700/30 rounded-lg mb-4 text-sm text-slate-300">
                                <span className="font-medium mr-2">📝 Ghi chú:</span> {selectedReceipt.notes}
                            </div>
                        )}

                        {/* Items */}
                        {selectedReceipt.items && selectedReceipt.items.length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-bold mb-2 text-white">Danh sách sản phẩm xuất</h3>
                                <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-slate-300">SKU</th>
                                                <th className="px-4 py-3 text-left text-slate-300">Tên SP</th>
                                                <th className="px-4 py-3 text-left text-slate-300">ĐVT</th>
                                                <th className="px-4 py-3 text-right text-slate-300">Tồn hiện tại</th>
                                                <th className="px-4 py-3 text-right text-slate-300">SL yêu cầu</th>
                                                <th className="px-4 py-3 text-right text-orange-300 font-bold">SL thực xuất</th>
                                                <th className="px-4 py-3 text-right text-slate-300">Đơn giá</th>
                                                <th className="px-4 py-3 text-right text-slate-300">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedReceipt.items.map((item) => {
                                                const isWarning = item.quantity_actual > (item.current_stock || 0);

                                                return (
                                                    <tr key={item.id} className="border-t border-slate-700/50">
                                                        <td className="px-4 py-3 font-mono text-indigo-300">{item.variant_sku || item.sku}</td>
                                                        <td className="px-4 py-3 text-white">{item.product_name}</td>
                                                        <td className="px-4 py-3 text-slate-400">{item.unit_name || '-'}</td>
                                                        <td className={`px-4 py-3 text-right font-mono ${isWarning ? 'text-red-400' : 'text-slate-400'}`}>{item.current_stock}</td>
                                                        <td className="px-4 py-3 text-right text-slate-400">{item.quantity_requested}</td>
                                                        <td className="px-4 py-3 text-right text-white font-bold">{item.quantity_actual}</td>
                                                        <td className="px-4 py-3 text-right text-slate-300">{Number(item.unit_price || 0).toLocaleString('vi-VN')}</td>
                                                        <td className="px-4 py-3 text-right font-medium text-red-400">{Number(item.line_total || 0).toLocaleString('vi-VN')}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-slate-700/50 font-medium">
                                            <tr>
                                                <td colSpan={7} className="px-4 py-3 text-right text-slate-300">Tổng tiền thu:</td>
                                                <td className="px-4 py-3 text-right text-lg text-red-400">{Number(selectedReceipt.total_amount || 0).toLocaleString('vi-VN')} đ</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                            <div className="text-xs text-slate-500">
                                👤 Người tạo: <span className="font-semibold text-slate-400 mr-4">{selectedReceipt.created_by_name}</span>
                                {selectedReceipt.status === 'APPROVED' && (
                                    <>✅ Người duyệt: <span className="font-semibold text-slate-400 mr-4">{selectedReceipt.approved_by_name}</span></>
                                )}
                            </div>
                            <div className="flex gap-3">
                                {selectedReceipt.status === 'PENDING' && (
                                    <button onClick={() => handleApprove(selectedReceipt.id)}
                                        disabled={approving === String(selectedReceipt.id)}
                                        className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                                        {approving === String(selectedReceipt.id) ? '⏳ Đang giảm tồn kho...' : '🔥 Duyệt phiếu (bắt đầu trừ Tồn Kho)'}
                                    </button>
                                )}
                                <button onClick={() => setShowDetailModal(false)} className="btn btn-secondary">Đóng</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportReceipt;
