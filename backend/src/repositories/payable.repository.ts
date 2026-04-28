import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

/**
 * Payable Repository - CRUD cho bảng payables (Công nợ phải trả NCC)
 */
class PayableRepository {

    /** Tạo mã công nợ tự động: NCC-2026-000001 */
    async generateNumber(connection?: PoolConnection): Promise<string> {
        const year = new Date().getFullYear();
        const conn = connection || await pool.getConnection();
        const shouldRelease = !connection;
        try {
            const [seqRows] = await conn.query<RowDataPacket[]>(
                `SELECT current_number FROM document_sequences 
                 WHERE document_type = 'payable' FOR UPDATE`,
            );

            let nextNum: number;
            if (seqRows.length > 0) {
                nextNum = seqRows[0].current_number + 1;
                await conn.query(
                    `UPDATE document_sequences SET current_number = ? WHERE document_type = 'payable'`,
                    [nextNum]
                );
            } else {
                const [countRows] = await conn.query<RowDataPacket[]>(
                    'SELECT COUNT(*) as count FROM payables WHERE YEAR(created_at) = ?',
                    [year]
                );
                nextNum = countRows[0].count + 1;
            }
            return `NCC-${year}-${nextNum.toString().padStart(6, '0')}`;
        } finally {
            if (shouldRelease) conn.release();
        }
    }

    /** Tạo công nợ mới */
    async create(data: {
        source_type: 'import_transfer' | 'goods_receipt';
        source_id: number;
        source_number: string;
        supplier_id: number;
        supplier_name: string;
        supplier_phone?: string;
        supplier_email?: string;
        total_amount: number;
        issue_date: string;
        payment_terms: number;
        notes?: string;
        created_by: number;
    }): Promise<number> {
        const payableNumber = await this.generateNumber();

        // Tính due_date từ payment_terms
        const date = new Date(data.issue_date);
        date.setDate(date.getDate() + data.payment_terms);
        const dueDate = date.toISOString().split('T')[0];

        const [result] = await pool.query<ResultSetHeader>(`
            INSERT INTO payables (
                payable_number, source_type, source_id, source_number,
                supplier_id, supplier_name, supplier_phone, supplier_email,
                total_amount, issue_date, due_date, payment_terms,
                status, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?)
        `, [
            payableNumber, data.source_type, data.source_id, data.source_number,
            data.supplier_id, data.supplier_name, data.supplier_phone || null, data.supplier_email || null,
            data.total_amount, data.issue_date, dueDate, data.payment_terms,
            data.notes || null, data.created_by
        ]);

        return result.insertId;
    }

