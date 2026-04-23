import rateLimit from 'express-rate-limit';

// Giới hạn số lần đăng ký để chống spam IP tạo tài khoản hàng loạt
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        message: 'Bạn đã tạo quá nhiều tài khoản từ địa chỉ IP này, vui lòng thử lại sau 1 giờ.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Giới hạn đặt hàng để chống tool tự tạo đơn rác
export const orderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Để ngăn chặn hành vi spam, vui lòng hủy phiếu nhập hàng có sai sót hoặc thiếu sót để tạo phiếu nhập lại, hoặc vui lòng thử lại sau 1 giờ.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
