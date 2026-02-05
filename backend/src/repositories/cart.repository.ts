import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * Cart Repository
 * Quản lý giỏ hàng trong database
 */

// ============================================================
// INTERFACES
// ============================================================

export interface Cart {
    id: number;
    user_id: number;
    session_id: string | null;
    total_items: number;
    total_quantity: number;
    subtotal: number;
    coupon_code: string | null;
    coupon_discount: number;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    expires_at: Date | null;
}

export interface CartItem {
    id: number;
    cart_id: number;
    product_id: number;
    product_variant_id: number;
    quantity: number;
    unit_price: number;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CartItemWithDetails extends CartItem {
    product_name: string;
    product_sku: string;
    product_image_url: string | null;
    variant_sku: string | null;
    variant_color: string | null;
    variant_image_url: string | null;
    variant_stock: number;
    line_total: number;
}

// ============================================================
// CART FUNCTIONS
// ============================================================

/**
 * Tìm giỏ hàng của user
 */
export const findCartByUserId = async (userId: number): Promise<Cart | null> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM carts WHERE user_id = ? LIMIT 1`,
        [userId]
    );
    return rows.length > 0 ? (rows[0] as Cart) : null;
};

/**
 * Tạo giỏ hàng mới cho user
 */
export const createCart = async (userId: number): Promise<number> => {
    const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO carts (user_id, total_items, total_quantity, subtotal) VALUES (?, 0, 0, 0)`,
        [userId]
    );
    return result.insertId;
};

/**
 * Lấy hoặc tạo giỏ hàng cho user
 */
export const getOrCreateCart = async (userId: number): Promise<Cart> => {
    let cart = await findCartByUserId(userId);
    if (!cart) {
        const cartId = await createCart(userId);
        cart = await findCartById(cartId);
    }
    return cart!;
};

/**
 * Tìm giỏ hàng theo ID
 */
export const findCartById = async (cartId: number): Promise<Cart | null> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM carts WHERE id = ? LIMIT 1`,
        [cartId]
    );
    return rows.length > 0 ? (rows[0] as Cart) : null;
};

// ============================================================
// CART ITEM FUNCTIONS
// ============================================================

/**
 * Tìm item trong giỏ theo variant
 */
export const findCartItem = async (cartId: number, variantId: number): Promise<CartItem | null> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM cart_items WHERE cart_id = ? AND product_variant_id = ? LIMIT 1`,
        [cartId, variantId]
    );
    return rows.length > 0 ? (rows[0] as CartItem) : null;
};

/**
 * Thêm item mới vào giỏ
 */
export const addCartItem = async (
    cartId: number,
    productId: number,
    variantId: number,
    quantity: number,
    unitPrice: number
): Promise<number> => {
    const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO cart_items (cart_id, product_id, product_variant_id, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`,
        [cartId, productId, variantId, quantity, unitPrice]
    );
    return result.insertId;
};

/**
 * Cập nhật số lượng item
 */
export const updateCartItemQuantity = async (itemId: number, quantity: number): Promise<void> => {
    await pool.execute(
        `UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [quantity, itemId]
    );
};

/**
 * Xóa item khỏi giỏ
 */
export const removeCartItem = async (itemId: number): Promise<void> => {
    await pool.execute(`DELETE FROM cart_items WHERE id = ?`, [itemId]);
};

/**
 * Xóa tất cả items trong giỏ
 */
export const clearCartItems = async (cartId: number): Promise<void> => {
    await pool.execute(`DELETE FROM cart_items WHERE cart_id = ?`, [cartId]);
};

/**
 * Lấy tất cả items trong giỏ với thông tin chi tiết
 */
export const getCartItems = async (cartId: number): Promise<CartItemWithDetails[]> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
            ci.*,
            p.name AS product_name,
            p.sku AS product_sku,
            p.image_url AS product_image_url,
            pv.sku AS variant_sku,
            pv.color AS variant_color,
            pv.image_url AS variant_image_url,
            pv.stock AS variant_stock,
            (ci.quantity * ci.unit_price) AS line_total
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         JOIN product_variants pv ON ci.product_variant_id = pv.id
         WHERE ci.cart_id = ?
         ORDER BY ci.created_at DESC`,
        [cartId]
    );
    return rows as CartItemWithDetails[];
};

/**
 * Cập nhật tổng giỏ hàng
 */
export const updateCartTotals = async (cartId: number): Promise<void> => {
    await pool.execute(
        `UPDATE carts SET 
            total_items = (SELECT COUNT(*) FROM cart_items WHERE cart_id = ?),
            total_quantity = (SELECT COALESCE(SUM(quantity), 0) FROM cart_items WHERE cart_id = ?),
            subtotal = (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM cart_items WHERE cart_id = ?),
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [cartId, cartId, cartId, cartId]
    );
};

/**
 * Lấy giỏ hàng đầy đủ với items
 */
export const getCartWithItems = async (userId: number): Promise<{
    cart: Cart | null;
    items: CartItemWithDetails[];
}> => {
    const cart = await findCartByUserId(userId);
    if (!cart) {
        return { cart: null, items: [] };
    }
    const items = await getCartItems(cart.id);
    return { cart, items };
};

/**
 * Đếm số items trong giỏ của user
 */
export const getCartItemCount = async (userId: number): Promise<number> => {
    const cart = await findCartByUserId(userId);
    if (!cart) return 0;

    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM cart_items WHERE cart_id = ?`,
        [cart.id]
    );
    return rows[0]?.count || 0;
};
