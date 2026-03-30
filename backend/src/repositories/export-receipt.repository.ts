import pool from '../config/database';
import { ExportReceipt, ExportReceiptItem, CreateExportReceiptDto, PaginatedResult } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class ExportReceiptRepository {
    async findAll(
        page: number = 1,
        limit: number = 10,
        warehouseId?: number,
        status?: string,
        startDate?: string,
        endDate?: string
    ): Promise<PaginatedResult<ExportReceipt>> {
        let countQuery = 'SELECT COUNT(*) as total FROM export_receipts WHERE deleted_at IS NULL';
        let dataQuery = `
      SELECT er.*, w.name as warehouse_name,
             u.full_name as created_by_name, ua.full_name as approved_by_name
      FROM export_receipts er
      INNER JOIN warehouses w ON er.warehouse_id = w.id
      LEFT JOIN users u ON er.created_by = u.id
      LEFT JOIN users ua ON er.approved_by = ua.id
      WHERE er.deleted_at IS NULL
    `;
        const params: any[] = [];
        const countParams: any[] = [];

        if (warehouseId) {
            dataQuery += ' AND er.warehouse_id = ?';
            countQuery += ' AND warehouse_id = ?';
            params.push(warehouseId);
            countParams.push(warehouseId);
        }

        if (status) {
            dataQuery += ' AND er.status = ?';
            countQuery += ' AND status = ?';
            params.push(status);
            countParams.push(status);
        }

        if (startDate) {
            dataQuery += ' AND er.receipt_date >= ?';
            countQuery += ' AND receipt_date >= ?';
            params.push(startDate);
            countParams.push(startDate);
        }

        if (endDate) {
            dataQuery += ' AND er.receipt_date <= ?';
            countQuery += ' AND receipt_date <= ?';
            params.push(endDate);
            countParams.push(endDate);
        }

        dataQuery += ' ORDER BY er.created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(limit, offset);

        const [countRows] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = countRows[0].total;

        const [rows] = await pool.query<RowDataPacket[]>(dataQuery, params);

        return {
            data: rows as ExportReceipt[],
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: number): Promise<ExportReceipt | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT er.*, w.name as warehouse_name,
             u.full_name as created_by_name, ua.full_name as approved_by_name
      FROM export_receipts er
      INNER JOIN warehouses w ON er.warehouse_id = w.id
      LEFT JOIN users u ON er.created_by = u.id
      LEFT JOIN users ua ON er.approved_by = ua.id
      WHERE er.id = ? AND er.deleted_at IS NULL
    `, [id]);

        return rows.length > 0 ? (rows[0] as ExportReceipt) : null;
    }

    async getItems(receiptId: number): Promise<ExportReceiptItem[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT eri.*, p.name as product_name, p.sku,
             pv.sku as variant_sku, pv.stock as current_stock,
             un.name as unit_name
      FROM export_receipt_items eri
      INNER JOIN products p ON eri.product_id = p.id
      LEFT JOIN product_variants pv ON eri.product_variant_id = pv.id
      LEFT JOIN units un ON p.unit_id = un.id
      WHERE eri.export_receipt_id = ?
    `, [receiptId]);

        return rows as ExportReceiptItem[];
    }

    async generateReceiptNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM export_receipts 
      WHERE YEAR(created_at) = ?
    `, [year]);

        const count = rows[0].count + 1;
        return `PX-${year}-${count.toString().padStart(6, '0')}`;
    }

    async create(dto: CreateExportReceiptDto, userId?: number): Promise<number> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const receiptNumber = await this.generateReceiptNumber();

            let totalItems = dto.items.length;
            let totalQuantity = 0;
            let totalAmount = 0;

            for (const item of dto.items) {
                const qty = item.quantity_actual || item.quantity_requested;
                totalQuantity += qty;
                totalAmount += qty * (item.unit_price || 0);
            }

            const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO export_receipts (
          receipt_number, receipt_date, receiver_name, receiver_department,
          export_reason, warehouse_id, notes, reference_document,
          delivery_person, storekeeper, total_items, total_quantity, total_amount,
          created_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `, [
                receiptNumber,
                dto.receipt_date,
                dto.receiver_name || null,
                dto.receiver_department || null,
                dto.export_reason || 'sale',
                dto.warehouse_id,
                dto.notes || null,
                dto.reference_document || null,
                dto.delivery_person || null,
                dto.storekeeper || null,
                totalItems,
                totalQuantity,
                totalAmount,
                userId || null,
            ]);

            const receiptId = result.insertId;

            // Insert items
            for (const item of dto.items) {
                const actualQty = item.quantity_actual || item.quantity_requested;
                const lineTotal = actualQty * (item.unit_price || 0);
                await connection.query(`
          INSERT INTO export_receipt_items (
            export_receipt_id, product_id, product_variant_id,
            quantity_requested, quantity_actual, unit_price, line_total, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                    receiptId,
                    item.product_id,
                    item.product_variant_id || null,
                    item.quantity_requested,
                    actualQty,
                    item.unit_price || 0,
                    lineTotal,
                    null,
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

            const receipt = await this.findById(id);
            if (!receipt) {
                throw new Error('Export receipt not found');
            }

            const items = await this.getItems(id);

            // Check stock availability and deduct
            for (const item of items) {
                const actualQty = item.quantity_actual || item.quantity_requested;

                if (item.product_variant_id) {
                    // Check variant stock
                    const [vr] = await connection.query<RowDataPacket[]>(
                        'SELECT stock FROM product_variants WHERE id = ?',
                        [item.product_variant_id]
                    );

                    if (vr.length === 0) {
                        throw new Error(`Biến thể sản phẩm #${item.product_variant_id} không tồn tại`);
                    }

                    const currentStock = Number(vr[0].stock) || 0;
                    if (currentStock < actualQty) {
                        throw new Error(
                            `Tồn kho không đủ cho sản phẩm "${item.product_name}" (SKU: ${item.variant_sku || item.sku}). ` +
                            `Tồn kho: ${currentStock}, Yêu cầu: ${actualQty}`
                        );
                    }

                    // Deduct variant stock
                    await connection.query(
                        'UPDATE product_variants SET stock = stock - ?, updated_at = NOW() WHERE id = ?',
                        [actualQty, item.product_variant_id]
                    );
                }

                // Update inventories
                const [existing] = await connection.query<RowDataPacket[]>(`
          SELECT * FROM inventories 
          WHERE product_id = ? AND warehouse_id = ?
          LIMIT 1
        `, [item.product_id, receipt.warehouse_id]);

                if (existing.length > 0) {
                    await connection.query(`
            UPDATE inventories 
            SET quantity_on_hand = GREATEST(0, quantity_on_hand - ?), last_movement_date = NOW()
            WHERE id = ?
          `, [actualQty, existing[0].id]);

                    // Log movement
                    await connection.query(`
            INSERT INTO inventory_logs (
              inventory_id, product_id, warehouse_id, location_id,
              movement_type, reference_type, reference_id, reference_number,
              quantity_before, quantity_change, quantity_after,
              unit_cost, total_cost, performed_by
            ) VALUES (?, ?, ?, NULL, 'export_receipt', 'export_receipt', ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
                        existing[0].id,
                        item.product_id,
                        receipt.warehouse_id,
                        id,
                        receipt.receipt_number,
                        existing[0].quantity_on_hand,
                        -actualQty,
                        Math.max(0, existing[0].quantity_on_hand - actualQty),
                        item.unit_price || 0,
                        actualQty * (item.unit_price || 0),
                        userId,
                    ]);
                }
            }

            // Update receipt status
            await connection.query(`
        UPDATE export_receipts 
        SET status = 'APPROVED', approved_by = ?, approved_at = NOW()
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

    async delete(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
      UPDATE export_receipts SET deleted_at = NOW() WHERE id = ? AND status = 'PENDING'
    `, [id]);

        return result.affectedRows > 0;
    }
}

export const exportReceiptRepository = new ExportReceiptRepository();
