import { Request, Response } from "express";
import payos from "../config/payos";

export const confirmWebhook = async (req: Request, res: Response) => {
  try {


    let webhookUrl = req.body?.webhookUrl || process.env.PAYOS_WEBHOOK_UR;

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp webhookUrl trong body hoặc biến PAYOS_WEBHOOK_URL trong .env"
      });
    }


    if (!webhookUrl.endsWith('/api/webhook')) {
      webhookUrl = `${webhookUrl.replace(/\/$/, '')}/api/webhook`;
    }

    const response = await (payos as any).confirmWebhook(webhookUrl);

    console.log(`✅ Webhook confirmed successfully: ${webhookUrl}`, response);
    return res.json({
      success: true,
      message: "Đã cập nhật Webhook PayOS thành công!",
      webhookUrl: webhookUrl,
      data: response
    });

  } catch (error: any) {
    console.error("❌ Confirm webhook failed:", error?.message || error);
    return res.status(500).json({
      success: false,
      message: "Cập nhật webhook thất bại",
      error: error?.message || "Lỗi không xác định"
    });
  }
};