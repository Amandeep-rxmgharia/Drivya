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
    name: "Starter",
    storage: 5 * GB,
    bandwidth: 10 * GB,
    maxUpload: 150 * MB,
    trashDays: 5,
    price: { monthly: 0, yearly: 0 },
    razorpayPlanId: { monthly: null, yearly: null },
  },
  [PLAN_KEYS.SPARK_GO]: {
    name: "Lite",
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
    name: "Plus",
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
    name: "Pro",
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
    name: "Max",
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
 * Numeric ordering of plans for upgrade/downgrade comparison.
 * Higher number = higher tier.
 */
export const PLAN_ORDER = Object.freeze({
  [PLAN_KEYS.FREE]: 0,
  [PLAN_KEYS.SPARK_GO]: 1,
  [PLAN_KEYS.BOOST]: 2,
  [PLAN_KEYS.PRO]: 3,
  [PLAN_KEYS.APEX]: 4,
});

/**
 * Determine whether switching from one plan to another is an upgrade.
 * @param {string} fromPlan – Current plan key.
 * @param {string} toPlan   – Target plan key.
 * @returns {boolean}
 */
export function isUpgrade(fromPlan, toPlan) {
  return (PLAN_ORDER[toPlan] ?? 0) > (PLAN_ORDER[fromPlan] ?? 0);
}

/**
 * Determine whether a plan change is actually a billing-cycle shift
 * (same plan tier, different period — e.g. monthly → yearly).
 * @param {string} fromPlan   – Current plan key.
 * @param {string} toPlan     – Target plan key.
 * @param {string} fromPeriod – Current period ("monthly" | "yearly").
 * @param {string} toPeriod   – Target period ("monthly" | "yearly").
 * @returns {boolean}
 */
export function isBillingCycleChange(fromPlan, toPlan, fromPeriod, toPeriod) {
  return fromPlan === toPlan && fromPeriod !== toPeriod;
}

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
