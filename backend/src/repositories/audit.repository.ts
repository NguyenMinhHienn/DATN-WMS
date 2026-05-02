import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export interface FinancialAuditLog {
    id?: number;
    reference_type: 'receivable' | 'payable' | 'payment_receipt' | 'payment_voucher';
    reference_id: number;
    reference_number?: string;
    action: string;
    amount?: number;
    actor_id?: number;
    actor_name?: string;
    approver_id?: number;
    approver_name?: string;
    status_before?: string;
    status_after?: string;
    notes?: string;
    metadata?: any;
    ip_address?: string;
    created_at?: Date;
}

class AuditRepository {
    /** Ghi log mới */
    async create(log: FinancialAuditLog): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(`
            INSERT INTO financial_audit_logs (
                reference_type, reference_id, reference_number, action, 
                amount, actor_id, actor_name, approver_id, approver_name,
                status_before, status_after, notes, metadata, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            log.reference_type, log.reference_id, log.reference_number, log.action,
            log.amount, log.actor_id, log.actor_name, log.approver_id, log.approver_name,
            log.status_before, log.status_after, log.notes, 
            log.metadata ? JSON.stringify(log.metadata) : null,
            log.ip_address
        ]);
        return result.insertId;
    }

    /** Lấy log theo đối tượng, bao gồm cả các phiếu thu/chi liên quan */
    async findByReference(type: string, id: number): Promise<FinancialAuditLog[]> {
        let sql = `SELECT * FROM financial_audit_logs WHERE reference_type = ? AND reference_id = ?`;
        const params: any[] = [type, id];

        if (type === 'receivable') {
            sql += ` OR (reference_type = 'payment_receipt' AND reference_id IN (SELECT id FROM payment_receipts WHERE receivable_id = ?))`;
            params.push(id);
        } else if (type === 'payable') {
            sql += ` OR (reference_type = 'payment_voucher' AND reference_id IN (SELECT id FROM payment_vouchers WHERE payable_id = ?))`;
            params.push(id);
        }

        sql += ` ORDER BY created_at DESC`;

        const [rows] = await pool.query<RowDataPacket[]>(sql, params);
        return rows as FinancialAuditLog[];
    }

    /** Lấy toàn bộ log (có phân trang) */
    async findAll(filters: { 
        page?: number, 
        limit?: number, 
        start_date?: string, 
        end_date?: string,
        reference_type?: string,
        actor_id?: number
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        let where = "1=1";
        const params: any[] = [];

        if (filters.start_date) {
            where += " AND created_at >= ?";
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            where += " AND created_at <= ?";
            params.push(filters.end_date + ' 23:59:59');
        }
        if (filters.reference_type) {
            where += " AND reference_type = ?";
            params.push(filters.reference_type);
        }
        if (filters.actor_id) {
            where += " AND actor_id = ?";
            params.push(filters.actor_id);
        }

        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT * FROM financial_audit_logs 
            WHERE ${where}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        const [countResult] = await pool.query<RowDataPacket[]>(`
            SELECT COUNT(*) as total FROM financial_audit_logs WHERE ${where}
        `, params);

        return {
            data: rows as FinancialAuditLog[],
            pagination: {
                total: countResult[0].total,
                page,
                limit,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        };
    }
}

export const auditRepository = new AuditRepository();
