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
      SELECT COALESCE(SUM(i.quantity_on_hand * COALESCE(i.unit_cost, p.cost_price, p.selling_price, 0)), 0) as total_value
      FROM inventories i
      INNER JOIN products p ON i.product_id = p.id
      WHERE p.deleted_at IS NULL
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
        COALESCE(i.unit_cost, p.cost_price) as unit_cost,
        COALESCE(i.quantity_on_hand * COALESCE(i.unit_cost, p.cost_price), 0) as total_value
      FROM products p
      CROSS JOIN warehouses w
      LEFT JOIN inventories i ON p.id = i.product_id AND w.id = i.warehouse_id
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
        DATE(il.created_at) as date,
        il.movement_type,
        p.name as product_name,
        w.name as warehouse_name,
        il.quantity_change,
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
        SUM(i.quantity_on_hand * COALESCE(i.unit_cost, p.cost_price, p.selling_price, 0)) as total_value
      FROM warehouses w
      LEFT JOIN inventories i ON w.id = i.warehouse_id
      LEFT JOIN products p ON i.product_id = p.id AND p.deleted_at IS NULL
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
}

export const reportRepository = new ReportRepository();
