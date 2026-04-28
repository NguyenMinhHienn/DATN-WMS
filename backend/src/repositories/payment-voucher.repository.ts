import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

/**
 * Payment Voucher Repository - CRUD cho bảng payment_vouchers (Phiếu chi)
 */
class PaymentVoucherRepository {

    /** Tạo mã phiếu chi tự động: PC-2026-000001 */
    async generateNumber(connection?: PoolConnection): Promise<string> {
        const year = new Date().getFullYear();
        const conn = connection || await pool.getConnection();
        const shouldRelease = !connection;
        try {
            const [seqRows] = await conn.query<RowDataPacket[]>(
                `SELECT current_number FROM document_sequences 
                 WHERE document_type = 'payment_voucher' FOR UPDATE`,
            );

            let nextNum: number;
            if (seqRows.length > 0) {
                nextNum = seqRows[0].current_number + 1;
                await conn.query(
                    `UPDATE document_sequences SET current_number = ? WHERE document_type = 'payment_voucher'`,
                    [nextNum]
                );
            } else {
                const [countRows] = await conn.query<RowDataPacket[]>(
                    'SELECT COUNT(*) as count FROM payment_vouchers WHERE YEAR(created_at) = ?',
                    [year]
                );
                nextNum = countRows[0].count + 1;
            }
            return `PC-${year}-${nextNum.toString().padStart(6, '0')}`;
        } finally {
            if (shouldRelease) conn.release();
        }
    }

    /** Tạo phiếu chi mới */
    async create(data: {
        payable_id: number;
        amount: number;
        payment_method: 'cash' | 'bank_transfer' | 'other';
        payment_date: string;
        bank_reference?: string;
        notes?: string;
        created_by: number;
    }): Promise<number> {
        const voucherNumber = await this.generateNumber();

        const [result] = await pool.query<ResultSetHeader>(`
            INSERT INTO payment_vouchers (
                voucher_number, payable_id, amount, payment_method,
                payment_date, bank_reference, status, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `, [
            voucherNumber, data.payable_id, data.amount, data.payment_method,
            data.payment_date, data.bank_reference || null, data.notes || null, data.created_by
        ]);

        return result.insertId;
    }

    /** Lấy chi tiết phiếu chi */
    async findById(id: number): Promise<any | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT v.*, 
                   cu.full_name as created_by_name,
                   au.full_name as approved_by_name,
                   p.payable_number, p.supplier_name
            FROM payment_vouchers v
            LEFT JOIN users cu ON v.created_by = cu.id
            LEFT JOIN users au ON v.approved_by = au.id
            LEFT JOIN payables p ON v.payable_id = p.id
            WHERE v.id = ?
        `, [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    /** Lấy tất cả phiếu chi (có filter) */
    async findAll(filters: {
        page?: number;
        limit?: number;
        status?: string;
        payable_id?: number;
    }): Promise<{ data: any[]; pagination: any }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        let where = '1=1';
        const params: any[] = [];

        if (filters.status) {
            where += ' AND v.status = ?';
            params.push(filters.status);
        }
        if (filters.payable_id) {
            where += ' AND v.payable_id = ?';
            params.push(filters.payable_id);
        }

        const [countRows] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) as total FROM payment_vouchers v WHERE ${where}`, params
        );
        const total = countRows[0].total;

        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT v.*, cu.full_name as created_by_name, au.full_name as approved_by_name
            FROM payment_vouchers v
            LEFT JOIN users cu ON v.created_by = cu.id
            LEFT JOIN users au ON v.approved_by = au.id
            WHERE ${where}
            ORDER BY v.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return {
            data: rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    /** Lấy danh sách phiếu chi theo payable_id (không phân trang) */
    async findByPayableId(payableId: number): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT v.*, cu.full_name as created_by_name, au.full_name as approved_by_name
            FROM payment_vouchers v
            LEFT JOIN users cu ON v.created_by = cu.id
            LEFT JOIN users au ON v.approved_by = au.id
            WHERE v.payable_id = ?
            ORDER BY v.created_at ASC
        `, [payableId]);
        return rows;
    }

    /** Cập nhật trạng thái phiếu chi */
    async updateStatus(id: number, status: 'pending' | 'approved' | 'rejected', adminId?: number, rejectReason?: string): Promise<boolean> {
        let query = 'UPDATE payment_vouchers SET status = ?';
        const params: any[] = [status];

        if (adminId) {
            query += ', approved_by = ?';
            params.push(adminId);
        }
        if (rejectReason) {
            query += ', notes = CONCAT(IFNULL(notes, ""), "\\nLý do từ chối: ", ?)';
            params.push(rejectReason);
        }

        query += ' WHERE id = ?';
        params.push(id);

        const [result] = await pool.query<ResultSetHeader>(query, params);
        return result.affectedRows > 0;
    }
}

export const paymentVoucherRepository = new PaymentVoucherRepository();
