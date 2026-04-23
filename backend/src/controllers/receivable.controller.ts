import { Response } from 'express';
import { receivableService } from '../services/receivable.service';
import { paymentReceiptService } from '../services/payment-receipt.service';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

// ==================== RECEIVABLE ENDPOINTS ====================

/** [GET] /receivables - Admin: danh sách công nợ */
export const getAllReceivables = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await receivableService.getAll({
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as string,
        source_type: req.query.source_type as string,
        debtor_name: req.query.debtor_name as string,
        debtor_phone: req.query.debtor_phone as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
    });

    res.json({ success: true, data: result.data, pagination: result.pagination } as ApiResponse);
});

/** [GET] /receivables/summary - Admin: thống kê tổng */
export const getReceivableSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await receivableService.getSummaryStats();
    res.json({ success: true, data: stats } as ApiResponse);
});

/** [GET] /receivables/overdue - Admin: danh sách quá hạn */
export const getOverdueReceivables = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await receivableService.getOverdue();
    res.json({ success: true, data } as ApiResponse);
});

/** [GET] /receivables/monthly-stats - Admin: thống kê theo tháng */
export const getMonthlyStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const data = await receivableService.getMonthlyStats(year);
    res.json({ success: true, data } as ApiResponse);
});

/** [POST] /receivables/check-overdue - Admin: cập nhật trạng thái quá hạn */
export const checkOverdue = asyncHandler(async (req: AuthRequest, res: Response) => {
    const count = await receivableService.checkAndMarkOverdue();
    res.json({ success: true, message: `Đã cập nhật ${count} công nợ quá hạn`, data: { count } } as ApiResponse);
});

/** [GET] /receivables/:id - Chi tiết công nợ */
export const getReceivableById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const data = await receivableService.getById(id);

    // Lấy lịch sử phiếu thu
    const paymentHistory = await paymentReceiptService.getByReceivableId(id);

    res.json({ success: true, data: { ...data, payment_history: paymentHistory } } as ApiResponse);
});

/** [PUT] /receivables/:id/cancel - Admin: hủy công nợ */
export const cancelReceivable = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await receivableService.cancel(id);
    res.json({ success: true, message: 'Đã hủy công nợ' } as ApiResponse);
});

/** [POST] /receivables/:id/remind - Admin: Gửi email nhắc nợ */
export const sendReminder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { email } = req.body;
    await receivableService.sendReminder(id, email);
    res.json({ success: true, message: 'Đã gửi email nhắc nợ thành công!' } as ApiResponse);
});

/** [PUT] /receivables/:id/bad-debt - Admin: đánh dấu nợ xấu */
export const markBadDebt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await receivableService.markBadDebt(id);
    res.json({ success: true, message: 'Đã đánh dấu nợ xấu' } as ApiResponse);
});

/** [GET] /client/receivables - User: xem công nợ của mình */
export const getClientReceivables = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const data = await receivableService.getByUserId(userId);
    res.json({ success: true, data } as ApiResponse);
});

// ==================== PAYMENT RECEIPT ENDPOINTS ====================

/** [POST] /payment-receipts - Staff/Admin: tạo phiếu thu */
export const createPaymentReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = req.user?.roles?.includes('admin') || false;
    const id = await paymentReceiptService.create(req.body, req.user?.userId, isAdmin);

    res.status(201).json({
        success: true,
        message: isAdmin ? 'Tạo và duyệt phiếu thu thành công' : 'Tạo phiếu thu thành công (chờ duyệt)',
        data: { id },
    } as ApiResponse);
});

/** [GET] /payment-receipts - Admin: danh sách phiếu thu */
export const getAllPaymentReceipts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await paymentReceiptService.getAll({
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as string,
        receivable_id: req.query.receivable_id ? parseInt(req.query.receivable_id as string) : undefined,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
    });

    res.json({ success: true, data: result.data, pagination: result.pagination } as ApiResponse);
});

/** [GET] /payment-receipts/:id - Chi tiết phiếu thu */
export const getPaymentReceiptById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const data = await paymentReceiptService.getById(id);
    res.json({ success: true, data } as ApiResponse);
});

/** [PUT] /payment-receipts/:id/approve - Admin: duyệt phiếu thu */
export const approvePaymentReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await paymentReceiptService.approve(id, req.user?.userId!);
    res.json({ success: true, message: 'Duyệt phiếu thu thành công. Công nợ đã được cập nhật.' } as ApiResponse);
});

/** [PUT] /payment-receipts/:id/reject - Admin: từ chối phiếu thu */
export const rejectPaymentReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { reason } = req.body;
    await paymentReceiptService.reject(id, req.user?.userId!, reason);
    res.json({ success: true, message: 'Đã từ chối phiếu thu' } as ApiResponse);
});

/** [GET] /receivables/ledger - Admin: sổ nợ tổng hợp theo khách hàng */
export const getConsolidatedLedger = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await receivableService.getConsolidatedLedger({
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        search: req.query.search as string,
    });

    res.json({ success: true, data: result.data, pagination: result.pagination } as ApiResponse);
});

/** [POST] /payment-receipts/consolidated - Admin: thu tiền gộp cho nhiều phiếu (FIFO) */
export const createConsolidatedPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = req.user?.roles?.includes('admin') || false;
    if (!isAdmin) throw new Error('Chỉ Admin mới có thể thực hiện thu tiền gộp');

    const result = await paymentReceiptService.createConsolidatedPayment(
        req.body, 
        req.user?.userId!, 
        true
    );

    res.status(201).json({
        success: true,
        message: 'Đã thực hiện thu tiền gộp và gạch nợ thành công',
        data: result,
    } as ApiResponse);
});
