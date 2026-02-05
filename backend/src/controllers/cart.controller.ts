import { Request, Response } from 'express';
import * as cartService from '../services/cart.service';

/**
 * Cart Controller
 * Handle HTTP requests cho giỏ hàng
 */

// ============================================================
// INTERFACES
// ============================================================

interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        roles: string[];
    };
}

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * POST /api/cart/add
 * Thêm sản phẩm vào giỏ hàng
 */
export const addToCart = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
            return;
        }

        const { productId, variantId, quantity } = req.body;

        // Validate required fields
        if (!productId) {
            res.status(400).json({ success: false, message: 'Thiếu productId' });
            return;
        }
        if (!variantId) {
            res.status(400).json({ success: false, message: 'Thiếu variantId' });
            return;
        }
        if (!quantity || quantity < 1) {
            res.status(400).json({ success: false, message: 'Số lượng phải lớn hơn 0' });
            return;
        }

        const result = await cartService.addToCart({
            userId,
            productId: parseInt(productId),
            variantId: parseInt(variantId),
            quantity: parseInt(quantity)
        });

        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

/**
 * GET /api/cart
 * Lấy giỏ hàng của user
 */
export const getCart = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
            return;
        }

        const cart = await cartService.getCart(userId);
        res.status(200).json({ success: true, data: cart });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

/**
 * PUT /api/cart/items/:itemId
 * Cập nhật số lượng item trong giỏ
 */
export const updateCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
            return;
        }

        const itemId = parseInt(req.params.itemId);
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            res.status(400).json({ success: false, message: 'Số lượng phải lớn hơn 0' });
            return;
        }

        const result = await cartService.updateCartItem(userId, itemId, parseInt(quantity));

        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

/**
 * DELETE /api/cart/items/:itemId
 * Xóa item khỏi giỏ
 */
export const removeCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
            return;
        }

        const itemId = parseInt(req.params.itemId);
        const result = await cartService.removeCartItem(userId, itemId);

        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Remove cart item error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

/**
 * DELETE /api/cart
 * Xóa tất cả items trong giỏ
 */
export const clearCart = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
            return;
        }

        const result = await cartService.clearCart(userId);

        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

/**
 * GET /api/cart/count
 * Đếm số items trong giỏ
 */
export const getCartItemCount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
            return;
        }

        const count = await cartService.getCartItemCount(userId);
        res.status(200).json({ success: true, data: { count } });
    } catch (error) {
        console.error('Get cart count error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
