import {
  createSubscription as createSub,
  verifyPayment as verifySub,
  getSubscriptionDetails,
  cancelSubscription as cancelSub,
  getInvoices as fetchInvoices,
  changePlan as changePlanSvc,
  verifyUpgradePayment as verifyUpgradeSvc,
  verifyDowngradeAuth as verifyDowngradeSvc,
  verifyBillingCycleChangeAuth as verifyBillingCycleChangeSvc,
  cancelScheduledDowngrade as cancelDowngradeSvc,
  getContinuationAuthDetails as getContinuationAuthSvc,
  verifyContinuationAuth as verifyContinuationAuthSvc,
} from "../services/subscriptionService.js";
import { PLANS, PLAN_KEYS, PERIODS } from "../constants/subscriptionConstants.js";

// ─── Create Subscription ─────────────────────────────────────────
export const createSubscription = async (req, res, next) => {
  try {
    const { planKey, period } = req.body;

    // Validate inputs
    if (!planKey || !Object.values(PLAN_KEYS).includes(planKey)) {
      return res.status(400).json({ message: "Invalid plan key." });
    }
    if (planKey === PLAN_KEYS.FREE) {
      return res.status(400).json({ message: "Cannot subscribe to the free plan." });
    }
    if (!period || !Object.values(PERIODS).includes(period)) {
      return res.status(400).json({ message: "Invalid period. Use 'monthly' or 'yearly'." });
    }

    const result = await createSub(req.user.id, planKey, period);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Verify Payment ──────────────────────────────────────────────
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification fields." });
    }

    const result = await verifySub(
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    );

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Get Current Subscription ────────────────────────────────────
export const getSubscription = async (req, res, next) => {
  try {
    const result = await getSubscriptionDetails(req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Cancel Subscription ─────────────────────────────────────────
export const cancelSubscription = async (req, res, next) => {
  try {
    const result = await cancelSub(req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Get Invoices ────────────────────────────────────────────────
export const getInvoices = async (req, res, next) => {
  try {
    const invoices = await fetchInvoices(req.user.id);
    return res.json({ invoices });
  } catch (err) {
    next(err);
  }
};

// ─── Get Available Plans (public info) ───────────────────────────
export const getPlans = async (req, res) => {
  const plans = Object.entries(PLANS).map(([key, plan]) => ({
    key,
    name: plan.name,
    storage: plan.storage,
    bandwidth: plan.bandwidth,
    maxUpload: plan.maxUpload,
    trashDays: plan.trashDays,
    price: plan.price,
    featured: plan.featured || false,
  }));

  return res.json({ plans });
};

// ─── Change Plan (Upgrade / Downgrade) ───────────────────────────
export const changePlan = async (req, res, next) => {
  try {
    const { planKey, period } = req.body;

    if (!planKey || !Object.values(PLAN_KEYS).includes(planKey)) {
      return res.status(400).json({ message: "Invalid plan key." });
    }
    if (planKey === PLAN_KEYS.FREE) {
      return res.status(400).json({ message: "To downgrade to free, cancel your subscription." });
    }
    if (!period || !Object.values(PERIODS).includes(period)) {
      return res.status(400).json({ message: "Invalid period. Use 'monthly' or 'yearly'." });
    }

    const result = await changePlanSvc(req.user.id, planKey, period);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Verify Plan Change Payment ─────────────────────────────────
export const verifyPlanChange = async (req, res, next) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      changeType,
    } = req.body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing verification fields." });
    }

    let result;
    if (changeType === "downgrade") {
      result = await verifyDowngradeSvc(
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
      );
    } else if (changeType === "billing_cycle_change") {
      result = await verifyBillingCycleChangeSvc(
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
      );
    } else {
      // Default to upgrade verification
      result = await verifyUpgradeSvc(
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
      );
    }

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Cancel Scheduled Downgrade ─────────────────────────────────
export const cancelDowngrade = async (req, res, next) => {
  try {
    const result = await cancelDowngradeSvc(req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Get Continuation Auth Details ──────────────────────────────
export const getContinuationAuth = async (req, res, next) => {
  try {
    const result = await getContinuationAuthSvc(req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Verify Continuation Auth ───────────────────────────────────
export const verifyContinuationAuth = async (req, res, next) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing verification fields." });
    }

    const result = await verifyContinuationAuthSvc(
      req.user.id,
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    );

    return res.json(result);
  } catch (err) {
    next(err);
  }
};
