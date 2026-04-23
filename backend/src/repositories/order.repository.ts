import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { inventoryCoreService } from '../services/inventory-core.service';

/**
 * Order Repository
 * CRUD operations cho bảng orders & order_items
 */

// ==================== INTERFACES ====================

export interface OrderRow {
    id: number;
    user_id: number;
    total_amount: number;
    payment_method: 'COD' | 'BANKING';
    payment_status: 'unpaid' | 'paid';
    status: 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'failed' | 'cancelled';
    shipping_name: string;
    shipping_phone: string;
    shipping_address: string;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    // Joined fields
    user_fullname?: string;
    user_email?: string;
}

export interface OrderItemRow {
    id: number;
    order_id: number;
    product_id: number;
    variant_id: number | null;
    product_name: string;
    variant_sku: string | null;
    quantity: number;
    unit_price: number;
    cost_price_snapshot: number;
    variant_attributes: string | null;
    image_url?: string;
}

export interface CreateOrderItemInput {
    product_id: number;
    variant_id: number | null;
    product_name: string;
    variant_sku: string | null;
    quantity: number;
    unit_price: number;
    cost_price_snapshot: number;
    variant_attributes: string | null;
}

// ==================== REPOSITORY ====================

class OrderRepository {

    /**
     * Tạo đơn hàng mới + items (trong transaction)
     */
    async createOrder(
        userId: number,
        shippingName: string,
        shippingPhone: string,
        shippingAddress: string,
        paymentMethod: 'COD' | 'BANKING',
        totalAmount: number,
        items: CreateOrderItemInput[],
        notes?: string,
        shippingLatitude?: number,
        shippingLongitude?: number
    ): Promise<number> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Insert order
            const [orderResult] = await connection.execute<ResultSetHeader>(
                `INSERT INTO orders (user_id, total_amount, payment_method, payment_status, status, shipping_name, shipping_phone, shipping_address, shipping_latitude, shipping_longitude, notes)
                 VALUES (?, ?, ?, 'unpaid', 'pending', ?, ?, ?, ?, ?, ?)`,
                [userId, totalAmount, paymentMethod, shippingName, shippingPhone, shippingAddress, shippingLatitude || null, shippingLongitude || null, notes || null]
            );
            const orderId = orderResult.insertId;

            // Insert order items and RESERVE stock (instead of deducting)
            for (const item of items) {
                // 1. Insert order item
                await connection.execute<ResultSetHeader>(
                    `INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_sku, quantity, unit_price, cost_price_snapshot, variant_attributes)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [orderId, item.product_id, item.variant_id, item.product_name, item.variant_sku, item.quantity, item.unit_price, item.cost_price_snapshot, item.variant_attributes]
                );

                // 2. GIỮ HÀNG (RESERVE) thay vì trừ stock trực tiếp
                if (item.variant_id) {
                    await inventoryCoreService.reserveStock({
                        connection,
                        productId: item.product_id,
                        variantId: item.variant_id,
                        warehouseId: 1, // Kho Tổng
                        quantity: item.quantity,
                        referenceType: 'order',
                        referenceId: orderId,
                        referenceNumber: `ORD-${orderId}`,
                        userId: userId,
                    });
                }
            }

            await connection.commit();
            return orderId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Lấy tất cả đơn hàng (admin) - có pagination
     */
    async getAllOrders(page: number = 1, limit: number = 10, status?: string): Promise<{ data: OrderRow[], pagination: any }> {
        const offset = (page - 1) * limit;
        let query = `
            SELECT o.*, u.full_name as user_fullname, u.email as user_email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }

        query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        // Count
        let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
        const countParams: any[] = [];
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        const [rows] = await pool.query<RowDataPacket[]>(query, params);
        const [[{ total }]] = await pool.query<RowDataPacket[]>(countQuery, countParams);

        return {
            data: rows as OrderRow[],
            pagination: {
                page, limit,
                total: parseInt(total),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Lấy đơn hàng của 1 user (client) - có pagination
     */
    async getOrdersByUserId(userId: number, page: number = 1, limit: number = 10, status?: string): Promise<{ data: OrderRow[], pagination: any }> {
        const offset = (page - 1) * limit;
        let query = `
            SELECT o.*
            FROM orders o
            WHERE o.user_id = ?
        `;
        const params: any[] = [userId];

        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }

        query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
        const countParams: any[] = [userId];
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        const [rows] = await pool.query<RowDataPacket[]>(query, params);
        const [[{ total }]] = await pool.query<RowDataPacket[]>(countQuery, countParams);

        return {
            data: rows as OrderRow[],
            pagination: {
                page, limit,
                total: parseInt(total),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Lấy chi tiết 1 đơn hàng (kèm items)
     */
    async getOrderById(orderId: number): Promise<(OrderRow & { items: OrderItemRow[] }) | null> {
        const [orderRows] = await pool.query<RowDataPacket[]>(
            `SELECT o.*, u.full_name as user_fullname, u.email as user_email
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             WHERE o.id = ?`,
            [orderId]
        );
        if (orderRows.length === 0) return null;

        const [itemRows] = await pool.query<RowDataPacket[]>(
            `SELECT oi.*, p.image_url
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?
             ORDER BY oi.id ASC`,
            [orderId]
        );

        return {
            ...(orderRows[0] as OrderRow),
            items: itemRows as OrderItemRow[]
        };
    }

    /**
     * Cập nhật trạng thái đơn hàng
     */
    async updateOrderStatus(orderId: number, status: string): Promise<void> {
        await pool.execute(
            'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, orderId]
        );
    }

    /**
     * Hủy đơn hàng và tự động hoàn lại tồn kho
     */
    async cancelOrderAndRestoreStock(orderId: number, items: OrderItemRow[]): Promise<void> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Chuyển trạng thái đơn hàng thành cancelled
            await connection.execute(
                'UPDATE orders SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [orderId]
            );

            // 2. HỦY GIỮ HÀNG (RELEASE) thay vì cộng lại stock trực tiếp
            for (const item of items) {
                if (item.variant_id) {
                    await inventoryCoreService.releaseStock({
                        connection,
                        productId: item.product_id,
                        variantId: item.variant_id,
                        warehouseId: 1, // Kho Tổng
                        quantity: item.quantity,
                        referenceType: 'order',
                        referenceId: orderId,
                        referenceNumber: `ORD-${orderId}`,
                        reason: 'Order cancelled',
                    });
                }
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Cập nhật trạng thái thanh toán
     */
    async updatePaymentStatus(orderId: number, paymentStatus: string): Promise<void> {
        await pool.execute(
            'UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [paymentStatus, orderId]
        );
    }

    /**
     * Lấy đơn hàng theo status (cho staff tạo phiếu)
     */
    async getOrdersByStatus(status: string, page: number = 1, limit: number = 10): Promise<{ data: OrderRow[], pagination: any }> {
        const offset = (page - 1) * limit;
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT o.*, u.full_name as user_fullname, u.email as user_email
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             WHERE o.status = ?
             ORDER BY o.created_at DESC
             LIMIT ? OFFSET ?`,
            [status, limit, offset]
        );
        const [[{ total }]] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as total FROM orders WHERE status = ?',
            [status]
        );

        return {
            data: rows as OrderRow[],
            pagination: {
                page, limit,
                total: parseInt(total),
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}

export const orderRepository = new OrderRepository();