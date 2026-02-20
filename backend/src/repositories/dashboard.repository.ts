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
    profit: number;
}

class DashboardRepository {

    /**
     * Tổng hợp doanh thu, giá vốn, lợi nhuận, tổng đơn (chỉ đơn delivered)
     */
    async getSalesSummary(): Promise<SalesSummary> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                COUNT(DISTINCT o.id) as total_orders,
                COALESCE(SUM(oi.unit_price * oi.quantity), 0) as total_revenue,
                COALESCE(SUM(oi.cost_price_snapshot * oi.quantity), 0) as total_cost,
                COALESCE(SUM((oi.unit_price - oi.cost_price_snapshot) * oi.quantity), 0) as total_profit
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'delivered'
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
            SELECT 
                MONTH(o.created_at) as month,
                COALESCE(SUM(oi.unit_price * oi.quantity), 0) as revenue,
                COALESCE(SUM((oi.unit_price - oi.cost_price_snapshot) * oi.quantity), 0) as profit
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'delivered' AND YEAR(o.created_at) = ?
            GROUP BY MONTH(o.created_at)
            ORDER BY month
        `, [year]);

        return rows as MonthlyReportRow[];
    }
}

export const dashboardRepository = new DashboardRepository();
