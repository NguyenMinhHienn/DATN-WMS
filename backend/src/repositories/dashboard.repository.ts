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
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT id, CONCAT('ORD-', id) as code, created_at as date, total_amount, status
            FROM orders
            WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
            ORDER BY created_at DESC
        `, [year, month]);
        return rows;
    }

    async getReceiptsByMonth(year: number, month: number): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                st.id,
                st.transfer_number as receipt_number,
                'purchase' as receipt_type,
                DATE_FORMAT(st.transfer_date, '%Y-%m-%d') as receipt_date,
                DATE_FORMAT(st.expected_arrival_date, '%Y-%m-%d') as expected_date,
                st.total_items,
                st.total_quantity,
                st.total_value as total_amount,
                st.status,
                s.name as supplier_name,
                w.name as warehouse_name,
                u.full_name as created_by_name,
                st.created_at
            FROM stock_transfers st
            LEFT JOIN suppliers s ON st.supplier_id = s.id
            LEFT JOIN warehouses w ON st.destination_warehouse_id = w.id
            LEFT JOIN users u ON st.created_by = u.id
            WHERE st.transfer_type = 'IMPORT'
                AND st.status IN ('approved', 'completed')
                AND st.deleted_at IS NULL
                AND YEAR(st.created_at) = ? AND MONTH(st.created_at) = ?
            ORDER BY st.created_at DESC
        `, [year, month]);
        return rows;
    }

    async getIssuesByMonth(year: number, month: number): Promise<any[]> {
        // Query mới sử dụng stock_transfers cho EXPORT
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                st.id,
                st.transfer_number as issue_number,
                'sales' as issue_type,
                DATE_FORMAT(st.transfer_date, '%Y-%m-%d') as issue_date,
                DATE_FORMAT(st.expected_arrival_date, '%Y-%m-%d') as required_date,
                st.total_items,
                st.total_quantity,
                st.total_value as total_amount,
                st.status,
                'normal' as priority,
                st.reason as customer_name,
                w.name as warehouse_name,
                u.full_name as created_by_name,
                st.created_at
            FROM stock_transfers st
            LEFT JOIN warehouses w ON st.source_warehouse_id = w.id
            LEFT JOIN users u ON st.created_by = u.id
            WHERE st.transfer_type = 'EXPORT'
                AND st.status IN ('approved', 'completed')
                AND st.deleted_at IS NULL
                AND YEAR(st.created_at) = ? AND MONTH(st.created_at) = ?
            ORDER BY st.created_at DESC
        `, [year, month]);
        return rows;
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
        const [orders, receipts, issues, products] = await Promise.all([
            this.getOrdersByMonth(year, month),
            this.getReceiptsByMonth(year, month),
            this.getIssuesByMonth(year, month),
            this.getProductPerformanceByMonth(year, month)
        ]);

        return {
            orders: orders || [],
            receipts: receipts || [],
            issues: issues || [],
            products: products || []
        };
    }
}

export const dashboardRepository = new DashboardRepository();
