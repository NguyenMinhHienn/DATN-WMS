import { Request, Response } from "express";
import payos from "../config/payos";
import pool from "../config/database";
import { AuthRequest } from "../types";

// ==================== DEBT PAYMENT ONLINE ====================
const DEBT_ORDERCODE_OFFSET = 9000000; // Offset to distinguish debt payments from order payments

/**
 * [POST] /client/debt-payment
 * Client tạo link PayOS để thanh toán công nợ online
 * Min thanh toán: 35% số nợ còn lại
 */
export const createDebtPaymentLink = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { receivableId, amount } = req.body;

        if (!receivableId || !amount) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin receivableId hoặc amount" });
        }

        // 1. Validate receivable thuộc user hiện tại
        const [receivables]: any = await pool.query(
            `SELECT r.*, u.full_name as debtor_display_name 
             FROM receivables r 
             LEFT JOIN users u ON r.user_id = u.id
             WHERE r.id = ? AND r.user_id = ?`,
            [receivableId, userId]
        );

        if (receivables.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy công nợ hoặc không thuộc tài khoản của bạn" });
        }

        const receivable = receivables[0];

        // 2. Validate status
        if (receivable.status === 'paid') {
            return res.status(400).json({ success: false, message: "Công nợ này đã được thanh toán đủ" });
        }
        if (receivable.status === 'cancelled') {
            return res.status(400).json({ success: false, message: "Công nợ này đã bị hủy" });
        }

        // 3. Validate amount
        const remaining = parseFloat(receivable.total_amount) - parseFloat(receivable.paid_amount);
        const minPayment = Math.ceil(remaining * 0.35); // Min 35%
        const payAmount = Number(amount);

        if (payAmount <= 0) {
            return res.status(400).json({ success: false, message: "Số tiền thanh toán phải lớn hơn 0" });
        }
        if (payAmount < minPayment) {
            return res.status(400).json({ 
                success: false, 
                message: `Số tiền tối thiểu phải thanh toán là ${minPayment.toLocaleString('vi-VN')}đ (35% số nợ còn lại)` 
            });
        }
        if (payAmount > remaining) {
            return res.status(400).json({ 
                success: false, 
                message: `Số tiền thanh toán (${payAmount.toLocaleString('vi-VN')}đ) vượt quá số nợ còn lại (${remaining.toLocaleString('vi-VN')}đ)` 
            });
        }

        // 4. Tạo PayOS payment link
        // orderCode = DEBT_ORDERCODE_OFFSET + receivable_id để tránh trùng với order thường
        // Thêm timestamp cuối để tránh trùng nếu thanh toán nhiều lần cho cùng 1 receivable
        const timestamp = Math.floor(Date.now() / 1000) % 100000; // 5 chữ số cuối timestamp
        const orderCode = DEBT_ORDERCODE_OFFSET + receivable.id * 100000 + timestamp;

        const paymentData = {
            orderCode: orderCode,
            amount: payAmount,
            description: `CN ${receivable.receivable_number}`,
            cancelUrl: `${process.env.FRONTEND_URL}/debt-payment-cancel?receivableId=${receivableId}`,
            returnUrl: `${process.env.FRONTEND_URL}/debt-payment-success?receivableId=${receivableId}&amount=${payAmount}`,
            items: [
                {
                    name: `Thanh toán công nợ: ${receivable.receivable_number}`,
                    quantity: 1,
                    price: payAmount
                }
            ]
        };

        const response = await payos.createPaymentLink(paymentData);

        // 5. Lưu mapping orderCode -> receivableId vào DB để webhook tra cứu
        await pool.query(
            `INSERT INTO debt_payment_pending (order_code, receivable_id, user_id, amount, created_at) 
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE receivable_id = VALUES(receivable_id), amount = VALUES(amount), created_at = NOW()`,
            [orderCode, receivableId, userId, payAmount]
        );

        return res.json({
            success: true,
            checkoutUrl: response.checkoutUrl,
            orderCode: orderCode,
        });

    } catch (error: any) {
        console.error("Create debt payment error:", error);
        return res.status(500).json({
            success: false,
            message: "Tạo link thanh toán thất bại",
            error: error.message
        });
    }
};

// ==================== EXISTING PAYMENT FUNCTIONS ====================

