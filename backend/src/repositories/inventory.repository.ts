import pool from '../config/database';
import { Inventory, InventoryLog, InventoryAdjustmentDto, PaginatedResult } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class InventoryRepository {
    async findAll(
        page: number = 1,
        limit: number = 10,
        warehouseId?: number,
        productId?: number,
        status?: string
    ): Promise<PaginatedResult<Inventory & { product_name: string; warehouse_name: string }>> {
        let countQuery = `
            SELECT COUNT(*) as total FROM inventories i 
            INNER JOIN products p ON i.product_id = p.id
            LEFT JOIN product_variants pv ON i.product_variant_id = pv.id
            WHERE p.deleted_at IS NULL AND (pv.id IS NULL OR pv.is_active = 1)
        `;
        let dataQuery = `
      SELECT i.*, p.name as product_name, p.sku, w.name as warehouse_name, sl.code as location_code,
             pv.sku as variant_sku, pv.price as variant_price,
             CONCAT_WS(' / ', pv.color, pv.size, pv.storage, pv.ram, pv.material, pv.capacity) as variant_label,
             (i.quantity_on_hand - i.quantity_reserved) as quantity_available
      FROM inventories i
      INNER JOIN products p ON i.product_id = p.id
      INNER JOIN warehouses w ON i.warehouse_id = w.id
      LEFT JOIN storage_locations sl ON i.location_id = sl.id
      LEFT JOIN product_variants pv ON i.product_variant_id = pv.id
      WHERE p.deleted_at IS NULL AND (pv.id IS NULL OR pv.is_active = 1)
    `;
        const params: any[] = [];
        const countParams: any[] = [];

        if (warehouseId) {
            dataQuery += ' AND i.warehouse_id = ?';
            countQuery += ' AND i.warehouse_id = ?';
            params.push(warehouseId);
            countParams.push(warehouseId);
        }

        if (productId) {
            dataQuery += ' AND i.product_id = ?';
            countQuery += ' AND i.product_id = ?';
            params.push(productId);
            countParams.push(productId);
        }

        if (status) {
            dataQuery += ' AND i.status = ?';
            countQuery += ' AND i.status = ?';
            params.push(status);
            countParams.push(status);
        }

        dataQuery += ' ORDER BY p.id DESC, i.product_variant_id ASC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(limit, offset);

        const [countRows] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = countRows[0].total;

        const [rows] = await pool.query<RowDataPacket[]>(dataQuery, params);

        return {
            data: rows as (Inventory & { product_name: string; warehouse_name: string })[],
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: number): Promise<Inventory | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT i.*, p.name as product_name, p.sku, w.name as warehouse_name
      FROM inventories i
      INNER JOIN products p ON i.product_id = p.id
      INNER JOIN warehouses w ON i.warehouse_id = w.id
      WHERE i.id = ?
    `, [id]);

        return rows.length > 0 ? (rows[0] as Inventory) : null;
    }

    async findByProductAndWarehouse(
        productId: number,
        warehouseId: number,
        locationId?: number
    ): Promise<Inventory | null> {
        let query = `
      SELECT * FROM inventories 
      WHERE product_id = ? AND warehouse_id = ?
    `;
        const params: any[] = [productId, warehouseId];

        if (locationId) {
            query += ' AND location_id = ?';
            params.push(locationId);
        } else {
            query += ' AND location_id IS NULL';
        }

        const [rows] = await pool.query<RowDataPacket[]>(query, params);
        return rows.length > 0 ? (rows[0] as Inventory) : null;
    }

    async getLowStockItems(): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT p.id, p.name, p.sku, p.min_stock_level, p.reorder_point,
             COALESCE(SUM(i.quantity_on_hand), 0) as total_quantity
      FROM products p
      LEFT JOIN inventories i ON p.id = i.product_id
      WHERE p.deleted_at IS NULL AND p.status = 'active'
      GROUP BY p.id
      HAVING total_quantity <= p.reorder_point OR total_quantity <= p.min_stock_level
      ORDER BY total_quantity ASC
    `);
        return rows;
    }

    async getUnderTenStockItems(): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT i.id, p.name, COALESCE(pv.sku, p.sku) as sku, 
             CONCAT_WS(' / ', pv.color, pv.size, pv.storage, pv.ram, pv.material, pv.capacity) as variant_label,
             i.quantity_on_hand as total_quantity
      FROM inventories i
      INNER JOIN products p ON i.product_id = p.id
      LEFT JOIN product_variants pv ON i.product_variant_id = pv.id
      WHERE p.deleted_at IS NULL AND p.status = 'active'
      AND i.quantity_on_hand < 10
      ORDER BY i.quantity_on_hand ASC
    `);
        return rows;
    }

    async adjustInventory(dto: InventoryAdjustmentDto, userId?: number): Promise<number> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Find or create inventory record
            let inventory = await this.findByProductAndWarehouse(
                dto.product_id,
                dto.warehouse_id,
                dto.location_id
            );

            const quantityChange = dto.adjustment_type === 'in' ? dto.quantity : -dto.quantity;
            let inventoryId: number;

            if (inventory) {
                const newQuantity = inventory.quantity_on_hand + quantityChange;
                if (newQuantity < 0) {
                    throw new Error('Insufficient inventory quantity');
                }

                await connection.query(`
          UPDATE inventories 
          SET quantity_on_hand = ?, last_movement_date = NOW()
          WHERE id = ?
        `, [newQuantity, inventory.id]);

                inventoryId = inventory.id;

                // Log the movement
                await connection.query(`
          INSERT INTO inventory_logs (
            inventory_id, product_id, warehouse_id, location_id,
            movement_type, quantity_before, quantity_change, quantity_after,
            reason, notes, performed_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                    inventory.id,
                    dto.product_id,
                    dto.warehouse_id,
                    dto.location_id || null,
                    dto.adjustment_type === 'in' ? 'adjustment_in' : 'adjustment_out',
                    inventory.quantity_on_hand,
                    quantityChange,
                    newQuantity,
                    dto.reason,
                    dto.notes || null,
                    userId || null,
                ]);
            } else {
                if (quantityChange < 0) {
                    throw new Error('Cannot create negative inventory');
                }

                const [result] = await connection.query<ResultSetHeader>(`
          INSERT INTO inventories (
            product_id, warehouse_id, location_id, quantity_on_hand,
            status, last_movement_date
          ) VALUES (?, ?, ?, ?, 'available', NOW())
        `, [dto.product_id, dto.warehouse_id, dto.location_id || null, dto.quantity]);

                inventoryId = result.insertId;

                // Log the movement
                await connection.query(`
          INSERT INTO inventory_logs (
            inventory_id, product_id, warehouse_id, location_id,
            movement_type, quantity_before, quantity_change, quantity_after,
            reason, notes, performed_by
          ) VALUES (?, ?, ?, ?, 'adjustment_in', 0, ?, ?, ?, ?, ?)
        `, [
                    inventoryId,
                    dto.product_id,
                    dto.warehouse_id,
                    dto.location_id || null,
                    dto.quantity,
                    dto.quantity,
                    dto.reason,
                    dto.notes || null,
                    userId || null,
                ]);
            }

            await connection.commit();
            return inventoryId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async getMovementLogs(
        page: number = 1,
        limit: number = 20,
        inventoryId?: number,
        productId?: number,
        warehouseId?: number,
        startDate?: string,
        endDate?: string
    ): Promise<PaginatedResult<InventoryLog>> {
        let countQuery = 'SELECT COUNT(*) as total FROM inventory_logs WHERE 1=1';
        let dataQuery = `
      SELECT il.*, p.name as product_name, w.name as warehouse_name, u.full_name as performed_by_name
      FROM inventory_logs il
      INNER JOIN products p ON il.product_id = p.id
      INNER JOIN warehouses w ON il.warehouse_id = w.id
      LEFT JOIN users u ON il.performed_by = u.id
      WHERE 1=1
    `;
        const params: any[] = [];
        const countParams: any[] = [];

        if (inventoryId) {
            dataQuery += ' AND il.inventory_id = ?';
            countQuery += ' AND inventory_id = ?';
            params.push(inventoryId);
            countParams.push(inventoryId);
        }

        if (productId) {
            dataQuery += ' AND il.product_id = ?';
            countQuery += ' AND product_id = ?';
            params.push(productId);
            countParams.push(productId);
        }

        if (warehouseId) {
            dataQuery += ' AND il.warehouse_id = ?';
            countQuery += ' AND warehouse_id = ?';
            params.push(warehouseId);
            countParams.push(warehouseId);
        }

        if (startDate) {
            dataQuery += ' AND il.created_at >= ?';
            countQuery += ' AND created_at >= ?';
            params.push(startDate);
            countParams.push(startDate);
        }

        if (endDate) {
            dataQuery += ' AND il.created_at <= ?';
            countQuery += ' AND created_at <= ?';
            params.push(endDate);
            countParams.push(endDate);
        }

        dataQuery += ' ORDER BY il.created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(limit, offset);

        const [countRows] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = countRows[0].total;

        const [rows] = await pool.query<RowDataPacket[]>(dataQuery, params);

        return {
            data: rows as InventoryLog[],
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Báo cáo Nhập – Xuất – Tồn theo khoảng thời gian cho 1 inventory record
     * - ton_dau: tổng biến động trước from_date (mọi nghiệp vụ làm thay đổi tồn thực tế)
     * - nhap_trong_ky: tổng biến động dương trong khoảng
     * - xuat_trong_ky: tổng trị tuyệt đối biến động âm trong khoảng
     * - ton_cuoi = ton_dau + nhap - xuat
     */
    async getInventoryReport(
        inventoryId: number,
        fromDate: string,
        toDate: string
    ): Promise<{ ton_dau: number; nhap_trong_ky: number; xuat_trong_ky: number; ton_cuoi: number }> {
        // Lọc các movement thực sự thay đổi on_hand (quantity_after != quantity_before)
        // Điều này giúp bao quát mọi loại nghiệp vụ thực tế trong DB và loại trừ RESERVE/RELEASE

        // 1. Tồn đầu kỳ: tổng quantity_change trước from_date
        const [tonDauRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(quantity_change), 0) AS ton_dau
             FROM inventory_logs
             WHERE inventory_id = ?
               AND quantity_after != quantity_before
               AND created_at < ?`,
            [inventoryId, fromDate]
        );
        const ton_dau = Number(tonDauRows[0].ton_dau) || 0;

        // 2. Nhập trong kỳ: tổng quantity_change > 0 trong khoảng
        const [nhapRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(quantity_change), 0) AS nhap
             FROM inventory_logs
             WHERE inventory_id = ?
               AND quantity_after != quantity_before
               AND quantity_change > 0
               AND created_at >= ? AND created_at <= ?`,
            [inventoryId, fromDate, toDate]
        );
        const nhap_trong_ky = Number(nhapRows[0].nhap) || 0;

        // 3. Xuất trong kỳ: tổng trị tuyệt đối quantity_change < 0 trong khoảng
        const [xuatRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(ABS(quantity_change)), 0) AS xuat
             FROM inventory_logs
             WHERE inventory_id = ?
               AND quantity_after != quantity_before
               AND quantity_change < 0
               AND created_at >= ? AND created_at <= ?`,
            [inventoryId, fromDate, toDate]
        );
        const xuat_trong_ky = Number(xuatRows[0].xuat) || 0;

        // 4. Tồn cuối kỳ
        const ton_cuoi = ton_dau + nhap_trong_ky - xuat_trong_ky;

        return { ton_dau, nhap_trong_ky, xuat_trong_ky, ton_cuoi };
    }

    async getProductPerformanceMetrics(inventoryId: number): Promise<{ totalCompletedOrders: number, totalRevenue: number, totalCost: number, totalProfit: number }> {
        // Find the variant_id for this inventory item
        const [invRows] = await pool.query<RowDataPacket[]>(
            `SELECT product_variant_id FROM inventories WHERE id = ?`,
            [inventoryId]
        );

        if (invRows.length === 0 || !invRows[0].product_variant_id) {
            return { totalCompletedOrders: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 };
        }

        const variantId = invRows[0].product_variant_id;

        // 1. Get metrics from Customer Orders
        const [orderMetricsRows] = await pool.query<RowDataPacket[]>(
            `SELECT 
                COUNT(DISTINCT o.id) as total_completed_orders,
                COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue,
                COALESCE(SUM(oi.quantity * oi.cost_price_snapshot), 0) as total_cost
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE oi.variant_id = ? AND o.status = 'delivered'`,
            [variantId]
        );

        // 2. Get metrics from Export Slips
        const [exportMetricsRows] = await pool.query<RowDataPacket[]>(
            `SELECT 
                COUNT(DISTINCT st.id) as export_completed_orders,
                COALESCE(SUM(sti.line_total), 0) as export_revenue,
                COALESCE(SUM(sti.cost_of_goods_sold), 0) as export_cost
             FROM stock_transfer_items sti
             JOIN stock_transfers st ON sti.stock_transfer_id = st.id
             WHERE sti.product_variant_id = ? AND st.transfer_type = 'EXPORT' AND st.status = 'approved'`,
            [variantId]
        );

        const orderMetrics = orderMetricsRows[0];
        const exportMetrics = exportMetricsRows[0];

        const totalOrders = Number(orderMetrics.total_completed_orders) + Number(exportMetrics.export_completed_orders);
        const revenue = Number(orderMetrics.total_revenue) + Number(exportMetrics.export_revenue);
        const cost = Number(orderMetrics.total_cost) + Number(exportMetrics.export_cost);

        return {
            totalCompletedOrders: totalOrders,
            totalRevenue: revenue,
            totalCost: cost,
            totalProfit: revenue - cost
        };
    }
}
export const inventoryRepository = new InventoryRepository();
