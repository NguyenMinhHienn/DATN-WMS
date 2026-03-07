/**
 * Cart Service - Quản lý giỏ hàng
 * 
 * - User đăng nhập: Sử dụng Backend API
 * - User chưa đăng nhập: Sử dụng localStorage (fallback)
 */

import api from './api';

const CART_STORAGE_KEY = 'wms_cart';

// ==================== Interfaces ====================

export interface CartItem {
    id?: number;
    product_id: number;
    variant_id: number | null;       // null nếu sản phẩm không có biến thể
    name: string;
    variant_label: string | null;    // VD: "Đỏ / 128GB" hoặc null
    price: number;
    quantity: number;
    image_url: string | null;
    sku: string | null;
    max_stock: number | null;        // Giới hạn tồn kho (optional, để validate số lượng)
}

export interface AddToCartParams {
    product_id: number;
    variant_id?: number | null;
    name: string;
    variant_label?: string | null;
    price: number;
    quantity: number;
    image_url?: string | null;
    sku?: string | null;
    max_stock?: number | null;
}

// Backend API response interfaces
export interface CartItemFromAPI {
    id: number;
    cart_id: number;
    product_id: number;
    product_variant_id: number;
    quantity: number;
    unit_price: number;
    product_name: string;
    product_sku: string;
    product_image_url: string | null;
    variant_sku: string | null;
    variant_color: string | null;
    variant_image_url: string | null;
    variant_stock: number;
    line_total: number;
}

export interface AddToCartAPIResult {
    success: boolean;
    message: string;
    data?: {
        cartId: number;
        itemId: number;
        itemCount: number;
        isNewItem: boolean;
    };
}

// ==================== Helper Functions ====================

/**
 * Tạo unique key cho item trong giỏ (dựa trên product_id + variant_id)
 */
const getItemKey = (productId: number, variantId: number | null): string => {
    return variantId ? `${productId}_${variantId}` : `${productId}_null`;
};

/**
 * Chuyển đổi từ API item sang CartItem format
 */
const convertAPIItemToCartItem = (apiItem: CartItemFromAPI): CartItem => ({
    id: apiItem.id, // Fix: Added id for update and remove operations
    product_id: apiItem.product_id,
    variant_id: apiItem.product_variant_id,
    name: apiItem.product_name,
    variant_label: apiItem.variant_color || null,
    price: apiItem.unit_price,
    quantity: apiItem.quantity,
    image_url: apiItem.variant_image_url || apiItem.product_image_url,
    sku: apiItem.variant_sku || apiItem.product_sku,
    max_stock: apiItem.variant_stock,
});

// ==================== Cart Service ====================

