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
}

export const auditService = new AuditService();
