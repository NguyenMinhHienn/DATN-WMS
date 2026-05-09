import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

class AuditController {
    /** Lấy lịch sử thao tác của 1 phiếu */
    async getHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const { type, id } = req.params;
            const history = await auditService.getHistory(type, parseInt(id));
            res.json({ success: true, data: history });
        } catch (error) {
            next(error);
        }
    }

    /** Lấy toàn bộ nhật ký hệ thống */
    async getAllLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
                start_date: req.query.start_date as string,
                end_date: req.query.end_date as string,
                reference_type: req.query.reference_type as string,
                actor_id: req.query.actor_id ? parseInt(req.query.actor_id as string) : undefined
            };
            const result = await auditService.getAllLogs(filters);
            res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    }
}

export const auditController = new AuditController();
