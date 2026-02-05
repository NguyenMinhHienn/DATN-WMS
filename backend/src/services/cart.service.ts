import * as cartRepository from '../repositories/cart.repository';
import { productRepository } from '../repositories/product.repository';
import * as variantRepository from '../repositories/variant.repository';

/**
 * Cart Service
 * Business logic cho giỏ hàng
 */

// ============================================================
// INTERFACES
// ============================================================

export interface AddToCartParams {
    userId: number;
    productId: number;
    variantId: number;
    quantity: number;
}

export interface AddToCartResult {
    success: boolean;
    message: string;
    data?: {
        cartId: number;
        itemId: number;
        itemCount: number;
        isNewItem: boolean;
    };
}

export interface CartData {
    cart: cartRepository.Cart | null;
    items: cartRepository.CartItemWithDetails[];
    totalItems: number;
    totalQuantity: number;
    subtotal: number;
}

// ============================================================
// SERVICE FUNCTIONS
// ============================================================

/**
 * Thêm sản phẩm vào giỏ hàng
 */
export const addToCart = async (params: AddToCartParams): Promise<AddToCartResult> => {
    const { userId, productId, variantId, quantity } = params;

    // Validate quantity
    if (!quantity || quantity < 1) {
        return { success: false, message: 'Số lượng phải lớn hơn 0' };
    }

    // Validate product exists
    const product = await productRepository.findById(productId);
    if (!product) {
        return { success: false, message: 'Sản phẩm không tồn tại' };
    }

    // Validate variant exists and belongs to product
    const variant = await variantRepository.findById(variantId);
    if (!variant) {
        return { success: false, message: 'Biến thể sản phẩm không tồn tại' };
    }
    if (variant.product_id !== productId) {
        return { success: false, message: 'Biến thể không thuộc sản phẩm này' };
    }

    // Check stock
    if (variant.stock < quantity) {
        return {
            success: false,
            message: `Không đủ hàng trong kho. Còn lại: ${variant.stock}`
        };
    }

    // Get or create cart for user
    const cart = await cartRepository.getOrCreateCart(userId);

    // Check if item already exists in cart
    const existingItem = await cartRepository.findCartItem(cart.id, variantId);

    let itemId: number;
    let isNewItem = false;

    if (existingItem) {
        // Update quantity (cộng dồn)
        const newQuantity = existingItem.quantity + quantity;

        // Validate total quantity against stock
        if (newQuantity > variant.stock) {
            return {
                success: false,
                message: `Không thể thêm. Tổng số lượng (${newQuantity}) vượt quá tồn kho (${variant.stock})`
            };
        }

        await cartRepository.updateCartItemQuantity(existingItem.id, newQuantity);
        itemId = existingItem.id;
    } else {
        // Add new item
        const unitPrice = variant.price || product.selling_price;
        itemId = await cartRepository.addCartItem(cart.id, productId, variantId, quantity, unitPrice);
        isNewItem = true;
    }

    // Update cart totals
    await cartRepository.updateCartTotals(cart.id);

    // Get updated item count
    const itemCount = await cartRepository.getCartItemCount(userId);

    return {
        success: true,
        message: isNewItem ? 'Đã thêm sản phẩm vào giỏ hàng' : 'Đã cập nhật số lượng trong giỏ hàng',
        data: {
            cartId: cart.id,
            itemId,
            itemCount,
            isNewItem
        }
    };
};

/**
 * Lấy giỏ hàng của user
 */
export const getCart = async (userId: number): Promise<CartData> => {
    const { cart, items } = await cartRepository.getCartWithItems(userId);

    return {
        cart,
        items,
        totalItems: cart?.total_items || 0,
        totalQuantity: cart?.total_quantity || 0,
        subtotal: cart?.subtotal || 0
    };
};

/**
 * Cập nhật số lượng item trong giỏ
 */
export const updateCartItem = async (
    userId: number,
    itemId: number,
    quantity: number
): Promise<{ success: boolean; message: string }> => {
    if (quantity < 1) {
        return { success: false, message: 'Số lượng phải lớn hơn 0' };
    }

    // Get user's cart
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
        return { success: false, message: 'Giỏ hàng không tồn tại' };
    }

    // Get cart items to verify ownership
    const items = await cartRepository.getCartItems(cart.id);
    const item = items.find(i => i.id === itemId);

    if (!item) {
        return { success: false, message: 'Sản phẩm không có trong giỏ hàng' };
    }

    // Check stock
    if (quantity > item.variant_stock) {
        return {
            success: false,
            message: `Không đủ hàng. Tồn kho: ${item.variant_stock}`
        };
    }

    await cartRepository.updateCartItemQuantity(itemId, quantity);
    await cartRepository.updateCartTotals(cart.id);

    return { success: true, message: 'Đã cập nhật số lượng' };
};

/**
 * Xóa item khỏi giỏ
 */
export const removeCartItem = async (
    userId: number,
    itemId: number
): Promise<{ success: boolean; message: string }> => {
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
        return { success: false, message: 'Giỏ hàng không tồn tại' };
    }

    // Verify item belongs to user's cart
    const items = await cartRepository.getCartItems(cart.id);
    const item = items.find(i => i.id === itemId);

    if (!item) {
        return { success: false, message: 'Sản phẩm không có trong giỏ hàng' };
    }

    await cartRepository.removeCartItem(itemId);
    await cartRepository.updateCartTotals(cart.id);

    return { success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng' };
};

/**
 * Xóa tất cả items trong giỏ
 */
export const clearCart = async (userId: number): Promise<{ success: boolean; message: string }> => {
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
        return { success: false, message: 'Giỏ hàng không tồn tại' };
    }

    await cartRepository.clearCartItems(cart.id);
    await cartRepository.updateCartTotals(cart.id);

    return { success: true, message: 'Đã xóa tất cả sản phẩm trong giỏ hàng' };
};

/**
 * Đếm số items trong giỏ
 */
export const getCartItemCount = async (userId: number): Promise<number> => {
    return await cartRepository.getCartItemCount(userId);
};
