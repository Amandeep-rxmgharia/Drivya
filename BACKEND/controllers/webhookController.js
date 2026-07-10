import crypto from "crypto";
import { handleWebhookEvent } from "../services/subscriptionService.js";

const { RAZORPAY_WEBHOOK_SECRET } = process.env;

// ─── Handle Razorpay Webhook ─────────────────────────────────────
export const handleRazorpayWebhook = async (req, res) => {
  try {
    // 1. Verify signature
    const signature = req.headers["x-razorpay-signature"];
    if (!signature || !RAZORPAY_WEBHOOK_SECRET) {
      console.warn("[Webhook] Missing signature or webhook secret.");
      return res.status(400).json({ message: "Invalid webhook." });
    }

    const rawBody =
      typeof req.body === "string"
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body.toString("utf8")
          : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.warn("[Webhook] Signature mismatch.");
      return res.status(400).json({ message: "Invalid webhook signature." });
    }

    // 2. Parse payload
    const body = typeof req.body === "string" || Buffer.isBuffer(req.body)
      ? JSON.parse(rawBody)
      : req.body;

    const event = body.event;
    const payload = body.payload;

    console.log(`[Webhook] Received event: ${event}`);

    // 3. Respond immediately (Razorpay expects 2xx within 5s)
    res.status(200).json({ status: "ok" });

    // 4. Process event asynchronously (after responding)
    try {
      await handleWebhookEvent(event, payload);
    } catch (err) {
      console.error(`[Webhook] Error processing ${event}:`, err.message);
    }
  } catch (err) {
    console.error("[Webhook] Unexpected error:", err.message);
    // Still respond 200 to prevent Razorpay from retrying on parse errors
    if (!res.headersSent) {
      res.status(200).json({ status: "error_logged" });
    }
  }
};
