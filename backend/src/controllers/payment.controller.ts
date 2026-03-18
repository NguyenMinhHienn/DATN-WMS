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

        //  hoàn kho (CHỈ 1 LẦN)
        for (const item of items) {
            if (!item.variant_id) continue;

            await pool.query(
                `UPDATE product_variants
                 SET stock = stock + ?
                 WHERE id = ?`,
                [item.quantity, item.variant_id]
            );
        }

        //  chỉ update trạng thái (KHÔNG xóa)
        await pool.query(
            `UPDATE orders 
             SET status = 'cancelled'
             WHERE id = ?`,
            [orderId]
        );

        return res.json({ message: "Order cancelled and stock restored correctly" });

    } catch (error) {
        console.error("Cancel order error:", error);

        return res.status(500).json({
            message: "Cancel order failed",
            error
        });
    }
};