export const createPaymentLink = async (req: Request, res: Response) => {

    try {

        const { orderId, amount } = req.body;

        // lấy các sản phẩm trong order
        const [items]: any = await pool.query(
            "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
            [orderId]
        );

        // trừ kho

        const paymentData = {
            orderCode: Number(orderId),
            amount: Number(amount),
            description: `DH ${orderId}`,
            cancelUrl: `${process.env.FRONTEND_URL}/payment-cancel?orderId=${orderId}`,
            returnUrl: `${process.env.FRONTEND_URL}/client/cart`,
            items: [
                {
                    name: `Đơn hàng số: ${orderId}`,
                    quantity: 1,
                    price: Number(amount)
                }
            ]
        };

        const response = await payos.createPaymentLink(paymentData);

        return res.json({
            checkoutUrl: response.checkoutUrl
        });

    } catch (error: any) {

        console.error("Create payment error:", error);

        return res.status(500).json({
            message: "Create payment failed",
            error: error.message
        });

    }
};
export const payosWebhook = async (req: Request, res: Response) => {
    try {

        const body = req.body;

        // kiểm tra dữ liệu webhook
        if (!body || !body.data) {
            return res.status(400).json({ message: "Invalid webhook" });
        }

        const orderCode = body.data.orderCode;

        // chỉ xử lý khi thanh toán thành công
        if (body.code === "00") {
            console.log("🔥 WEBHOOK:", JSON.stringify(body, null, 2));

            // ==================== DEBT PAYMENT ====================
            if (orderCode >= DEBT_ORDERCODE_OFFSET) {
                await handleDebtPaymentWebhook(orderCode, body.data);
            }
            // ==================== ORDER PAYMENT (logic cũ giữ nguyên) ====================
            else {
                const [result]: any = await pool.query(
                    `UPDATE orders 
                     SET payment_status = 'paid',
                         status = 'pending'
                     WHERE id = ?`,
                    [orderCode]
                );

                if (result.affectedRows === 0) {
                    console.log("⚠️ Không tìm thấy order trong DB:", orderCode);
                } else {
                    console.log("✅ Order updated to PAID:", orderCode);
                }
            }
        }

        return res.json({ success: true });

    } catch (error) {
        console.error("Webhook error:", error);
        return res.status(500).json({ success: false });
    }
};

/**
 * Xử lý webhook thanh toán công nợ online
 * Auto-approve: tạo phiếu thu đã duyệt + cập nhật công nợ + thông báo Staff/Admin
 */
async function handleDebtPaymentWebhook(orderCode: number, payosData: any) {
    try {
        // 1. Tra cứu pending record
        const [pendingRows]: any = await pool.query(
            `SELECT * FROM debt_payment_pending WHERE order_code = ?`,
            [orderCode]
        );

        if (pendingRows.length === 0) {
            console.log("⚠️ Không tìm thấy debt_payment_pending cho orderCode:", orderCode);
            return;
        }

        const pending = pendingRows[0];
        const { receivable_id, user_id, amount } = pending;

        // 2. Validate receivable vẫn còn hợp lệ
        const { receivableRepository } = require("../repositories/receivable.repository");
        const receivable = await receivableRepository.findById(receivable_id);
        if (!receivable) {
            console.log("⚠️ Không tìm thấy receivable:", receivable_id);
            return;
        }

        if (receivable.status === 'paid' || receivable.status === 'cancelled') {
            console.log(`⚠️ Receivable ${receivable_id} status=${receivable.status}, skip`);
            return;
        }

        // 3. Tạo payment receipt (auto-approved)
        const { paymentReceiptRepository } = require("../repositories/payment-receipt.repository");
        const { auditService } = require("../services/audit.service");
        const crypto = require("crypto");

        const paymentDate = new Date().toISOString().split('T')[0];
        const transactionGroupId = crypto.randomUUID();

        const receiptId = await paymentReceiptRepository.create({
            receivable_id: receivable_id,
            amount: Number(amount),
            payment_method: 'online_payos',
            payment_date: paymentDate,
            bank_reference: payosData.reference || `PayOS-${orderCode}`,
            notes: `Thanh toán online qua PayOS | Mã GD: ${orderCode}`,
            created_by: user_id,
            status: 'pending', // Tạo pending trước để log
        });

        const receipt = await paymentReceiptRepository.findById(receiptId);
        const receiptNumber = receipt?.receipt_number || `THU-PAYOS-${receiptId}`;
        const paidBefore = parseFloat(receivable.paid_amount);

        // 4. Ghi audit log CREATE
        await auditService.logWithBalanceSnapshot({
            referenceType: 'payment_receipt',
            referenceId: receiptId,
            referenceNumber: receiptNumber,
            action: 'CREATE',
            amount: Number(amount),
            actorId: user_id,
            statusAfter: 'pending',
            notes: `[ONLINE] Thanh toán công nợ online qua PayOS`,
            totalAmount: parseFloat(receivable.total_amount),
            paidBefore: paidBefore,
            paidAfter: paidBefore,
            paymentMethod: 'online_payos',
            bankReference: payosData.reference || `PayOS-${orderCode}`,
            selfApproved: true,
            transactionGroupId: transactionGroupId,
        });

        // 5. Auto-approve
        const { paymentReceiptService } = require("../services/payment-receipt.service");
        await paymentReceiptService.approve(receiptId, user_id, transactionGroupId);

        // 6. Gửi notification cho tất cả Staff + Admin
        const { notificationRepository } = require("../repositories/notification.repository");
        const [staffAdminUsers]: any = await pool.query(
            `SELECT DISTINCT u.id FROM users u 
             JOIN user_roles ur ON u.id = ur.user_id 
             JOIN roles r ON ur.role_id = r.id 
             WHERE r.name IN ('admin', 'staff', 'warehouse_manager') AND u.status = 'active'`
        );

        const debtorName = receivable.debtor_name || 'Khách hàng';
        const formattedAmount = new Intl.NumberFormat('vi-VN').format(Number(amount));
        
        for (const staffUser of staffAdminUsers) {
            try {
                await notificationRepository.create({
                    user_id: staffUser.id,
                    type: 'payment_receipt' as const,
                    title: `💳 Thanh toán online: ${receiptNumber}`,
                    message: `${debtorName} đã thanh toán online ${formattedAmount} VNĐ cho công nợ ${receivable.receivable_number}. Phiếu thu tự động được xác nhận qua PayOS.`,
                    reference_type: 'payment_receipt',
                    reference_id: receiptId,
                });
            } catch (notifErr) {
                console.error(`⚠️ Lỗi gửi notification cho user ${staffUser.id}:`, notifErr);
            }
        }

        // 7. Xóa pending record
        await pool.query(`DELETE FROM debt_payment_pending WHERE order_code = ?`, [orderCode]);

        console.log(`✅ Debt payment processed: ${receiptNumber} | ${formattedAmount} VNĐ | Receivable: ${receivable.receivable_number}`);

    } catch (error) {
        console.error("❌ handleDebtPaymentWebhook error:", error);
    }
}