    /** Lấy chi tiết theo ID */
    async findById(id: number): Promise<any | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT p.*, 
                   s.bank_name, s.bank_account, s.address as supplier_address,
                   cu.full_name as created_by_name
            FROM payables p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN users cu ON p.created_by = cu.id
            WHERE p.id = ?
        `, [id]);

        if (rows.length === 0) return null;
        
        const payable = rows[0];
        payable.items = await this.getSourceItems(payable.source_type, payable.source_id);
        
        return payable;
    }

    /** Lấy danh sách sản phẩm từ nguồn (Source) */
    async getSourceItems(sourceType: string, sourceId: number): Promise<any[]> {
        if (!sourceType || !sourceId) return [];
        
        let query = '';
        if (sourceType === 'import_transfer') {
            query = `
                SELECT 
                    sti.product_id, p.sku, sti.quantity_requested as quantity, 
                    sti.unit_cost, (sti.quantity_requested * sti.unit_cost) as line_total,
                    p.name as product_name
                FROM stock_transfer_items sti
                JOIN products p ON sti.product_id = p.id
                WHERE sti.stock_transfer_id = ?
            `;
        } else if (sourceType === 'goods_receipt') {
            query = `
                SELECT 
                    gri.product_id, p.sku, gri.quantity_actual as quantity, 
                    gri.unit_price as unit_cost, gri.line_total,
                    p.name as product_name
                FROM goods_receipt_items gri
                JOIN products p ON gri.product_id = p.id
                WHERE gri.goods_receipt_id = ?
            `;
        } else {
            return [];
        }

        const [rows] = await pool.query<RowDataPacket[]>(query, [sourceId]);
        return rows;
    }

    /** Lấy theo source để kiểm tra trùng lặp */
    async findBySource(sourceType: string, sourceId: number): Promise<any | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM payables WHERE source_type = ? AND source_id = ?',
            [sourceType, sourceId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /** Lấy danh sách với filter + pagination */
    async findAll(filters: {
        page?: number;
        limit?: number;
        status?: string;
        supplier_id?: number;
        search?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<{ data: any[]; pagination: any }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        let where = '1=1';
        const params: any[] = [];

        if (filters.status) {
            where += ' AND p.status = ?';
            params.push(filters.status);
        }
        if (filters.supplier_id) {
            where += ' AND p.supplier_id = ?';
            params.push(filters.supplier_id);
        }
        if (filters.search) {
            where += ' AND (p.supplier_name LIKE ? OR p.payable_number LIKE ? OR p.source_number LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        if (filters.start_date) {
            where += ' AND p.issue_date >= ?';
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            where += ' AND p.issue_date <= ?';
            params.push(filters.end_date);
        }

        const [countRows] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) as total FROM payables p WHERE ${where}`, params
        );
        const total = countRows[0].total;

        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT p.*, cu.full_name as created_by_name
            FROM payables p
            LEFT JOIN users cu ON p.created_by = cu.id
            WHERE ${where}
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return {
            data: rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    /** Cập nhật paid_amount và status sau khi duyệt phiếu chi */
    async updatePaidAmount(id: number, amount: number): Promise<void> {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const [rows] = await conn.query<RowDataPacket[]>(
                'SELECT total_amount, paid_amount FROM payables WHERE id = ? FOR UPDATE', [id]
            );
            if (rows.length === 0) throw new Error('Không tìm thấy công nợ NCC');

            const { total_amount, paid_amount } = rows[0];
            const newPaid = parseFloat(paid_amount) + amount;

            let newStatus: string;
            if (newPaid >= parseFloat(total_amount)) {
                newStatus = 'paid';
            } else if (newPaid > 0) {
                newStatus = 'partial';
            } else {
                newStatus = 'unpaid';
            }

            await conn.query(`
                UPDATE payables 
                SET paid_amount = ?, status = ?
                WHERE id = ?
            `, [newPaid, newStatus, id]);

            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    /** Hủy công nợ */
    async cancel(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            "UPDATE payables SET status = 'cancelled' WHERE id = ? AND status NOT IN ('paid')",
            [id]
        );
        return result.affectedRows > 0;
    }

    /** Cập nhật trạng thái quá hạn */
    async markOverdue(): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(`
            UPDATE payables 
            SET status = 'overdue'
            WHERE status IN ('unpaid', 'partial') 
              AND due_date < CURDATE()
        `);
        return result.affectedRows;
    }

    /** Lấy thống kê KPI */
    async getSummaryStats(startDate?: string, endDate?: string): Promise<any> {
        let where = "status NOT IN ('cancelled')";
        const params: any[] = [];
        
        if (startDate) {
            where += " AND issue_date >= ?";
            params.push(startDate);
        }
        if (endDate) {
            where += " AND issue_date <= ?";
            params.push(endDate);
        }

        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                COUNT(*) as total_payables,
                COALESCE(SUM(total_amount), 0) as total_amount,
                COALESCE(SUM(paid_amount), 0) as total_paid,
                COALESCE(SUM(total_amount - paid_amount), 0) as total_remaining,
                SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as total_overdue,
                COALESCE(SUM(CASE WHEN status = 'overdue' THEN (total_amount - paid_amount) ELSE 0 END), 0) as overdue_amount
            FROM payables
            WHERE ${where}
        `, params);

        return rows[0];
    }

    /** Thống kê công nợ NCC theo tháng cho báo cáo tài chính */
    async getMonthlyStats(year: number): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                MONTH(p.issue_date) as month,
                COALESCE(SUM(p.total_amount), 0) as total_issued,
                COALESCE(SUM(p.paid_amount), 0) as total_paid,
                COALESCE(SUM(p.total_amount - p.paid_amount), 0) as total_remaining,
                COUNT(*) as count
            FROM payables p
            WHERE YEAR(p.issue_date) = ? AND p.status != 'cancelled'
            GROUP BY MONTH(p.issue_date)
            ORDER BY month
        `, [year]);
        return rows;
    }

    /** 
     * Lấy sổ nợ tổng hợp theo nhà cung cấp
     * Gộp tất cả các phiếu nợ theo supplier_id
     */
    async getConsolidatedLedger(filters: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{ data: any[]; pagination: any }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        let where = '1=1 AND p.status != "cancelled"';
        const params: any[] = [];

        if (filters.search) {
            where += ' AND (p.supplier_name LIKE ? OR p.supplier_phone LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        // Đếm tổng số NCC duy nhất
        const [countRows] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(DISTINCT supplier_id) as total FROM payables p WHERE ${where}`, params
        );
        const total = countRows[0].total || 0;

        // Lấy danh sách gộp
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                p.supplier_id,
                p.supplier_name,
                p.supplier_phone,
                COUNT(p.id) as total_slips,
                SUM(CASE WHEN p.status IN ("unpaid", "partial", "overdue") THEN 1 ELSE 0 END) as unpaid_slips,
                SUM(p.total_amount) as total_debt,
                SUM(p.paid_amount) as total_paid,
                SUM(p.total_amount - p.paid_amount) as remaining_debt,
                MAX(p.created_at) as last_activity_at
            FROM payables p
            WHERE ${where}
            GROUP BY p.supplier_id, p.supplier_name, p.supplier_phone
            ORDER BY remaining_debt DESC, last_activity_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return {
            data: rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    /**
     * Lấy danh sách phiếu nợ chưa trả theo supplier_id (FIFO - cũ nhất trước)
     */
    async getUnpaidBySupplier(supplierId: number): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT p.*, cu.full_name as created_by_name
            FROM payables p
            LEFT JOIN users cu ON p.created_by = cu.id
            WHERE p.supplier_id = ? 
              AND p.status IN ('unpaid', 'partial', 'overdue')
            ORDER BY p.issue_date ASC, p.id ASC
        `, [supplierId]);
        return rows;
    }

    /**
     * Lấy danh sách công nợ NCC sắp tới hạn (trong N ngày tới)
     */
    async getUpcomingDue(daysAhead: number = 3): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT p.*, s.bank_name, s.bank_account
            FROM payables p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.status IN ('unpaid', 'partial')
              AND p.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            ORDER BY p.due_date ASC
        `, [daysAhead]);
        return rows;
    }
}

export const payableRepository = new PayableRepository();
