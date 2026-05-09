import { Response } from 'express';
import { creditService } from '../services/credit.service';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

// ==================== CLIENT ENDPOINTS ====================

/** [GET] /client/credit-info - User xem thông tin tín dụng */
export const getClientCreditInfo = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const info = await creditService.getCreditInfo(userId);
    res.json({ success: true, data: info } as ApiResponse);
});

/** [POST] /client/credit/register - User đăng ký sử dụng công nợ */
export const registerCredit = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id_number, address, company, tax_code, payment_terms } = req.body;

    await creditService.register(userId, {
        id_number,
        address,
        company,
        tax_code,
        payment_terms: payment_terms ? parseInt(payment_terms) : undefined,
    });

    const info = await creditService.getCreditInfo(userId);

    res.json({
        success: true,
        message: info.is_eligible
            ? 'Đăng ký và kích hoạt công nợ thành công! Bạn có thể sử dụng ngay.'
            : 'Đăng ký thành công! Tính năng công nợ sẽ được kích hoạt khi bạn đủ điều kiện.',
        data: info,
    } as ApiResponse);
});

// ==================== ADMIN ENDPOINTS ====================

/** [GET] /admin/users/:id/credit - Admin xem credit info của user */
export const getAdminUserCredit = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    const info = await creditService.getCreditInfo(userId);
    res.json({ success: true, data: info } as ApiResponse);
});

/** [PUT] /admin/users/:id/credit/enable - Admin bật quyền công nợ */
export const enableUserCredit = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    const adminId = req.user?.userId!;
    await creditService.enableCredit(userId, adminId);
    res.json({ success: true, message: 'Đã kích hoạt công nợ cho user' } as ApiResponse);
});

/** [PUT] /admin/users/:id/credit/disable - Admin tắt quyền công nợ */
export const disableUserCredit = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    await creditService.disableCredit(userId);
    res.json({ success: true, message: 'Đã tắt công nợ cho user' } as ApiResponse);
});

/** [PUT] /admin/users/:id/credit/limit - Admin điều chỉnh hạn mức */
export const updateUserCreditLimit = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    const { credit_limit } = req.body;
    await creditService.updateCreditLimit(userId, parseFloat(credit_limit));
    res.json({ success: true, message: 'Đã cập nhật hạn mức công nợ' } as ApiResponse);
});

/** [PUT] /admin/users/:id/credit/payment-terms - Admin cập nhật hạn thanh toán */
export const updateUserPaymentTerms = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    const { payment_terms } = req.body;
    await creditService.updatePaymentTerms(userId, parseInt(payment_terms));
    res.json({ success: true, message: 'Đã cập nhật hạn thanh toán' } as ApiResponse);
});

/** [GET] /admin/credit/settings - Xem cấu hình credit */
export const getCreditSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await creditService.getAllSettings();
    res.json({ success: true, data: settings } as ApiResponse);
});

/** [PUT] /admin/credit/settings - Cập nhật cấu hình credit */
export const updateCreditSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const updates = req.body; // { credit_min_total_spent: '...', credit_default_limit: '...', ... }

    for (const [key, value] of Object.entries(updates)) {
        if (key.startsWith('credit_')) {
            await creditService.updateSetting(key, String(value));
        }
    }

    res.json({ success: true, message: 'Đã cập nhật cấu hình công nợ' } as ApiResponse);
});
