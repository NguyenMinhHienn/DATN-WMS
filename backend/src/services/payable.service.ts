import { payableRepository } from '../repositories/payable.repository';
import { paymentVoucherRepository } from '../repositories/payment-voucher.repository';
import { AppError } from '../middlewares/error.middleware';

/**
 * Payable Service - Business logic công nợ phải trả NCC
 */
class PayableService {

    /**
     * Tạo công nợ tự động từ phiếu nhập kho (Import Transfer) khi được duyệt
     */
    async createFromImportTransfer(transfer: {
        id: number;
        transfer_number: string;
        total_amount: number;
        transfer_date: string;
        supplier_id: number;
        supplier_name: string;
        payment_terms: number;
    }, createdBy: number): Promise<number> {
        // Kiểm tra đã tồn tại chưa
        const existing = await payableRepository.findBySource('import_transfer', transfer.id);
        if (existing) {
            return existing.id;
        }

        const issueDate = transfer.transfer_date || new Date().toISOString().split('T')[0];

        const payableId = await payableRepository.create({
            source_type: 'import_transfer',
            source_id: transfer.id,
            source_number: transfer.transfer_number,
            supplier_id: transfer.supplier_id,
            supplier_name: transfer.supplier_name,
            total_amount: transfer.total_amount,
            issue_date: issueDate,
            payment_terms: transfer.payment_terms,
            notes: `Tự động tạo từ phiếu nhập kho ${transfer.transfer_number}`,
            created_by: createdBy,
        });

        return payableId;
    }

    /** Lấy chi tiết công nợ */
    async getById(id: number) {
        const payable = await payableRepository.findById(id);
        if (!payable) throw new AppError('Không tìm thấy công nợ', 404);
        return payable;
    }

    /** Danh sách công nợ (Admin) */
    async getAll(filters: any) {
        return payableRepository.findAll(filters);
    }

    /** Thống kê tổng cho dashboard */
    async getSummaryStats(startDate?: string, endDate?: string) {
        return payableRepository.getSummaryStats(startDate, endDate);
    }

    /** Thống kê theo tháng */
    async getMonthlyStats(year: number) {
        return payableRepository.getMonthlyStats(year);
    }

    /** Lấy sổ nợ tổng hợp (Admin) */
    async getConsolidatedLedger(filters: any) {
        return payableRepository.getConsolidatedLedger(filters);
    }

    /** Cập nhật trạng thái quá hạn */
    async checkAndMarkOverdue() {
        const count = await payableRepository.markOverdue();
        if (count > 0) {
            console.log(`[Scheduler] Đã đánh dấu ${count} công nợ NCC quá hạn`);
        }
        return count;
    }

    /** Hủy công nợ (Admin) */
    async cancel(id: number) {
        const payable = await payableRepository.findById(id);
        if (!payable) throw new AppError('Không tìm thấy công nợ', 404);
        if (payable.status === 'paid') throw new AppError('Không thể hủy công nợ đã thanh toán hoàn tất', 400);

        const ok = await payableRepository.cancel(id);
        if (!ok) throw new AppError('Hủy công nợ thất bại', 500);
        return true;
    }

    // --- LOGIC PHIẾU CHI (PAYMENT VOUCHERS) ---

    /** Tạo phiếu chi */
    async createVoucher(data: {
        payable_id: number;
        amount: number;
        payment_method: 'cash' | 'bank_transfer' | 'other';
        payment_date?: string;
        bank_reference?: string;
        notes?: string;
    }, adminId: number) {
        const payable = await payableRepository.findById(data.payable_id);
        if (!payable) throw new AppError('Không tìm thấy công nợ', 404);
        if (payable.status === 'paid' || payable.status === 'cancelled') {
            throw new AppError('Công nợ đã hoàn tất hoặc đã hủy, không thể tạo phiếu chi', 400);
        }

        const remaining = parseFloat(payable.total_amount) - parseFloat(payable.paid_amount);
        if (data.amount <= 0 || data.amount > remaining) {
            throw new AppError(`Số tiền chi không hợp lệ. Số tiền còn lại phải trả là ${new Intl.NumberFormat('vi-VN').format(remaining)} VNĐ`, 400);
        }

        const voucherId = await paymentVoucherRepository.create({
            ...data,
            payment_date: data.payment_date || new Date().toISOString().split('T')[0],
            created_by: adminId,
        });

        // Tự động duyệt phiếu chi nếu được tạo bởi Admin (để trừ nợ ngay lập tức)
        await this.approveVoucher(voucherId, adminId);

        return voucherId;
    }

    /** Duyệt phiếu chi */
    async approveVoucher(id: number, adminId: number) {
        const voucher = await paymentVoucherRepository.findById(id);
        if (!voucher) throw new AppError('Không tìm thấy phiếu chi', 404);
        if (voucher.status !== 'draft' && voucher.status !== 'pending') {
            throw new AppError('Chỉ có thể duyệt phiếu chi đang chờ duyệt', 400);
        }

        const payable = await payableRepository.findById(voucher.payable_id);
        if (!payable || payable.status === 'cancelled') {
            throw new AppError('Công nợ gốc không tồn tại hoặc đã hủy', 400);
        }

        const remaining = parseFloat(payable.total_amount) - parseFloat(payable.paid_amount);
        if (parseFloat(voucher.amount) > remaining) {
            throw new AppError('Số tiền trên phiếu chi vượt quá số nợ còn lại', 400);
        }

        // 1. Duyệt phiếu chi
        await paymentVoucherRepository.updateStatus(id, 'approved', adminId);

        // 2. Cập nhật paid_amount của công nợ
        await payableRepository.updatePaidAmount(voucher.payable_id, parseFloat(voucher.amount));

        return true;
    }

    /** Từ chối phiếu chi */
    async rejectVoucher(id: number, adminId: number, reason: string) {
        const voucher = await paymentVoucherRepository.findById(id);
        if (!voucher) throw new AppError('Không tìm thấy phiếu chi', 404);
        if (voucher.status !== 'draft' && voucher.status !== 'pending') {
            throw new AppError('Chỉ có thể từ chối phiếu chi đang chờ duyệt', 400);
        }

        await paymentVoucherRepository.updateStatus(id, 'rejected', adminId, reason);
        return true;
    }

    /** Lấy danh sách phiếu chi của 1 công nợ */
    async getVouchersByPayable(payableId: number) {
        return paymentVoucherRepository.findByPayableId(payableId);
    }
}

export const payableService = new PayableService();