export const cartService = {
    // ==================== API Functions (Backend) ====================

    /**
     * API: Thêm sản phẩm vào giỏ hàng
     * Yêu cầu user đăng nhập
     */
    async addToCartAPI(
        productId: number,
        variantId: number,
        quantity: number
    ): Promise<AddToCartAPIResult> {
        try {
            const response = await api.post('/cart/add', {
                productId,
                variantId,
                quantity
            });
            return response.data;
        } catch (error: any) {
            console.error('API addToCart error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Lỗi khi thêm vào giỏ hàng'
            };
        }
    },

    /**
     * API: Lấy giỏ hàng của user
     */
    async getCartAPI(): Promise<{ cart: any; items: CartItem[] }> {
        try {
            const response = await api.get('/cart');
            if (response.data.success) {
                const items = (response.data.data.items || []).map(convertAPIItemToCartItem);
                return { cart: response.data.data.cart, items };
            }
            return { cart: null, items: [] };
        } catch (error) {
            console.error('API getCart error:', error);
            return { cart: null, items: [] };
        }
    },

    /**
     * API: Cập nhật số lượng item trong giỏ
     */
    async updateCartItemAPI(itemId: number, quantity: number): Promise<{ success: boolean; message: string }> {
        try {
            const response = await api.put(`/cart/items/${itemId}`, { quantity });
            return response.data;
        } catch (error: any) {
            console.error('API updateCartItem error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Lỗi khi cập nhật giỏ hàng'
            };
        }
    },

    /**
     * API: Xóa item khỏi giỏ hàng
     */
    async removeCartItemAPI(itemId: number): Promise<{ success: boolean; message: string }> {
        try {
            const response = await api.delete(`/cart/items/${itemId}`);
            return response.data;
        } catch (error: any) {
            console.error('API removeCartItem error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Lỗi khi xóa khỏi giỏ hàng'
            };
        }
    },

    /**
     * API: Xóa toàn bộ giỏ hàng
     */
    async clearCartAPI(): Promise<{ success: boolean; message: string }> {
        try {
            const response = await api.delete('/cart');
            return response.data;
        } catch (error: any) {
            console.error('API clearCart error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Lỗi khi xóa giỏ hàng'
            };
        }
    },

    /**
     * API: Đếm số items trong giỏ
     */
    async getCartItemCountAPI(): Promise<number> {
        try {
            const response = await api.get('/cart/count');
            if (response.data.success) {
                return response.data.data.count;
            }
            return 0;
        } catch (error) {
            console.error('API getCartItemCount error:', error);
            return 0;
        }
    },

    // ==================== LocalStorage Functions (Fallback) ====================

    /**
     * Lấy toàn bộ giỏ hàng từ localStorage
     */
    getCart(): CartItem[] {
        try {
            const cartData = localStorage.getItem(CART_STORAGE_KEY);
            if (!cartData) return [];
            return JSON.parse(cartData) as CartItem[];
        } catch (error) {
            console.error('Lỗi đọc giỏ hàng từ localStorage:', error);
            return [];
        }
    },

    /**
     * Lưu giỏ hàng vào localStorage
     */
    saveCart(cart: CartItem[]): void {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        } catch (error) {
            console.error('Lỗi lưu giỏ hàng vào localStorage:', error);
        }
    },

    /**
     * Thêm sản phẩm vào giỏ hàng (localStorage)
     */
    addToCart(params: AddToCartParams): CartItem[] {
        const cart = this.getCart();
        const itemKey = getItemKey(params.product_id, params.variant_id ?? null);

        const existingIndex = cart.findIndex(item =>
            getItemKey(item.product_id, item.variant_id) === itemKey
        );

        if (existingIndex >= 0) {
            // Đã tồn tại - tăng số lượng
            const existingItem = cart[existingIndex];
            let newQuantity = existingItem.quantity + params.quantity;

            // Validate max stock nếu có
            if (existingItem.max_stock && newQuantity > existingItem.max_stock) {
                newQuantity = existingItem.max_stock;
            }

            cart[existingIndex] = {
                ...existingItem,
                quantity: newQuantity,
                // Cập nhật giá mới nhất
                price: params.price,
            };
        } else {
            // Chưa tồn tại - thêm mới
            const newItem: CartItem = {
                product_id: params.product_id,
                variant_id: params.variant_id ?? null,
                name: params.name,
                variant_label: params.variant_label ?? null,
                price: params.price,
                quantity: params.quantity,
                image_url: params.image_url ?? null,
                sku: params.sku ?? null,
                max_stock: params.max_stock ?? null,
            };
            cart.push(newItem);
        }

        this.saveCart(cart);
        return cart;
    },

    /**
     * Cập nhật số lượng sản phẩm trong giỏ (localStorage)
     */
    updateQuantity(productId: number, variantId: number | null, quantity: number): CartItem[] {
        const cart = this.getCart();
        const itemKey = getItemKey(productId, variantId);

        const itemIndex = cart.findIndex(item =>
            getItemKey(item.product_id, item.variant_id) === itemKey
        );

        if (itemIndex >= 0) {
            if (quantity <= 0) {
                // Xóa item nếu quantity <= 0
                cart.splice(itemIndex, 1);
            } else {
                // Validate max stock
                let newQuantity = quantity;
                const item = cart[itemIndex];
                if (item.max_stock && newQuantity > item.max_stock) {
                    newQuantity = item.max_stock;
                }
                cart[itemIndex].quantity = newQuantity;
            }
            this.saveCart(cart);
        }

        return cart;
    },

    /**
     * Xóa sản phẩm khỏi giỏ hàng (localStorage)
     */
    removeFromCart(productId: number, variantId: number | null): CartItem[] {
        const cart = this.getCart();
        const itemKey = getItemKey(productId, variantId);

        const filteredCart = cart.filter(item =>
            getItemKey(item.product_id, item.variant_id) !== itemKey
        );

        this.saveCart(filteredCart);
        return filteredCart;
    },

    /**
     * Xóa toàn bộ giỏ hàng (localStorage)
     */
    clearCart(): void {
        localStorage.removeItem(CART_STORAGE_KEY);
    },

    // ==================== Utility Functions ====================

    /**
     * Tính tổng tiền của giỏ hàng
     */
    getCartTotal(cart?: CartItem[]): number {
        const items = cart ?? this.getCart();
        return items.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    /**
     * Tính tổng tiền của các sản phẩm được chọn
     */
    getSelectedTotal(cart: CartItem[], selectedKeys: Set<string>): number {
        return cart
            .filter(item => selectedKeys.has(getItemKey(item.product_id, item.variant_id)))
            .reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    /**
     * Đếm tổng số sản phẩm trong giỏ (tính theo quantity)
     */
    getCartItemCount(): number {
        const cart = this.getCart();
        return cart.reduce((count, item) => count + item.quantity, 0);
    },

    /**
     * Đếm số loại sản phẩm trong giỏ
     */
    getCartUniqueItemCount(): number {
        return this.getCart().length;
    },

    /**
     * Kiểm tra sản phẩm có trong giỏ không
     */
    isInCart(productId: number, variantId: number | null): boolean {
        const cart = this.getCart();
        const itemKey = getItemKey(productId, variantId);
        return cart.some(item => getItemKey(item.product_id, item.variant_id) === itemKey);
    },

    /**
     * Lấy item key utility (public để dùng trong component)
     */
    getItemKey,
};

export default cartService;
