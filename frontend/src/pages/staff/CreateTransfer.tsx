import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { stockTransferService } from '../../services/stockTransferService';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';
import { Warehouse, Product } from '../../interface';
import ImageCropper from '../../components/ImageCropper';

/**
 * CreateTransfer - Light theme modern
 * Tạo phiếu NHẬP/XUẤT/CHUYỂN KHO cho STAFF
 */

type TransferType = 'IMPORT' | 'EXPORT' | 'TRANSFER';

interface FormItem {
    product_id?: number;
    product_name: string;
    product_sku: string;
    product_image_url: string;
    quantity: number;
    unit_price: number;
    notes: string;
}

const emptyItem: FormItem = {
    product_id: 0,
    product_name: '',
    product_sku: '',
    product_image_url: '',
    quantity: 1,
    unit_price: 0,
    notes: ''
};

const CreateTransfer: React.FC = () => {
    const navigate = useNavigate();

    // Form state
    const [transferType, setTransferType] = useState<TransferType>('IMPORT');
    const [sourceWarehouseId, setSourceWarehouseId] = useState<number | undefined>();
    const [destWarehouseId, setDestWarehouseId] = useState<number | undefined>();
    const [formItems, setFormItems] = useState<FormItem[]>([{ ...emptyItem }]);
    const [reason, setReason] = useState('');

    // Reference data
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [warehouseRes, productRes] = await Promise.all([
                warehouseService.getAll(),
                productService.getAll(1, 100)
            ]);
            setWarehouses(warehouseRes || []);
            setProducts(productRes.data || []);
        } catch (err) {
            console.error('Failed to load data:', err);
            setError('Không thể tải dữ liệu.');
        } finally {
            setLoading(false);
        }
    };

    // Tính thành tiền
    const calculations = useMemo(() => {
        const itemTotals = formItems.map(item => item.quantity * item.unit_price);
        const grandTotal = itemTotals.reduce((sum, t) => sum + t, 0);
        const totalQty = formItems.reduce((sum, i) => sum + i.quantity, 0);
        return { itemTotals, grandTotal, totalQty };
    }, [formItems]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate warehouse
        if (transferType === 'IMPORT' && !destWarehouseId) {
            setError('Vui lòng chọn kho nhập');
            return;
        }
        if (transferType === 'EXPORT' && !sourceWarehouseId) {
            setError('Vui lòng chọn kho xuất');
            return;
        }
        if (transferType === 'TRANSFER' && (!sourceWarehouseId || !destWarehouseId)) {
            setError('Vui lòng chọn kho nguồn và kho đích');
            return;
        }

        // Validate items
        const validItems = formItems.filter(i => {
            if (transferType === 'IMPORT') {
                return i.product_name.trim().length > 0 && i.quantity > 0;
            } else {
                return i.product_id && i.product_id > 0 && i.quantity > 0;
            }
        });

        if (validItems.length === 0) {
            setError('Vui lòng thêm ít nhất một sản phẩm hợp lệ');
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                type: transferType,
                source_warehouse_id: sourceWarehouseId,
                destination_warehouse_id: destWarehouseId,
                reason: reason,
                items: validItems.map(item => {
                    if (transferType === 'IMPORT') {
                        return {
                            product_name: item.product_name,
                            product_sku: item.product_sku || undefined,
                            product_image_url: item.product_image_url || undefined,
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                            notes: item.notes || undefined
                        };
                    } else {
                        return {
                            product_id: item.product_id,
                            quantity: item.quantity,
                            unit_price: item.unit_price
                        };
                    }
                })
            };

            await stockTransferService.createTransfer(payload as any);

            const typeLabel = transferType === 'IMPORT' ? 'nhập kho' : transferType === 'EXPORT' ? 'xuất kho' : 'chuyển kho';
            alert(`✅ Phiếu ${typeLabel} đã được tạo thành công!\n\nPhiếu đang chờ Admin duyệt.`);
            navigate('/staff/my-transfers');
        } catch (err: any) {
            console.error('[CreateTransfer] Error:', err);
            const message = err.response?.data?.message || 'Có lỗi xảy ra khi tạo phiếu';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const addItem = () => {
        setFormItems([...formItems, { ...emptyItem }]);
    };

    const removeItem = (index: number) => {
        if (formItems.length > 1) {
            setFormItems(formItems.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof FormItem, value: any) => {
        const updated = [...formItems];
        (updated[index] as any)[field] = value;

        // Auto-fill price từ product
        if (field === 'product_id') {
            const product = products.find(p => p.id === value);
            if (product) {
                updated[index].unit_price = product.cost_price || 0;
            }
        }

        setFormItems(updated);
    };

    const getProduct = (id: number) => products.find(p => p.id === id);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Link to="/staff/dashboard" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-shadow border border-slate-200">
                        <span className="text-lg">←</span>
                    </Link>
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <span className="text-2xl">📝</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Tạo phiếu kho</h1>
                        <p className="text-slate-500">Chọn loại phiếu và nhập thông tin sản phẩm</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                {error && (
                    <div className="m-6 mb-0 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                        <strong>⚠️ Lỗi:</strong> {error}
                    </div>
                )}

                {/* Transfer Type Selection */}
                <div className="p-6 border-b border-slate-100">
                    <label className="block text-sm font-semibold text-slate-700 mb-4">Loại phiếu *</label>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { type: 'IMPORT' as const, icon: '📥', label: 'Nhập kho', desc: 'Nhập sản phẩm mới vào kho', gradient: 'from-emerald-500 to-green-600', border: 'border-emerald-200', bg: 'bg-emerald-50' },
                            { type: 'EXPORT' as const, icon: '📤', label: 'Xuất kho', desc: 'Xuất hàng khỏi kho', gradient: 'from-orange-500 to-amber-500', border: 'border-orange-200', bg: 'bg-orange-50' },
                            { type: 'TRANSFER' as const, icon: '🔄', label: 'Chuyển kho', desc: 'Chuyển giữa 2 kho', gradient: 'from-purple-500 to-indigo-600', border: 'border-purple-200', bg: 'bg-purple-50' },
                        ].map((item) => (
                            <button
                                key={item.type}
                                type="button"
                                onClick={() => {
                                    setTransferType(item.type);
                                    setFormItems([{ ...emptyItem }]);
                                }}
                                className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 ${transferType === item.type
                                    ? `bg-gradient-to-br ${item.gradient} text-white border-transparent shadow-lg scale-[1.02]`
                                    : `${item.bg} ${item.border} hover:shadow-md`
                                    }`}
                            >
                                <span className="text-3xl block mb-2">{item.icon}</span>
                                <p className={`font-bold ${transferType === item.type ? 'text-white' : 'text-slate-800'}`}>{item.label}</p>
                                <p className={`text-xs mt-1 ${transferType === item.type ? 'text-white/80' : 'text-slate-500'}`}>{item.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Warehouse Selection */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="grid grid-cols-2 gap-6">
                        {(transferType === 'EXPORT' || transferType === 'TRANSFER') && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Kho nguồn <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={sourceWarehouseId || ''}
                                    onChange={(e) => setSourceWarehouseId(Number(e.target.value) || undefined)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    required
                                >
                                    <option value="">-- Chọn kho nguồn --</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {(transferType === 'IMPORT' || transferType === 'TRANSFER') && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Kho đích <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={destWarehouseId || ''}
                                    onChange={(e) => setDestWarehouseId(Number(e.target.value) || undefined)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    required
                                >
                                    <option value="">-- Chọn kho đích --</option>
                                    {warehouses.filter(w => w.id !== sourceWarehouseId).map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className={transferType === 'IMPORT' ? 'col-span-1' : ''}>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Lý do</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="Nhập lý do..."
                            />
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="p-6 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-5">
                        <label className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">📦</span>
                            Danh sách sản phẩm <span className="text-red-500">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={addItem}
                            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors font-medium text-sm"
                        >
                            + Thêm sản phẩm
                        </button>
                    </div>

                    <div className="space-y-4">
                        {formItems.map((item, index) => (
                            <div key={index} className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium">Sản phẩm #{index + 1}</span>
                                    {formItems.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"
                                        >
                                            ❌ Xóa
                                        </button>
                                    )}
                                </div>

                                {/* IMPORT: Nhập thông tin sản phẩm mới */}
                                {transferType === 'IMPORT' ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Tên SP *</label>
                                                <input
                                                    type="text"
                                                    value={item.product_name}
                                                    onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                                    placeholder="Tên sản phẩm"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Mã SKU</label>
                                                <input
                                                    type="text"
                                                    value={item.product_sku}
                                                    onChange={(e) => updateItem(index, 'product_sku', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                                    placeholder="Tự động"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Số lượng *</label>
                                                <input
                                                    type="number" min="1" value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Đơn giá</label>
                                                <input
                                                    type="number" min="0" value={item.unit_price}
                                                    onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                                />
                                            </div>
                                        </div>
                                        {/* Hình ảnh */}
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Hình ảnh sản phẩm</label>
                                                <ImageCropper
                                                    value={item.product_image_url}
                                                    onChange={(url) => updateItem(index, 'product_image_url', url)}
                                                    maxSize={400}
                                                    aspectRatio={1}
                                                    placeholder="📷 Chọn hình"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Ghi chú</label>
                                                <input type="text" value={item.notes}
                                                    onChange={(e) => updateItem(index, 'notes', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                                    placeholder="Ghi chú (hàng dễ vỡ, bảo quản lạnh...)" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* EXPORT/TRANSFER: Chọn sản phẩm có sẵn */
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Sản phẩm *</label>
                                            <select
                                                value={item.product_id || ''}
                                                onChange={(e) => updateItem(index, 'product_id', Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                                required
                                            >
                                                <option value="">-- Chọn sản phẩm --</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                                ))}
                                            </select>
                                            {item.product_id && getProduct(item.product_id) && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    {getProduct(item.product_id)?.image_url && (
                                                        <img src={getProduct(item.product_id)?.image_url} className="h-10 w-10 rounded-lg object-cover border border-slate-200 shadow-sm" />
                                                    )}
                                                    <span className="text-sm text-slate-600">{getProduct(item.product_id)?.name}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Số lượng *</label>
                                            <input
                                                type="number" min="1" value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Đơn giá</label>
                                            <input
                                                type="number" min="0" value={item.unit_price}
                                                onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Thành tiền */}
                                <div className="mt-4 text-right">
                                    <span className="text-sm text-slate-500">Thành tiền: </span>
                                    <span className="font-bold text-green-600 text-lg">{calculations.itemTotals[index]?.toLocaleString() || 0} đ</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary & Actions */}
                <div className="p-6 bg-gradient-to-r from-slate-50 to-indigo-50">
                    <div className="flex justify-between items-center mb-6">
                        <div className="space-y-1">
                            <p className="text-sm text-slate-600">Số sản phẩm: <strong className="text-slate-800">{formItems.length}</strong></p>
                            <p className="text-sm text-slate-600">Tổng SL: <strong className="text-slate-800">{calculations.totalQty}</strong></p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-600 mb-1">Tổng tiền:</p>
                            <p className="text-3xl font-bold text-green-600">{calculations.grandTotal.toLocaleString()} đ</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/staff/dashboard')}
                            className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 font-medium flex items-center gap-2"
                        >
                            {submitting ? (
                                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang tạo...</>
                            ) : (
                                <>📤 Gửi phiếu cho Admin</>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateTransfer;
