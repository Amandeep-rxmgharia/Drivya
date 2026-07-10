/** ─── Subscription Plan Constants ────────────────────────────────
 *
 * Central authority for plan tiers, storage/bandwidth limits,
 * pricing, and Razorpay plan ID mappings.
 */

const GB = 1024 * 1024 * 1024;
const TB = 1024 * GB;
const MB = 1024 * 1024;

/** Available plan keys. */
export const PLAN_KEYS = Object.freeze({
  FREE: "free",
  SPARK_GO: "spark_go",
  BOOST: "boost",
  PRO: "pro",
  APEX: "apex",
});

/** Razorpay subscription lifecycle statuses. */
export const SUBSCRIPTION_STATUS = Object.freeze({
  CREATED: "created",
  AUTHENTICATED: "authenticated",
  ACTIVE: "active",
  PENDING: "pending",
  HALTED: "halted",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  EXPIRED: "expired",
});

/** Billing periods. */
export const PERIODS = Object.freeze({
  MONTHLY: "monthly",
  YEARLY: "yearly",
});

/**
 * Full plan definitions.
 * `razorpayPlanId` values are populated from env vars
 * (set by running scripts/seedRazorpayPlans.js).
 */
export const PLANS = Object.freeze({
  [PLAN_KEYS.FREE]: {
    name: "Drivya Starter",
    storage: 5 * GB,
    bandwidth: 10 * GB,
    maxUpload: 150 * MB,
    trashDays: 5,
    price: { monthly: 0, yearly: 0 },
    razorpayPlanId: { monthly: null, yearly: null },
  },
  [PLAN_KEYS.SPARK_GO]: {
    name: "Drivya Lite",
    storage: 50 * GB,
    bandwidth: 25 * GB,
    maxUpload: null, // unlimited
    trashDays: 15,
    price: { monthly: 39, yearly: 399 },
    razorpayPlanId: {
      monthly: process.env.RZP_PLAN_SPARK_GO_MONTHLY || null,
      yearly: process.env.RZP_PLAN_SPARK_GO_YEARLY || null,
    },
  },
  [PLAN_KEYS.BOOST]: {
    name: "Drivya Plus",
    storage: 100 * GB,
    bandwidth: 70 * GB,
    maxUpload: null,
    trashDays: 30,
    price: { monthly: 149, yearly: 1499 },
    razorpayPlanId: {
      monthly: process.env.RZP_PLAN_BOOST_MONTHLY || null,
      yearly: process.env.RZP_PLAN_BOOST_YEARLY || null,
    },
  },
  [PLAN_KEYS.PRO]: {
    name: "Drivya Pro",
    storage: 500 * GB,
    bandwidth: 300 * GB,
    maxUpload: null,
    trashDays: 45,
    price: { monthly: 399, yearly: 3999 },
    featured: true,
    razorpayPlanId: {
      monthly: process.env.RZP_PLAN_PRO_MONTHLY || null,
      yearly: process.env.RZP_PLAN_PRO_YEARLY || null,
    },
  },
  [PLAN_KEYS.APEX]: {
    name: "Drivya Max",
    storage: 1 * TB,
    bandwidth: 700 * GB,
    maxUpload: null,
    trashDays: 60,
    price: { monthly: 699, yearly: 6999 },
    razorpayPlanId: {
      monthly: process.env.RZP_PLAN_APEX_MONTHLY || null,
      yearly: process.env.RZP_PLAN_APEX_YEARLY || null,
    },
  },
});

/**
 * Resolve the Razorpay plan ID for a given planKey + period.
 * @param {string} planKey  – One of PLAN_KEYS values.
 * @param {string} period   – "monthly" or "yearly".
 * @returns {string|null}
 */
export function getRazorpayPlanId(planKey, period) {
  return PLANS[planKey]?.razorpayPlanId?.[period] || null;
}

/**
 * Get plan limits for syncing to user model.
 * @param {string} planKey
 * @returns {{ storage: number, bandwidth: number, maxUpload: number|null, trashDays: number }}
 */
export function getPlanLimits(planKey) {
  const plan = PLANS[planKey] || PLANS[PLAN_KEYS.FREE];
  return {
    storage: plan.storage,
    bandwidth: plan.bandwidth,
    maxUpload: plan.maxUpload,
    trashDays: plan.trashDays,
  };
}
