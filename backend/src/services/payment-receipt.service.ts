import { paymentReceiptRepository } from '../repositories/payment-receipt.repository';
import { receivableRepository } from '../repositories/receivable.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { emailService } from './email.service';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';

/**
 * Payment Receipt Service - Business logic phiếu thu
 * Staff tạo → Admin duyệt → Cập nhật công nợ → Gửi thông báo
 */
class PaymentReceiptService {

    /** Staff tạo phiếu thu */
    async create(data: {
        receivable_id: number;
        amount: number;
        payment_method: string;
        payment_date: string;
        bank_name?: string;
        bank_account?: string;
        bank_reference?: string;
        notes?: string;
        debtor_email?: string;
    }, createdBy?: number, isAdmin: boolean = false) {
        // Validate receivable
        const receivable = await receivableRepository.findById(data.receivable_id);
        if (!receivable) throw new AppError('Không tìm thấy công nợ', 404);

        if (receivable.status === 'paid') throw new AppError('Công nợ đã được thanh toán đủ', 400);
        if (receivable.status === 'cancelled') throw new AppError('Công nợ đã bị hủy', 400);

        // Validate amount
        const remaining = parseFloat(receivable.total_amount) - parseFloat(receivable.paid_amount);
        if (data.amount <= 0) throw new AppError('Số tiền phải lớn hơn 0', 400);
        if (data.amount > remaining) {
            throw new AppError(`Số tiền thu (${data.amount}) vượt quá còn nợ (${remaining})`, 400);
        }

        const id = await paymentReceiptRepository.create({
            ...data,
            created_by: createdBy,
            status: isAdmin ? 'approved' : 'pending', // Admin tạo = approved luôn
        });

        // Nếu có nhập email, cập nhật email vào công nợ
        if (data.debtor_email) {
            await receivableRepository.updateEmail(data.receivable_id, data.debtor_email);
        }

        // Nếu admin tạo, auto-approve
        if (isAdmin && createdBy) {
            await this.processApproval(id, createdBy);
        }

        // Ghi log CREATE
        await auditService.log({
            reference_type: 'payment_receipt',
            reference_id: id,
            reference_number: `THU-${id}`, // Hoặc lấy receipt_number nếu có repo trả về
            action: 'CREATE',
            amount: data.amount,
            actor_id: createdBy || 0,
            status_after: isAdmin ? 'approved' : 'pending',
            notes: data.notes
        });

        return id;
    }

    /** 
     * Tạo phiếu thu gộp cho nhiều công nợ (Sổ nợ)
     * Ưu tiên thanh toán cho các phiếu cũ trước (FIFO)
     */
    async createConsolidatedPayment(data: {
        debtor_phone: string;
        amount: number;
        payment_method: string;
        payment_date: string;
        bank_name?: string;
        bank_account?: string;
        bank_reference?: string;
        notes?: string;
    }, createdBy: number, isAdmin: boolean = false) {
        if (data.amount <= 0) throw new AppError('Số tiền phải lớn hơn 0', 400);

        // 1. Lấy danh sách phiếu nợ chưa trả của SĐT này (FIFO)
        const unpaidReceivables = await receivableRepository.getUnpaidByPhone(data.debtor_phone);
        if (unpaidReceivables.length === 0) {
            throw new AppError(`Khách hàng số điện thoại ${data.debtor_phone} không còn nợ`, 400);
        }

        const totalRemaining = unpaidReceivables.reduce((sum, r) => 
            sum + (parseFloat(r.total_amount) - parseFloat(r.paid_amount)), 0);
        
        if (data.amount > totalRemaining) {
            throw new AppError(`Số tiền thanh toán (${data.amount}) vượt quá tổng dư nợ (${totalRemaining})`, 400);
        }

        let remainingToPay = data.amount;
        const receiptIds: number[] = [];

        // 2. Duyệt qua từng phiếu nợ và gạch nợ
        for (const receivable of unpaidReceivables) {
            if (remainingToPay <= 0) break;

            const remainingOnSlip = parseFloat(receivable.total_amount) - parseFloat(receivable.paid_amount);
            const amountForThisSlip = Math.min(remainingToPay, remainingOnSlip);

            if (amountForThisSlip > 0) {
                // Tạo phiếu thu lẻ cho phiếu nợ này
                const receiptId = await paymentReceiptRepository.create({
                    receivable_id: receivable.id,
                    amount: amountForThisSlip,
                    payment_method: data.payment_method,
                    payment_date: data.payment_date,
                    bank_name: data.bank_name,
                    bank_account: data.bank_account,
                    bank_reference: data.bank_reference,
                    notes: data.notes || `Thanh toán gộp cho khách hàng ${data.debtor_phone}`,
                    created_by: createdBy,
                    status: isAdmin ? 'approved' : 'pending'
                });

                receiptIds.push(receiptId);

                // Nếu là Admin thì auto-approve luôn
                if (isAdmin) {
                    await this.processApproval(receiptId, createdBy);
                }

                remainingToPay -= amountForThisSlip;
            }
        }

        return {
            success: true,
            receipt_ids: receiptIds,
            amount_paid: data.amount - remainingToPay,
            remaining_unprocessed: remainingToPay
        };
    }

