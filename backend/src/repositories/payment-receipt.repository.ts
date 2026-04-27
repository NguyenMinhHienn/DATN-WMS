import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

/**
 * Payment Receipt Repository - CRUD cho bảng payment_receipts (Phiếu thu)
 */
class PaymentReceiptRepository {


    async generateNumber(connection?: PoolConnection): Promise<string> {
        const year = new Date().getFullYear();
        const conn = connection || await pool.getConnection();
        const shouldRelease = !connection;
        try {
            const [seqRows] = await conn.query<RowDataPacket[]>(
                `SELECT current_number FROM document_sequences 
                 WHERE document_type = 'payment_receipt' FOR UPDATE`,
            );

            let nextNum: number;
            if (seqRows.length > 0) {
                nextNum = seqRows[0].current_number + 1;
                await conn.query(
                    `UPDATE document_sequences SET current_number = ? WHERE document_type = 'payment_receipt'`,
                    [nextNum]
                );
            } else {
                const [countRows] = await conn.query<RowDataPacket[]>(
                    'SELECT COUNT(*) as count FROM payment_receipts WHERE YEAR(created_at) = ?',
                    [year]
                );
                nextNum = countRows[0].count + 1;
            }
            return `PT-${year}-${nextNum.toString().padStart(6, '0')}`;
        } finally {
            if (shouldRelease) conn.release();
        }
    }

    /** Tạo phiếu thu mới */
    async create(data: {
        receivable_id: number;
        amount: number;
        payment_method: string;
        payment_date: string;
        bank_name?: string;
        bank_account?: string;
        bank_reference?: string;
        notes?: string;
        created_by?: number;
        status?: string;
    }): Promise<number> {
        const receiptNumber = await this.generateNumber();

        const [result] = await pool.query<ResultSetHeader>(`
            INSERT INTO payment_receipts (
                receipt_number, receivable_id, amount, payment_method, payment_date,
                bank_name, bank_account, bank_reference,
                notes, created_by, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            receiptNumber, data.receivable_id, data.amount,
            data.payment_method || 'cash', data.payment_date,
            data.bank_name || null, data.bank_account || null, data.bank_reference || null,
            data.notes || null, data.created_by || null,
            data.status || 'pending',
        ]);

        return result.insertId;
    }

    /** Lấy chi tiết phiếu thu */
    async findById(id: number): Promise<any | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT pr.*, 
                   r.receivable_number, r.debtor_name, r.debtor_phone, r.debtor_email,
                   r.total_amount as receivable_total, r.paid_amount as receivable_paid,
                   (r.total_amount - r.paid_amount) as receivable_remaining, r.source_type, r.source_number,
                   r.user_id as debtor_user_id,
                   cu.full_name as created_by_name,
                   au.full_name as approved_by_name
            FROM payment_receipts pr
            JOIN receivables r ON pr.receivable_id = r.id
            LEFT JOIN users cu ON pr.created_by = cu.id
            LEFT JOIN users au ON pr.approved_by = au.id
            WHERE pr.id = ?
        `, [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    /** Danh sách phiếu thu với filter + pagination */
    async findAll(filters: {
        page?: number;
        limit?: number;
        status?: string;
        receivable_id?: number;
        start_date?: string;
        end_date?: string;
    }): Promise<{ data: any[]; pagination: any }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        let where = '1=1';
        const params: any[] = [];

        if (filters.status) {
            where += ' AND pr.status = ?';
            params.push(filters.status);
        }
        if (filters.receivable_id) {
            where += ' AND pr.receivable_id = ?';
            params.push(filters.receivable_id);
        }
        if (filters.start_date) {
            where += ' AND pr.payment_date >= ?';
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            where += ' AND pr.payment_date <= ?';
            params.push(filters.end_date);
        }

        const [countRows] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) as total FROM payment_receipts pr WHERE ${where}`, params
        );

        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT pr.*, 
                   r.receivable_number, r.debtor_name, r.source_type, r.source_number, r.user_id as debtor_user_id,
                   cu.full_name as created_by_name,
                   au.full_name as approved_by_name
            FROM payment_receipts pr
            JOIN receivables r ON pr.receivable_id = r.id
            LEFT JOIN users cu ON pr.created_by = cu.id
            LEFT JOIN users au ON pr.approved_by = au.id
            WHERE ${where}
            ORDER BY pr.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return {
            data: rows,
            pagination: {
                page, limit,
                total: countRows[0].total,
                totalPages: Math.ceil(countRows[0].total / limit),
            },
        };
    }

    /** Lấy lịch sử thu tiền của 1 công nợ */
    async findByReceivableId(receivableId: number): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT pr.*, cu.full_name as created_by_name, au.full_name as approved_by_name
            FROM payment_receipts pr
            LEFT JOIN users cu ON pr.created_by = cu.id
            LEFT JOIN users au ON pr.approved_by = au.id
            WHERE pr.receivable_id = ?
            ORDER BY pr.payment_date DESC
        `, [receivableId]);
        return rows;
    }

    /** Admin duyệt phiếu thu */
    async approve(id: number, userId: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
            UPDATE payment_receipts 
            SET status = 'approved', approved_by = ?, approved_at = NOW()
            WHERE id = ? AND status = 'pending'
        `, [userId, id]);
        return result.affectedRows > 0;
    }

    /** Admin từ chối phiếu thu */
    async reject(id: number, userId: number, reason: string): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
            UPDATE payment_receipts 
            SET status = 'rejected', rejected_by = ?, rejected_at = NOW(), rejection_reason = ?
            WHERE id = ? AND status = 'pending'
        `, [userId, reason, id]);
        return result.affectedRows > 0;
    }
}

export const paymentReceiptRepository = new PaymentReceiptRepository();
