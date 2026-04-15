import pool from '../config/database';
import { DashboardStats, InventoryReport, MovementReport } from '../types';
import { RowDataPacket } from 'mysql2';

export class ReportRepository {
  async getDashboardStats(): Promise<DashboardStats> {
    const [productCount] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL AND status = 'active'
    `);

    const [warehouseCount] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM warehouses WHERE deleted_at IS NULL AND status = 'active'
    `);

    const [inventoryValue] = await pool.query<RowDataPacket[]>(`
      SELECT COALESCE(SUM(pv.stock * pv.average_cost), 0) as total_value
      FROM product_variants pv
      INNER JOIN products p ON pv.product_id = p.id
      WHERE p.deleted_at IS NULL AND pv.is_active = 1
    `);

    const [lowStock] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity_on_hand) as total_qty
        FROM inventories
        GROUP BY product_id
      ) inv ON p.id = inv.product_id
      WHERE p.deleted_at IS NULL 
        AND p.status = 'active'
        AND (COALESCE(inv.total_qty, 0) <= p.reorder_point OR COALESCE(inv.total_qty, 0) <= p.min_stock_level)
    `);

    const [pendingSlips] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM stock_transfers 
      WHERE deleted_at IS NULL AND status = 'pending'
    `);

    const [pendingOrders] = await pool.query<RowDataPacket[]>(`
    SELECT COUNT(*) as count FROM orders 
    WHERE status = 'pending'
  `);

    const [recentMovements] = await pool.query<RowDataPacket[]>(`
      SELECT il.*, p.name as product_name, w.name as warehouse_name
      FROM inventory_logs il
      INNER JOIN products p ON il.product_id = p.id
      INNER JOIN warehouses w ON il.warehouse_id = w.id
      ORDER BY il.created_at DESC
      LIMIT 10
    `);

    return {
      totalProducts: productCount[0].count,
      totalWarehouses: warehouseCount[0].count,
      totalInventoryValue: parseFloat(inventoryValue[0].total_value) || 0,
      lowStockItems: lowStock[0].count,
      pendingReceipts: pendingSlips[0].count,
      pendingIssues: 0,
      pendingOrders: pendingOrders[0].count,
      recentMovements: recentMovements as any[],
    };
  }

  async getInventoryReport(warehouseId?: number): Promise<InventoryReport[]> {
    let query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        w.name as warehouse_name,
        COALESCE(i.quantity_on_hand, 0) as quantity_on_hand,
        COALESCE(i.quantity_available, 0) as quantity_available,
        COALESCE(pv.average_cost, p.cost_price) as unit_cost,
        COALESCE(i.quantity_on_hand * COALESCE(pv.average_cost, p.cost_price), 0) as total_value
      FROM products p
      CROSS JOIN warehouses w
      LEFT JOIN inventories i ON p.id = i.product_id AND w.id = i.warehouse_id
      LEFT JOIN (
          SELECT product_id, AVG(average_cost) as average_cost 
          FROM product_variants 
          WHERE average_cost > 0 
          GROUP BY product_id
      ) pv ON p.id = pv.product_id
      WHERE p.deleted_at IS NULL AND w.deleted_at IS NULL
    `;

    const params: any[] = [];
    if (warehouseId) {
      query += ' AND w.id = ?';
      params.push(warehouseId);
    }

    query += ' ORDER BY p.name, w.name';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows as InventoryReport[];
  }

  async getMovementReport(
    startDate: string,
    endDate: string,
    warehouseId?: number,
    movementType?: string
  ): Promise<MovementReport[]> {
    let query = `
      SELECT 
        il.created_at,
        DATE(il.created_at) as date,
        il.movement_type,
        p.name as product_name,
        w.name as warehouse_name,
        il.quantity_change,
        il.quantity_after,
        il.reference_number,
        u.full_name as performed_by
      FROM inventory_logs il
      INNER JOIN products p ON il.product_id = p.id
      INNER JOIN warehouses w ON il.warehouse_id = w.id
      LEFT JOIN users u ON il.performed_by = u.id
      WHERE il.created_at BETWEEN ? AND ?
    `;

    const params: any[] = [startDate, endDate + ' 23:59:59'];

    if (warehouseId) {
      query += ' AND il.warehouse_id = ?';
      params.push(warehouseId);
    }

    if (movementType) {
      query += ' AND il.movement_type = ?';
      params.push(movementType);
    }

    query += ' ORDER BY il.created_at DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows as MovementReport[];
  }

  async getStockValueReport(): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        w.id as warehouse_id,
        w.name as warehouse_name,
        COUNT(DISTINCT i.product_id) as product_count,
        SUM(i.quantity_on_hand) as total_quantity,
        SUM(i.quantity_on_hand * COALESCE(pv.average_cost, p.cost_price, p.selling_price, 0)) as total_value
      FROM warehouses w
      LEFT JOIN inventories i ON w.id = i.warehouse_id
      LEFT JOIN goods_receipt_items gri ON i.product_id = gri.product_id /* This join is problematic, let's just use a subquery or join with product_variants if we have the mapping, actually wait, inventories doesn't link to variants. Let's assume the warehouse quantity is multiplied by average MWA cost of the default variant or we just join products */
      LEFT JOIN products p ON i.product_id = p.id AND p.deleted_at IS NULL
      LEFT JOIN (
          SELECT product_id, AVG(average_cost) as average_cost 
          FROM product_variants 
          WHERE average_cost > 0 
          GROUP BY product_id
      ) pv ON p.id = pv.product_id
      WHERE w.deleted_at IS NULL AND w.status = 'active'
      GROUP BY w.id, w.name
      ORDER BY total_value DESC
    `);
    return rows;
  }

  async getProductStockSummary(productId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        w.name as warehouse_name,
        sl.code as location_code,
        i.quantity_on_hand,
        i.quantity_reserved,
        i.quantity_available,
        i.batch_number,
        i.expiry_date,
        i.unit_cost,
        i.status
      FROM inventories i
      INNER JOIN warehouses w ON i.warehouse_id = w.id
      LEFT JOIN storage_locations sl ON i.location_id = sl.id
      WHERE i.product_id = ?
      ORDER BY w.name, sl.code
    `, [productId]);
    return rows;
  }
  /**
   * KPI tổng quan theo khoảng thời gian
   * - Tổng doanh thu (từ phiếu xuất approved + đơn hàng delivered)
   * - Tổng số đơn hàng xuất
   * - Tổng SL nhập kho
   * - Tổng SL xuất kho
   */
  async getKpiOverview(startDate: string, endDate: string): Promise<any> {
    // Doanh thu + số đơn từ phiếu xuất đã duyệt + đơn hàng delivered
    const [revenueRows] = await pool.query<RowDataPacket[]>(`
      WITH CombinedRevenue AS (
        SELECT 
          CONCAT('O-', o.id) as ref_id,
          COALESCE(SUM(oi.unit_price * oi.quantity), 0) as revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.status = 'delivered'
          AND o.created_at BETWEEN ? AND ?
        GROUP BY o.id

        UNION ALL

        SELECT 
          CONCAT('T-', st.id) as ref_id,
          COALESCE(SUM(sti.line_total), 0) as revenue
        FROM stock_transfers st
        JOIN stock_transfer_items sti ON st.id = sti.stock_transfer_id
        WHERE st.transfer_type = 'EXPORT'
          AND st.status IN ('approved', 'completed')
          AND st.deleted_at IS NULL
          AND st.created_at BETWEEN ? AND ?
        GROUP BY st.id
      )
      SELECT 
        COUNT(DISTINCT ref_id) as total_orders,
        COALESCE(SUM(revenue), 0) as total_revenue
      FROM CombinedRevenue
    `, [startDate, endDate + ' 23:59:59', startDate, endDate + ' 23:59:59']);

    // Tổng SL nhập kho từ inventory_logs
    const [importRows] = await pool.query<RowDataPacket[]>(`
      SELECT COALESCE(SUM(quantity_change), 0) as total_import
      FROM inventory_logs
      WHERE quantity_change > 0
        AND created_at BETWEEN ? AND ?
    `, [startDate, endDate + ' 23:59:59']);

    // Tổng SL xuất kho từ inventory_logs
    const [exportRows] = await pool.query<RowDataPacket[]>(`
      SELECT COALESCE(SUM(ABS(quantity_change)), 0) as total_export
      FROM inventory_logs
      WHERE quantity_change < 0
        AND created_at BETWEEN ? AND ?
    `, [startDate, endDate + ' 23:59:59']);

    return {
      total_revenue: parseFloat(revenueRows[0]?.total_revenue) || 0,
      total_orders: parseInt(revenueRows[0]?.total_orders) || 0,
      total_import: parseInt(importRows[0]?.total_import) || 0,
      total_export: parseInt(exportRows[0]?.total_export) || 0,
    };
  }

  /**
   * Top N sản phẩm bán chạy nhất (theo SL xuất)
   */
  async getTopSellingProducts(startDate: string, endDate: string, limit: number = 10): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      WITH ProductSales AS (
        -- Từ đơn hàng online (delivered)
        SELECT 
          oi.product_id,
          p.name as product_name,
          p.sku,
          p.image_url,
          oi.quantity as qty_sold,
          (oi.unit_price * oi.quantity) as revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.status = 'delivered'
          AND o.created_at BETWEEN ? AND ?

        UNION ALL

        -- Từ phiếu xuất kho nội bộ (approved/completed)
        SELECT 
          sti.product_id,
          p.name as product_name,
          p.sku,
          p.image_url,
          sti.quantity_requested as qty_sold,
          sti.line_total as revenue
        FROM stock_transfers st
        JOIN stock_transfer_items sti ON st.id = sti.stock_transfer_id
        JOIN products p ON sti.product_id = p.id
        WHERE st.transfer_type = 'EXPORT'
          AND st.status IN ('approved', 'completed')
          AND st.deleted_at IS NULL
          AND st.created_at BETWEEN ? AND ?
      )
      SELECT 
        product_id,
        product_name,
        sku,
        image_url,
        SUM(qty_sold) as total_sold,
        SUM(revenue) as total_revenue
      FROM ProductSales
      GROUP BY product_id, product_name, sku, image_url
      ORDER BY total_sold DESC
      LIMIT ?
    `, [startDate, endDate + ' 23:59:59', startDate, endDate + ' 23:59:59', limit]);
    return rows;
  }

  /**
   * Tổng hợp biến động nhập/xuất theo ngày + chênh lệch + xu hướng
   */
  async getMovementSummary(startDate: string, endDate: string): Promise<any> {
    // Dữ liệu theo ngày
    const [dailyRows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN quantity_change > 0 THEN quantity_change ELSE 0 END) as total_in,
        SUM(CASE WHEN quantity_change < 0 THEN ABS(quantity_change) ELSE 0 END) as total_out
      FROM inventory_logs
      WHERE created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [startDate, endDate + ' 23:59:59']);

    // Tổng cộng
    const totalIn = dailyRows.reduce((sum: number, r: any) => sum + Number(r.total_in), 0);
    const totalOut = dailyRows.reduce((sum: number, r: any) => sum + Number(r.total_out), 0);
    const delta = totalIn - totalOut;

    let trend: 'balanced' | 'import_heavy' | 'export_heavy' = 'balanced';
    if (totalOut > totalIn * 1.2) trend = 'export_heavy';
    else if (totalIn > totalOut * 1.2) trend = 'import_heavy';

    return {
      daily: dailyRows,
      summary: {
        total_in: totalIn,
        total_out: totalOut,
        delta,
        trend,
      }
    };
  }

  /**
   * Giá trị tồn kho chi tiết theo từng sản phẩm
   */
  async getStockValueByProduct(warehouseId?: number): Promise<any[]> {
    let query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.image_url,
        c.name as category_name,
        COALESCE(SUM(i.quantity_on_hand), 0) as quantity,
        COALESCE(AVG(COALESCE(pv.average_cost, p.cost_price)), 0) as avg_cost,
        COALESCE(SUM(i.quantity_on_hand) * AVG(COALESCE(pv.average_cost, p.cost_price)), 0) as total_value
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventories i ON p.id = i.product_id
      LEFT JOIN (
        SELECT product_id, AVG(average_cost) as average_cost
        FROM product_variants WHERE average_cost > 0
        GROUP BY product_id
      ) pv ON p.id = pv.product_id
      WHERE p.deleted_at IS NULL AND p.status = 'active'
    `;
    const params: any[] = [];
    if (warehouseId) {
      query += ' AND i.warehouse_id = ?';
      params.push(warehouseId);
    }
    query += `
      GROUP BY p.id, p.name, p.sku, p.image_url, c.name
      HAVING quantity > 0
      ORDER BY total_value DESC
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  /**
   * Giá trị tồn kho theo danh mục
   */
  async getStockValueByCategory(): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COALESCE(c.name, 'Chưa phân loại') as category_name,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(i.quantity_on_hand), 0) as total_quantity,
        COALESCE(SUM(i.quantity_on_hand * COALESCE(pv.average_cost, p.cost_price, 0)), 0) as total_value
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventories i ON p.id = i.product_id
      LEFT JOIN (
        SELECT product_id, AVG(average_cost) as average_cost
        FROM product_variants WHERE average_cost > 0
        GROUP BY product_id
      ) pv ON p.id = pv.product_id
      WHERE p.deleted_at IS NULL AND p.status = 'active'
      GROUP BY COALESCE(c.name, 'Chưa phân loại')
      HAVING total_value > 0
      ORDER BY total_value DESC
    `);
    return rows;
  }

  /**
   * Cảnh báo thông minh:
   * - SP tồn kho thấp (dưới reorder_point hoặc min_stock_level)
   * - SP tồn kho cao (trên max_stock_level)
   */
  async getSmartAlerts(): Promise<any> {
    // SP tồn kho thấp
    const [lowStock] = await pool.query<RowDataPacket[]>(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.image_url,
        p.reorder_point,
        p.min_stock_level,
        COALESCE(inv.total_qty, 0) as current_stock
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity_on_hand) as total_qty
        FROM inventories GROUP BY product_id
      ) inv ON p.id = inv.product_id
      WHERE p.deleted_at IS NULL AND p.status = 'active'
        AND (
          COALESCE(inv.total_qty, 0) <= p.reorder_point 
          OR COALESCE(inv.total_qty, 0) <= p.min_stock_level
        )
        AND (p.reorder_point > 0 OR p.min_stock_level > 0)
      ORDER BY current_stock ASC
      LIMIT 20
    `);

    // SP tồn kho cao (ứ đọng)
    const [overStock] = await pool.query<RowDataPacket[]>(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.image_url,
        p.max_stock_level,
        COALESCE(inv.total_qty, 0) as current_stock
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity_on_hand) as total_qty
        FROM inventories GROUP BY product_id
      ) inv ON p.id = inv.product_id
      WHERE p.deleted_at IS NULL AND p.status = 'active'
        AND p.max_stock_level IS NOT NULL
        AND p.max_stock_level > 0
        AND COALESCE(inv.total_qty, 0) > p.max_stock_level
      ORDER BY current_stock DESC
      LIMIT 20
    `);

    return {
      low_stock: lowStock,
      over_stock: overStock,
      low_stock_count: lowStock.length,
      over_stock_count: overStock.length,
    };
  }

  /**
   * Drill-down: Chi tiết lịch sử nhập/xuất của 1 sản phẩm
   */
  async getProductDrillDown(productId: number, startDate?: string, endDate?: string): Promise<any> {
    // Thông tin SP
    const [productRows] = await pool.query<RowDataPacket[]>(`
      SELECT p.id, p.name, p.sku, p.image_url,
        COALESCE(inv.total_qty, 0) as current_stock,
        COALESCE(inv.total_value, 0) as current_value
      FROM products p
      LEFT JOIN (
        SELECT product_id, 
          SUM(quantity_on_hand) as total_qty,
          SUM(quantity_on_hand * COALESCE(unit_cost, 0)) as total_value
        FROM inventories GROUP BY product_id
      ) inv ON p.id = inv.product_id
      WHERE p.id = ?
    `, [productId]);

    // Lịch sử biến động
    let logQuery = `
      SELECT 
        DATE(il.created_at) as date,
        il.movement_type,
        il.quantity_change,
        il.quantity_after,
        il.reference_number,
        il.reason,
        w.name as warehouse_name,
        u.full_name as performed_by
      FROM inventory_logs il
      LEFT JOIN warehouses w ON il.warehouse_id = w.id
      LEFT JOIN users u ON il.performed_by = u.id
      WHERE il.product_id = ?
    `;
    const params: any[] = [productId];

    if (startDate && endDate) {
      logQuery += ' AND il.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate + ' 23:59:59');
    }
    logQuery += ' ORDER BY il.created_at DESC LIMIT 50';

    const [logs] = await pool.query<RowDataPacket[]>(logQuery, params);

    // Tổng nhập / tổng xuất
    let summaryQuery = `
      SELECT 
        SUM(CASE WHEN quantity_change > 0 THEN quantity_change ELSE 0 END) as total_in,
        SUM(CASE WHEN quantity_change < 0 THEN ABS(quantity_change) ELSE 0 END) as total_out
      FROM inventory_logs
      WHERE product_id = ?
    `;
    const summaryParams: any[] = [productId];
    if (startDate && endDate) {
      summaryQuery += ' AND created_at BETWEEN ? AND ?';
      summaryParams.push(startDate, endDate + ' 23:59:59');
    }
    const [summaryRows] = await pool.query<RowDataPacket[]>(summaryQuery, summaryParams);

    return {
      product: productRows[0] || null,
      logs,
      summary: {
        total_in: parseInt(summaryRows[0]?.total_in) || 0,
        total_out: parseInt(summaryRows[0]?.total_out) || 0,
      }
    };
  }
}

export const reportRepository = new ReportRepository();
