import { auditRepository, FinancialAuditLog } from '../repositories/audit.repository';
import { userRepository } from '../repositories/user.repository';

class AuditService {
    /** Ghi log thao tác tài chính */
    async log(data: FinancialAuditLog) {
        try {
            // Lấy tên actor nếu chưa có
            if (data.actor_id && !data.actor_name) {
                const user = await userRepository.findById(data.actor_id);
                data.actor_name = user?.full_name || 'Hệ thống';
            }

            // Lấy tên approver nếu chưa có
            if (data.approver_id && !data.approver_name) {
                const approver = await userRepository.findById(data.approver_id);
                data.approver_name = approver?.full_name;
            }

            return await auditRepository.create(data);
        } catch (error) {
            console.error('[AuditService] Failed to record audit log:', error);
            // Không throw error để tránh làm gián đoạn flow chính của người dùng
            // Tuy nhiên, tùy vào yêu cầu audit nghiêm ngặt mà có thể throw
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
