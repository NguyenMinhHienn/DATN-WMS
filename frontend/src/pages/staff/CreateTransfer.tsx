import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockTransferService } from '../../services/stockTransferService';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';
import { Warehouse, Product } from '../../interface';

/**
 * CreateTransfer - Trang tạo phiếu NHẬP/XUẤT/CHUYỂN KHO cho STAFF
 * 
 * - IMPORT (Nhập kho): Nhập thông tin sản phẩm mới → Kho đích
 * - EXPORT (Xuất kho): Chọn sản phẩm có sẵn từ Kho nguồn
 * - TRANSFER (Chuyển kho): Chọn sản phẩm từ Kho nguồn → Kho đích
 */

type TransferType = 'IMPORT' | 'EXPORT' | 'TRANSFER';

interface FormItem {
    // Dùng cho EXPORT/TRANSFER
    product_id?: number;

    // Dùng cho IMPORT (nhập mới)
    product_name: string;
    product_sku: string;
    product_image_url: string;
    image_file?: File | null;
    image_preview?: string;

    // Chung
    quantity: number;
    unit_price: number;
    notes: string;
}

const emptyItem: FormItem = {
    product_id: 0,
    product_name: '',
    product_sku: '',
    product_image_url: '',
    image_file: null,
    image_preview: '',
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

    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
                            product_image_url: item.product_image_url || item.image_preview || undefined,
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

            console.log('[CreateTransfer] Sending payload:', payload);

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

    const handleFileSelect = (index: number, file: File | null) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const updated = [...formItems];
                updated[index].image_file = file;
                updated[index].image_preview = reader.result as string;
                setFormItems(updated);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = (index: number) => {
        fileInputRefs.current[index]?.click();
    };

    const getProduct = (id: number) => products.find(p => p.id === id);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Tạo phiếu kho</h1>
                <p className="text-slate-600">Chọn loại phiếu và nhập thông tin sản phẩm</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg">
                {error && (
                    <div className="m-6 mb-0 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                        <strong>Lỗi:</strong> {error}
                    </div>
                )}

                {/* Transfer Type Selection */}
                <div className="p-6 border-b">
                    <label className="block text-sm font-medium text-slate-700 mb-3">Loại phiếu *</label>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { type: 'IMPORT' as const, icon: '📥', label: 'Nhập kho', desc: 'Nhập sản phẩm mới vào kho', color: 'emerald' },
                            { type: 'EXPORT' as const, icon: '📤', label: 'Xuất kho', desc: 'Xuất hàng khỏi kho', color: 'orange' },
                            { type: 'TRANSFER' as const, icon: '🔄', label: 'Chuyển kho', desc: 'Chuyển giữa 2 kho', color: 'purple' },
                        ].map((item) => (
                            <button
                                key={item.type}
                                type="button"
                                onClick={() => {
                                    setTransferType(item.type);
                                    setFormItems([{ ...emptyItem }]); // Reset items
                                }}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${transferType === item.type
                                        ? `border-${item.color}-500 bg-${item.color}-50 ring-2 ring-${item.color}-200`
                                        : 'border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <span className="text-3xl block mb-2">{item.icon}</span>
                                <p className="font-semibold">{item.label}</p>
                                <p className="text-xs text-slate-500">{item.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Warehouse Selection */}
                <div className="p-6 border-b">
                    <div className="grid grid-cols-2 gap-6">
                        {(transferType === 'EXPORT' || transferType === 'TRANSFER') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Kho nguồn <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={sourceWarehouseId || ''}
                                    onChange={(e) => setSourceWarehouseId(Number(e.target.value) || undefined)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Kho đích <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={destWarehouseId || ''}
                                    onChange={(e) => setDestWarehouseId(Number(e.target.value) || undefined)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
                            <label className="block text-sm font-medium text-slate-700 mb-2">Lý do</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                                placeholder="Nhập lý do..."
                            />
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-lg font-medium text-slate-700">
                            Danh sách sản phẩm <span className="text-red-500">*</span>
                        </label>
                        <button type="button" onClick={addItem} className="px-4 py-2 text-emerald-600 hover:text-emerald-700 font-medium">
                            + Thêm sản phẩm
                        </button>
                    </div>

                    <div className="space-y-4">
                        {formItems.map((item, index) => (
                            <div key={index} className="p-4 bg-slate-50 rounded-xl border">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-sm font-medium text-slate-500">Sản phẩm #{index + 1}</span>
                                    {formItems.length > 1 && (
                                        <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 text-sm">
                                            ❌ Xóa
                                        </button>
                                    )}
                                </div>

                                {/* IMPORT: Nhập thông tin sản phẩm mới */}
                                {transferType === 'IMPORT' ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs text-slate-500 mb-1">Tên SP *</label>
                                                <input
                                                    type="text"
                                                    value={item.product_name}
                                                    onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                    placeholder="Tên sản phẩm"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Mã SKU</label>
                                                <input
                                                    type="text"
                                                    value={item.product_sku}
                                                    onChange={(e) => updateItem(index, 'product_sku', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                    placeholder="Tự động"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Số lượng *</label>
                                                <input
                                                    type="number" min="1" value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Đơn giá</label>
                                                <input
                                                    type="number" min="0" value={item.unit_price}
                                                    onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                />
                                            </div>
                                        </div>
                                        {/* Hình ảnh */}
                                        <div className="mt-3 grid grid-cols-3 gap-4">
                                            <div>
                                                <input type="file" accept="image/*" ref={el => fileInputRefs.current[index] = el} className="hidden"
                                                    onChange={(e) => handleFileSelect(index, e.target.files?.[0] || null)} />
                                                <button type="button" onClick={() => triggerFileInput(index)}
                                                    className="w-full px-3 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-emerald-400 text-sm">
                                                    📷 Chọn hình
                                                </button>
                                            </div>
                                            <div>
                                                <input type="url" value={item.product_image_url}
                                                    onChange={(e) => updateItem(index, 'product_image_url', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                    placeholder="URL hình" />
                                            </div>
                                            <div>
                                                <input type="text" value={item.notes}
                                                    onChange={(e) => updateItem(index, 'notes', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                    placeholder="Ghi chú" />
                                            </div>
                                        </div>
                                        {(item.image_preview || item.product_image_url) && (
                                            <img src={item.image_preview || item.product_image_url} alt="Preview"
                                                className="mt-2 h-12 w-12 object-cover rounded border"
                                                onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                        )}
                                    </>
                                ) : (
                                    /* EXPORT/TRANSFER: Chọn sản phẩm có sẵn */
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs text-slate-500 mb-1">Sản phẩm *</label>
                                            <select
                                                value={item.product_id || ''}
                                                onChange={(e) => updateItem(index, 'product_id', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                required
                                            >
                                                <option value="">-- Chọn sản phẩm --</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                                ))}
                                            </select>
                                            {item.product_id && getProduct(item.product_id) && (
                                                <div className="mt-1 flex items-center gap-2">
                                                    {getProduct(item.product_id)?.image_url && (
                                                        <img src={getProduct(item.product_id)?.image_url} className="h-8 w-8 rounded object-cover" />
                                                    )}
                                                    <span className="text-xs text-slate-500">{getProduct(item.product_id)?.name}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Số lượng *</label>
                                            <input
                                                type="number" min="1" value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Đơn giá</label>
                                            <input
                                                type="number" min="0" value={item.unit_price}
                                                onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Thành tiền */}
                                <div className="mt-3 text-right">
                                    <span className="text-sm text-slate-600">Thành tiền: </span>
                                    <span className="font-bold text-emerald-600">{calculations.itemTotals[index]?.toLocaleString() || 0} đ</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary & Actions */}
                <div className="p-6 bg-slate-50 rounded-b-xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <p className="text-sm text-slate-600">Số sản phẩm: <strong>{formItems.length}</strong></p>
                            <p className="text-sm text-slate-600">Tổng SL: <strong>{calculations.totalQty}</strong></p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-600">Tổng tiền:</p>
                            <p className="text-3xl font-bold text-emerald-600">{calculations.grandTotal.toLocaleString()} đ</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={() => navigate('/staff/dashboard')} className="px-6 py-3 text-slate-600 hover:text-slate-800">
                            Hủy
                        </button>
                        <button type="submit" disabled={submitting}
                            className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-2">
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
