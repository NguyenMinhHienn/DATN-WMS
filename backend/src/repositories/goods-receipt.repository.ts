import pool from '../config/database';
import { GoodsReceipt, GoodsReceiptItem, CreateGoodsReceiptDto, PaginatedResult } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class GoodsReceiptRepository {
    async findAll(
        page: number = 1,
        limit: number = 10,
        warehouseId?: number,
        status?: string,
        startDate?: string,
        endDate?: string
    ): Promise<PaginatedResult<GoodsReceipt>> {
        let countQuery = 'SELECT COUNT(*) as total FROM goods_receipts WHERE deleted_at IS NULL';
        let dataQuery = `
      SELECT gr.*, w.name as warehouse_name, s.name as supplier_name,
             u.full_name as created_by_name, ua.full_name as approved_by_name
      FROM goods_receipts gr
      INNER JOIN warehouses w ON gr.warehouse_id = w.id
      LEFT JOIN suppliers s ON gr.supplier_id = s.id
      LEFT JOIN users u ON gr.created_by = u.id
      LEFT JOIN users ua ON gr.approved_by = ua.id
      WHERE gr.deleted_at IS NULL
    `;
        const params: any[] = [];
        const countParams: any[] = [];

        if (warehouseId) {
            dataQuery += ' AND gr.warehouse_id = ?';
            countQuery += ' AND warehouse_id = ?';
            params.push(warehouseId);
            countParams.push(warehouseId);
        }

        if (status) {
            dataQuery += ' AND gr.status = ?';
            countQuery += ' AND status = ?';
            params.push(status);
            countParams.push(status);
        }

        if (startDate) {
            dataQuery += ' AND gr.receipt_date >= ?';
            countQuery += ' AND receipt_date >= ?';
            params.push(startDate);
            countParams.push(startDate);
        }

        if (endDate) {
            dataQuery += ' AND gr.receipt_date <= ?';
            countQuery += ' AND receipt_date <= ?';
            params.push(endDate);
            countParams.push(endDate);
        }

        dataQuery += ' ORDER BY gr.created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(limit, offset);

        const [countRows] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = countRows[0].total;

        const [rows] = await pool.query<RowDataPacket[]>(dataQuery, params);

        return {
            data: rows as GoodsReceipt[],
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: number): Promise<GoodsReceipt | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT gr.*, w.name as warehouse_name, s.name as supplier_name,
             u.full_name as created_by_name, ua.full_name as approved_by_name
      FROM goods_receipts gr
      INNER JOIN warehouses w ON gr.warehouse_id = w.id
      LEFT JOIN suppliers s ON gr.supplier_id = s.id
      LEFT JOIN users u ON gr.created_by = u.id
      LEFT JOIN users ua ON gr.approved_by = ua.id
      WHERE gr.id = ? AND gr.deleted_at IS NULL
    `, [id]);

        return rows.length > 0 ? (rows[0] as GoodsReceipt) : null;
    }

    async getItems(receiptId: number): Promise<GoodsReceiptItem[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT gri.*, p.name as product_name, p.sku,
             pv.sku as variant_sku, pv.stock as current_stock,
             un.name as unit_name,
             sl.code as location_code
      FROM goods_receipt_items gri
      INNER JOIN products p ON gri.product_id = p.id
      LEFT JOIN product_variants pv ON gri.product_variant_id = pv.id
      LEFT JOIN units un ON p.unit_id = un.id
      LEFT JOIN storage_locations sl ON gri.location_id = sl.id
      WHERE gri.goods_receipt_id = ?
    `, [receiptId]);

        return rows as GoodsReceiptItem[];
    }

    async generateReceiptNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM goods_receipts 
      WHERE YEAR(created_at) = ?
    `, [year]);

        const count = rows[0].count + 1;
        return `PN-${year}-${count.toString().padStart(4, '0')}`;
    }

    async create(dto: CreateGoodsReceiptDto, userId?: number): Promise<number> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const receiptNumber = await this.generateReceiptNumber();

            // Calculate totals
            let totalItems = dto.items.length;
            let totalQuantity = 0;
            let subtotal = 0;

            for (const item of dto.items) {
                totalQuantity += item.quantity_expected;
                subtotal += item.quantity_expected * item.unit_cost;
            }

            const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO goods_receipts (
          receipt_number, receipt_type, supplier_id, source_warehouse_id,
          purchase_order_number, warehouse_id, receipt_date, expected_date,
          total_items, total_quantity, subtotal, total_amount, status,
          shipping_method, notes, delivery_person, storekeeper, reference_document,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)
      `, [
                receiptNumber,
                dto.receipt_type,
                dto.supplier_id || null,
                dto.source_warehouse_id || null,
                dto.purchase_order_number || null,
                dto.warehouse_id,
                dto.receipt_date,
                dto.expected_date || null,
                totalItems,
                totalQuantity,
                subtotal,
                subtotal,
                dto.shipping_method || null,
                dto.notes || null,
                dto.delivery_person || null,
                dto.storekeeper || null,
                dto.reference_document || null,
                userId || null,
            ]);

            const receiptId = result.insertId;

            // Insert items
            for (const item of dto.items) {
                const lineTotal = item.quantity_expected * item.unit_cost;
                await connection.query(`
          INSERT INTO goods_receipt_items (
            goods_receipt_id, product_id, product_variant_id, location_id, 
            quantity_expected, quantity_document, quantity_actual,
            unit_cost, line_total, batch_number, manufacturing_date, expiry_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                    receiptId,
                    item.product_id,
                    item.product_variant_id || null,
                    item.location_id || null,
                    item.quantity_expected,
                    item.quantity_document || item.quantity_expected,
                    item.quantity_actual || item.quantity_expected,
                    item.unit_cost,
                    lineTotal,
                    item.batch_number || null,
                    item.manufacturing_date || null,
                    item.expiry_date || null,
                ]);
            }

            await connection.commit();
            return receiptId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async approveReceipt(id: number, userId?: number): Promise<boolean> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Get receipt and items
            const receipt = await this.findById(id);
            if (!receipt) {
                throw new Error('Receipt not found');
            }

            const items = await this.getItems(id);

            // Update inventory for each item
            for (const item of items) {
                const actualQty = item.quantity_actual || item.quantity_expected;

                // Find existing inventory or create new
                const [existing] = await connection.query<RowDataPacket[]>(`
          SELECT * FROM inventories 
          WHERE product_id = ? AND warehouse_id = ? AND (location_id = ? OR (location_id IS NULL AND ? IS NULL))
        `, [item.product_id, receipt.warehouse_id, item.location_id, item.location_id]);

                if (existing.length > 0) {
                    await connection.query(`
            UPDATE inventories 
            SET quantity_on_hand = quantity_on_hand + ?, last_movement_date = NOW()
            WHERE id = ?
          `, [actualQty, existing[0].id]);

                    // Log movement
                    await connection.query(`
            INSERT INTO inventory_logs (
              inventory_id, product_id, warehouse_id, location_id,
              movement_type, reference_type, reference_id, reference_number,
              quantity_before, quantity_change, quantity_after,
              unit_cost, total_cost, performed_by
            ) VALUES (?, ?, ?, ?, 'goods_receipt', 'goods_receipt', ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
                        existing[0].id,
                        item.product_id,
                        receipt.warehouse_id,
                        item.location_id,
                        id,
                        receipt.receipt_number,
                        existing[0].quantity_on_hand,
                        actualQty,
                        existing[0].quantity_on_hand + actualQty,
                        item.unit_cost,
                        actualQty * item.unit_cost,
                        userId,
                    ]);
                } else {
                    const [newInv] = await connection.query<ResultSetHeader>(`
            INSERT INTO inventories (
              product_id, warehouse_id, location_id, quantity_on_hand,
              unit_cost, status, last_movement_date
            ) VALUES (?, ?, ?, ?, ?, 'available', NOW())
          `, [item.product_id, receipt.warehouse_id, item.location_id, actualQty, item.unit_cost]);

                    await connection.query(`
            INSERT INTO inventory_logs (
              inventory_id, product_id, warehouse_id, location_id,
              movement_type, reference_type, reference_id, reference_number,
              quantity_before, quantity_change, quantity_after,
              unit_cost, total_cost, performed_by
            ) VALUES (?, ?, ?, ?, 'goods_receipt', 'goods_receipt', ?, ?, 0, ?, ?, ?, ?, ?)
          `, [
                        newInv.insertId,
                        item.product_id,
                        receipt.warehouse_id,
                        item.location_id,
                        id,
                        receipt.receipt_number,
                        actualQty,
                        actualQty,
                        item.unit_cost,
                        actualQty * item.unit_cost,
                        userId,
                    ]);
                }

                // Update item as received
                await connection.query(`
          UPDATE goods_receipt_items 
          SET quantity_received = ?, quality_status = 'passed'
          WHERE id = ?
        `, [actualQty, item.id]);

                // Update variant stock + MWA
                if (item.product_variant_id) {
                    const [vr] = await connection.query<RowDataPacket[]>(
                        'SELECT stock, average_cost FROM product_variants WHERE id = ?',
                        [item.product_variant_id]
                    );

                    if (vr.length > 0) {
                        const oldStock = Number(vr[0].stock) || 0;
                        const oldAvg = Number(vr[0].average_cost) || 0;
                        const newQty = actualQty;
                        const totalStock = oldStock + newQty;

                        // Tính MWA
                        const newAvg = totalStock > 0
                            ? Math.round(((oldStock * oldAvg) + (newQty * item.unit_cost)) / totalStock)
                            : item.unit_cost;

                        await connection.query(
                            'UPDATE product_variants SET stock = ?, average_cost = ?, updated_at = NOW() WHERE id = ?',
                            [totalStock, newAvg, item.product_variant_id]
                        );
                    }
                }
            }

            // Update receipt status
            await connection.query(`
        UPDATE goods_receipts 
        SET status = 'APPROVED', received_by = ?, approved_by = ?, approved_at = NOW()
        WHERE id = ?
      `, [userId, userId, id]);

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
      UPDATE goods_receipts SET status = ? WHERE id = ?
    `, [status, id]);

        return result.affectedRows > 0;
    }

    async delete(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
      UPDATE goods_receipts SET deleted_at = NOW() WHERE id = ? AND status = 'PENDING'
    `, [id]);

        return result.affectedRows > 0;
    }
}

export const goodsReceiptRepository = new GoodsReceiptRepository();
