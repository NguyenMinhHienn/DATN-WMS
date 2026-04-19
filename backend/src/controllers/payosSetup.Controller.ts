import { Request, Response } from "express";
import payos from "../config/payos";

export const confirmWebhook = async (req: Request, res: Response) => {
  try {

    const webhookUrl = "https://unthrowable-latasha-preseptal.ngrok-free.dev/api/webhook";

    const response = await (payos as any).confirmWebhook(webhookUrl);
     
    console.log("Webhook confirmed:", response);
    return res.json(response);
    

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Confirm webhook failed"
    });
  }
};