    /** Lấy chi tiết phiếu thu */
    async getById(id: number) {
        const receipt = await paymentReceiptRepository.findById(id);
        if (!receipt) throw new AppError('Không tìm thấy phiếu thu', 404);
        return receipt;
    }

    /** Danh sách phiếu thu */
    async getAll(filters: any) {
        return paymentReceiptRepository.findAll(filters);
    }

    /** Lịch sử thu tiền của 1 công nợ */
    async getByReceivableId(receivableId: number) {
        return paymentReceiptRepository.findByReceivableId(receivableId);
    }

    /** Admin duyệt phiếu thu */
    async approve(id: number, userId: number) {
        const receipt = await paymentReceiptRepository.findById(id);
        if (!receipt) throw new AppError('Không tìm thấy phiếu thu', 404);
        if (receipt.status !== 'pending') throw new AppError('Phiếu thu không ở trạng thái chờ duyệt', 400);

        // Validate lại amount
        const receivable = await receivableRepository.findById(receipt.receivable_id);
        if (!receivable) throw new AppError('Không tìm thấy công nợ liên quan', 404);

        const paidBefore = parseFloat(receivable.paid_amount);
        const remaining = parseFloat(receivable.total_amount) - paidBefore;
        if (parseFloat(receipt.amount) > remaining) {
            throw new AppError(`Số tiền thu vượt quá còn nợ hiện tại (${remaining})`, 400);
        }

        // Approve phiếu thu
        const ok = await paymentReceiptRepository.approve(id, userId);
        if (!ok) throw new AppError('Duyệt phiếu thu thất bại', 500);

        // Xử lý sau duyệt
        await this.processApproval(id, userId);

        // Ghi log APPROVE kèm balance snapshot
        const paidAfter = paidBefore + parseFloat(receipt.amount);
        const remainingAfter = parseFloat(receivable.total_amount) - paidAfter;
        await auditService.log({
            reference_type: 'payment_receipt',
            reference_id: id,
            reference_number: receipt.receipt_number,
            action: 'APPROVE',
            amount: parseFloat(receipt.amount),
            actor_id: userId,
            approver_id: userId,
            status_before: 'pending',
            status_after: 'approved',
            notes: `[Balance] Đã thu: ${paidBefore} → ${paidAfter} | Còn nợ: ${remainingAfter} | Tổng nợ: ${receivable.total_amount}`
        });

        return true;
    }

