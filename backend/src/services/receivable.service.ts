import { receivableRepository } from '../repositories/receivable.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { emailService } from './email.service';
import { AppError } from '../middlewares/error.middleware';

/**
 * Receivable Service - Business logic công nợ phải thu
 */
class ReceivableService {

    /**
     * Tạo công nợ tự động từ phiếu xuất kho (Export Receipt) khi được duyệt
     */
    async createFromExportReceipt(receipt: {
        id: number;
        receipt_number: string;
        total_amount: number;
        receipt_date: string;
        receiver_name?: string;
        receiver_phone?: string;
        receiver_address?: string;
        payment_terms?: number;
    }, createdBy?: number): Promise<number> {
        // Kiểm tra đã tồn tại chưa
        const existing = await receivableRepository.findBySource('export_receipt', receipt.id);
        if (existing) {
            return existing.id;
        }

        const paymentTerms = receipt.payment_terms || 0;
        const issueDate = receipt.receipt_date || new Date().toISOString().split('T')[0];

        const receivableId = await receivableRepository.create({
            source_type: 'export_receipt',
            source_id: receipt.id,
            source_number: receipt.receipt_number,
            debtor_type: 'external',
            debtor_name: receipt.receiver_name || 'Khách hàng',
            debtor_phone: receipt.receiver_phone,
            debtor_address: receipt.receiver_address,
            total_amount: receipt.total_amount,
            issue_date: issueDate,
            payment_terms: paymentTerms,
            notes: `Tự động tạo từ phiếu xuất kho ${receipt.receipt_number}`,
            created_by: createdBy,
        });

        return receivableId;
    }

    /**
     * Tạo công nợ từ đơn hàng COD delivered nhưng chưa thanh toán
     */
    async createFromOrder(order: {
        id: number;
        total_amount: number;
        shipping_name: string;
        shipping_phone: string;
        shipping_address: string;
        user_id: number;
        created_at: string;
    }, createdBy?: number): Promise<number> {
        // Kiểm tra đã tồn tại chưa
        const existing = await receivableRepository.findBySource('order', order.id);
        if (existing) {
            return existing.id;
        }

        const receivableId = await receivableRepository.create({
            source_type: 'order',
            source_id: order.id,
            source_number: `ORD-${order.id}`,
            debtor_type: 'user',
            user_id: order.user_id,
            debtor_name: order.shipping_name,
            debtor_phone: order.shipping_phone,
            debtor_address: order.shipping_address,
            total_amount: order.total_amount,
            issue_date: order.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            payment_terms: 0, // COD = thanh toán ngay
            notes: `Tự động tạo từ đơn hàng COD #${order.id}`,
            created_by: createdBy,
        });

        // Gửi notification cho user
        try {
            const receivable = await receivableRepository.findById(receivableId);
            if (receivable && order.user_id) {
                await notificationRepository.create({
                    user_id: order.user_id,
                    type: 'debt_created',
                    title: 'Công nợ mới từ đơn hàng COD',
                    message: `Đơn hàng #${order.id} đã giao thành công. Vui lòng thanh toán ${new Intl.NumberFormat('vi-VN').format(order.total_amount)} VNĐ.`,
                    reference_type: 'receivable',
                    reference_id: receivableId,
                });
            }
        } catch (err) {
            console.error('Lỗi gửi notification công nợ:', err);
        }

        return receivableId;
    }

    /**
     * Tạo công nợ từ đơn hàng CREDIT (mua trả sau)
     * Khác COD: KHÔNG auto-close, có payment_terms, có due_date
     */
    async createFromCreditOrder(order: {
        id: number;
        total_amount: number;
        shipping_name: string;
        shipping_phone: string;
        shipping_address: string;
        user_id: number;
        created_at: string;
        payment_terms: number;
    }, createdBy?: number): Promise<number> {
        // Kiểm tra đã tồn tại chưa
        const existing = await receivableRepository.findBySource('order', order.id);
        if (existing) {
            return existing.id;
        }

        const paymentTerms = order.payment_terms || 30;

        const receivableId = await receivableRepository.create({
            source_type: 'order',
            source_id: order.id,
            source_number: `ORD-${order.id}`,
            debtor_type: 'user',
            user_id: order.user_id,
            debtor_name: order.shipping_name,
            debtor_phone: order.shipping_phone,
            debtor_address: order.shipping_address,
            total_amount: order.total_amount,
            issue_date: order.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            payment_terms: paymentTerms,
            notes: `Công nợ từ đơn hàng trả sau #${order.id} - Hạn ${paymentTerms} ngày`,
            created_by: createdBy,
        });

        // Gửi notification cho user
        try {
            const receivable = await receivableRepository.findById(receivableId);
            if (receivable && order.user_id) {
                await notificationRepository.create({
                    user_id: order.user_id,
                    type: 'debt_created',
                    title: 'Công nợ mới từ đơn hàng trả sau',
                    message: `Đơn hàng #${order.id} đã giao thành công. Bạn cần thanh toán ${new Intl.NumberFormat('vi-VN').format(order.total_amount)} VNĐ trong vòng ${paymentTerms} ngày.`,
                    reference_type: 'receivable',
                    reference_id: receivableId,
                });
            }
        } catch (err) {
            console.error('Lỗi gửi notification công nợ CREDIT:', err);
        }

        return receivableId;
    }

    /** Lấy chi tiết công nợ */
    async getById(id: number) {
        const receivable = await receivableRepository.findById(id);
        if (!receivable) throw new AppError('Không tìm thấy công nợ', 404);
        return receivable;
    }

