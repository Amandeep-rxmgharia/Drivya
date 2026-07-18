import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  createSubscription,
  verifyPayment,
  getSubscription,
  cancelSubscription,
  getInvoices,
  getPlans,
  changePlan,
  verifyPlanChange,
  cancelDowngrade,
  getContinuationAuth,
  verifyContinuationAuth,
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

// Protected: plan changes (upgrade / downgrade)
router.post("/change-plan", authenticate, changePlan);
router.post("/verify-change", authenticate, verifyPlanChange);
router.post("/cancel-downgrade", authenticate, cancelDowngrade);

// Protected: continuation subscription auth
router.get("/continuation-auth", authenticate, getContinuationAuth);
router.post("/verify-continuation", authenticate, verifyContinuationAuth);

export default router;
