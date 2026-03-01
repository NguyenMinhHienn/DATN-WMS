import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * ExportSlip Repository
 * CRUD operations cho phiếu xuất kho
 */

// ==================== INTERFACES ====================

export interface ExportSlipRow {
    id: number;
    order_id: number;
    created_by: number;
    approved_by: number | null;
    status: 'waiting_approval' | 'approved' | 'completed' | 'returned';
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    // Joined fields
    creator_name?: string;
    approver_name?: string;
    order_status?: string;
    order_total?: number;
    order_shipping_name?: string;
}

export interface ExportSlipDetailRow {
    id: number;
    export_slip_id: number;
    product_id: number;
    variant_id: number | null;
    quantity: number;
    // Joined
    product_name?: string;
    variant_sku?: string;
    image_url?: string;
    current_stock?: number;
}

export interface CreateExportSlipItemInput {
    product_id: number;
    variant_id: number | null;
    quantity: number;
}

// ==================== REPOSITORY ====================

class ExportSlipRepository {

    /**
     * Tạo phiếu xuất kho + details (trong transaction)
     */
    async createExportSlip(
        orderId: number,
        staffId: number,
        items: CreateExportSlipItemInput[],
        notes?: string
    ): Promise<number> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.execute<ResultSetHeader>(
                `INSERT INTO export_slips (order_id, created_by, status, notes)
                 VALUES (?, ?, 'waiting_approval', ?)`,
                [orderId, staffId, notes || null]
            );
            const slipId = result.insertId;

            for (const item of items) {
                await connection.execute<ResultSetHeader>(
                    `INSERT INTO export_slip_details (export_slip_id, product_id, variant_id, quantity)
                     VALUES (?, ?, ?, ?)`,
                    [slipId, item.product_id, item.variant_id, item.quantity]
                );
            }

            await connection.commit();
            return slipId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Lấy tất cả phiếu xuất kho (admin)
     */
    async getAllExportSlips(page: number = 1, limit: number = 10, status?: string): Promise<{ data: ExportSlipRow[], pagination: any }> {
        const offset = (page - 1) * limit;
        let query = `
            SELECT es.*,
                   uc.full_name as creator_name,
                   ua.full_name as approver_name,
                   o.status as order_status,
                   o.total_amount as order_total,
                   o.shipping_name as order_shipping_name
            FROM export_slips es
            LEFT JOIN users uc ON es.created_by = uc.id
            LEFT JOIN users ua ON es.approved_by = ua.id
            LEFT JOIN orders o ON es.order_id = o.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (status) {
            query += ' AND es.status = ?';
            params.push(status);
        }

        query += ' ORDER BY es.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        let countQuery = 'SELECT COUNT(*) as total FROM export_slips WHERE 1=1';
        const countParams: any[] = [];
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        const [rows] = await pool.query<RowDataPacket[]>(query, params);
        const [[{ total }]] = await pool.query<RowDataPacket[]>(countQuery, countParams);

        return {
            data: rows as ExportSlipRow[],
            pagination: {
                page, limit,
                total: parseInt(total),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Lấy phiếu xuất kho của 1 staff
     */
    async getExportSlipsByStaff(staffId: number, page: number = 1, limit: number = 10): Promise<{ data: ExportSlipRow[], pagination: any }> {
        const offset = (page - 1) * limit;

        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT es.*,
                    uc.full_name as creator_name,
                    ua.full_name as approver_name,
                    o.status as order_status,
                    o.total_amount as order_total,
                    o.shipping_name as order_shipping_name
             FROM export_slips es
             LEFT JOIN users uc ON es.created_by = uc.id
             LEFT JOIN users ua ON es.approved_by = ua.id
             LEFT JOIN orders o ON es.order_id = o.id
             WHERE es.created_by = ?
             ORDER BY es.created_at DESC
             LIMIT ? OFFSET ?`,
            [staffId, limit, offset]
        );
        const [[{ total }]] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as total FROM export_slips WHERE created_by = ?',
            [staffId]
        );

        return {
            data: rows as ExportSlipRow[],
            pagination: {
                page, limit,
                total: parseInt(total),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Lấy chi tiết phiếu xuất kho
     */
    async getExportSlipById(id: number): Promise<(ExportSlipRow & { details: ExportSlipDetailRow[] }) | null> {
        const [slipRows] = await pool.query<RowDataPacket[]>(
            `SELECT es.*,
                    uc.full_name as creator_name,
                    ua.full_name as approver_name,
                    o.status as order_status,
                    o.total_amount as order_total,
                    o.shipping_name as order_shipping_name
             FROM export_slips es
             LEFT JOIN users uc ON es.created_by = uc.id
             LEFT JOIN users ua ON es.approved_by = ua.id
             LEFT JOIN orders o ON es.order_id = o.id
             WHERE es.id = ?`,
            [id]
        );
        if (slipRows.length === 0) return null;

        const [detailRows] = await pool.query<RowDataPacket[]>(
            `SELECT esd.*, p.name as product_name, p.image_url, pv.sku as variant_sku, pv.stock as current_stock
             FROM export_slip_details esd
             LEFT JOIN products p ON esd.product_id = p.id
             LEFT JOIN product_variants pv ON esd.variant_id = pv.id
             WHERE esd.export_slip_id = ?
             ORDER BY esd.id ASC`,
            [id]
        );

        return {
            ...(slipRows[0] as ExportSlipRow),
            details: detailRows as ExportSlipDetailRow[]
        };
    }

    /**
     * Cập nhật trạng thái phiếu xuất kho
     */
    async updateExportSlipStatus(id: number, status: string, approvedBy?: number): Promise<void> {
        if (approvedBy) {
            await pool.execute(
                'UPDATE export_slips SET status = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, approvedBy, id]
            );
        } else {
            await pool.execute(
                'UPDATE export_slips SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, id]
            );
        }
    }

    /**
     * Kiểm tra đã có phiếu xuất kho active cho order chưa
     */
    async getActiveExportSlipByOrderId(orderId: number): Promise<ExportSlipRow | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM export_slips WHERE order_id = ? AND status IN ('waiting_approval', 'approved') LIMIT 1`,
            [orderId]
        );
        return rows.length > 0 ? (rows[0] as ExportSlipRow) : null;
    }

    /**
     * Trừ tồn kho (product_variants.stock)
     */
    async deductStock(variantId: number, quantity: number): Promise<void> {
        await pool.execute(
            'UPDATE product_variants SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [quantity, variantId]
        );
    }

    /**
     * Cộng lại tồn kho
     */
    async restoreStock(variantId: number, quantity: number): Promise<void> {
        await pool.execute(
            'UPDATE product_variants SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [quantity, variantId]
        );
    }

    /**
     * Lấy stock hiện tại của variant
     */
    async getVariantStock(variantId: number): Promise<number> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT stock FROM product_variants WHERE id = ?',
            [variantId]
        );
        return rows.length > 0 ? rows[0].stock : 0;
    }
}

export const exportSlipRepository = new ExportSlipRepository();