    /** Danh sách công nợ (Admin) */
    async getAll(filters: any) {
        return receivableRepository.findAll(filters);
    }

    /** Công nợ của 1 user (Client) */
    async getByUserId(userId: number) {
        return receivableRepository.findByUserId(userId);
    }

    /** Thống kê tổng cho dashboard */
    async getSummaryStats(startDate?: string, endDate?: string) {
        return receivableRepository.getSummaryStats(startDate, endDate);
    }

    /** Lấy danh sách quá hạn */
    async getOverdue() {
        return receivableRepository.getOverdueReceivables();
    }

    /**
     * Tạo công nợ tự động từ phiếu xuất kho nội bộ (Export Transfer) khi được duyệt
     */
    async createFromExportTransfer(transfer: {
        id: number;
        transfer_number: string;
        total_amount: number;
        transfer_date: string;
        receiver_name?: string;
        receiver_phone?: string;
        receiver_address?: string;
        payment_terms?: number;
    }, createdBy?: number): Promise<number> {
        // Kiểm tra đã tồn tại chưa
        const existing = await receivableRepository.findBySource('export_transfer', transfer.id);
        if (existing) {
            return existing.id;
        }

        const paymentTerms = transfer.payment_terms || 0;
        const issueDate = transfer.transfer_date || new Date().toISOString().split('T')[0];

        const receivableId = await receivableRepository.create({
            source_type: 'export_transfer',
            source_id: transfer.id,
            source_number: transfer.transfer_number,
            debtor_type: 'external',
            debtor_name: transfer.receiver_name || 'Khách hàng/Kho nhận',
            debtor_phone: transfer.receiver_phone,
            debtor_address: transfer.receiver_address,
            total_amount: transfer.total_amount,
            issue_date: issueDate,
            payment_terms: paymentTerms,
            notes: `Tự động tạo từ phiếu xuất/chuyển kho ${transfer.transfer_number}`,
            created_by: createdBy,
        });

        return receivableId;
    }

    /** Cập nhật trạng thái quá hạn */
    async checkAndMarkOverdue() {
        const count = await receivableRepository.markOverdue();
        if (count > 0) {
            console.log(`⚠️ Đã đánh dấu ${count} công nợ quá hạn`);
        }
        return count;
    }

    /** Hủy công nợ (Admin) */
    async cancel(id: number) {
        const receivable = await receivableRepository.findById(id);
        if (!receivable) throw new AppError('Không tìm thấy công nợ', 404);
        if (receivable.status === 'paid') throw new AppError('Không thể hủy công nợ đã thanh toán', 400);

        const ok = await receivableRepository.cancel(id);
        if (!ok) throw new AppError('Hủy công nợ thất bại', 500);
        return true;
    }

    /** Gửi nhắc nợ thủ công (Admin) */
    async sendReminder(id: number, emailInput?: string) {
        const receivable = await receivableRepository.findById(id);
        if (!receivable) throw new AppError('Không tìm thấy công nợ', 404);
        if (receivable.status === 'paid' || receivable.status === 'cancelled') {
            throw new AppError('Chỉ có thể nhắc nợ cho công nợ chưa hoàn tất', 400);
        }

        let finalEmail = emailInput || receivable.debtor_email || receivable.user_email_account;
        if (!finalEmail) throw new AppError('Không có địa chỉ email nào được gắn với công nợ này!', 400);

        // Lưu lại email nếu người dùng nhập mới
        if (emailInput && emailInput !== receivable.debtor_email) {
            await receivableRepository.updateEmail(id, emailInput);
            finalEmail = emailInput;
        }

        let daysOverdue = 0;
        if (receivable.due_date) {
            const due = new Date(receivable.due_date).getTime();
            const now = new Date().getTime();
            daysOverdue = Math.floor((now - due) / (1000 * 60 * 60 * 24));
        }

        const { emailService } = require('./email.service');
        const sent = await emailService.sendPaymentReminder(finalEmail, {
            debtorName: receivable.debtor_name,
            receivableNumber: receivable.receivable_number,
            totalAmount: parseFloat(receivable.total_amount),
            remainingAmount: parseFloat(receivable.total_amount) - parseFloat(receivable.paid_amount),
            dueDate: receivable.due_date ? new Date(receivable.due_date).toLocaleDateString('vi-VN') : 'Thanh toán ngay',
            daysOverdue: daysOverdue,
            sourceNumber: receivable.source_number || '',
        });

        if (!sent) throw new AppError('Gửi email nhắc nợ thất bại. Vui lòng kiểm tra lại cấu hình SMTP.', 500);
        return true;
    }

    /** Đánh dấu nợ xấu (Admin) */
    async markBadDebt(id: number) {
        const receivable = await receivableRepository.findById(id);
        if (!receivable) throw new AppError('Không tìm thấy công nợ', 404);
        if (receivable.status !== 'overdue') throw new AppError('Chỉ có thể đánh dấu nợ xấu cho công nợ quá hạn', 400);

        const ok = await receivableRepository.markBadDebt(id);
        if (!ok) throw new AppError('Thao tác thất bại', 500);
        return true;
    }

    /** Thống kê theo tháng */
    async getMonthlyStats(year: number) {
        return receivableRepository.getMonthlyStats(year);
    }

    /** Lấy sổ nợ tổng hợp (Admin) */
    async getConsolidatedLedger(filters: any) {
        return receivableRepository.getConsolidatedLedger(filters);
    }

    /** Lấy danh sách phiếu chưa trả theo SĐT */
    async getUnpaidByPhone(phone: string) {
        return receivableRepository.getUnpaidByPhone(phone);
    }
}

export const receivableService = new ReceivableService();
