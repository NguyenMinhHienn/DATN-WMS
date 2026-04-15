import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

/**
 * Dashboard Repository
 * Queries cho tính doanh thu, giá vốn, lợi nhuận từ đơn hàng delivered
 */

export interface SalesSummary {
    total_orders: number;
    total_revenue: number;
    total_cost: number;
    total_profit: number;
}

export interface MonthlyReportRow {
    month: number;
    revenue: number;
    cost: number;
    profit: number;
}

class DashboardRepository {

    /**
     * Tổng hợp doanh thu, giá vốn, lợi nhuận, tổng đơn (chỉ đơn delivered)
     */
    async getSalesSummary(): Promise<SalesSummary> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            WITH CombinedSales AS (
                -- 1. Đơn hàng từ người dùng (Web Orders)
                SELECT 
                    CONCAT('O-', o.id) as ref_id,
                    o.created_at,
                    (oi.unit_price * oi.quantity) as revenue,
                    COALESCE(esd.cost_of_goods_sold, oi.cost_price_snapshot * oi.quantity) as cost
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN export_slips es ON o.id = es.order_id AND es.status IN ('approved', 'completed')
                LEFT JOIN export_slip_details esd ON es.id = esd.export_slip_id 
                    AND esd.product_id = oi.product_id 
                    AND (esd.variant_id = oi.variant_id OR (esd.variant_id IS NULL AND oi.variant_id IS NULL))
                WHERE o.status = 'delivered'

                UNION ALL

                -- 2. Đơn từ phiếu xuất kho nội bộ (Export Transfers)
                SELECT 
                    CONCAT('T-', st.id) as ref_id,
                    st.created_at,
                    sti.line_total as revenue,
                    COALESCE(sti.cost_of_goods_sold, (sti.quantity_requested * sti.unit_cost)) as cost
                FROM stock_transfers st
                JOIN stock_transfer_items sti ON st.id = sti.stock_transfer_id
                WHERE st.transfer_type = 'EXPORT' 
                  AND st.status IN ('approved', 'completed') 
                  AND st.deleted_at IS NULL
            )
            SELECT 
                COUNT(DISTINCT ref_id) as total_orders,
                COALESCE(SUM(revenue), 0) as total_revenue,
                COALESCE(SUM(cost), 0) as total_cost,
                COALESCE(SUM(revenue - cost), 0) as total_profit
            FROM CombinedSales;
        `);

        const row = rows[0];
        return {
            total_orders: parseInt(row.total_orders) || 0,
            total_revenue: parseFloat(row.total_revenue) || 0,
            total_cost: parseFloat(row.total_cost) || 0,
            total_profit: parseFloat(row.total_profit) || 0,
        };
    }

    /**
     * Doanh thu & lợi nhuận theo tháng trong năm (chỉ đơn delivered)
     */
    async getMonthlyReport(year: number): Promise<MonthlyReportRow[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            WITH CombinedSales AS (
                -- 1. Đơn hàng từ người dùng (Web Orders)
                SELECT 
                    o.created_at,
                    (oi.unit_price * oi.quantity) as revenue,
                    COALESCE(esd.cost_of_goods_sold, oi.cost_price_snapshot * oi.quantity) as cost
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN export_slips es ON o.id = es.order_id AND es.status IN ('approved', 'completed')
                LEFT JOIN export_slip_details esd ON es.id = esd.export_slip_id 
                    AND esd.product_id = oi.product_id 
                    AND (esd.variant_id = oi.variant_id OR (esd.variant_id IS NULL AND oi.variant_id IS NULL))
                WHERE o.status = 'delivered' AND YEAR(o.created_at) = ?

                UNION ALL

                -- 2. Đơn từ phiếu xuất kho nội bộ (Export Transfers)
                SELECT 
                    st.created_at,
                    sti.line_total as revenue,
                    COALESCE(sti.cost_of_goods_sold, (sti.quantity_requested * sti.unit_cost)) as cost
                FROM stock_transfers st
                JOIN stock_transfer_items sti ON st.id = sti.stock_transfer_id
                WHERE st.transfer_type = 'EXPORT' 
                  AND st.status IN ('approved', 'completed') 
                  AND st.deleted_at IS NULL 
                  AND YEAR(st.created_at) = ?
            )
            SELECT 
                MONTH(created_at) as month,
                COALESCE(SUM(revenue), 0) as revenue,
                COALESCE(SUM(cost), 0) as cost,
                COALESCE(SUM(revenue - cost), 0) as profit
            FROM CombinedSales
            GROUP BY MONTH(created_at)
            ORDER BY month
        `, [year, year]);

        return rows as MonthlyReportRow[];
    }

    async getOrdersByMonth(year: number, month: number): Promise<any[]> {
        // 1. Đơn hàng online (Web Orders)
        const [webOrders] = await pool.query<RowDataPacket[]>(`
            SELECT 
                o.id,
                CONCAT('ORD-', o.id) as code,
                'online' as order_type,
                o.created_at as date,
                o.total_amount,
                o.status,
                o.payment_method,
                o.payment_status,
                o.shipping_name as customer_name,
                o.shipping_phone as customer_phone,
                o.shipping_address,
                u.full_name as user_name,
                u.email as user_email,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
                (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id) as total_qty
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE YEAR(o.created_at) = ? AND MONTH(o.created_at) = ?
            ORDER BY o.created_at DESC
        `, [year, month]);

        // 2. Phiếu xuất kho nội bộ (Internal Export)
        const [internalOrders] = await pool.query<RowDataPacket[]>(`
            SELECT 
                st.id,
                st.transfer_number as code,
                'internal' as order_type,
                st.created_at as date,
                st.total_value as total_amount,
                st.status,
                'COD' as payment_method,
                'paid' as payment_status,
                COALESCE(st.receiver_name, st.reason, 'Xuất kho nội bộ') as customer_name,
                st.receiver_phone as customer_phone,
                st.receiver_address as shipping_address,
                u.full_name as user_name,
                u.email as user_email,
                st.total_items as item_count,
                st.total_quantity as total_qty
            FROM stock_transfers st
            LEFT JOIN users u ON st.created_by = u.id
            WHERE st.transfer_type = 'EXPORT'
                AND st.status IN ('approved', 'completed')
                AND st.deleted_at IS NULL
                AND YEAR(st.created_at) = ? AND MONTH(st.created_at) = ?
            ORDER BY st.created_at DESC
        `, [year, month]);

        // Gộp và sắp xếp theo ngày giảm dần
        const allOrders = [...webOrders, ...internalOrders];
        allOrders.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return allOrders;
    }

    /**
     * Lấy chi tiết items của 1 đơn hàng (cho drill-down trong báo cáo tài chính)
     */
    async getOrderItems(orderId: number, orderType: string): Promise<any[]> {
        if (orderType === 'online') {
            const [rows] = await pool.query<RowDataPacket[]>(`
                SELECT 
                    oi.id,
                    p.name as product_name,
                    p.sku,
                    pv.sku as variant_sku,
                    CONCAT_WS(' / ', pv.color, pv.size, pv.storage, pv.ram, pv.material) as variant_label,
                    oi.quantity,
                    oi.unit_price,
                    (oi.quantity * oi.unit_price) as line_total
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                LEFT JOIN product_variants pv ON oi.variant_id = pv.id
                WHERE oi.order_id = ?
            `, [orderId]);
            return rows;
        } else {
            const [rows] = await pool.query<RowDataPacket[]>(`
                SELECT 
                    sti.id,
                    p.name as product_name,
                    p.sku,
                    pv.sku as variant_sku,
                    CONCAT_WS(' / ', pv.color, pv.size, pv.storage, pv.ram, pv.material) as variant_label,
                    sti.quantity_requested as quantity,
                    sti.unit_cost as unit_price,
                    sti.line_total
                FROM stock_transfer_items sti
                JOIN products p ON sti.product_id = p.id
                LEFT JOIN product_variants pv ON sti.product_variant_id = pv.id
                WHERE sti.stock_transfer_id = ?
            `, [orderId]);
            return rows;
        }
    }

    async getProductPerformanceByMonth(year: number, month: number): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            WITH ProductSales AS (
                -- 1. Orders (Revenue & COGS)
                SELECT 
                    p.id as product_id,
                    p.name as product_name,
                    oi.quantity as quantity_sold,
                    (oi.unit_price * oi.quantity) as revenue,
                    COALESCE(esd.cost_of_goods_sold, oi.cost_price_snapshot * oi.quantity) as cost
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN export_slips es ON o.id = es.order_id AND es.status IN ('approved', 'completed')
                LEFT JOIN export_slip_details esd ON es.id = esd.export_slip_id 
                    AND esd.product_id = oi.product_id 
                    AND (esd.variant_id = oi.variant_id OR (esd.variant_id IS NULL AND oi.variant_id IS NULL))
                JOIN products p ON oi.product_id = p.id
                WHERE o.status = 'delivered' AND YEAR(o.created_at) = ? AND MONTH(o.created_at) = ?

                UNION ALL

                -- 2. Stock Transfers (EXPORT) (Revenue & COGS)
                SELECT 
                    p.id as product_id,
                    p.name as product_name,
                    sti.quantity_requested as quantity_sold,
                    sti.line_total as revenue,
                    COALESCE(sti.cost_of_goods_sold, sti.quantity_requested * sti.unit_cost) as cost
                FROM stock_transfers st
                JOIN stock_transfer_items sti ON st.id = sti.stock_transfer_id
                JOIN products p ON sti.product_id = p.id
                WHERE st.transfer_type = 'EXPORT'
                    AND st.status IN ('approved', 'completed')
                    AND st.deleted_at IS NULL
                    AND YEAR(st.created_at) = ? AND MONTH(st.created_at) = ?
            )
            SELECT 
                product_id,
                product_name,
                SUM(quantity_sold) as quantity_sold,
                SUM(revenue) as revenue,
                SUM(cost) as cost,
                SUM(revenue - cost) as profit
            FROM ProductSales
            GROUP BY product_id, product_name
            HAVING revenue > 0 OR cost > 0
            ORDER BY revenue DESC
        `, [year, month, year, month, year, month, year, month]);
        return rows;
    }

    async getMonthlyDetail(year: number, month: number): Promise<any> {
        const [orders, products] = await Promise.all([
            this.getOrdersByMonth(year, month),
            this.getProductPerformanceByMonth(year, month)
        ]);

        return {
            orders: orders || [],
            products: products || []
        };
    }
}

export const dashboardRepository = new DashboardRepository();
