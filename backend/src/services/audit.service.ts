import { auditRepository, FinancialAuditLog } from '../repositories/audit.repository';
import { userRepository } from '../repositories/user.repository';

class AuditService {
    /**
     * Ghi log thao tác tài chính — BẮT BUỘC thành công
     * 
     * Nếu ghi log thất bại, error sẽ được throw lên caller
     * để đảm bảo KHÔNG có giao dịch tài chính nào xảy ra mà không có audit trail.
     * Có cơ chế retry 1 lần trước khi throw.
     */
    async log(data: FinancialAuditLog) {
        // Lấy tên actor nếu chưa có
        if (data.actor_id && !data.actor_name) {
            try {
                const user = await userRepository.findById(data.actor_id);
                data.actor_name = user?.full_name || 'Hệ thống';
            } catch {
                data.actor_name = `User #${data.actor_id}`;
            }
        }

        // Lấy tên approver nếu chưa có
        if (data.approver_id && !data.approver_name) {
            try {
                const approver = await userRepository.findById(data.approver_id);
                data.approver_name = approver?.full_name;
            } catch {
                data.approver_name = `User #${data.approver_id}`;
            }
        }

        // Attempt 1: Ghi log
        try {
            return await auditRepository.create(data);
        } catch (firstError) {
            console.error('[AuditService] Lần 1 thất bại, thử lại...', firstError);

            // Attempt 2: Retry 1 lần sau 200ms
            try {
                await new Promise(resolve => setTimeout(resolve, 200));
                return await auditRepository.create(data);
            } catch (retryError) {
                console.error('[AuditService] ❌ CRITICAL: Ghi audit log thất bại sau 2 lần thử!', {
                    data,
                    error: retryError
                });
                // THROW để caller biết và rollback giao dịch tài chính
                throw new Error(
                    `[AUDIT CRITICAL] Không thể ghi nhật ký kiểm toán cho ${data.reference_type} #${data.reference_id} (${data.action}). ` +
                    `Giao dịch bị chặn để đảm bảo minh bạch tài chính.`
                );
            }
        }
    }

    /** Lấy lịch sử theo phiếu */
    async getHistory(type: string, id: number) {
        return await auditRepository.findByReference(type, id);
    }

    /** Lấy toàn bộ nhật ký (Admin) */
    async getAllLogs(filters: any) {
        return await auditRepository.findAll(filters);
    }

    /**
     * Helper tự động tính balance snapshot trước/sau khi ghi audit log.
     * Dùng cho tất cả thao tác tạo/duyệt phiếu thu/chi.
     */
    async logWithBalanceSnapshot(params: {
        referenceType: 'receivable' | 'payable' | 'payment_receipt' | 'payment_voucher';
        referenceId: number;
        referenceNumber?: string;
        action: string;
        amount?: number;
        actorId: number;
        approverId?: number;
        statusBefore?: string;
        statusAfter?: string;
        notes?: string;
        // Balance info
        totalAmount: number;
        paidBefore: number;
        paidAfter: number;
        // Payment info
        paymentMethod?: string;
        bankReference?: string;
        // Flags
        selfApproved?: boolean;
        transactionGroupId?: string;
    }) {
        const remainingBefore = params.totalAmount - params.paidBefore;
        const remainingAfter = params.totalAmount - params.paidAfter;

        const metadata = {
            balance_before: {
                total_amount: params.totalAmount,
                paid_amount: params.paidBefore,
                remaining: remainingBefore > 0 ? remainingBefore : 0
            },
            balance_after: {
                total_amount: params.totalAmount,
                paid_amount: params.paidAfter,
                remaining: remainingAfter > 0 ? remainingAfter : 0
            },
            self_approved: params.selfApproved || false,
            ...(params.paymentMethod ? { payment_method: params.paymentMethod } : {}),
            ...(params.bankReference ? { bank_reference: params.bankReference } : {}),
            ...(params.transactionGroupId ? { transaction_group_id: params.transactionGroupId } : {})
        };

        return await this.log({
            reference_type: params.referenceType,
            reference_id: params.referenceId,
            reference_number: params.referenceNumber,
            action: params.action,
            amount: params.amount,
            actor_id: params.actorId,
            approver_id: params.approverId,
            status_before: params.statusBefore,
            status_after: params.statusAfter,
            notes: params.notes,
            metadata: metadata
        });
    }
}

export const auditService = new AuditService();
