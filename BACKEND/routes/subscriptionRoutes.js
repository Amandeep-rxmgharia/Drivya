import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  createSubscription,
  verifyPayment,
  getSubscription,
  cancelSubscription,
  getInvoices,
  getPlans,
} from "../controllers/subscriptionController.js";

const router = Router();

// Public: get available plans
router.get("/plans", getPlans);

// Protected: subscription management
router.post("/create", authenticate, createSubscription);
router.post("/verify", authenticate, verifyPayment);
router.get("/", authenticate, getSubscription);
router.post("/cancel", authenticate, cancelSubscription);
router.get("/invoices", authenticate, getInvoices);

export default router;
