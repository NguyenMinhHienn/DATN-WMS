import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AppError } from '../middlewares/error.middleware';

/**
 * Credit Service - Business logic quản lý tín dụng mua hàng công nợ
 * 
 * Quy tắc nghiệp vụ:
 * - User phải đăng ký (nhập CMND, địa chỉ) trước khi sử dụng
 * - Tổng thanh toán thành công >= ngưỡng (mặc định 100 triệu)
 * - Hạn mức tối đa 50 triệu / lần (phải trả xong mới nợ tiếp)
 * - Không có nợ quá hạn (overdue / bad_debt)
 * - Admin có thể bật/tắt/chỉnh hạn mức cho từng user
 */

export interface CreditInfo {
    is_registered: boolean;
    is_eligible: boolean;
    credit_limit: number;
    credit_used: number;
    credit_available: number;
    credit_payment_terms: number;
    total_spent: number;
    min_required: number;
    has_active_debt: boolean;
    has_overdue: boolean;
    active_debt_count: number;
    paid_percentage?: number;
    reason_not_eligible?: string;
}

class CreditService {

    /** Lấy cấu hình system setting */
    async getSetting(key: string): Promise<string> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT setting_value FROM system_settings WHERE setting_key = ?',
            [key]
        );
        return rows.length > 0 ? rows[0].setting_value : '';
    }

    /** Lấy tất cả credit settings */
    async getAllSettings(): Promise<Record<string, string>> {
        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'credit_%'"
        );
        const settings: Record<string, string> = {};
        for (const row of rows) {
            settings[row.setting_key] = row.setting_value;
        }
        return settings;
    }

    /** Cập nhật setting */
    async updateSetting(key: string, value: string): Promise<void> {
        await pool.query(
            'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [key, value, value]
        );
    }

    /** Lấy tổng chi tiêu đã thanh toán thành công của user */
    async getTotalSpent(userId: number): Promise<number> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(total_amount), 0) as total_spent 
             FROM orders 
             WHERE user_id = ? AND status = 'delivered' AND payment_status = 'paid'`,
            [userId]
        );
        return parseFloat(rows[0].total_spent) || 0;
    }

    /** Kiểm tra user có nợ đang active (chưa trả hết) không */
    async getActiveDebtInfo(userId: number): Promise<{ count: number; hasOverdue: boolean; totalUsed: number; paidPercentage: number }> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT 
                COUNT(*) as active_count,
                SUM(CASE WHEN status IN ('overdue', 'bad_debt') THEN 1 ELSE 0 END) as overdue_count,
                COALESCE(SUM(total_amount), 0) as total_active_amount,
                COALESCE(SUM(paid_amount), 0) as total_active_paid
             FROM receivables 
             WHERE user_id = ? AND status IN ('unpaid', 'partial', 'overdue')`,
            [userId]
        );
        
        const count = parseInt(rows[0].active_count) || 0;
        const totalActiveAmount = parseFloat(rows[0].total_active_amount) || 0;
        const totalActivePaid = parseFloat(rows[0].total_active_paid) || 0;
        const totalUsed = totalActiveAmount - totalActivePaid;
        
        let paidPercentage = 100; // Nếu không có nợ thì coi như đã trả 100%
        if (totalActiveAmount > 0) {
            paidPercentage = (totalActivePaid / totalActiveAmount) * 100;
        }

        return {
            count,
            hasOverdue: (parseInt(rows[0].overdue_count) || 0) > 0,
            totalUsed,
            paidPercentage
        };
    }

    /** Lấy thông tin tín dụng đầy đủ của user */
    async getCreditInfo(userId: number): Promise<CreditInfo> {
        // 1. Lấy thông tin user
        const [userRows] = await pool.query<RowDataPacket[]>(
            `SELECT credit_eligible, credit_limit, credit_used, credit_payment_terms, 
                    credit_registered, credit_id_number, credit_address
             FROM users WHERE id = ?`,
            [userId]
        );
        if (userRows.length === 0) throw new AppError('User không tồn tại', 404);

        const user = userRows[0];
        const isRegistered = user.credit_registered === 1;

        // 2. Lấy tổng chi tiêu
        const totalSpent = await this.getTotalSpent(userId);

        // 3. Lấy ngưỡng tối thiểu
        const minRequired = parseFloat(await this.getSetting('credit_min_total_spent')) || 100000000;

        // 4. Lấy thông tin nợ
        const debtInfo = await this.getActiveDebtInfo(userId);

        // 5. Sync credit_used thực tế
        if (Math.abs(debtInfo.totalUsed - parseFloat(user.credit_used)) > 0.01) {
            await pool.query('UPDATE users SET credit_used = ? WHERE id = ?', [debtInfo.totalUsed, userId]);
        }

        const creditLimit = parseFloat(user.credit_limit) || 50000000;
        const creditUsed = debtInfo.totalUsed;
        const creditAvailable = Math.max(0, creditLimit - creditUsed);

        // 6. Xác định eligible
        let isEligible = user.credit_eligible === 1;
        let reasonNotEligible = '';

        if (isEligible) {
            // Đã được cấp quyền (Admin cấp hoặc tự động đạt). Chỉ kiểm tra điều kiện giao dịch:
            if (debtInfo.hasOverdue) {
                isEligible = false;
                reasonNotEligible = 'Tài khoản có nợ quá hạn, vui lòng thanh toán trước';
            } else if (debtInfo.count > 0 && debtInfo.paidPercentage < 75) {
                isEligible = false;
                reasonNotEligible = `Bạn cần thanh toán tối thiểu 75% tổng dư nợ hiện tại để tiếp tục mua (đã thanh toán: ${debtInfo.paidPercentage.toFixed(1)}%)`;
            } else if (creditAvailable <= 0) {
                isEligible = false;
                reasonNotEligible = 'Bạn đã sử dụng hết hạn mức công nợ';
            }
        } else {
            // Chưa được cấp quyền, giải thích lý do:
            if (!isRegistered) {
                reasonNotEligible = 'Bạn chưa đăng ký sử dụng công nợ';
            } else if (totalSpent < minRequired) {
                reasonNotEligible = `Tổng thanh toán chưa đạt ${new Intl.NumberFormat('vi-VN').format(minRequired)}đ (hiện tại: ${new Intl.NumberFormat('vi-VN').format(totalSpent)}đ)`;
            }
        }

        return {
            is_registered: isRegistered,
            is_eligible: isEligible,
            credit_limit: creditLimit,
            credit_used: creditUsed,
            credit_available: creditAvailable,
            credit_payment_terms: user.credit_payment_terms || 30,
            total_spent: totalSpent,
            min_required: minRequired,
            has_active_debt: debtInfo.count > 0,
            has_overdue: debtInfo.hasOverdue,
            active_debt_count: debtInfo.count,
            paid_percentage: debtInfo.paidPercentage,
            reason_not_eligible: reasonNotEligible || undefined,
        };
    }

    /** User đăng ký sử dụng công nợ */
    async register(userId: number, data: {
        id_number: string;
        address: string;
        company?: string;
        tax_code?: string;
        payment_terms?: number;
    }): Promise<void> {
        if (!data.id_number || data.id_number.trim().length < 9) {
            throw new AppError('Số CMND/CCCD không hợp lệ (tối thiểu 9 ký tự)', 400);
        }
        if (!data.address || data.address.trim().length < 10) {
            throw new AppError('Địa chỉ không hợp lệ (tối thiểu 10 ký tự)', 400);
        }

        const validTerms = [15, 30, 45];
        const paymentTerms = data.payment_terms && validTerms.includes(data.payment_terms)
            ? data.payment_terms
            : parseInt(await this.getSetting('credit_default_payment_terms')) || 30;

        await pool.query(
            `UPDATE users SET 
                credit_registered = 1,
                credit_registered_at = NOW(),
                credit_id_number = ?,
                credit_address = ?,
                credit_company = ?,
                credit_tax_code = ?,
                credit_payment_terms = ?
             WHERE id = ?`,
            [
                data.id_number.trim(),
                data.address.trim(),
                data.company?.trim() || null,
                data.tax_code?.trim() || null,
                paymentTerms,
                userId
            ]
        );

        // Tự động check & enable nếu đủ điều kiện
        await this.autoCheckAndEnable(userId);
    }

    /** Tự động kiểm tra và kích hoạt credit khi đủ điều kiện */
    async autoCheckAndEnable(userId: number): Promise<boolean> {
        const autoEnable = await this.getSetting('credit_auto_enable');
        if (autoEnable !== '1') return false;

        const [userRows] = await pool.query<RowDataPacket[]>(
            'SELECT credit_eligible, credit_registered FROM users WHERE id = ?',
            [userId]
        );
        if (userRows.length === 0) return false;

        // Đã eligible rồi → skip
        if (userRows[0].credit_eligible === 1) return true;

        // Chưa đăng ký → skip
        if (userRows[0].credit_registered !== 1) return false;

        // Kiểm tra điều kiện
        const totalSpent = await this.getTotalSpent(userId);
        const minRequired = parseFloat(await this.getSetting('credit_min_total_spent')) || 100000000;

        if (totalSpent >= minRequired) {
            const defaultLimit = parseFloat(await this.getSetting('credit_default_limit')) || 50000000;
            await pool.query(
                `UPDATE users SET 
                    credit_eligible = 1, 
                    credit_limit = ?,
                    credit_enabled_at = NOW(), 
                    credit_enabled_by = NULL 
                 WHERE id = ?`,
                [defaultLimit, userId]
            );
            return true;
        }

        return false;
    }

    /** Admin bật quyền công nợ cho user */
    async enableCredit(userId: number, adminId: number): Promise<void> {
        const [userRows] = await pool.query<RowDataPacket[]>(
            'SELECT credit_registered FROM users WHERE id = ? AND deleted_at IS NULL',
            [userId]
        );
        if (userRows.length === 0) throw new AppError('User không tồn tại', 404);
        if (userRows[0].credit_registered !== 1) {
            throw new AppError('User chưa đăng ký sử dụng công nợ', 400);
        }

        await pool.query(
            `UPDATE users SET 
                credit_eligible = 1, 
                credit_enabled_at = NOW(), 
                credit_enabled_by = ? 
             WHERE id = ?`,
            [adminId, userId]
        );
    }

    /** Admin tắt quyền công nợ */
    async disableCredit(userId: number): Promise<void> {
        // Kiểm tra còn nợ không
        const debtInfo = await this.getActiveDebtInfo(userId);
        if (debtInfo.count > 0) {
            throw new AppError(`User còn ${debtInfo.count} khoản nợ chưa thanh toán. Không thể tắt công nợ.`, 400);
        }

        await pool.query(
            'UPDATE users SET credit_eligible = 0 WHERE id = ?',
            [userId]
        );
    }

    /** Admin điều chỉnh hạn mức */
    async updateCreditLimit(userId: number, newLimit: number): Promise<void> {
        if (newLimit < 0) throw new AppError('Hạn mức phải >= 0', 400);

        await pool.query(
            'UPDATE users SET credit_limit = ? WHERE id = ?',
            [newLimit, userId]
        );
    }

    /** Admin cập nhật payment terms cho user */
    async updatePaymentTerms(userId: number, terms: number): Promise<void> {
        const validTerms = [15, 30, 45];
        if (!validTerms.includes(terms)) {
            throw new AppError('Hạn thanh toán phải là 15, 30 hoặc 45 ngày', 400);
        }

        await pool.query(
            'UPDATE users SET credit_payment_terms = ? WHERE id = ?',
            [terms, userId]
        );
    }

    /** Validate trước khi cho phép đặt hàng công nợ */
    async validateCreditOrder(userId: number, orderAmount: number): Promise<{ valid: boolean; message?: string; paymentTerms: number }> {
        const creditInfo = await this.getCreditInfo(userId);

        if (!creditInfo.is_registered) {
            return { valid: false, message: 'Bạn chưa đăng ký sử dụng công nợ', paymentTerms: 0 };
        }

        if (!creditInfo.is_eligible) {
            return { valid: false, message: creditInfo.reason_not_eligible || 'Tài khoản không đủ điều kiện mua công nợ', paymentTerms: 0 };
        }

        if (creditInfo.has_active_debt && creditInfo.paid_percentage !== undefined && creditInfo.paid_percentage < 75) {
            return { valid: false, message: `Bạn cần thanh toán tối thiểu 75% tổng dư nợ hiện tại để tiếp tục mua (đã thanh toán: ${creditInfo.paid_percentage.toFixed(1)}%)`, paymentTerms: 0 };
        }

        if (orderAmount > creditInfo.credit_available) {
            return { valid: false, message: `Giá trị đơn hàng (${new Intl.NumberFormat('vi-VN').format(orderAmount)}đ) vượt quá hạn mức khả dụng (${new Intl.NumberFormat('vi-VN').format(creditInfo.credit_available)}đ)`, paymentTerms: 0 };
        }

        return { valid: true, paymentTerms: creditInfo.credit_payment_terms };
    }

    /** Sync lại credit_used từ receivables thực tế */
    async syncCreditUsed(userId: number): Promise<void> {
        const debtInfo = await this.getActiveDebtInfo(userId);
        await pool.query(
            'UPDATE users SET credit_used = ? WHERE id = ?',
            [debtInfo.totalUsed, userId]
        );
    }
}

export const creditService = new CreditService();
