import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { stockTransferService } from '../../services/stockTransferService';
import { productService } from '../../services/productService';
import { supplierService, Supplier } from '../../services/supplierService';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { Product, User } from '../../interface';
const AddressMapPicker = lazy(() => import('../../components/AddressMapPicker'));
type TransferType = 'IMPORT' | 'EXPORT' | 'TRANSFER';




interface VariantFormInfo {
    id: number;
    sku: string;
    label: string;
    stock: number;
    price: number;
    average_cost: number;
    image_url?: string;
    // Input attributes
    quantity: number;
    unit_price: number;
    notes: string;
}

interface FormItem {
    product_id?: number;
    product_name: string;
    loadingVariants: boolean;
    variants: VariantFormInfo[];
}

const emptyItem: FormItem = {
    product_id: undefined,
    product_name: '',
    loadingVariants: false,
    variants: [],
};

const CreateTransfer: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Form state
    const [transferType, setTransferType] = useState<TransferType>('IMPORT');
    const [formItems, setFormItems] = useState<FormItem[]>([{ ...emptyItem }]);
    const [reason, setReason] = useState('');
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplierId, setSupplierId] = useState<number | undefined>();
    const [orderId, setOrderId] = useState<number | undefined>();
    const [isCustomSupplier, setIsCustomSupplier] = useState(false);
    const [customSupplierName, setCustomSupplierName] = useState('');
    const [deliveryPerson, setDeliveryPerson] = useState('');
    const [storekeeperName, setStorekeeperName] = useState(user?.full_name || '');
    const [receiverName, setReceiverName] = useState('');
    const [receiverDepartment, setReceiverDepartment] = useState('');
    const [receiverAddress, setReceiverAddress] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [receiverLat, setReceiverLat] = useState<number | undefined>();
    const [receiverLng, setReceiverLng] = useState<number | undefined>();
    const [exportNote, setExportNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [vatPercent, setVatPercent] = useState<number>(0);
    const [shippingFee, setShippingFee] = useState<number>(0);
    const [paymentTerms, setPaymentTerms] = useState<number>(0);

    // User Search State
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
    const [searchUserQuery, setSearchUserQuery] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    // Reference data
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    // Verify Modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmChecked, setConfirmChecked] = useState(false);
    const [itemsToConfirm, setItemsToConfirm] = useState<any[]>([]);

    // Autocomplete state
    const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
    const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
    const searchRefs = useRef<Record<number, HTMLDivElement | null>>({});

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (!storekeeperName && user) setStorekeeperName(user.full_name);
    }, [user]);

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
            const [productRes, supplierRes, userRes] = await Promise.all([
                productService.getAll(1, 200),
                supplierService.getAll(),
                userService.getAll()
            ]);
            setProducts(productRes.data || []);
            setSuppliers(supplierRes || []);
            setUsers(userRes || []);

            // Check if nav state exists (coming from specific order)
            if (location.state?.fromOrder) {
                setTransferType('EXPORT');
                setReason(location.state.reason || '');
                if (location.state.orderId) setOrderId(location.state.orderId);
                // Auto-fill receiver info from order
                if (location.state.shippingName) setReceiverName(location.state.shippingName);
                if (location.state.shippingAddress) setReceiverAddress(location.state.shippingAddress);
                if (location.state.shippingPhone) setReceiverPhone(location.state.shippingPhone);
                if (location.state.paymentMethod) {
                    const pm = location.state.paymentMethod.toUpperCase();
                    if (pm === 'CREDIT') {
                        setPaymentMethod('');
                        setPaymentTerms(15); // Auto-select 15 days for credit orders
                    } else if (pm === 'COD') {
                        setPaymentMethod('cod');
                    } else {
                        setPaymentMethod('online');
                    }
                }

                const orderItems = location.state.orderItems || [];
                if (orderItems.length > 0) {
                    // Group orderItems by product_id
                    const groupedByProduct: Record<number, any[]> = {};
                    orderItems.forEach((item: any) => {
                        if (!groupedByProduct[item.product_id]) groupedByProduct[item.product_id] = [];
                        groupedByProduct[item.product_id].push(item);
                    });

                    const productIds = Object.keys(groupedByProduct).map(Number);
                    
                    // Pre-fetch all variants for the given products concurrently
                    const variantPromises = productIds.map((pid: number) =>
                        productService.getProductVariants(pid).catch(() => [])
                    );
                    const allVariants = await Promise.all(variantPromises);

                    const newFormItems: FormItem[] = productIds.map((pid: number, index: number) => {
                        const itemsForProduct = groupedByProduct[pid];
                        const variants = allVariants[index] || [];
                        const mappedVariants: VariantFormInfo[] = variants.map((v: any) => {
                            const orderItem = itemsForProduct.find(i => i.variant_id === v.id);
                            return {
                                id: v.id,
                                sku: v.sku || '',
                                price: Number(v.price) || 0,
                                stock: Number(v.stock) || 0,
                                average_cost: Number(v.average_cost) || 0,
                                label: buildVariantLabel(v),
                                image_url: v.image_url,
                                quantity: orderItem ? orderItem.quantity : 0,
                                unit_price: orderItem ? orderItem.unit_price : 0,
                                notes: ''
                            };
                        });

                        return {
                            ...emptyItem,
                            product_id: pid,
                            product_name: itemsForProduct[0].product_name,
                            variants: mappedVariants,
                            loadingVariants: false,
                        };
                    });

                    setFormItems(newFormItems);

                    // Also populate searchTerms for the autocomplete inputs
                    const newSearchTerms: Record<number, string> = {};
                    newFormItems.forEach((item: any, i: number) => {
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
        // Use attribute_values if available
        if (v.attribute_values && v.attribute_values.length > 0) {
            return v.attribute_values
                .map((av: any) => av.display_value || av.value)
                .join(' / ');
        }
        // Fallback to legacy fields
        const parts = [v.color, v.size, v.storage, v.ram, v.material, v.capacity]
            .filter(Boolean)
            .join(' / ');
        return parts || 'Mặc định';
    };

    // Load variants for a product
    const loadVariants = async (index: number, productId: number) => {
        const updated = [...formItems];
        updated[index].loadingVariants = true;
        setFormItems(updated);

        try {
            const product = products.find(p => p.id === productId);
            const variants = await productService.getProductVariants(productId);
            
            const mappedVariants: VariantFormInfo[] = variants.map((v: any) => ({
                id: v.id,
                sku: v.sku || '',
                price: Number(v.price) || 0,
                stock: Number(v.stock) || 0,
                average_cost: Number(v.average_cost) || 0,
                label: buildVariantLabel(v),
                image_url: v.image_url,
                // Initialize user inputs
                quantity: 0,
                unit_price: transferType === 'EXPORT' ? (v.price || 0) : (product?.cost_price || v.average_cost || 0),
                notes: ''
            }));

            const final = [...formItems];
            final[index].variants = mappedVariants;
            final[index].loadingVariants = false;
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
        let grandTotal = 0;
        let totalQty = 0;
        formItems.forEach(block => {
            block.variants.forEach(v => {
                if(v.quantity > 0) {
                    grandTotal += v.quantity * v.unit_price;
                    totalQty += v.quantity;
                }
            });
        });
        return { grandTotal, totalQty };
    }, [formItems]);

    // Check if supplier is selected for IMPORT
    const hasSupplier = !!(supplierId || (isCustomSupplier && customSupplierName.trim()));

    const handleSupplierChange = (val: string) => {
        // If items already added, confirm reset
        const hasItems = formItems.some(i => i.product_id);
        if (hasItems) {
            if (!confirm('Đổi nhà cung cấp sẽ xóa danh sách sản phẩm đã thêm. Bạn có chắc?')) {
                return;
            }
            setFormItems([{ ...emptyItem }]);
            setSearchTerms({});
        }

        if (val === 'custom') {
            setIsCustomSupplier(true);
            setCustomSupplierName('');
            setSupplierId(undefined);
        } else if (val.startsWith('custom_')) {
            setIsCustomSupplier(true);
            setCustomSupplierName(val.replace('custom_', ''));
            setSupplierId(undefined);
        } else {
            setIsCustomSupplier(false);
            setSupplierId(Number(val) || undefined);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // ===== VALIDATE THÔNG TIN CHUNG =====
        if (!receiptDate) {
            setError('Vui lòng chọn Ngày lập phiếu');
            return;
        }

        // ===== VALIDATE THEO LOẠI PHIẾU =====
        if (transferType === 'IMPORT') {
            // Nhà cung cấp bắt buộc
            if (!hasSupplier) {
                setError('Vui lòng chọn Nhà cung cấp trước khi tạo phiếu nhập');
                return;
            }
            // Người giao hàng bắt buộc
            if (!deliveryPerson.trim()) {
                setError('Vui lòng nhập tên Người giao hàng');
                return;
            }
        }

        if (transferType === 'EXPORT') {
            // Lý do xuất bắt buộc
            if (!reason.trim()) {
                setError('Vui lòng chọn Lý do xuất kho');
                return;
            }
            if (paymentTerms > 0 && !selectedUserId) {
                setError('Vui lòng chọn Khách hàng (User) khi tạo đơn hàng Công nợ.');
                return;
            }
            // Người nhận bắt buộc
            if (!receiverName.trim()) {
                setError('Vui lòng nhập tên Người nhận hàng');
                return;
            }
            // SĐT người nhận bắt buộc
            if (!receiverPhone.trim()) {
                setError('Vui lòng nhập Số điện thoại người nhận');
                return;
            }
            // Địa chỉ người nhận bắt buộc
            if (!receiverAddress.trim()) {
                setError('Vui lòng nhập Địa chỉ người nhận');
                return;
            }
        }

        // Thủ kho bắt buộc
        if (!storekeeperName.trim()) {
            setError('Vui lòng nhập tên Thủ kho');
            return;
        }

        // ===== VALIDATE SẢN PHẨM =====
        type ValidItemT = { product_id: number; product_name: string; product_variant_id: number; variant_sku: string; quantity: number; unit_price: number; notes: string; stock: number };
        const validItems: ValidItemT[] = [];

        formItems.forEach(block => {
            if (block.product_id) {
                block.variants.forEach(variant => {
                    if (variant.quantity > 0) {
                        validItems.push({
                            product_id: block.product_id!,
                            product_name: block.product_name,
                            product_variant_id: variant.id,
                            variant_sku: variant.sku,
                            quantity: variant.quantity,
                            unit_price: variant.unit_price,
                            notes: variant.notes,
                            stock: variant.stock
                        });
                    }
                });
            }
        });

        if (validItems.length === 0) {
            setError('Vui lòng nhập số lượng cho ít nhất một biến thể sản phẩm');
            return;
        }

        // Validate đơn giá > 0 cho từng biến thể
        for (let i = 0; i < validItems.length; i++) {
            if (validItems[i].unit_price <= 0) {
                setError(`Sản phẩm "${validItems[i].product_name}" (Biến thể: ${validItems[i].variant_sku}) chưa có đơn giá hợp lệ.`);
                return;
            }
        }

        // Check export stock
        if (transferType === 'EXPORT') {
            for (const item of validItems) {
                if (item.quantity > item.stock) {
                    setError(`Sản phẩm "${item.product_name}" (Biến thể: ${item.variant_sku}) - SL yêu cầu (${item.quantity}) vượt quá tồn kho (${item.stock})`);
                    return;
                }
            }
        }

        // IF ALL GOOD, SHOW CONFIRM MODAL
        setItemsToConfirm(validItems);
        setConfirmChecked(false);
        setShowConfirmModal(true);
    };

    const executeSubmit = async () => {
        if (!confirmChecked) {
            alert('Vui lòng đánh dấu xác nhận trước khi gửi.');
            return;
        }

        setSubmitting(true);

        try {
            let finalSupplierId = supplierId;
            if (transferType === 'IMPORT' && isCustomSupplier) {
                if (!customSupplierName.trim()) {
                    setError('Vui lòng nhập tên nhà cung cấp mới');
                    setSubmitting(false);
                    return;
                }
                const newSup = await supplierService.create({ name: customSupplierName.trim(), status: 'active' });
                finalSupplierId = newSup.id;
            }

            let finalExportNote = exportNote;
            if (transferType === 'EXPORT') {
                if (paymentTerms > 0) {
                    finalExportNote = exportNote ? `[ĐƠN HÀNG CÔNG NỢ] ${exportNote}` : `[ĐƠN HÀNG CÔNG NỢ]`;
                } else if (paymentMethod) {
                    const pmText = paymentMethod === 'cod' ? 'Thanh toán COD' : 'Thanh toán Online';
                    finalExportNote = exportNote ? `[${pmText}] ${exportNote}` : `[${pmText}]`;
                }
            }

            const payload = {
                type: transferType,
                source_warehouse_id: 1,
                destination_warehouse_id: 1,
                transfer_date: receiptDate,
                reason: transferType === 'EXPORT' ? (finalExportNote ? `${reason} - ${finalExportNote}` : reason) : reason,
                order_id: transferType === 'EXPORT' ? orderId : undefined,
                supplier_id: transferType === 'IMPORT' ? finalSupplierId : undefined,
                delivery_person: deliveryPerson || undefined,
                storekeeper: storekeeperName || undefined,
                receiver_name: transferType === 'EXPORT' ? receiverName || undefined : undefined,
                receiver_department: transferType === 'EXPORT' ? receiverDepartment || undefined : undefined,
                receiver_address: transferType === 'EXPORT' ? receiverAddress || undefined : undefined,
                receiver_phone: transferType === 'EXPORT' ? receiverPhone || undefined : undefined,
                user_id: transferType === 'EXPORT' ? selectedUserId : undefined,
                receiver_latitude: transferType === 'EXPORT' ? receiverLat : undefined,
                receiver_longitude: transferType === 'EXPORT' ? receiverLng : undefined,
                subtotal: calculations.grandTotal,
                vat_percent: vatPercent,
                vat_amount: calculations.grandTotal * vatPercent,
                shipping_fee: shippingFee,
                payment_terms: (transferType === 'EXPORT' || transferType === 'IMPORT') ? paymentTerms : 0,
                items: itemsToConfirm.map(item => ({
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
            setShowConfirmModal(false);
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
        updated[index].variants = [];
        setFormItems(updated);
        setActiveSearchIndex(null);
        setSearchTerms({ ...searchTerms, [index]: product.name });

        // Load variants
        loadVariants(index, product.id);
    };

    const updateVariantField = (blockIndex: number, variantId: number, field: 'quantity' | 'unit_price' | 'notes', value: any) => {
        const updated = [...formItems];
        const vUpdate = updated[blockIndex].variants.find(v => v.id === variantId);
        if (vUpdate) {
            (vUpdate as any)[field] = value;
            setFormItems(updated);
        }
    };

    // Check if form can submit
    const canSubmit = formItems.some(block =>
        block.product_id && block.variants.some(v => v.quantity > 0)
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
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { type: 'IMPORT' as const, icon: '📥', label: 'Nhập kho', desc: 'Nhập sản phẩm mới vào kho', gradient: 'from-emerald-500 to-green-600', border: 'border-emerald-200', bg: 'bg-emerald-50' },
                            { type: 'EXPORT' as const, icon: '📤', label: 'Xuất kho', desc: 'Xuất hàng khỏi kho', gradient: 'from-orange-500 to-amber-500', border: 'border-orange-200', bg: 'bg-orange-50' },
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

                {/* General Info */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <label className="block text-sm font-semibold text-indigo-700 mb-4 flex items-center gap-2"><span>📄</span> Thông tin chung</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-2">Số phiếu</label>
                            <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium italic cursor-not-allowed">
                                (Tự động tạo)
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-2">Trạng thái phiếu</label>
                            <div className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-600 font-medium cursor-not-allowed flex items-center">
                                ⏳ Chưa duyệt
                            </div>
                        </div>
                        {transferType === 'IMPORT' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-2">Kho nhập</label>
                                <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed">
                                    🏭 Kho Tổng
                                </div>
                            </div>
                        )}
                        {transferType === 'IMPORT' && (
                            <div>
                                <label className="block text-xs font-medium text-red-600 mb-2 font-semibold">🏢 Nhà cung cấp <span className="text-red-500">*</span></label>
                                <select
                                    value={isCustomSupplier ? 'custom' : (supplierId || '')}
                                    onChange={(e) => handleSupplierChange(e.target.value)}
                                    className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                                        hasSupplier ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                                    }`}
                                >
                                    <option value="">-- Chọn nhà cung cấp (bắt buộc) --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                    <optgroup label="Thương hiệu nổi tiếng">
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
                                        placeholder="Nhập tên nhà cung cấp mới..."
                                        className="mt-2 w-full px-4 py-2 bg-indigo-50 border border-indigo-300 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                        autoFocus
                                    />
                                )}
                                {!hasSupplier && (
                                    <p className="mt-1 text-xs text-red-500 font-medium">⚠️ Bắt buộc chọn NCC trước khi thêm sản phẩm</p>
                                )}
                            </div>
                        )}
                        {transferType === 'EXPORT' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-2">Kho xuất</label>
                                <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed">
                                    🏭 Kho Tổng
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-2">📍 Địa chỉ kho</label>
                            <div className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-700 text-sm cursor-not-allowed">
                                Số 1, Phố Trịnh Văn Bô, Phương Canh, Hà Nội
                            </div>
                        </div>

                        {transferType === 'EXPORT' ? (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-2">Lý do xuất *</label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                >
                                    <option value="">-- Chọn lý do xuất --</option>
                                    <option value="Bán hàng">Bán hàng</option>
                                    <option value="Xuất nội bộ">Xuất nội bộ</option>
                                    <option value="Hủy / hỏng">Hủy / hỏng</option>
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-2">Ghi chú phiếu (Lý do)</label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Nhập ghi chú / lý do..."
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Business Details */}
                <div className="p-6 border-b border-slate-100 bg-white">
                    <label className="block text-sm font-semibold text-indigo-700 mb-4 flex items-center gap-2"><span>🏢</span> Thông tin nghiệp vụ</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Ngày lập phiếu *</label>
                            <input
                                type="date"
                                value={receiptDate}
                                onChange={(e) => setReceiptDate(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                        {/* NCC đã được di chuyển lên phần Thông tin chung */}
                        {(transferType === 'IMPORT' || transferType === 'EXPORT') && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{transferType === 'IMPORT' ? 'Người giao hàng *' : 'Người giao hàng'}</label>
                                <input
                                    type="text"
                                    value={deliveryPerson}
                                    onChange={(e) => setDeliveryPerson(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Tên người giao"
                                />
                            </div>
                        )}
                        {transferType === 'EXPORT' && (
                            <>
                                {paymentTerms > 0 && (
                                    <div className="col-span-2 relative">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                            Khách hàng / Tài khoản <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            value={searchUserQuery}
                                            onChange={(e) => {
                                                setSearchUserQuery(e.target.value);
                                                setShowUserDropdown(true);
                                                if (!e.target.value) {
                                                    setSelectedUserId(undefined);
                                                }
                                            }}
                                            onFocus={() => setShowUserDropdown(true)}
                                            className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${selectedUserId ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}
                                            placeholder="🔍 Nhập Tên hoặc SĐT để tìm KH..." 
                                        />
                                        {showUserDropdown && searchUserQuery && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {users.filter(u => 
                                                    u.full_name.toLowerCase().includes(searchUserQuery.toLowerCase()) || 
                                                    (u.phone && u.phone.includes(searchUserQuery))
                                                ).slice(0, 5).map(u => (
                                                    <div 
                                                        key={u.id}
                                                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                                        onClick={() => {
                                                            setSearchUserQuery(`${u.full_name} - ${u.phone || ''}`);
                                                            setSelectedUserId(u.id);
                                                            setReceiverName(u.full_name);
                                                            setReceiverPhone(u.phone || '');
                                                            setShowUserDropdown(false);
                                                        }}
                                                    >
                                                        <div className="font-medium text-sm text-slate-800">{u.full_name}</div>
                                                        <div className="text-xs text-slate-500">{u.phone || 'Chưa có SĐT'} - {u.email}</div>
                                                    </div>
                                                ))}
                                                <div className="p-2 text-xs text-slate-400 text-center bg-slate-50 rounded-b-lg border-t border-slate-100 cursor-pointer" onClick={() => setShowUserDropdown(false)}>
                                                    Đóng
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Người nhận *</label>
                                    <input
                                        type="text"
                                        value={receiverName}
                                        onChange={(e) => setReceiverName(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="Tên người nhận"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">📞 SĐT người nhận *</label>
                                    <input
                                        type="text"
                                        value={receiverPhone}
                                        onChange={(e) => setReceiverPhone(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="Số điện thoại"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Suspense fallback={<div className="py-3 text-center text-slate-400 text-sm">Đang tải bản đồ...</div>}>
                                        <AddressMapPicker
                                            value={receiverAddress}
                                            onChange={setReceiverAddress}
                                            onCoordinatesChange={(lat, lng) => { setReceiverLat(lat); setReceiverLng(lng); }}
                                            label="🏠 Địa chỉ người nhận"
                                            placeholder="Tìm kiếm địa chỉ giao hàng..."
                                            required
                                            showDistance
                                            warehouseCoords={{ lat: 21.0388, lng: 105.7478 }}
                                            height="280px"
                                        />
                                    </Suspense>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Bộ phận nhận</label>
                                    <input
                                        type="text"
                                        value={receiverDepartment}
                                        onChange={(e) => setReceiverDepartment(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="Bộ phận (không bắt buộc)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Ghi chú xuất kho</label>
                                    <input
                                        type="text"
                                        value={exportNote}
                                        onChange={(e) => setExportNote(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="Ghi chú thêm..."
                                    />
                                </div>
                                {paymentTerms === 0 && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Thanh toán</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        >
                                            <option value="">-- Chọn thanh toán --</option>
                                            <option value="cod">Tiền mặt (COD)</option>
                                            <option value="online">Chuyển khoản (Online)</option>
                                            <option value="credit">Công nợ (Trả sau)</option>
                                        </select>
                                    </div>
                                )}
                            </>
                        )}
                        
                        {(transferType === 'EXPORT' || transferType === 'IMPORT') && (
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-medium text-indigo-600 mb-1 font-semibold">
                                    {transferType === 'IMPORT' ? 'Hình thức thanh toán NCC' : 'Tạo công nợ B2B (Ngày)'}
                                </label>
                                <select
                                    value={paymentTerms}
                                    onChange={(e) => {
                                        const terms = Number(e.target.value);
                                        setPaymentTerms(terms);
                                        if (terms > 0) {
                                            setPaymentMethod(''); // Clear payment method if using debt
                                        }
                                    }}
                                    className="w-full px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                >
                                    <option value={0}>Thanh toán ngay (0 ngày)</option>
                                    <option value={15}>Công nợ 15 ngày</option>
                                    <option value={30}>Công nợ 30 ngày</option>
                                    <option value={45}>Công nợ 45 ngày</option>
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Người lập phiếu</label>
                            <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed">
                                {user?.full_name || ''}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Thủ kho *</label>
                            <input
                                type="text"
                                value={storekeeperName}
                                onChange={(e) => setStorekeeperName(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="Tên thủ kho"
                                readOnly={true}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Người duyệt</label>
                            <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 italic cursor-not-allowed">
                                (Sẽ cập nhật khi duyệt)
                            </div>
                        </div>

                    </div>
                </div>

                {/* Items */}
                <div className={`p-6 border-b border-slate-100 ${transferType === 'IMPORT' && !hasSupplier ? 'opacity-50 pointer-events-none' : ''}`}>
                    {transferType === 'IMPORT' && !hasSupplier && (
                        <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-700 font-medium flex items-center gap-2">
                            <span className="text-2xl">⚠️</span>
                            <span>Vui lòng chọn <strong>Nhà cung cấp</strong> ở phần Thông tin chung trước khi thêm sản phẩm.</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center mb-5">
                        <label className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">📦</span>
                            Danh sách sản phẩm <span className="text-red-500">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={addItem}
                            disabled={transferType === 'IMPORT' && !hasSupplier}
                            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

                                {/* Product Autocomplete */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="relative" ref={(el) => { searchRefs.current[index] = el; }}>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">🔍 Chọn Sản phẩm gốc *</label>
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
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                            placeholder="Tìm theo tên hoặc SKU..."
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
                                                                {transferType === 'EXPORT' ? p.selling_price?.toLocaleString() : p.cost_price?.toLocaleString()} đ
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Matrix Input for Variants */}
                                {item.loadingVariants ? (
                                    <div className="flex justify-center items-center py-8">
                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="ml-3 text-slate-500 font-medium">Đang tải danh sách biến thể...</span>
                                    </div>
                                ) : item.product_id && item.variants.length > 0 ? (
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-4">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-indigo-50/50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                                                        <th className="py-3 px-4 w-1/3">Biến thể</th>
                                                        <th className="py-3 px-4 text-center">Tồn kho / Giá vốn</th>
                                                        <th className="py-3 px-4 text-center w-32">
                                                            {transferType === 'EXPORT' ? 'Đơn giá xuất (đ)' : 'Đơn giá nhập (đ)'}
                                                        </th>
                                                        <th className="py-3 px-4 text-center w-32">SL Nhập/Xuất *</th>
                                                        <th className="py-3 px-4 text-right">Thành tiền</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {item.variants.map((v) => {
                                                        const isSelected = v.quantity > 0;
                                                        const rowTotal = v.quantity * v.unit_price;
                                                        return (
                                                            <tr key={v.id} className={`border-b border-slate-100 transition-colors ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                                                                <td className="py-2 px-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
                                                                        <div>
                                                                            <p className={`text-sm font-medium ${isSelected ? 'text-indigo-800' : 'text-slate-700'}`}>
                                                                                {v.label}
                                                                            </p>
                                                                            <p className="text-xs text-slate-400 font-mono mt-0.5">{v.sku}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-2 px-4 text-center">
                                                                    <div className="text-xs font-semibold text-blue-600">{v.stock.toLocaleString()} SP</div>
                                                                    <div className="text-[10px] text-slate-400">{v.average_cost?.toLocaleString()} đ</div>
                                                                </td>
                                                                <td className="py-2 px-4">
                                                                    <input 
                                                                        type="text"
                                                                        value={v.unit_price ? Number(v.unit_price).toLocaleString('vi-VN') : ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                                            updateVariantField(index, v.id, 'unit_price', val ? Number(val) : 0);
                                                                        }}
                                                                        className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center font-mono"
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-4">
                                                                    <input 
                                                                        type="text"
                                                                        value={v.quantity ? Number(v.quantity).toLocaleString('vi-VN') : ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                                            updateVariantField(index, v.id, 'quantity', val ? Number(val) : 0);
                                                                        }}
                                                                        placeholder="0"
                                                                        className={`w-full px-2 py-1.5 text-sm bg-white border rounded text-center font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                                                                            isSelected ? 'border-indigo-300 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-700'
                                                                        }`}
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-4 text-right">
                                                                    <span className={`text-sm font-semibold ${rowTotal > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                        {rowTotal > 0 ? rowTotal.toLocaleString('vi-VN') : '-'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-sm text-slate-600">
                                            <span>Mẹo: Bạn có thể bỏ trống Số lượng đối với những biến thể không muốn thêm vào phiếu.</span>
                                            <div className="flex gap-4">
                                                <span>Tổng SP chọn: <strong className="text-indigo-600">{item.variants.reduce((s, v) => s + (v.quantity > 0 ? 1 : 0), 0)}/{item.variants.length}</strong></span>
                                                <span>Tổng Tiền hàng: <strong className="text-emerald-600">{item.variants.reduce((s, v) => s + (v.quantity * v.unit_price), 0).toLocaleString()} đ</strong></span>
                                            </div>
                                        </div>
                                    </div>
                                ) : item.product_id ? (
                                    <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                        <p className="text-slate-500 text-sm">Sản phẩm này không có biến thể nào.</p>
                                    </div>
                                ) : (
                                    <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                        <p className="text-slate-400 text-sm">Vui lòng chọn một sản phẩm để hiển thị danh sách biến thể tương ứng.</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary & Actions */}
                <div className="p-6 bg-gradient-to-r from-slate-50 to-indigo-50">
                    <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-1 self-end">
                            <p className="text-sm text-slate-600">Số sản phẩm: <strong className="text-slate-800">{formItems.length}</strong></p>
                            <p className="text-sm text-slate-600">Tổng SL: <strong className="text-slate-800">{calculations.totalQty}</strong></p>
                        </div>
                        <div className="space-y-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-center text-slate-600">
                                <span>Tổng tiền hàng:</span>
                                <span className="font-semibold">{calculations.grandTotal.toLocaleString('vi-VN')} đ</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 flex items-center gap-2">
                                    VAT (%)
                                    <select
                                        value={vatPercent}
                                        onChange={(e) => setVatPercent(Number(e.target.value))}
                                        className="w-20 px-2 py-1 text-sm border-b-2 border-indigo-200 focus:border-indigo-500 bg-transparent outline-none"
                                    >
                                        <option value={0}>0%</option>
                                        <option value={0.05}>5%</option>
                                        <option value={0.08}>8%</option>
                                        <option value={0.10}>10%</option>
                                    </select>
                                </span>
                                <span className="font-semibold text-slate-700">
                                    {(calculations.grandTotal * vatPercent).toLocaleString('vi-VN')} đ
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">Phí vận chuyển:</span>
                                <div className="relative w-32">
                                    <input
                                        type="text"
                                        value={shippingFee ? shippingFee.toLocaleString('vi-VN') : ''}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setShippingFee(val ? Number(val) : 0);
                                        }}
                                        className="w-full text-right px-2 py-1 text-sm border-b-2 border-indigo-200 focus:border-indigo-500 bg-transparent outline-none pr-6 font-semibold"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 text-xs">đ</span>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
                                <span className="text-slate-800 font-bold">TỔNG THANH TOÁN:</span>
                                <span className="text-3xl font-bold text-green-600">
                                    {(calculations.grandTotal + (calculations.grandTotal * vatPercent) + shippingFee).toLocaleString('vi-VN')} đ
                                </span>
                            </div>
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

            {/* ==================== APPROVE VERIFICATION MODAL ==================== */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 m-4 border border-blue-100 shadow-2xl">
                        <div className="flex justify-between items-start mb-4 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-emerald-600 font-bold">✅ Xác nhận tạo phiếu</h2>
                                <p className="text-slate-600 mt-1">
                                    {transferType === 'IMPORT' ? 'Tạo phiếu Nhập Kho' : transferType === 'EXPORT' ? 'Tạo phiếu Xuất Kho' : 'Tạo phiếu Chuyển Kho'}
                                </p>
                            </div>
                            <button onClick={() => setShowConfirmModal(false)} className="text-slate-600 hover:text-blue-900 text-2xl">×</button>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 shrink-0">
                            <h3 className="font-medium text-amber-700 mb-2">
                                {transferType === 'IMPORT' 
                                  ? '⚠️ Yêu cầu đánh giá thực tế hàng hoá nhập kho' 
                                  : '⚠️ Yêu cầu đánh giá thực tế hàng hoá xuất kho'
                                }
                            </h3>
                            <p className="text-sm text-amber-600/80">
                                {transferType === 'IMPORT'
                                  ? 'Vui lòng kiểm tra thực tế trong kho xem các mặt hàng sau đã được nhập đủ số lượng chưa trước khi gửi phiếu cho Quản lý.'
                                  : 'Vui lòng kiểm tra chắc chắn các mặt hàng sau đã được lấy đủ số lượng xuất ra trước khi gửi phiếu cho Quản lý.'
                                }
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto mb-4 border border-blue-100 rounded-xl">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-slate-700">Mã (SKU)</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-700">Tên SP</th>
                                        <th className="px-4 py-3 text-right font-medium text-slate-700">SL Yêu Cầu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemsToConfirm.map((item, idx) => (
                                        <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                                            <td className="px-4 py-3 font-mono text-slate-600">{item.variant_sku || 'N/A'}</td>
                                            <td className="px-4 py-3 text-blue-900 font-medium">{item.product_name}</td>
                                            <td className="px-4 py-3 text-right text-emerald-600 font-bold text-lg">{item.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="shrink-0 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                    checked={confirmChecked}
                                    onChange={(e) => setConfirmChecked(e.target.checked)}
                                />
                                <span className="text-slate-800 font-medium select-none">
                                    Tôi xác nhận đã kiểm tra và số lượng hàng hoá thực tế hoàn toàn khớp với danh sách trên.
                                </span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowConfirmModal(false)} className="btn btn-secondary">Hủy bỏ</button>
                            <button onClick={executeSubmit} disabled={!confirmChecked || submitting}
                                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:opacity-90 font-medium shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:grayscale">
                                {submitting ? 'Đang gửi...' : 'Xác nhận tạo phiếu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateTransfer;
