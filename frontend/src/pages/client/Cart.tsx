import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { cartService, CartItem } from '../../services/cartService';
import { uploadService } from '../../services/uploadService';
import { useAuth } from '../../context/AuthContext';

/**
 * Trang Giỏ hàng - Hiển thị và quản lý sản phẩm trong giỏ
 * 
 * - User đăng nhập: Lấy từ backend API
 * - User chưa đăng nhập: Lấy từ localStorage
 */

// Extended cart item with API id (for backend operations)
interface CartItemWithId extends CartItem {
    api_id?: number; // ID from backend cart_items table
}

const Cart: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [cart, setCart] = useState<CartItemWithId[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<Set<string>>(new Set()); // Track items being updated

    // Load giỏ hàng
    const loadCart = useCallback(async () => {
        setLoading(true);
        try {
            let cartItems: CartItemWithId[] = [];

            if (isAuthenticated) {
                // User đăng nhập - thử lấy từ API trước
                try {
                    const response = await cartService.getCartAPI();
                    // Convert API items to CartItem format with api_id
                    cartItems = response.items.map(item => ({
                        ...item,
                        api_id: (item as any).id || undefined,
                    }));
                } catch (apiError) {
                    console.warn('API cart failed, will try localStorage:', apiError);
                }
            }

            // Fallback: Nếu chưa đăng nhập HOẶC API trả về rỗng, lấy từ localStorage
            if (cartItems.length === 0) {
                const localCart = cartService.getCart();
                cartItems = localCart.map(item => ({
                    ...item,
                    api_id: undefined,
                }));
            }

            setCart(cartItems);

            // Mặc định chọn tất cả
            const allKeys = new Set(cartItems.map(item =>
                cartService.getItemKey(item.product_id, item.variant_id)
            ));
            setSelectedItems(allKeys);
        } catch (error) {
            console.error('Failed to load cart:', error);
            // Fallback cuối cùng: lấy từ localStorage
            const localCart = cartService.getCart();
            setCart(localCart);
            const allKeys = new Set(localCart.map(item =>
                cartService.getItemKey(item.product_id, item.variant_id)
            ));
            setSelectedItems(allKeys);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        loadCart();
    }, [loadCart]);

    // Tính tổng tiền các sản phẩm được chọn
    const selectedTotal = useMemo(() => {
        return cartService.getSelectedTotal(cart, selectedItems);
    }, [cart, selectedItems]);

    // Đếm số sản phẩm được chọn
    const selectedCount = selectedItems.size;
    const totalCount = cart.length;

    // Toggle chọn 1 sản phẩm
    const toggleSelectItem = (productId: number, variantId: number | null) => {
        const key = cartService.getItemKey(productId, variantId);
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    // Chọn/Bỏ chọn tất cả
    const toggleSelectAll = () => {
        if (selectedItems.size === cart.length) {
            setSelectedItems(new Set());
        } else {
            const allKeys = new Set(cart.map(item =>
                cartService.getItemKey(item.product_id, item.variant_id)
            ));
            setSelectedItems(allKeys);
        }
    };

    // Update quantity với debounce-like behavior
    const updateQuantity = async (item: CartItemWithId, newQuantity: number) => {
        if (newQuantity < 1) return;
        if (item.max_stock && newQuantity > item.max_stock) return;

        const key = cartService.getItemKey(item.product_id, item.variant_id);
        setUpdating(prev => new Set(prev).add(key));

        try {
            if (isAuthenticated && item.api_id) {
                // API call
                const result = await cartService.updateCartItemAPI(item.api_id, newQuantity);
                if (result.success) {
                    // Reload cart để có data mới nhất
                    await loadCart();
                } else {
                    alert(result.message);
                }
            } else {
                // localStorage
                const updatedCart = cartService.updateQuantity(item.product_id, item.variant_id, newQuantity);
                setCart(updatedCart);
            }
        } catch (error) {
            console.error('Update quantity error:', error);
        } finally {
            setUpdating(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        }
    };

    // Tăng số lượng
    const increaseQuantity = (item: CartItemWithId) => {
        updateQuantity(item, item.quantity + 1);
    };

    // Giảm số lượng
    const decreaseQuantity = (item: CartItemWithId) => {
        if (item.quantity <= 1) return;
        updateQuantity(item, item.quantity - 1);
    };

    // Cập nhật số lượng từ input
    const handleQuantityChange = (item: CartItemWithId, value: string) => {
        const newQuantity = parseInt(value) || 1;
        const validQuantity = Math.max(1, item.max_stock ? Math.min(newQuantity, item.max_stock) : newQuantity);
        updateQuantity(item, validQuantity);
    };

    // Xóa sản phẩm
    const removeItem = async (item: CartItemWithId) => {
        if (!window.confirm(`Bạn có chắc muốn xóa "${item.name}" khỏi giỏ hàng?`)) return;

        const key = cartService.getItemKey(item.product_id, item.variant_id);
        setUpdating(prev => new Set(prev).add(key));

        try {
            if (isAuthenticated && item.api_id) {
                const result = await cartService.removeCartItemAPI(item.api_id);
                if (result.success) {
                    await loadCart();
                } else {
                    alert(result.message);
                }
            } else {
                const updatedCart = cartService.removeFromCart(item.product_id, item.variant_id);
                setCart(updatedCart);
                // Bỏ khỏi danh sách đã chọn
                setSelectedItems(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(key);
                    return newSet;
                });
            }
        } catch (error) {
            console.error('Remove item error:', error);
        } finally {
            setUpdating(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        }
    };

    // Xóa các sản phẩm đã chọn
    const removeSelectedItems = async () => {
        if (selectedItems.size === 0) return;
        if (!window.confirm(`Bạn có chắc muốn xóa ${selectedItems.size} sản phẩm đã chọn?`)) return;

        if (isAuthenticated) {
            // Remove items via API - one by one
            for (const key of selectedItems) {
                const item = cart.find(i => cartService.getItemKey(i.product_id, i.variant_id) === key);
                if (item?.api_id) {
                    await cartService.removeCartItemAPI(item.api_id);
                }
            }
            await loadCart();
        } else {
            // localStorage
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

    // Format giá tiền VNĐ
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN').format(price) + '₫';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Đang tải giỏ hàng...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ========== HEADER ========== */}
            <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Breadcrumb */}
                    <nav className="mb-4">
                        <ol className="flex items-center gap-2 text-sm text-primary-100">
                            <li className="flex items-center gap-1">
                                <span>🏠</span>
                                <Link to="/" className="hover:text-white transition-colors">Trang chủ</Link>
                            </li>
                            <li className="text-primary-300">›</li>
                            <li className="flex items-center gap-1">
                                <span>📦</span>
                                <Link to="/products" className="hover:text-white transition-colors">Sản phẩm</Link>
                            </li>
                            <li className="text-primary-300">›</li>
                            <li className="text-white font-medium">Giỏ hàng</li>
                        </ol>
                    </nav>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                                <span>🛒</span> Giỏ hàng của bạn
                            </h1>
                            <p className="text-primary-100 mt-1">
                                {totalCount > 0 ? `${totalCount} sản phẩm trong giỏ` : 'Giỏ hàng trống'}
                                {!isAuthenticated && <span className="ml-2 text-yellow-200">(Chưa đăng nhập)</span>}
                            </p>
                        </div>
                        {cart.length > 0 && (
                            <Link to="/products" className="btn bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm">
                                ← Tiếp tục mua sắm
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ========== MAIN CONTENT ========== */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {cart.length === 0 ? (
                    /* ========== GIỎ HÀNG TRỐNG ========== */
                    <div className="text-center py-16">
                        <div className="text-8xl mb-6">🛒</div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Giỏ hàng của bạn đang trống</h2>
                        <p className="text-slate-500 mb-6">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm!</p>
                        <Link to="/products" className="btn btn-primary px-8 py-3 text-lg">
                            🛍️ Khám phá sản phẩm
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* ========== DANH SÁCH SẢN PHẨM ========== */}
                        <div className="lg:col-span-2">
                            {/* Header với checkbox chọn tất cả */}
                            <div className="card mb-4 flex items-center justify-between">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.size === cart.length && cart.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="font-medium text-slate-700">
                                        Chọn tất cả ({cart.length} sản phẩm)
                                    </span>
                                </label>
                                {selectedItems.size > 0 && (
                                    <button
                                        onClick={removeSelectedItems}
                                        className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                                    >
                                        🗑️ Xóa đã chọn ({selectedItems.size})
                                    </button>
                                )}
                            </div>

                            {/* Danh sách sản phẩm */}
                            <div className="space-y-4">
                                {cart.map(item => {
                                    const itemKey = cartService.getItemKey(item.product_id, item.variant_id);
                                    const isSelected = selectedItems.has(itemKey);
                                    const isUpdating = updating.has(itemKey);
                                    const lineTotal = item.price * item.quantity;

                                    return (
                                        <div
                                            key={itemKey}
                                            className={`card border-2 transition-all ${isSelected
                                                ? 'border-primary-300 bg-primary-50/30'
                                                : 'border-transparent hover:border-slate-200'
                                                } ${isUpdating ? 'opacity-60' : ''}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Checkbox */}
                                                <div className="flex-shrink-0 pt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectItem(item.product_id, item.variant_id)}
                                                        className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                    />
                                                </div>

                                                {/* Ảnh sản phẩm */}
                                                <Link
                                                    to={`/products/${item.product_id}`}
                                                    className="flex-shrink-0 w-24 h-24 bg-slate-100 rounded-lg overflow-hidden"
                                                >
                                                    {item.image_url ? (
                                                        <img
                                                            src={uploadService.getImageUrl(item.image_url)}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                                                    )}
                                                </Link>

                                                {/* Thông tin sản phẩm */}
                                                <div className="flex-1 min-w-0">
                                                    <Link
                                                        to={`/products/${item.product_id}`}
                                                        className="font-semibold text-slate-800 hover:text-primary-600 line-clamp-2"
                                                    >
                                                        {item.name}
                                                    </Link>

                                                    {item.variant_label && (
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            Phân loại: <span className="font-medium">{item.variant_label}</span>
                                                        </p>
                                                    )}

                                                    {item.sku && (
                                                        <p className="text-xs text-slate-400 mt-1 font-mono">SKU: {item.sku}</p>
                                                    )}

                                                    <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
                                                        {/* Giá */}
                                                        <div className="text-primary-600 font-bold text-lg">
                                                            {formatPrice(item.price)}
                                                        </div>

                                                        {/* Điều chỉnh số lượng */}
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => decreaseQuantity(item)}
                                                                disabled={item.quantity <= 1 || isUpdating}
                                                                className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                                            >
                                                                −
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={item.max_stock || 999}
                                                                value={item.quantity}
                                                                onChange={(e) => handleQuantityChange(item, e.target.value)}
                                                                disabled={isUpdating}
                                                                className="w-14 h-8 text-center border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100"
                                                            />
                                                            <button
                                                                onClick={() => increaseQuantity(item)}
                                                                disabled={(item.max_stock !== null && item.quantity >= item.max_stock) || isUpdating}
                                                                className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                                            >
                                                                +
                                                            </button>
                                                            {isUpdating && (
                                                                <span className="animate-spin text-primary-500">⏳</span>
                                                            )}
                                                        </div>

                                                        {/* Tổng tiền dòng */}
                                                        <div className="text-right">
                                                            <div className="text-sm text-slate-500">Thành tiền</div>
                                                            <div className="font-bold text-slate-800">{formatPrice(lineTotal)}</div>
                                                        </div>

                                                        {/* Nút xóa */}
                                                        <button
                                                            onClick={() => removeItem(item)}
                                                            disabled={isUpdating}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                                                            title="Xóa sản phẩm"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ========== TỔNG KẾT ĐƠN HÀNG ========== */}
                        <div className="lg:col-span-1">
                            <div className="card sticky top-4 bg-gradient-to-br from-white to-slate-50 border border-slate-200">
                                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    📋 Tổng kết đơn hàng
                                </h2>

                                {/* Thông tin chọn */}
                                <div className="space-y-3 pb-4 border-b border-slate-200">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Đã chọn:</span>
                                        <span className="font-medium text-slate-800">
                                            {selectedCount} / {totalCount} sản phẩm
                                        </span>
                                    </div>

                                    {selectedCount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Tổng số lượng:</span>
                                            <span className="font-medium text-slate-800">
                                                {cart
                                                    .filter(item => selectedItems.has(cartService.getItemKey(item.product_id, item.variant_id)))
                                                    .reduce((sum, item) => sum + item.quantity, 0)
                                                } sản phẩm
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Tổng tiền */}
                                <div className="py-4 border-b border-slate-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Tạm tính:</span>
                                        <span className="text-2xl font-bold text-primary-600">
                                            {formatPrice(selectedTotal)}
                                        </span>
                                    </div>
                                    {selectedCount === 0 && (
                                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                            ⚠️ Vui lòng chọn ít nhất 1 sản phẩm
                                        </p>
                                    )}
                                </div>

                                {/* Nút thanh toán */}
                                <div className="pt-4 space-y-3">
                                    <button
                                        disabled={selectedCount === 0}
                                        className="w-full btn bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 text-lg font-semibold flex items-center justify-center gap-2 shadow-lg"
                                        onClick={() => alert('Chức năng thanh toán sẽ được triển khai sau!')}
                                    >
                                        💳 Tiến hành thanh toán
                                    </button>

                                    <Link
                                        to="/products"
                                        className="w-full btn btn-secondary py-3 flex items-center justify-center gap-2"
                                    >
                                        ← Tiếp tục mua sắm
                                    </Link>
                                </div>

                                {/* Ghi chú */}
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <p className="text-xs text-slate-500 flex items-start gap-2">
                                        <span>ℹ️</span>
                                        <span>
                                            {isAuthenticated
                                                ? 'Giỏ hàng được lưu trên server.'
                                                : 'Đăng nhập để lưu giỏ hàng và đặt hàng.'}
                                        </span>
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

export default Cart;
