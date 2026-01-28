import pool from '../config/database';
import { RowDataPacket } from 'mysql2/promise';


/**
 * Order Repository
 * Xử lý truy vấn CSDL cho đơn hàng (READ ONLY cho Staff)
 */


export interface UserWithOrderCount {
    id: number;
    username: string;
    email: string;
    full_name: string;
    order_count: number;
}


export interface OrderSummary {
    id: number;
    order_number: string;
    order_date: Date;
    status_code: string;
    status_name: string;
    status_color: string;
    total_amount: number;
    total_items: number;
    payment_status: string;
    shipping_name: string;
}


export interface OrderItem {
    id: number;
    product_name: string;
    variant_sku: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    variant_attributes?: string;
}


export interface OrderDetail extends OrderSummary {
    items: OrderItem[];
}


class OrderRepository {
    /**
     * Lấy danh sách users có ít nhất 1 đơn hàng
     */
    async getUsersWithOrders(search?: string): Promise<UserWithOrderCount[]> {
        let query = `
            SELECT
                u.id,
                u.username,
                u.email,
                u.full_name,
                COUNT(co.id) as order_count
            FROM users u
            INNER JOIN customer_orders co ON u.id = co.user_id
            WHERE co.deleted_at IS NULL AND u.deleted_at IS NULL
        `;
        const params: any[] = [];


        if (search && search.trim()) {
            query += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)`;
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }


        query += ` GROUP BY u.id ORDER BY order_count DESC, u.full_name ASC`;


        const [rows] = await pool.query<RowDataPacket[]>(query, params);
        return rows as UserWithOrderCount[];
    }


    /**
     * Lấy danh sách đơn hàng của một user
     */
    async getOrdersByUserId(userId: number): Promise<OrderSummary[]> {
        const query = `
            SELECT
                co.id,
                co.order_number,
                co.order_date,
                co.status_code,
                COALESCE(os.name_vi, co.status_code) as status_name,
                COALESCE(os.color, '#6B7280') as status_color,
                co.total_amount,
                co.total_items,
                co.payment_status,
                co.shipping_name
            FROM customer_orders co
            LEFT JOIN order_statuses os ON co.status_id = os.id
            WHERE co.user_id = ? AND co.deleted_at IS NULL
            ORDER BY co.order_date DESC
        `;


        const [rows] = await pool.query<RowDataPacket[]>(query, [userId]);
        return rows as OrderSummary[];
    }


    /**
     * Lấy chi tiết đơn hàng (bao gồm items)
     */
    async getOrderById(orderId: number): Promise<OrderDetail | null> {
        // Get order info
        const orderQuery = `
            SELECT
                co.id,
                co.order_number,
                co.order_date,
                co.status_code,
                COALESCE(os.name_vi, co.status_code) as status_name,
                COALESCE(os.color, '#6B7280') as status_color,
                co.total_amount,
                co.total_items,
                co.payment_status,
                co.shipping_name
            FROM customer_orders co
            LEFT JOIN order_statuses os ON co.status_id = os.id
            WHERE co.id = ? AND co.deleted_at IS NULL
        `;


        const [orderRows] = await pool.query<RowDataPacket[]>(orderQuery, [orderId]);
        if (orderRows.length === 0) {
            return null;
        }


        // Get order items
        const itemsQuery = `
            SELECT
                coi.id,
                coi.product_name,
                coi.variant_sku,
                coi.quantity,
                coi.unit_price,
                coi.line_total,
                coi.variant_attributes
            FROM customer_order_items coi
            WHERE coi.order_id = ?
            ORDER BY coi.id ASC
        `;


        const [itemRows] = await pool.query<RowDataPacket[]>(itemsQuery, [orderId]);


        return {
            ...(orderRows[0] as OrderSummary),
            items: itemRows as OrderItem[]
        };
    }


    /**
     * Lấy items của một đơn hàng
     */
    async getOrderItems(orderId: number): Promise<OrderItem[]> {
        const query = `
            SELECT
                coi.id,
                coi.product_name,
                coi.variant_sku,
                coi.quantity,
                coi.unit_price,
                coi.line_total,
                coi.variant_attributes
            FROM customer_order_items coi
            WHERE coi.order_id = ?
            ORDER BY coi.id ASC
        `;


        const [rows] = await pool.query<RowDataPacket[]>(query, [orderId]);
        return rows as OrderItem[];
    }


    /**
     * Đếm tổng số users có đơn hàng
     */
    async countUsersWithOrders(): Promise<number> {
        const query = `
            SELECT COUNT(DISTINCT co.user_id) as total
            FROM customer_orders co
            WHERE co.deleted_at IS NULL
        `;


        const [rows] = await pool.query<RowDataPacket[]>(query);
        return rows[0]?.total || 0;
    }
}


export const orderRepository = new OrderRepository();