import { Request, Response, NextFunction } from 'express';
import { payableService } from '../services/payable.service';

/**
 * Payable Controller - API cho công nợ NCC
 */
class PayableController {

    /** Lấy danh sách công nợ (Admin) */
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await payableService.getAll({
                page: req.query.page ? parseInt(req.query.page as string) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
                status: req.query.status as string,
                supplier_id: req.query.supplier_id ? parseInt(req.query.supplier_id as string) : undefined,
                search: req.query.search as string,
                start_date: req.query.start_date as string,
                end_date: req.query.end_date as string,
            });
            res.json({ success: true, data: result.data, pagination: result.pagination });
        } catch (error) {
            next(error);
        }
    }

    /** Lấy thống kê KPI */
    async getSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const start_date = req.query.start_date as string;
            const end_date = req.query.end_date as string;
            const stats = await payableService.getSummaryStats(start_date, end_date);
            res.json({ success: true, data: stats });
        } catch (error) {
            next(error);
        }
    }

    /** Lấy chi tiết công nợ */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const payable = await payableService.getById(id);
            res.json({ success: true, data: payable });
        } catch (error) {
            next(error);
        }
    }

    /** Hủy công nợ */
    async cancel(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            await payableService.cancel(id);
            res.json({ success: true, message: 'Hủy công nợ thành công' });
        } catch (error) {
            next(error);
        }
    }

    // --- PHIẾU CHI ---

    /** Lấy danh sách phiếu chi của 1 công nợ */
    async getVouchers(req: Request, res: Response, next: NextFunction) {
        try {
            const payableId = parseInt(req.params.id);
            const vouchers = await payableService.getVouchersByPayable(payableId);
            res.json({ success: true, data: vouchers });
        } catch (error) {
            next(error);
        }
    }

    /** Tạo phiếu chi mới */
    async createVoucher(req: Request, res: Response, next: NextFunction) {
        try {
            const adminId = (req as any).user.userId;
            const data = {
                ...req.body,
                payable_id: parseInt(req.params.id)
            };
            const voucherId = await payableService.createVoucher(data, adminId);
            res.status(201).json({ message: 'Tạo phiếu chi thành công', data: { id: voucherId } });
        } catch (error) {
            next(error);
        }
    }

    /** Duyệt phiếu chi */
    async approveVoucher(req: Request, res: Response, next: NextFunction) {
        try {
            const adminId = (req as any).user.userId;
            const voucherId = parseInt(req.params.voucherId);
            await payableService.approveVoucher(voucherId, adminId);
            res.json({ success: true, message: 'Duyệt phiếu chi thành công' });
        } catch (error) {
            next(error);
        }
    }

    /** Từ chối phiếu chi */
    async rejectVoucher(req: Request, res: Response, next: NextFunction) {
        try {
            const adminId = (req as any).user.userId;
            const voucherId = parseInt(req.params.voucherId);
            const { reason } = req.body;
            await payableService.rejectVoucher(voucherId, adminId, reason);
            res.json({ success: true, message: 'Từ chối phiếu chi thành công' });
        } catch (error) {
            next(error);
        }
    }

    /** Thống kê theo tháng */
    async getMonthlyStats(req: Request, res: Response, next: NextFunction) {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const stats = await payableService.getMonthlyStats(year);
            res.json({ success: true, data: stats });
        } catch (error) {
            next(error);
        }
    }

    /** Lấy sổ nợ tổng hợp theo NCC */
    async getConsolidatedLedger(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = {
                page: req.query.page ? parseInt(req.query.page as string) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
                search: req.query.search as string,
            };
            const result = await payableService.getConsolidatedLedger(filters);
            res.json({ success: true, data: result.data, pagination: result.pagination });
        } catch (error) {
            next(error);
        }
    }
}

export const payableController = new PayableController();
