import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * Receivable Repository - CRUD cho bảng receivables (Công nợ phải thu)
 */
class ReceivableRepository {

    /** Tạo mã công nợ tự động: CN-2026-000001 */
    async generateNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM receivables WHERE YEAR(created_at) = ?',
            [year]
        );
        const count = rows[0].count + 1;
        return `CN-${year}-${count.toString().padStart(6, '0')}`;
    }

    /** Tạo công nợ mới */
    async create(data: {
        source_type: 'order' | 'export_receipt' | 'export_transfer';
        source_id: number;
        source_number?: string;
        debtor_type?: 'user' | 'customer' | 'external';
        user_id?: number;
        debtor_name: string;
        debtor_phone?: string;
        debtor_email?: string;
        debtor_address?: string;
        total_amount: number;
        issue_date: string;
        payment_terms?: number;
        notes?: string;
        created_by?: number;
    }): Promise<number> {
        const receivableNumber = await this.generateNumber();

        // Tính due_date từ payment_terms
        let dueDate: string | null = null;
        const paymentTerms = data.payment_terms || 0;
        if (paymentTerms > 0) {
            const date = new Date(data.issue_date);
            date.setDate(date.getDate() + paymentTerms);
            dueDate = date.toISOString().split('T')[0];
        }

        const [result] = await pool.query<ResultSetHeader>(`
            INSERT INTO receivables (
                receivable_number, source_type, source_id, source_number,
                debtor_type, user_id, debtor_name, debtor_phone, debtor_email, debtor_address,
                total_amount, issue_date, due_date, payment_terms,
                status, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?)
        `, [
            receivableNumber, data.source_type, data.source_id, data.source_number || null,
            data.debtor_type || 'external', data.user_id || null,
            data.debtor_name, data.debtor_phone || null, data.debtor_email || null, data.debtor_address || null,
            data.total_amount, data.issue_date, dueDate, paymentTerms,
            data.notes || null, data.created_by || null,
        ]);

        return result.insertId;
    }

    /** Lấy chi tiết theo ID */
    async findById(id: number): Promise<any | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT r.*, 
                   u.full_name as user_full_name, u.email as user_email_account,
                   cu.full_name as created_by_name
            FROM receivables r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN users cu ON r.created_by = cu.id
            WHERE r.id = ?
        `, [id]);

        if (rows.length === 0) return null;
        
        const receivable = rows[0];
        // Fetch items from source
        receivable.items = await this.getSourceItems(receivable.source_type, receivable.source_id);
        
        return receivable;
    }

    /** 
     * Lấy danh sách sản phẩm từ nguồn (Source) của công nợ
     */
    async getSourceItems(sourceType: string, sourceId: number): Promise<any[]> {
        if (!sourceType || !sourceId) return [];
        
        let query = '';
        let type = sourceType.toLowerCase();
        
        // Fallback: If it's TR-... (Transfer) but labeled as export_receipt, fix it locally
        const [numCheck] = await pool.query<RowDataPacket[]>(
            'SELECT source_number FROM receivables WHERE source_type = ? AND source_id = ?',
            [sourceType, sourceId]
        );
        if (numCheck.length > 0 && numCheck[0].source_number?.startsWith('TR-') && type === 'export_receipt') {
            type = 'export_transfer';
        }

        switch (type) {
            case 'export_receipt':
                query = `
                    SELECT 
                        eri.product_id, p.sku, eri.quantity_actual as quantity, 
                        eri.unit_price as unit_cost, eri.line_total,
                        p.name as product_name
                    FROM export_receipt_items eri
                    JOIN products p ON eri.product_id = p.id
                    WHERE eri.export_receipt_id = ?
                `;
                break;
            case 'order':
                query = `
                    SELECT 
                        oi.product_id, 
                        oi.variant_sku as sku, oi.quantity, oi.unit_price as unit_cost, 
                        (oi.quantity * oi.unit_price) as line_total,
                        oi.product_name
                    FROM order_items oi
                    WHERE oi.order_id = ?
                `;
                break;
            case 'export_transfer':
                query = `
                    SELECT 
                        sti.product_id, p.sku, sti.quantity_requested as quantity, 
                        sti.unit_cost, (sti.quantity_requested * sti.unit_cost) as line_total,
                        p.name as product_name
                    FROM stock_transfer_items sti
                    JOIN products p ON sti.product_id = p.id
                    WHERE sti.stock_transfer_id = ?
                `;
                break;
            default:
                return [];
        }

        const [rows] = await pool.query<RowDataPacket[]>(query, [sourceId]);
        return rows;
    }

    /** Lấy theo source */
    async findBySource(sourceType: string, sourceId: number): Promise<any | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM receivables WHERE source_type = ? AND source_id = ?',
            [sourceType, sourceId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /** Lấy danh sách với filter + pagination */
    async findAll(filters: {
        page?: number;
        limit?: number;
        status?: string;
        source_type?: string;
        debtor_name?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<{ data: any[]; pagination: any }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        let where = '1=1';
        const params: any[] = [];

        if (filters.status) {
            where += ' AND r.status = ?';
            params.push(filters.status);
        }
        if (filters.source_type) {
            where += ' AND r.source_type = ?';
            params.push(filters.source_type);
        }
        if (filters.debtor_name) {
            where += ' AND r.debtor_name LIKE ?';
            params.push(`%${filters.debtor_name}%`);
        }
        if (filters.debtor_phone) {
            where += ' AND r.debtor_phone = ?';
            params.push(filters.debtor_phone);
        }
        if (filters.start_date) {
            where += ' AND r.issue_date >= ?';
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            where += ' AND r.issue_date <= ?';
            params.push(filters.end_date);
        }

        const [countRows] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) as total FROM receivables r WHERE ${where}`, params
        );
        const total = countRows[0].total;

        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT r.*, u.full_name as user_full_name, cu.full_name as created_by_name
            FROM receivables r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN users cu ON r.created_by = cu.id
            WHERE ${where}
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return {
            data: rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    /** Lấy công nợ của 1 user */
    async findByUserId(userId: number): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT * FROM receivables WHERE user_id = ? ORDER BY created_at DESC
        `, [userId]);
        return rows;
    }

    /** Cập nhật paid_amount và status sau khi duyệt phiếu thu */
    async updatePaidAmount(id: number, additionalAmount: number): Promise<void> {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // Lấy thông tin hiện tại  
            const [rows] = await conn.query<RowDataPacket[]>(
                'SELECT total_amount, paid_amount FROM receivables WHERE id = ? FOR UPDATE', [id]
            );
            if (rows.length === 0) throw new Error('Không tìm thấy công nợ');

            const { total_amount, paid_amount } = rows[0];
            const newPaid = parseFloat(paid_amount) + additionalAmount;

            let newStatus: string;
            if (newPaid >= parseFloat(total_amount)) {
                newStatus = 'paid';
            } else if (newPaid > 0) {
                newStatus = 'partial';
            } else {
                newStatus = 'unpaid';
            }

            await conn.query(`
                UPDATE receivables 
                SET paid_amount = ?, status = ?, last_payment_at = NOW(),
                    closed_at = CASE WHEN ? >= total_amount THEN NOW() ELSE NULL END
                WHERE id = ?
            `, [newPaid, newStatus, newPaid, id]);

            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    /** Thống kê tổng cho dashboard */
    async getSummaryStats(): Promise<{
        total_receivables: number;
        total_amount: number;
        total_paid: number;
        total_remaining: number;
        total_overdue: number;
        overdue_amount: number;
        count_by_status: Record<string, number>;
    }> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                COUNT(*) as total_receivables,
                COALESCE(SUM(total_amount), 0) as total_amount,
                COALESCE(SUM(paid_amount), 0) as total_paid,
                COALESCE(SUM(total_amount - paid_amount), 0) as total_remaining,
                SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as total_overdue,
                COALESCE(SUM(CASE WHEN status = 'overdue' THEN (total_amount - paid_amount) ELSE 0 END), 0) as overdue_amount
            FROM receivables
            WHERE status NOT IN ('cancelled')
        `);

        const [statusRows] = await pool.query<RowDataPacket[]>(`
            SELECT status, COUNT(*) as count FROM receivables 
            WHERE status NOT IN ('cancelled')
            GROUP BY status
        `);

        const count_by_status: Record<string, number> = {};
        for (const row of statusRows) {
            count_by_status[row.status] = row.count;
        }

        return {
            total_receivables: rows[0].total_receivables,
            total_amount: parseFloat(rows[0].total_amount),
            total_paid: parseFloat(rows[0].total_paid),
            total_remaining: parseFloat(rows[0].total_remaining),
            total_overdue: rows[0].total_overdue,
            overdue_amount: parseFloat(rows[0].overdue_amount),
            count_by_status,
        };
    }

    /** Lấy danh sách quá hạn */
    async getOverdueReceivables(): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT r.*, u.full_name as user_full_name
            FROM receivables r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.status = 'overdue'
            ORDER BY r.due_date ASC
        `);
        return rows;
    }

    /** Cập nhật trạng thái quá hạn (gọi từ cron job hoặc thủ công) */
    async markOverdue(): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(`
            UPDATE receivables 
            SET status = 'overdue'
            WHERE status IN ('unpaid', 'partial') 
              AND due_date IS NOT NULL 
              AND due_date < CURDATE()
        `);
        return result.affectedRows;
    }

    /** Hủy công nợ */
    async cancel(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            "UPDATE receivables SET status = 'cancelled' WHERE id = ? AND status NOT IN ('paid')",
            [id]
        );
        return result.affectedRows > 0;
    }

    /** Đánh dấu nợ xấu */
    async markBadDebt(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            "UPDATE receivables SET status = 'bad_debt' WHERE id = ? AND status IN ('overdue')",
            [id]
        );
        return result.affectedRows > 0;
    }

    /** Cập nhật email của người nợ */
    async updateEmail(id: number, email: string): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE receivables SET debtor_email = ? WHERE id = ?`,
            [email, id]
        );
        return result.affectedRows > 0;
    }

    /** Thống kê công nợ theo tháng cho báo cáo tài chính */
    async getMonthlyStats(year: number): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                MONTH(r.issue_date) as month,
                COALESCE(SUM(r.total_amount), 0) as total_issued,
                COALESCE(SUM(r.paid_amount), 0) as total_collected,
                COALESCE(SUM(r.total_amount - r.paid_amount), 0) as total_outstanding,
                COUNT(*) as count
            FROM receivables r
            WHERE YEAR(r.issue_date) = ? AND r.status != 'cancelled'
            GROUP BY MONTH(r.issue_date)
            ORDER BY month
        `, [year]);
        return rows;
    }

    /** 
     * Lấy sổ nợ tổng hợp theo khách hàng (SĐT) 
     * Gộp tất cả các phiếu nợ theo số điện thoại
     */
    async getConsolidatedLedger(filters: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{ data: any[]; pagination: any }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        let where = '1=1 AND r.status != "cancelled"';
        const params: any[] = [];

        if (filters.search) {
            where += ' AND (r.debtor_phone LIKE ? OR r.debtor_name LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        // Đếm tổng số khách hàng (SĐT) duy nhất
        const [countRows] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(DISTINCT debtor_phone) as total FROM receivables r WHERE ${where}`, params
        );
        const total = countRows[0].total || 0;

        // Lấy danh sách gộp
        // Logic: Lấy tên mới nhất cho mỗi SĐT bằng cách sử dụng MAX(created_at)
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                r.debtor_phone,
                (SELECT debtor_name FROM receivables r2 WHERE r2.debtor_phone = r.debtor_phone ORDER BY r2.created_at DESC LIMIT 1) as debtor_name,
                (SELECT debtor_address FROM receivables r3 WHERE r3.debtor_phone = r.debtor_phone ORDER BY r3.created_at DESC LIMIT 1) as debtor_address,
                COUNT(r.id) as total_slips,
                SUM(CASE WHEN r.status IN ("unpaid", "partial", "overdue") THEN 1 ELSE 0 END) as unpaid_slips,
                SUM(r.total_amount) as total_debt,
                SUM(r.paid_amount) as total_paid,
                SUM(r.total_amount - r.paid_amount) as remaining_debt,
                MAX(r.last_payment_at) as last_payment_at,
                MAX(r.created_at) as last_activity_at
            FROM receivables r
            WHERE ${where}
            GROUP BY r.debtor_phone
            ORDER BY remaining_debt DESC, last_activity_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return {
            data: rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    /** 
     * Lấy danh sách các phiếu chưa trả hết của 1 SĐT khách hàng
     * Phục vụ logic "Gạch nợ" FIFO
     */
    async getUnpaidByPhone(phone: string): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT * FROM receivables 
            WHERE debtor_phone = ? 
              AND status IN ('unpaid', 'partial', 'overdue')
            ORDER BY issue_date ASC, created_at ASC
        `, [phone]);
        return rows;
    }
}

export const receivableRepository = new ReceivableRepository();
