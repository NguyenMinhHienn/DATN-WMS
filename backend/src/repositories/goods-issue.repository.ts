import pool from '../config/database';
import { GoodsIssue, GoodsIssueItem, CreateGoodsIssueDto, PaginatedResult } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class GoodsIssueRepository {
    async findAll(
        page: number = 1,
        limit: number = 10,
        warehouseId?: number,
        status?: string,
        startDate?: string,
        endDate?: string
    ): Promise<PaginatedResult<GoodsIssue>> {
        let countQuery = 'SELECT COUNT(*) as total FROM goods_issues WHERE deleted_at IS NULL';
        let dataQuery = `
      SELECT gi.*, w.name as warehouse_name, u.full_name as created_by_name
      FROM goods_issues gi
      INNER JOIN warehouses w ON gi.warehouse_id = w.id
      LEFT JOIN users u ON gi.created_by = u.id
      WHERE gi.deleted_at IS NULL
    `;
        const params: any[] = [];
        const countParams: any[] = [];

        if (warehouseId) {
            dataQuery += ' AND gi.warehouse_id = ?';
            countQuery += ' AND warehouse_id = ?';
            params.push(warehouseId);
            countParams.push(warehouseId);
        }

        if (status) {
            dataQuery += ' AND gi.status = ?';
            countQuery += ' AND status = ?';
            params.push(status);
            countParams.push(status);
        }

        if (startDate) {
            dataQuery += ' AND gi.issue_date >= ?';
            countQuery += ' AND issue_date >= ?';
            params.push(startDate);
            countParams.push(startDate);
        }

        if (endDate) {
            dataQuery += ' AND gi.issue_date <= ?';
            countQuery += ' AND issue_date <= ?';
            params.push(endDate);
            countParams.push(endDate);
        }

        dataQuery += ' ORDER BY gi.created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(limit, offset);

        const [countRows] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = countRows[0].total;

        const [rows] = await pool.query<RowDataPacket[]>(dataQuery, params);

        return {
            data: rows as GoodsIssue[],
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: number): Promise<GoodsIssue | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT gi.*, w.name as warehouse_name
      FROM goods_issues gi
      INNER JOIN warehouses w ON gi.warehouse_id = w.id
      WHERE gi.id = ? AND gi.deleted_at IS NULL
    `, [id]);

        return rows.length > 0 ? (rows[0] as GoodsIssue) : null;
    }

    async getItems(issueId: number): Promise<GoodsIssueItem[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT gii.*, p.name as product_name, p.sku, sl.code as location_code
      FROM goods_issue_items gii
      INNER JOIN products p ON gii.product_id = p.id
      LEFT JOIN storage_locations sl ON gii.location_id = sl.id
      WHERE gii.goods_issue_id = ?
    `, [issueId]);

        return rows as GoodsIssueItem[];
    }

    async generateIssueNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM goods_issues 
      WHERE YEAR(created_at) = ?
    `, [year]);

        const count = rows[0].count + 1;
        return `GI-${year}-${count.toString().padStart(6, '0')}`;
    }

    async create(dto: CreateGoodsIssueDto, userId?: number): Promise<number> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const issueNumber = await this.generateIssueNumber();

            let totalItems = dto.items.length;
            let totalQuantity = 0;
            let subtotal = 0;

            for (const item of dto.items) {
                totalQuantity += item.quantity_requested;
                subtotal += item.quantity_requested * item.unit_price;
            }

            const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO goods_issues (
          issue_number, issue_type, warehouse_id, destination_warehouse_id,
          customer_name, customer_address, customer_phone, customer_email,
          sales_order_number, issue_date, required_date, total_items,
          total_quantity, subtotal, total_amount, status, priority, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
      `, [
                issueNumber,
                dto.issue_type,
                dto.warehouse_id,
                dto.destination_warehouse_id || null,
                dto.customer_name || null,
                dto.customer_address || null,
                dto.customer_phone || null,
                dto.customer_email || null,
                dto.sales_order_number || null,
                dto.issue_date,
                dto.required_date || null,
                totalItems,
                totalQuantity,
                subtotal,
                subtotal,
                dto.priority || 'normal',
                dto.notes || null,
                userId || null,
            ]);

            const issueId = result.insertId;

            for (const item of dto.items) {
                const lineTotal = item.quantity_requested * item.unit_price;
                await connection.query(`
          INSERT INTO goods_issue_items (
            goods_issue_id, product_id, location_id, quantity_requested,
            unit_price, line_total, batch_number
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
                    issueId,
                    item.product_id,
                    item.location_id || null,
                    item.quantity_requested,
                    item.unit_price,
                    lineTotal,
                    item.batch_number || null,
                ]);
            }

            await connection.commit();
            return issueId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async shipIssue(id: number, userId?: number): Promise<boolean> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const issue = await this.findById(id);
            if (!issue) {
                throw new Error('Issue not found');
            }

            const items = await this.getItems(id);

            for (const item of items) {
                const [existing] = await connection.query<RowDataPacket[]>(`
          SELECT * FROM inventories 
          WHERE product_id = ? AND warehouse_id = ? 
          AND quantity_on_hand >= ?
          ORDER BY expiry_date ASC, created_at ASC
          LIMIT 1
        `, [item.product_id, issue.warehouse_id, item.quantity_requested]);

                if (existing.length === 0) {
                    throw new Error(`Insufficient inventory for product ${item.product_id}`);
                }

                const inventory = existing[0];
                const newQuantity = inventory.quantity_on_hand - item.quantity_requested;

                await connection.query(`
          UPDATE inventories 
          SET quantity_on_hand = ?, last_movement_date = NOW()
          WHERE id = ?
        `, [newQuantity, inventory.id]);

                await connection.query(`
          INSERT INTO inventory_logs (
            inventory_id, product_id, warehouse_id, location_id,
            movement_type, reference_type, reference_id, reference_number,
            quantity_before, quantity_change, quantity_after,
            unit_cost, total_cost, performed_by
          ) VALUES (?, ?, ?, ?, 'goods_issue', 'goods_issue', ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                    inventory.id,
                    item.product_id,
                    issue.warehouse_id,
                    item.location_id,
                    id,
                    issue.issue_number,
                    inventory.quantity_on_hand,
                    -item.quantity_requested,
                    newQuantity,
                    inventory.unit_cost || 0,
                    item.quantity_requested * (inventory.unit_cost || 0),
                    userId,
                ]);

                await connection.query(`
          UPDATE goods_issue_items 
          SET quantity_picked = ?, quantity_shipped = ?, pick_status = 'completed'
          WHERE id = ?
        `, [item.quantity_requested, item.quantity_requested, item.id]);
            }

            await connection.query(`
        UPDATE goods_issues 
        SET status = 'shipped', shipped_date = CURDATE(), issued_by = ?
        WHERE id = ?
      `, [userId, id]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async updateStatus(id: number, status: string): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
      UPDATE goods_issues SET status = ? WHERE id = ?
    `, [status, id]);

        return result.affectedRows > 0;
    }

    async delete(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
      UPDATE goods_issues SET deleted_at = NOW() WHERE id = ? AND status = 'draft'
    `, [id]);

        return result.affectedRows > 0;
    }
}

export const goodsIssueRepository = new GoodsIssueRepository();
