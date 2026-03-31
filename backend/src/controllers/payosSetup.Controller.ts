import { Request, Response } from "express";
import payos from "../config/payos";

export const confirmWebhook = async (req: Request, res: Response) => {
  try {

    const webhookUrl = "https://b0e1-42-116-163-76.ngrok-free.app/api/webhook";;

    const response = await (payos as any).confirmWebhook(webhookUrl);

    return res.json(response);

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Confirm webhook failed"
    });
  }
};