export const cancelPaymentOrder = async (req: Request, res: Response) => {
    const orderId = req.params.id;

    try {

        //  lấy order
        const [orders]: any = await pool.query(
            "SELECT status FROM orders WHERE id = ?",
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        const order = orders[0];

        //  nếu đã cancel rồi → KHÔNG làm gì nữa
        if (order.status === "cancelled") {
            return res.json({ message: "Order already cancelled" });
        }

        //  nếu đã thanh toán → không cho cancel
        if (order.status === "confirmed") {
            return res.status(400).json({ message: "Order already paid" });
        }

        // lấy items
        const [items]: any = await pool.query(
            "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
            [orderId]
        );

        // [FIX 1.5] Hoàn kho qua inventoryCoreService để ghi log đúng inventory_logs
        const { inventoryCoreService } = require("../services/inventory-core.service");
        for (const item of items) {
            if (!item.variant_id) continue;

            try {
                const [invRows]: any = await pool.query(
                    `SELECT i.id, i.warehouse_id, i.product_id FROM inventories i 
                     WHERE i.product_variant_id = ? 
                     ORDER BY i.quantity_on_hand DESC LIMIT 1`,
                    [item.variant_id]
                );

                if (invRows.length > 0) {
                    // Hoàn qua inventoryCoreService → ghi inventory_logs
                    const conn = await pool.getConnection();
                    try {
                        await conn.beginTransaction();
                        await inventoryCoreService.importStock({
                            connection: conn as any,
                            productId: invRows[0].product_id,
                            variantId: item.variant_id,
                            warehouseId: invRows[0].warehouse_id,
                            quantity: item.quantity,
                            referenceType: 'order',
                            referenceId: Number(orderId),
                            reason: `Hoàn kho do hủy đơn PayOS #${orderId}`
                        });
                        await conn.commit();
                    } catch(err) {
                        await conn.rollback();
                        throw err;
                    } finally {
                        conn.release();
                    }
                } else {
                    // Fallback: cập nhật trực tiếp product_variants nếu chưa có inventories
                    await pool.query(
                        `UPDATE product_variants SET stock = stock + ? WHERE id = ?`,
                        [item.quantity, item.variant_id]
                    );
                }
            } catch (stockErr) {
                console.error(`⚠️ Lỗi hoàn kho variant ${item.variant_id}:`, stockErr);
                // Fallback an toàn
                await pool.query(
                    `UPDATE product_variants SET stock = stock + ? WHERE id = ?`,
                    [item.quantity, item.variant_id]
                );
            }
        }

        //  chỉ update trạng thái (KHÔNG xóa)
        await pool.query(
            `UPDATE orders 
             SET status = 'cancelled'
             WHERE id = ?`,
            [orderId]
        );

        // [FIX 1.2] Hủy công nợ liên quan nếu tồn tại
        try {
            const { receivableRepository } = require("../repositories/receivable.repository");
            const existing = await receivableRepository.findBySource('order', Number(orderId));
            if (existing && existing.status !== 'paid') {
                await receivableRepository.cancel(existing.id);
                console.log(`✅ Đã hủy công nợ ${existing.receivable_number} do cancel PayOS đơn #${orderId}`);
            }
        } catch (recErr) {
            console.error('⚠️ Lỗi hủy công nợ khi cancel PayOS order:', recErr);
        }

        return res.json({ message: "Order cancelled and stock restored correctly" });

    } catch (error) {
        console.error("Cancel order error:", error);

        return res.status(500).json({
            message: "Cancel order failed",
            error
        });
    }
};