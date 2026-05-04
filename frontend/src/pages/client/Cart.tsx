import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartService, CartItem } from '../../services/cartService';
import { uploadService } from '../../services/uploadService';
import { orderService } from '../../services/orderService';
import { creditService, CreditInfo } from '../../services/creditService';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
const AddressMapPicker = lazy(() => import('../../components/AddressMapPicker'));


/**
 * Trang Phiếu yêu cầu tạm - Hiển thị, quản lý hàng hóa và tạo phiếu yêu cầu
 */

interface CartItemWithId extends CartItem {
    api_id?: number;
}

const Cart: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [cart, setCart] = useState<CartItemWithId[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [updating, setUpdating] = useState<Set<string>>(new Set());

    // Checkout state
    const [showCheckout, setShowCheckout] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutForm, setCheckoutForm] = useState({
        shipping_name: '',
        shipping_phone: '',
        shipping_address: '',
        payment_method: 'COD' as 'COD' | 'BANKING' | 'CREDIT',
        notes: '',
    });
    const [shippingLat, setShippingLat] = useState<number | undefined>();
    const [shippingLng, setShippingLng] = useState<number | undefined>();
    const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
    const [creditLoading, setCreditLoading] = useState(false);

    // Load giỏ hàng
    const loadCart = useCallback(async () => {
        try {
            let cartItems: CartItemWithId[] = [];
            if (isAuthenticated) {
                try {
                    const response = await cartService.getCartAPI();
                    cartItems = response.items.map(item => ({
                        ...item,
                        api_id: (item as any).id || undefined,
                    }));
                } catch (apiError) {
                    console.warn('API cart failed, will try localStorage:', apiError);
                }
            }
            if (cartItems.length === 0) {
                const localCart = cartService.getCart();
                cartItems = localCart.map(item => ({ ...item, api_id: undefined }));
            }
            setCart(cartItems);
            const allKeys = new Set(cartItems.map(item =>
                cartService.getItemKey(item.product_id, item.variant_id)
            ));
            setSelectedItems(allKeys);
        } catch (error) {
            console.error('Failed to load cart:', error);
            const localCart = cartService.getCart();
            setCart(localCart);
            const allKeys = new Set(localCart.map(item =>
                cartService.getItemKey(item.product_id, item.variant_id)
            ));
            setSelectedItems(allKeys);
        }
    }, [isAuthenticated]);

    useEffect(() => { loadCart(); }, [loadCart]);
    
   

    const selectedTotal = useMemo(() => {
        return cartService.getSelectedTotal(cart, selectedItems);
    }, [cart, selectedItems]);

    const selectedCount = selectedItems.size;
    const totalCount = cart.length;

    const toggleSelectItem = (productId: number, variantId: number | null) => {
        const key = cartService.getItemKey(productId, variantId);
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key); else newSet.add(key);
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === cart.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(cart.map(item =>
                cartService.getItemKey(item.product_id, item.variant_id)
            )));
        }
    };

    const updateQuantity = async (item: CartItemWithId, newQuantity: number) => {
        if (newQuantity < 1) return;
        if (item.max_stock && newQuantity > item.max_stock) return;
        const key = cartService.getItemKey(item.product_id, item.variant_id);
        setUpdating(prev => new Set(prev).add(key));
        try {
            if (isAuthenticated && item.api_id) {
                const result = await cartService.updateCartItemAPI(item.api_id, newQuantity);
                if (result.success) await loadCart(); else alert(result.message);
            } else {
                const updatedCart = cartService.updateQuantity(item.product_id, item.variant_id, newQuantity);
                setCart(updatedCart);
            }
        } catch (error) {
            console.error('Update quantity error:', error);
        } finally {
            setUpdating(prev => { const n = new Set(prev); n.delete(key); return n; });
        }
    };

    const increaseQuantity = (item: CartItemWithId) => updateQuantity(item, item.quantity + 1);
    const decreaseQuantity = (item: CartItemWithId) => { if (item.quantity > 1) updateQuantity(item, item.quantity - 1); };
    const handleQuantityChange = (item: CartItemWithId, value: string) => {
        const newQty = parseInt(value) || 1;
        const valid = Math.max(1, item.max_stock ? Math.min(newQty, item.max_stock) : newQty);
        updateQuantity(item, valid);
    };

    const removeItem = async (item: CartItemWithId) => {
        if (!window.confirm(`Bạn có chắc muốn xóa "${item.name}" khỏi danh sách?`)) return;
        const key = cartService.getItemKey(item.product_id, item.variant_id);
        setUpdating(prev => new Set(prev).add(key));
        try {
            if (isAuthenticated && item.api_id) {
                const result = await cartService.removeCartItemAPI(item.api_id);
                if (result.success) await loadCart(); else alert(result.message);
            } else {
                const updatedCart = cartService.removeFromCart(item.product_id, item.variant_id);
                setCart(updatedCart);
                setSelectedItems(prev => { const n = new Set(prev); n.delete(key); return n; });
            }
        } catch (error) { console.error('Remove item error:', error); }
        finally { setUpdating(prev => { const n = new Set(prev); n.delete(key); return n; }); }
    };

    const removeSelectedItems = async () => {
        if (selectedItems.size === 0) return;
        if (!window.confirm(`Bạn có chắc muốn xóa ${selectedItems.size} hàng hóa đã chọn?`)) return;
        if (isAuthenticated) {
            for (const key of selectedItems) {
                const item = cart.find(i => cartService.getItemKey(i.product_id, i.variant_id) === key);
                if (item?.api_id) await cartService.removeCartItemAPI(item.api_id);
            }
            await loadCart();
        } else {
            let updatedCart = cart;
            selectedItems.forEach(key => {
                const [productId, variantStr] = key.split('_');
                const variantId = variantStr === 'null' ? null : parseInt(variantStr);
                updatedCart = cartService.removeFromCart(parseInt(productId), variantId);
            });
            setCart(updatedCart);
            setSelectedItems(new Set());
        }
    };

    const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price) + '₫';

    // ==================== CHECKOUT ====================
    const handleCheckout = async () => {
        if (!isAuthenticated) {
            alert('Vui lòng đăng nhập để gửi yêu cầu!');
            navigate('/login');
            return;
        }
        setShowCheckout(true);
        // Load credit info
        setCreditLoading(true);
        try {
            const info = await creditService.getCreditInfo();
            setCreditInfo(info);
        } catch (err) {
            console.warn('Could not load credit info:', err);
            setCreditInfo(null);
        } finally {
            setCreditLoading(false);
        }
    };

    const handlePlaceOrder = async () => {
        const { shipping_name, shipping_phone, shipping_address, payment_method, notes } = checkoutForm;


        if (!shipping_name.trim()) { alert('Vui lòng nhập họ tên người nhận'); return; }
        if (!shipping_phone.trim()) { alert('Vui lòng nhập số điện thoại'); return; }
        if (!shipping_address.trim()) { alert('Vui lòng nhập địa chỉ nhận hàng'); return; }

        setCheckoutLoading(true);

        try {

            const localCart = cartService.getCart();
            if (localCart.length > 0) {
                for (const item of localCart) {
                    if (item.variant_id) {
                        try {
                            await cartService.addToCartAPI(item.product_id, item.variant_id, item.quantity);
                        } catch (syncErr) {
                            console.warn('Failed to sync item:', item.name, syncErr);
                        }
                    }
                }
                cartService.clearCart();
            }


            const order = await orderService.createOrder({
                shipping_name: shipping_name.trim(),
                shipping_phone: shipping_phone.trim(),
                shipping_address: shipping_address.trim(),
                payment_method,
                notes: notes.trim() || undefined,
                shipping_latitude: shippingLat,
                shipping_longitude: shippingLng,
            });

            // Nếu COD → về trang đơn hàng
            if (payment_method === "COD") {
                alert('🎉 Gửi yêu cầu thành công!');
                navigate('/orders');
                return;
            }

            // Nếu CREDIT → về trang đơn hàng + thông báo
            if (payment_method === "CREDIT") {
                alert('🎉 Gửi yêu cầu thành công! Đơn hàng sẽ được xử lý theo hình thức công nợ.');
                navigate('/orders');
                return;
            }

            // Nếu BANKING → tạo payment link PayOS
            if (payment_method === "BANKING") {

                const res = await axios.post("/api/create-payment", {
                    orderId: order.id,
                    amount: order.total_amount
                });

                const { checkoutUrl } = res.data;

                // redirect sang trang QR PayOS
                //su ly ben client 
                window.location.href = checkoutUrl;
            }

        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Gửi yêu cầu thất bại!';
            alert(msg);
        } finally {
            setCheckoutLoading(false);
        }


    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ========== HEADER ========== */}
            <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <nav className="mb-4">
                        <ol className="flex items-center gap-2 text-sm text-primary-100">
                            <li className="flex items-center gap-1"><span>🏠</span><Link to="/" className="hover:text-white transition-colors">Trang chủ</Link></li>
                            <li className="text-primary-300">›</li>
                            <li className="flex items-center gap-1"><span>📦</span><Link to="/products" className="hover:text-white transition-colors">Hàng hóa</Link></li>
                            <li className="text-primary-300">›</li>
                            <li className="text-white font-medium">Phiếu yêu cầu tạm</li>
                        </ol>
                    </nav>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3"><span>📋</span> Phiếu yêu cầu tạm</h1>
                            <p className="text-primary-100 mt-1">
                                {totalCount > 0 ? `${totalCount} hàng hóa trong danh sách` : 'Chưa có hàng hóa'}
                                {!isAuthenticated && <span className="ml-2 text-yellow-200">(Chưa đăng nhập)</span>}
                            </p>
                        </div>
                        {cart.length > 0 && (
                            <Link to="/products" className="btn bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm">← Tiếp tục chọn hàng</Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ========== MAIN CONTENT ========== */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {cart.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-8xl mb-6">📋</div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Danh sách yêu cầu đang trống</h2>
                        <p className="text-slate-500 mb-6">Hãy thêm hàng hóa vào danh sách để khởi tạo yêu cầu xuất/nhập!</p>
                        <Link to="/products" className="btn btn-primary px-8 py-3 text-lg">📦 Xem danh sách hàng hóa</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* ========== DANH SÁCH SẢN PHẨM ========== */}
                        <div className="lg:col-span-2">
                            <div className="card mb-4 flex items-center justify-between">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={selectedItems.size === cart.length && cart.length > 0} onChange={toggleSelectAll}
                                        className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                                    <span className="font-medium text-slate-700">Chọn tất cả ({cart.length} hàng hóa)</span>
                                </label>
                                {selectedItems.size > 0 && (
                                    <button onClick={removeSelectedItems} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1">
                                        🗑️ Xóa đã chọn ({selectedItems.size})
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {cart.map(item => {
                                    const itemKey = cartService.getItemKey(item.product_id, item.variant_id);
                                    const isSelected = selectedItems.has(itemKey);
                                    const isUpdating = updating.has(itemKey);
                                    const lineTotal = item.price * item.quantity;
                                    return (
                                        <div key={itemKey} className={`card border-2 transition-all ${isSelected ? 'border-primary-300 bg-primary-50/30' : 'border-transparent hover:border-slate-200'} ${isUpdating ? 'opacity-60' : ''}`}>
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 pt-1">
                                                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelectItem(item.product_id, item.variant_id)}
                                                        className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer" />
                                                </div>
                                                <Link to={`/products/${item.product_id}`} className="flex-shrink-0 w-24 h-24 bg-slate-100 rounded-lg overflow-hidden">
                                                    {item.image_url ? (
                                                        <img src={uploadService.getImageUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                                                    )}
                                                </Link>
                                                <div className="flex-1 min-w-0">
                                                    <Link to={`/products/${item.product_id}`} className="font-semibold text-slate-800 hover:text-primary-600 line-clamp-2">{item.name}</Link>
                                                    {item.variant_label && <p className="text-sm text-slate-500 mt-1">Phân loại: <span className="font-medium">{item.variant_label}</span></p>}
                                                    {item.sku && <p className="text-xs text-slate-400 mt-1 font-mono">SKU: {item.sku}</p>}
                                                    <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
                                                        <div className="text-primary-600 font-bold text-lg">{formatPrice(item.price)}</div>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => decreaseQuantity(item)} disabled={item.quantity <= 1 || isUpdating}
                                                                className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center">−</button>
                                                            <input type="number" min="1" max={item.max_stock || 999} value={item.quantity}
                                                                onChange={(e) => handleQuantityChange(item, e.target.value)} disabled={isUpdating}
                                                                onFocus={(e) => e.target.select()}
                                                                className="w-14 h-8 text-center border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100" />
                                                            <button onClick={() => increaseQuantity(item)} disabled={(item.max_stock !== null && item.quantity >= item.max_stock) || isUpdating}
                                                                className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center">+</button>
                                                            {isUpdating && <span className="animate-spin text-primary-500">⏳</span>}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm text-slate-500">Thành tiền</div>
                                                            <div className="font-bold text-slate-800">{formatPrice(lineTotal)}</div>
                                                        </div>
                                                        <button onClick={() => removeItem(item)} disabled={isUpdating}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50" title="Xóa hàng hóa">🗑️</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ========== TỔNG KẾT + CHECKOUT ========== */}
                        <div className="lg:col-span-1">
                            <div className="card sticky top-4 bg-gradient-to-br from-white to-slate-50 border border-slate-200">
                                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">📋 Tổng kết yêu cầu</h2>

                                <div className="space-y-3 pb-4 border-b border-slate-200">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Đã chọn:</span>
                                        <span className="font-medium text-slate-800">{selectedCount} / {totalCount} hàng hóa</span>
                                    </div>
                                    {selectedCount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Tổng số lượng:</span>
                                            <span className="font-medium text-slate-800">
                                                {cart.filter(item => selectedItems.has(cartService.getItemKey(item.product_id, item.variant_id)))
                                                    .reduce((sum, item) => sum + item.quantity, 0)} đơn vị
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="py-4 border-b border-slate-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Tổng giá trị:</span>
                                        <span className="text-2xl font-bold text-primary-600">{formatPrice(selectedTotal)}</span>
                                    </div>
                                    {selectedCount === 0 && (
                                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">⚠️ Vui lòng chọn ít nhất 1 hàng hóa</p>
                                    )}
                                </div>

                                {/* Checkout Form */}
                                {showCheckout ? (
                                    <div className="pt-4 space-y-3">
                                        <h3 className="font-semibold text-slate-700">📍 Thông tin yêu cầu</h3>
                                        <input type="text" placeholder="Người yêu cầu / Tên người nhận *" value={checkoutForm.shipping_name}
                                            onChange={e => setCheckoutForm(prev => ({ ...prev, shipping_name: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" />
                                        <input type="tel" placeholder="Số điện thoại *" value={checkoutForm.shipping_phone}
                                            onChange={e => setCheckoutForm(prev => ({ ...prev, shipping_phone: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" />
                                        <Suspense fallback={<div className="py-2 text-center text-slate-400 text-sm">Đang tải bản đồ...</div>}>
                                            <AddressMapPicker
                                                value={checkoutForm.shipping_address}
                                                onChange={(addr) => setCheckoutForm(prev => ({ ...prev, shipping_address: addr }))}
                                                onCoordinatesChange={(lat, lng) => { setShippingLat(lat); setShippingLng(lng); }}
                                                label="📍 Địa chỉ nhận hàng"
                                                placeholder="Tìm kiếm địa chỉ..."
                                                required
                                                height="250px"
                                            />
                                        </Suspense>

                                        <div>
                                            <label className="text-sm font-medium text-slate-600">Phương thức thanh toán</label>
                                            <div className="flex gap-3 mt-1 flex-col">
                                                <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${checkoutForm.payment_method === 'COD' ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}>
                                                    <input type="radio" name="payment" value="COD" checked={checkoutForm.payment_method === 'COD'}
                                                        onChange={() => setCheckoutForm(prev => ({ ...prev, payment_method: 'COD' }))} className="text-primary-600" />
                                                    <span className="text-sm">💵 Thanh toán khi nhận hàng (COD)</span>
                                                </label>
                                                <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${checkoutForm.payment_method === 'BANKING' ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}>
                                                    <input type="radio" name="payment" value="BANKING" checked={checkoutForm.payment_method === 'BANKING'}
                                                        onChange={() => setCheckoutForm(prev => ({ ...prev, payment_method: 'BANKING' }))} className="text-primary-600" />
                                                    <span className="text-sm">🏦 Chuyển khoản / Quét mã QR</span>
                                                </label>
                                                {/* CREDIT - Công nợ (Trả sau) */}
                                                {creditLoading ? (
                                                    <div className="p-3 border border-slate-200 rounded-lg text-sm text-slate-400 flex items-center gap-2">
                                                        <span className="animate-spin">⏳</span> Đang kiểm tra tín dụng...
                                                    </div>
                                                ) : creditInfo?.is_registered ? (
                                                    <label className={`flex items-start gap-2 p-3 border rounded-lg transition-all ${
                                                        creditInfo.is_eligible
                                                            ? (checkoutForm.payment_method === 'CREDIT' ? 'border-emerald-500 bg-emerald-50 cursor-pointer' : 'border-slate-200 cursor-pointer hover:border-emerald-300')
                                                            : 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
                                                    }`}>
                                                        <input type="radio" name="payment" value="CREDIT"
                                                            checked={checkoutForm.payment_method === 'CREDIT'}
                                                            disabled={!creditInfo.is_eligible}
                                                            onChange={() => setCheckoutForm(prev => ({ ...prev, payment_method: 'CREDIT' }))}
                                                            className="text-emerald-600 mt-0.5" />
                                                        <div className="flex-1">
                                                            <span className="text-sm font-medium">🏦 Công nợ (Trả sau)</span>
                                                            {creditInfo.is_eligible ? (
                                                                <div className="mt-1 space-y-0.5">
                                                                    <p className="text-xs text-emerald-600">✅ Hạn mức: {creditService.formatMoney(creditInfo.credit_limit)} · Hạn {creditInfo.credit_payment_terms} ngày</p>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-red-500 mt-0.5">❌ {creditInfo.reason_not_eligible || 'Không đủ điều kiện'}</p>
                                                            )}
                                                        </div>
                                                    </label>
                                                ) : (
                                                    <div className="p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <span className="text-sm text-slate-500">🏦 Công nợ (Trả sau)</span>
                                                                <p className="text-xs text-slate-400 mt-0.5">Đăng ký để mua hàng trả sau</p>
                                                            </div>
                                                            <button type="button" onClick={() => navigate('/my-credit')}
                                                                className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
                                                                Đăng ký
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <textarea placeholder="Ghi chú thêm (tùy chọn)" rows={2} value={checkoutForm.notes}
                                            onChange={e => setCheckoutForm(prev => ({ ...prev, notes: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" />

                                        <button onClick={handlePlaceOrder} disabled={checkoutLoading}
                                            className="w-full btn bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 py-3 text-lg font-semibold flex items-center justify-center gap-2 shadow-lg">
                                            {checkoutLoading ? '⏳ Đang xử lý...' : '✅ Gửi yêu cầu'}
                                        </button>
                                        <button onClick={() => setShowCheckout(false)} className="w-full btn btn-secondary py-2 text-sm">← Quay lại danh sách</button>
                                    </div>
                                ) : (
                                    <div className="pt-4 space-y-3">
                                        <button disabled={selectedCount === 0} onClick={handleCheckout}
                                            className="w-full btn bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 text-lg font-semibold flex items-center justify-center gap-2 shadow-lg">
                                            📤 Tạo yêu cầu ngay
                                        </button>
                                        <Link to="/products" className="w-full btn btn-secondary py-3 flex items-center justify-center gap-2">← Tiếp tục chọn hàng</Link>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <p className="text-xs text-slate-500 flex items-start gap-2">
                                        <span>ℹ️</span>
                                        <span>{isAuthenticated ? 'Phiếu yêu cầu được bảo mật.' : 'Vui lòng đăng nhập để lưu trữ yêu cầu.'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cart