    /** Xử lý logic sau khi duyệt phiếu thu */
    private async processApproval(receiptId: number, approvedBy: number) {
        const receipt = await paymentReceiptRepository.findById(receiptId);
        if (!receipt) return;

        // 1. Cập nhật paid_amount trong receivable
        await receivableRepository.updatePaidAmount(receipt.receivable_id, parseFloat(receipt.amount));

        // 2. Lấy lại receivable đã cập nhật
        const receivable = await receivableRepository.findById(receipt.receivable_id);
        if (!receivable) return;

        const remainingDebt = parseFloat(receivable.total_amount) - parseFloat(receivable.paid_amount);

        // 3. Gửi notification in-app nếu debtor có user account
        if (receivable.user_id) {
            try {
                await notificationRepository.create({
                    user_id: receivable.user_id,
                    type: 'payment_receipt',
                    title: `Phiếu thu ${receipt.receipt_number} đã được duyệt`,
                    message: remainingDebt <= 0
                        ? `Thanh toán ${new Intl.NumberFormat('vi-VN').format(receipt.amount)} VNĐ thành công. Công nợ ${receivable.receivable_number} đã hoàn tất.`
                        : `Đã ghi nhận thanh toán ${new Intl.NumberFormat('vi-VN').format(receipt.amount)} VNĐ. Còn nợ: ${new Intl.NumberFormat('vi-VN').format(remainingDebt)} VNĐ.`,
                    reference_type: 'payment_receipt',
                    reference_id: receiptId,
                });
            } catch (err) {
                console.error('Lỗi tạo notification:', err);
            }
        }

        // 4. Gửi email nếu có email debtor
        const debtorEmail = receivable.debtor_email || receivable.user_email_account;
        if (debtorEmail) {
            try {
                await emailService.sendPaymentReceipt(debtorEmail, {
                    receiptNumber: receipt.receipt_number,
                    debtorName: receivable.debtor_name,
                    amount: parseFloat(receipt.amount),
                    paymentDate: new Date(receipt.payment_date).toLocaleDateString('vi-VN'),
                    paymentMethod: receipt.payment_method,
                    remainingDebt,
                    sourceNumber: receivable.source_number || '',
                    receivableNumber: receivable.receivable_number,
                });
            } catch (err) {
                console.error('Lỗi gửi email phiếu thu:', err);
            }
        }

        // 5. Sync credit_used nếu debtor là user có tài khoản
        if (receivable.user_id) {
            try {
                const { creditService } = require('./credit.service');
                await creditService.syncCreditUsed(receivable.user_id);
            } catch (err) {
                console.error('Lỗi sync credit_used:', err);
            }
        }
    }

    /** Admin từ chối phiếu thu */
    async reject(id: number, userId: number, reason: string) {
        const receipt = await paymentReceiptRepository.findById(id);
        if (!receipt) throw new AppError('Không tìm thấy phiếu thu', 404);
        if (receipt.status !== 'pending') throw new AppError('Phiếu thu không ở trạng thái chờ duyệt', 400);
        if (!reason || reason.trim().length === 0) throw new AppError('Vui lòng nhập lý do từ chối', 400);

        const ok = await paymentReceiptRepository.reject(id, userId, reason);
        if (!ok) throw new AppError('Từ chối phiếu thu thất bại', 500);

        // Ghi log REJECT
        await auditService.log({
            reference_type: 'payment_receipt',
            reference_id: id,
            reference_number: receipt.receipt_number,
            action: 'REJECT',
            amount: parseFloat(receipt.amount),
            actor_id: userId,
            status_before: 'pending',
            status_after: 'rejected',
            notes: reason
        });

        // Notify staff (if debtor has account)
        const receivable = await receivableRepository.findById(receipt.receivable_id);
        if (receivable?.user_id) {
            try {
                await notificationRepository.create({
                    user_id: receivable.user_id,
                    type: 'payment_receipt',
                    title: `Phiếu thu ${receipt.receipt_number} bị từ chối`,
                    message: `Lý do: ${reason}`,
                    reference_type: 'payment_receipt',
                    reference_id: id,
                });
            } catch (err) {
                console.error('Lỗi tạo notification:', err);
            }
        }

        return true;
    }
}

export const paymentReceiptService = new PaymentReceiptService();
