import { payableRepository } from '../repositories/payable.repository';
import { paymentVoucherRepository } from '../repositories/payment-voucher.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import crypto from 'crypto';

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

        // Ghi log CREATE
        await auditService.log({
            reference_type: 'payable',
            reference_id: payableId,
            reference_number: transfer.transfer_number,
            action: 'CREATE',
            amount: transfer.total_amount,
            actor_id: createdBy,
            status_after: 'unpaid',
            notes: `Tự động tạo từ phiếu nhập kho ${transfer.transfer_number}`
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

        // Ghi log CANCEL
        await auditService.log({
            reference_type: 'payable',
            reference_id: id,
            reference_number: payable.payable_number,
            action: 'CANCEL',
            amount: parseFloat(payable.total_amount),
            actor_id: 0, // Cần pass actor_id từ controller nếu muốn định danh
            status_before: payable.status,
            status_after: 'cancelled'
        });

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
    }, userId: number, isAdmin: boolean = false) {
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
            created_by: userId,
        });

        // Lấy voucher_number thật từ DB (do repository auto-generate)
        const createdVoucher = await paymentVoucherRepository.findById(voucherId);
        const voucherNumber = createdVoucher?.voucher_number || `CHI-${voucherId}`;
        const transactionGroupId = crypto.randomUUID();

        // Ghi log CREATE TRƯỚC khi approve (đảm bảo thứ tự timeline đúng)
        await auditService.logWithBalanceSnapshot({
            referenceType: 'payment_voucher',
            referenceId: voucherId,
            referenceNumber: voucherNumber,
            action: 'CREATE',
            amount: data.amount,
            actorId: userId,
            statusAfter: 'pending',
            notes: data.notes || `Tạo phiếu chi cho công nợ ${payable.payable_number}`,
            totalAmount: parseFloat(payable.total_amount),
            paidBefore: parseFloat(payable.paid_amount),
            paidAfter: parseFloat(payable.paid_amount),
            paymentMethod: data.payment_method,
            bankReference: data.bank_reference,
            selfApproved: isAdmin,
            transactionGroupId: transactionGroupId
        });

        // Tự động duyệt phiếu chi nếu được tạo bởi Admin (để trừ nợ ngay lập tức)
        if (isAdmin) {
            await this.approveVoucher(voucherId, userId, transactionGroupId);
        }

        return voucherId;
    }

    /** Duyệt phiếu chi */
    async approveVoucher(id: number, adminId: number, transactionGroupId?: string) {
        const voucher = await paymentVoucherRepository.findById(id);
        if (!voucher) throw new AppError('Không tìm thấy phiếu chi', 404);
        if (voucher.status !== 'draft' && voucher.status !== 'pending') {
            throw new AppError('Chỉ có thể duyệt phiếu chi đang chờ duyệt', 400);
        }

        const payable = await payableRepository.findById(voucher.payable_id);
        if (!payable || payable.status === 'cancelled') {
            throw new AppError('Công nợ gốc không tồn tại hoặc đã hủy', 400);
        }

        const paidBefore = parseFloat(payable.paid_amount);
        const remaining = parseFloat(payable.total_amount) - paidBefore;
        if (parseFloat(voucher.amount) > remaining) {
            throw new AppError('Số tiền trên phiếu chi vượt quá số nợ còn lại', 400);
        }

        // 1. Duyệt phiếu chi
        await paymentVoucherRepository.updateStatus(id, 'approved', adminId);

        // 2. Cập nhật paid_amount của công nợ
        await payableRepository.updatePaidAmount(voucher.payable_id, parseFloat(voucher.amount));

        // Ghi log APPROVE kèm balance snapshot
        const paidAfter = paidBefore + parseFloat(voucher.amount);
        await auditService.logWithBalanceSnapshot({
            referenceType: 'payment_voucher',
            referenceId: id,
            referenceNumber: voucher.voucher_number,
            action: 'APPROVE',
            amount: parseFloat(voucher.amount),
            actorId: adminId,
            approverId: adminId,
            statusBefore: voucher.status,
            statusAfter: 'approved',
            notes: `Duyệt phiếu chi ${voucher.voucher_number}`,
            totalAmount: parseFloat(payable.total_amount),
            paidBefore: paidBefore,
            paidAfter: paidAfter,
            paymentMethod: voucher.payment_method,
            bankReference: voucher.bank_reference,
            selfApproved: voucher.created_by === adminId,
            transactionGroupId: transactionGroupId
        });

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

        // Ghi log REJECT
        await auditService.log({
            reference_type: 'payment_voucher',
            reference_id: id,
            reference_number: voucher.voucher_number,
            action: 'REJECT',
            amount: parseFloat(voucher.amount),
            actor_id: adminId,
            status_before: voucher.status,
            status_after: 'rejected',
            notes: reason
        });

        return true;
    }

    /** Lấy danh sách phiếu chi của 1 công nợ */
    async getVouchersByPayable(payableId: number) {
        return paymentVoucherRepository.findByPayableId(payableId);
    }

    /** Lấy danh sách tất cả phiếu chi (có filter) */
    async getAllVouchers(filters: {
        page?: number;
        limit?: number;
        status?: string;
        payable_id?: number;
    }) {
        return paymentVoucherRepository.findAll(filters);
    }

    /** Lấy danh sách phiếu nợ chưa trả theo supplier_id (FIFO) */
    async getUnpaidBySupplier(supplierId: number) {
        return payableRepository.getUnpaidBySupplier(supplierId);
    }

    /**
     * Tạo phiếu chi gộp cho nhiều công nợ của 1 NCC (FIFO)
     * Ưu tiên thanh toán cho các phiếu cũ nhất trước
     */
    async createConsolidatedVoucher(data: {
        supplier_id: number;
        amount: number;
        payment_method: 'cash' | 'bank_transfer' | 'other';
        payment_date?: string;
        bank_reference?: string;
        notes?: string;
    }, adminId: number) {
        if (data.amount <= 0) throw new AppError('Số tiền phải lớn hơn 0', 400);

        // 1. Lấy danh sách phiếu nợ chưa trả (FIFO)
        const unpaidPayables = await payableRepository.getUnpaidBySupplier(data.supplier_id);
        if (unpaidPayables.length === 0) {
            throw new AppError('Nhà cung cấp này không còn nợ chưa thanh toán', 400);
        }

        const totalRemaining = unpaidPayables.reduce((sum: number, p: any) =>
            sum + (parseFloat(p.total_amount) - parseFloat(p.paid_amount)), 0);

        if (data.amount > totalRemaining) {
            throw new AppError(`Số tiền thanh toán (${new Intl.NumberFormat('vi-VN').format(data.amount)}) vượt quá tổng dư nợ (${new Intl.NumberFormat('vi-VN').format(totalRemaining)})`, 400);
        }

        let remainingToPay = data.amount;
        const voucherIds: number[] = [];

        // 2. Duyệt qua từng phiếu nợ và gạch nợ (FIFO)
        for (const payable of unpaidPayables) {
            if (remainingToPay <= 0) break;

            const remainingOnSlip = parseFloat(payable.total_amount) - parseFloat(payable.paid_amount);
            const amountForThisSlip = Math.min(remainingToPay, remainingOnSlip);

            if (amountForThisSlip > 0) {
                // Tạo phiếu chi cho phiếu nợ này
                const voucherId = await paymentVoucherRepository.create({
                    payable_id: payable.id,
                    amount: amountForThisSlip,
                    payment_method: data.payment_method,
                    payment_date: data.payment_date || new Date().toISOString().split('T')[0],
                    bank_reference: data.bank_reference,
                    notes: data.notes || `Thanh toán gộp cho NCC #${data.supplier_id}`,
                    created_by: adminId,
                });

                voucherIds.push(voucherId);

                // Auto-approve và cập nhật paid_amount
                await paymentVoucherRepository.updateStatus(voucherId, 'approved', adminId);

                // Ghi balance snapshot vào audit
                const paidBefore = parseFloat(payable.paid_amount);
                const paidAfter = paidBefore + amountForThisSlip;
                await payableRepository.updatePaidAmount(payable.id, amountForThisSlip);

                await auditService.log({
                    reference_type: 'payment_voucher',
                    reference_id: voucherId,
                    reference_number: `CHI-BULK-${voucherId}`,
                    action: 'APPROVE',
                    amount: amountForThisSlip,
                    actor_id: adminId,
                    approver_id: adminId,
                    status_before: payable.status,
                    status_after: paidAfter >= parseFloat(payable.total_amount) ? 'paid' : 'partial',
                    notes: `[Thanh toán gộp] Phiếu ${payable.payable_number} | Trước: ${paidBefore} → Sau: ${paidAfter} | Tổng nợ: ${payable.total_amount}`
                });

                remainingToPay -= amountForThisSlip;
            }
        }

        return {
            success: true,
            voucher_ids: voucherIds,
            amount_paid: data.amount - remainingToPay,
            remaining_unprocessed: remainingToPay
        };
    }

    /** Lấy danh sách công nợ NCC sắp tới hạn */
    async getUpcomingDue(daysAhead: number = 3) {
        return payableRepository.getUpcomingDue(daysAhead);
    }

    /** Lấy số lượng phiếu chi đang chờ duyệt */
    async getPendingCount(): Promise<number> {
        const result = await paymentVoucherRepository.findAll({ status: 'pending', limit: 1 });
        return result.pagination.total;
    }
}

export const payableService = new PayableService();

