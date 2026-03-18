import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { stockTransferService } from '../../services/stockTransferService';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';
import { Warehouse, Product } from '../../interface';


type TransferType = 'IMPORT' | 'EXPORT' | 'TRANSFER';

interface VariantInfo {
    id: number;
    sku: string;
    price: number;
    stock: number;
    average_cost: number;
    label: string;
    image_url?: string;
}

interface FormItem {
    product_id?: number;
    product_name: string;
    product_variant_id?: number;
    variant_sku: string;
    quantity: number;
    unit_price: number;
    notes: string;
    // Loaded data
    variants: VariantInfo[];
    loadingVariants: boolean;
    selectedVariant?: VariantInfo;
}

const emptyItem: FormItem = {
    product_id: undefined,
    product_name: '',
    product_variant_id: undefined,
    variant_sku: '',
    quantity: 1,
    unit_price: 0,
    notes: '',
    variants: [],
    loadingVariants: false,
    selectedVariant: undefined,
};

const CreateTransfer: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

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

    // Autocomplete state
    const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
    const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
    const searchRefs = useRef<Record<number, HTMLDivElement | null>>({});

    useEffect(() => {
        loadData();
    }, []);

    // Close autocomplete dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (activeSearchIndex !== null) {
                const ref = searchRefs.current[activeSearchIndex];
                if (ref && !ref.contains(e.target as Node)) {
                    setActiveSearchIndex(null);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeSearchIndex]);

    const loadData = async () => {
        try {
            const [warehouseRes, productRes] = await Promise.all([
                warehouseService.getAll(),
                productService.getAll(1, 200)
            ]);
            setWarehouses(warehouseRes || []);
            setProducts(productRes.data || []);

            // Check if nav state exists (coming from specific order)
            if (location.state?.fromOrder) {
                setTransferType('EXPORT');
                setReason(location.state.reason || '');

                const orderItems = location.state.orderItems || [];
                if (orderItems.length > 0) {
                    // Pre-fetch all variants for the given products concurrently
                    const variantPromises = orderItems.map((item: any) =>
                        productService.getProductVariants(item.product_id).catch(() => [])
                    );
                    const allVariants = await Promise.all(variantPromises);

                    const newFormItems: FormItem[] = orderItems.map((item: any, index: number) => {
                        const variants = allVariants[index] || [];
                        const mapped: VariantInfo[] = variants.map((v: any) => ({
                            id: v.id,
                            sku: v.sku || '',
                            price: Number(v.price) || 0,
                            stock: Number(v.stock) || 0,
                            average_cost: Number(v.average_cost) || 0,
                            label: buildVariantLabel(v),
                            image_url: v.image_url,
                        }));

                        const targetVariant = mapped.find(v => v.id === item.variant_id);

                        return {
                            ...emptyItem,
                            product_id: item.product_id,
                            product_name: item.product_name,
                            product_variant_id: targetVariant?.id,
                            variant_sku: targetVariant?.sku || item.variant_sku,
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                            variants: mapped,
                            loadingVariants: false,
                            selectedVariant: targetVariant,
                        };
                    });

                    setFormItems(newFormItems);

                    // Also populate searchTerms for the autocomplete inputs
                    const newSearchTerms: Record<number, string> = {};
                    orderItems.forEach((item: any, i: number) => {
                        newSearchTerms[i] = item.product_name;
                    });
                    setSearchTerms(newSearchTerms);
                }
            }
        } catch (err) {
            console.error('Failed to load data:', err);
            setError('Không thể tải dữ liệu.');
        } finally {
            setLoading(false);
        }
    };

    // Build variant label from attributes
    const buildVariantLabel = (v: any): string => {
        const parts = [v.color, v.size, v.storage, v.ram, v.material, v.capacity]
            .filter(Boolean)
            .join(' / ');
        return parts || 'Mặc định';
    };

    // Load variants for a product
    const loadVariants = async (index: number, productId: number, autoSelectVariantId?: number) => {
        const updated = [...formItems];
        // Only reset variant if we are not auto-selecting (e.g., from order)
        if (!autoSelectVariantId) {
            updated[index].loadingVariants = true;
            updated[index].variants = [];
            updated[index].product_variant_id = undefined;
            updated[index].selectedVariant = undefined;
            updated[index].variant_sku = '';
        } else {
            updated[index].loadingVariants = true;
        }
        setFormItems(updated);

        try {
            const variants = await productService.getProductVariants(productId);
            const mapped: VariantInfo[] = variants.map((v: any) => ({
                id: v.id,
                sku: v.sku || '',
                price: Number(v.price) || 0,
                stock: Number(v.stock) || 0,
                average_cost: Number(v.average_cost) || 0,
                label: buildVariantLabel(v),
                image_url: v.image_url,
            }));

            const final = [...formItems];
            final[index].variants = mapped;
            final[index].loadingVariants = false;

            // Auto-select logic
            if (autoSelectVariantId) {
                const target = mapped.find(v => v.id === autoSelectVariantId);
                if (target) {
                    final[index].product_variant_id = target.id;
                    final[index].selectedVariant = target;
                    final[index].variant_sku = target.sku;
                    // Don't overwrite unit_price if coming from order (it's the selling price)
                }
            } else if (mapped.length === 1) {
                final[index].product_variant_id = mapped[0].id;
                final[index].selectedVariant = mapped[0];
                final[index].variant_sku = mapped[0].sku;
                final[index].unit_price = transferType === 'EXPORT' ? mapped[0].price : (mapped[0].average_cost || mapped[0].price);
            }

            setFormItems(final);
        } catch (err) {
            console.error('Failed to load variants:', err);
            const final = [...formItems];
            final[index].loadingVariants = false;
            setFormItems(final);
        }
    };

    // Filter products by search term
    const getFilteredProducts = (index: number) => {
        const term = (searchTerms[index] || '').toLowerCase().trim();
        if (!term) return products.slice(0, 20);
        return products.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.sku?.toLowerCase().includes(term)
        ).slice(0, 20);
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

        // Validate items - must have product + variant
        const validItems = formItems.filter(i =>
            i.product_id && i.product_id > 0 &&
            i.product_variant_id && i.product_variant_id > 0 &&
            i.quantity > 0
        );

        if (validItems.length === 0) {
            setError('Vui lòng thêm ít nhất một sản phẩm với biến thể hợp lệ');
            return;
        }

        // Check export stock
        if (transferType === 'EXPORT' || transferType === 'TRANSFER') {
            for (const item of validItems) {
                if (item.selectedVariant && item.quantity > item.selectedVariant.stock) {
                    setError(`Sản phẩm "${item.product_name}" - SL yêu cầu (${item.quantity}) vượt quá tồn kho (${item.selectedVariant.stock})`);
                    return;
                }
            }
        }

        setSubmitting(true);

        try {
            const payload = {
                type: transferType,
                source_warehouse_id: sourceWarehouseId,
                destination_warehouse_id: destWarehouseId,
                reason: reason,
                items: validItems.map(item => ({
                    product_id: item.product_id,
                    product_variant_id: item.product_variant_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    notes: item.notes || undefined
                }))
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
            // Clean up search terms
            const newTerms = { ...searchTerms };
            delete newTerms[index];
            setSearchTerms(newTerms);
        }
    };

    // Select product from autocomplete
    const selectProduct = (index: number, product: Product) => {
        const updated = [...formItems];
        updated[index].product_id = product.id;
        updated[index].product_name = product.name;
        updated[index].unit_price = transferType === 'EXPORT' ? (product.selling_price || 0) : (product.cost_price || 0);
        // Reset variant
        updated[index].product_variant_id = undefined;
        updated[index].selectedVariant = undefined;
        updated[index].variant_sku = '';
        updated[index].variants = [];
        setFormItems(updated);
        setActiveSearchIndex(null);
        setSearchTerms({ ...searchTerms, [index]: product.name });

        // Load variants
        loadVariants(index, product.id);
    };

    // Select variant
    const selectVariant = (index: number, variantId: number) => {
        const updated = [...formItems];
        const variant = updated[index].variants.find(v => v.id === variantId);
        if (variant) {
            updated[index].product_variant_id = variant.id;
            updated[index].selectedVariant = variant;
            updated[index].variant_sku = variant.sku;
            updated[index].unit_price = transferType === 'EXPORT' ? variant.price : (variant.average_cost || variant.price);
        }
        setFormItems(updated);
    };

    const updateItemField = (index: number, field: 'quantity' | 'unit_price' | 'notes', value: any) => {
        const updated = [...formItems];
        (updated[index] as any)[field] = value;
        setFormItems(updated);
    };

    // Check if form can submit
    const canSubmit = formItems.some(i =>
        i.product_id && i.product_variant_id && i.quantity > 0
    );

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
                        <p className="text-slate-500">Chọn sản phẩm + biến thể → nhập số lượng và đơn giá</p>
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
                                    setSearchTerms({});
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

                                {/* Row 1: Product Search + Variant + SKU */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    {/* Product Autocomplete */}
                                    <div className="relative" ref={(el) => { searchRefs.current[index] = el; }}>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Sản phẩm *</label>
                                        <input
                                            type="text"
                                            value={activeSearchIndex === index ? (searchTerms[index] ?? '') : (item.product_name || '')}
                                            onChange={(e) => {
                                                setSearchTerms({ ...searchTerms, [index]: e.target.value });
                                                setActiveSearchIndex(index);
                                            }}
                                            onFocus={() => {
                                                setActiveSearchIndex(index);
                                                if (!searchTerms[index] && item.product_name) {
                                                    setSearchTerms({ ...searchTerms, [index]: item.product_name });
                                                }
                                            }}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                            placeholder="🔍 Tìm theo tên hoặc SKU..."
                                            autoComplete="off"
                                        />
                                        {/* Autocomplete dropdown */}
                                        {activeSearchIndex === index && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                {getFilteredProducts(index).length === 0 ? (
                                                    <div className="p-3 text-sm text-slate-500 text-center">Không tìm thấy sản phẩm</div>
                                                ) : (
                                                    getFilteredProducts(index).map(p => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => selectProduct(index, p)}
                                                            className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex items-center gap-3 border-b border-slate-100 last:border-b-0 ${item.product_id === p.id ? 'bg-indigo-50' : ''}`}
                                                        >
                                                            {p.image_url && (
                                                                <img src={p.image_url} className="w-10 h-10 rounded-lg object-cover border border-slate-200" alt="" />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                                                                <p className="text-xs text-slate-500">{p.sku}</p>
                                                            </div>
                                                            <span className="text-xs text-indigo-500 font-mono">
                                                                {transferType === 'EXPORT' ? p.selling_price?.toLocaleString() : p.cost_price?.toLocaleString()}đ
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Variant Selection */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                            Biến thể *
                                            {item.loadingVariants && <span className="ml-1 text-indigo-500">⏳</span>}
                                        </label>
                                        {!item.product_id ? (
                                            <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 text-sm">
                                                Chọn sản phẩm trước
                                            </div>
                                        ) : item.loadingVariants ? (
                                            <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 text-sm">
                                                Đang tải biến thể...
                                            </div>
                                        ) : item.variants.length === 0 ? (
                                            <div className="w-full px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                                                Sản phẩm chưa có biến thể
                                            </div>
                                        ) : item.variants.length === 1 ? (
                                            <div className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                                                ✓ {item.variants[0].label} ({item.variants[0].sku})
                                            </div>
                                        ) : (
                                            <select
                                                value={item.product_variant_id || ''}
                                                onChange={(e) => selectVariant(index, Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                                required
                                            >
                                                <option value="">-- Chọn biến thể --</option>
                                                {item.variants.map(v => (
                                                    <option key={v.id} value={v.id}>
                                                        {v.label} | SKU: {v.sku} | Tồn: {v.stock}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* SKU (readonly) */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Mã SKU</label>
                                        <input
                                            type="text"
                                            value={item.variant_sku}
                                            readOnly
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono text-sm cursor-not-allowed"
                                            placeholder="Tự động từ biến thể"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Stock Info + Quantity + Price */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* Stock info (readonly) */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">📊 Tồn kho hiện tại</label>
                                        <div className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border ${item.selectedVariant
                                            ? item.selectedVariant.stock > 0
                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                : 'bg-red-50 border-red-200 text-red-600'
                                            : 'bg-slate-50 border-slate-200 text-slate-400'
                                            }`}>
                                            {item.selectedVariant ? `${item.selectedVariant.stock.toLocaleString()} SP` : '—'}
                                        </div>
                                    </div>

                                    {/* Average cost (readonly) */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">💰 Giá vốn BQ</label>
                                        <div className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border ${item.selectedVariant
                                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                                            : 'bg-slate-50 border-slate-200 text-slate-400'
                                            }`}>
                                            {item.selectedVariant ? `${item.selectedVariant.average_cost.toLocaleString()} đ` : '—'}
                                        </div>
                                    </div>

                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Số lượng *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItemField(index, 'quantity', Number(e.target.value))}
                                            disabled={!item.product_variant_id}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                            required
                                        />
                                        {/* Stock warning for EXPORT */}
                                        {(transferType === 'EXPORT' || transferType === 'TRANSFER') &&
                                            item.selectedVariant && item.quantity > item.selectedVariant.stock && (
                                                <p className="text-xs text-red-500 mt-1">⚠️ Vượt quá tồn kho!</p>
                                            )}
                                    </div>

                                    {/* Unit price */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                            {transferType === 'EXPORT' ? 'Đơn giá xuất / bán' : 'Đơn giá nhập'}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.unit_price}
                                            onChange={(e) => updateItemField(index, 'unit_price', Number(e.target.value))}
                                            disabled={!item.product_variant_id}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

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
                            disabled={submitting || !canSubmit}
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
