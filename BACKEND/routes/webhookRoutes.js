import { Router } from "express";
import express from "express";
import { handleRazorpayWebhook } from "../controllers/webhookController.js";

const router = Router();

// Razorpay webhook — uses raw body for HMAC signature verification
router.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook,
);

export default router;
