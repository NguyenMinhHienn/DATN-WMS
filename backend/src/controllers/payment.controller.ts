import { Request, Response } from "express";
import payos from "../config/payos";
import pool from "../config/database";

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
        // console.log("Webhook body:", body);

        // kiểm tra dữ liệu webhook
        if (!body || !body.data) {
            return res.status(400).json({ message: "Invalid webhook" });
        }

        const orderCode = body.data.orderCode;

        // chỉ xử lý khi thanh toán thành công
        if (body.code === "00") {

            const [result]: any = await pool.query(
                `UPDATE orders 
     SET payment_status = 'paid',
         status = 'pending'
     WHERE id = ?`,
                [orderCode]
            );
            // console.log("OrderCode:", orderCode);
            // console.log("Update result:", result);
            console.log("🔥 WEBHOOK:", JSON.stringify(body, null, 2));

            // nếu không update được dòng nào
            if (result.affectedRows === 0) {
                console.log("⚠️ Không tìm thấy order trong DB:", orderCode);
            } else {
                console.log("✅ Order updated to PAID:", orderCode);
            }
        }


        return res.json({ success: true });


    } catch (error) {
        console.error("Webhook error:", error);
        return res.status(500).json({ success: false });
    }
};
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