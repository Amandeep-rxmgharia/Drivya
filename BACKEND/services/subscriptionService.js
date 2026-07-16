import crypto from "crypto";
import razorpay from "../config/razorpayClient.js";
import Subscription from "../models/subscriptionModel.js";
import User from "../models/userModel.js";
import {
  PLANS,
  PLAN_KEYS,
  SUBSCRIPTION_STATUS,
  getRazorpayPlanId,
  getPlanLimits,
  isUpgrade,
} from "../constants/subscriptionConstants.js";
import { createNotification } from "./notificationService.js";

const { RAZORPAY_KEY_SECRET } = process.env;

/**
 * Helper: create a system notification for subscription events.
 */
function notify(userId, title, description) {
  return createNotification(userId, {
    type: "system",
    title,
    description,
    actionLabel: "View Billing",
    actionPath: "/dashboard/settings/billing",
  });
}

// ─── Create Subscription ─────────────────────────────────────────
export async function createSubscription(userId, planKey, period) {
  // 1. Validate plan
  const plan = PLANS[planKey];
  if (!plan || planKey === PLAN_KEYS.FREE) {
    throw Object.assign(new Error("Invalid plan selected."), { status: 400 });
  }

  const razorpayPlanId = getRazorpayPlanId(planKey, period);
  if (!razorpayPlanId) {
    throw Object.assign(
      new Error(`Razorpay plan ID not configured for ${planKey}/${period}.`),
      { status: 500 },
    );
  }

  // 2. Check for existing active subscription
  const existingSub = await Subscription.findOne({
    userId,
    status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.CREATED, SUBSCRIPTION_STATUS.AUTHENTICATED] },
  });

  if (existingSub) {
    throw Object.assign(
      new Error("You already have an active subscription. Cancel it before subscribing to a new plan."),
      { status: 409 },
    );
  }

  // 3. Get or create Razorpay customer
  const user = await User.findById(userId).select("name email subscription").lean();
  if (!user) {
    throw Object.assign(new Error("User not found."), { status: 404 });
  }

  let customerId = user.subscription?.razorpayCustomerId;

  if (!customerId) {
    try {
      const customer = await razorpay.customers.create({
        name: user.name,
        email: user.email,
        notes: { userId: userId.toString() },
      });
      customerId = customer.id;

      await User.findByIdAndUpdate(userId, {
        "subscription.razorpayCustomerId": customerId,
      });
    } catch (err) {
      // Customer with this email may already exist in Razorpay
      // (e.g. user deleted their account and re-registered with the same email).
      // Proceed without customer_id — Razorpay subscriptions work without it.
      console.warn(
        `[Subscription] Could not create Razorpay customer for ${user.email}: ${err.message}. Proceeding without customer_id.`,
      );
      customerId = null;
    }
  }

  // 4. Create Razorpay subscription
  const subscriptionPayload = {
    plan_id: razorpayPlanId,
    total_count: period === "yearly" ? 5 : 60, // max billing cycles
    customer_notify: 1,
    notes: {
      userId: userId.toString(),
      planKey,
      period,
    },
  };
  if (customerId) {
    subscriptionPayload.customer_id = customerId;
  }
  const rzpSubscription = await razorpay.subscriptions.create(subscriptionPayload);

  // 5. Store in DB
  const subscription = await Subscription.create({
    userId,
    razorpaySubscriptionId: rzpSubscription.id,
    razorpayPlanId,
    razorpayCustomerId: customerId,
    planKey,
    period,
    status: SUBSCRIPTION_STATUS.CREATED,
  });

  return {
    subscriptionId: subscription._id,
    razorpaySubscriptionId: rzpSubscription.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    planName: plan.name,
    amount: plan.price[period],
  };
}

// ─── Verify Payment (after Razorpay Checkout) ────────────────────
export async function verifyPayment(
  razorpayPaymentId,
  razorpaySubscriptionId,
  razorpaySignature,
) {
  // 1. HMAC verification
  const body = razorpayPaymentId + "|" + razorpaySubscriptionId;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    throw Object.assign(new Error("Payment verification failed — invalid signature."), {
      status: 400,
    });
  }

  // 2. Update subscription status
  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId },
    { status: SUBSCRIPTION_STATUS.AUTHENTICATED },
    { new: true },
  );

  if (!subscription) {
    throw Object.assign(new Error("Subscription not found."), { status: 404 });
  }

  // 3. Activate immediately (webhook will also fire, but this gives instant feedback)
  await activateSubscription(razorpaySubscriptionId);

  const updatedSub = await Subscription.findOne({ razorpaySubscriptionId }).lean();

  return {
    success: true,
    subscription: {
      id: updatedSub._id,
      planKey: updatedSub.planKey,
      period: updatedSub.period,
      status: updatedSub.status,
      planName: PLANS[updatedSub.planKey]?.name,
    },
  };
}

// ─── Activate Subscription ───────────────────────────────────────
export async function activateSubscription(razorpaySubscriptionId) {
  const subscription = await Subscription.findOne({ razorpaySubscriptionId });
  if (!subscription) return;

  // Already active — idempotent
  if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) return;

  subscription.status = SUBSCRIPTION_STATUS.ACTIVE;

  // Set billing period (approximate if not provided by webhook)
  if (!subscription.currentPeriodStart) {
    subscription.currentPeriodStart = new Date();
    const end = new Date();
    if (subscription.period === "yearly") {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    subscription.currentPeriodEnd = end;
  }

  await subscription.save();

  // Sync plan limits to user
  await syncPlanLimits(subscription.userId, subscription.planKey);

  // Update user subscription reference
  await User.findByIdAndUpdate(subscription.userId, {
    "subscription.plan": subscription.planKey,
    "subscription.status": "active",
    "subscription.subscriptionId": subscription._id,
  });

  // Create notification
  const planName = PLANS[subscription.planKey]?.name || subscription.planKey;
  await notify(
    subscription.userId,
    "Subscription Activated",
    `Your ${planName} plan is now active. Enjoy your upgraded storage and features!`,
  );
}

// ─── Sync Plan Limits to User ────────────────────────────────────
export async function syncPlanLimits(userId, planKey) {
  const limits = getPlanLimits(planKey);

  await User.findByIdAndUpdate(userId, {
    storageLimit: limits.storage,
    bandwidthLimit: limits.bandwidth,
    "storagePreferences.trashAutoEmptyDays": limits.trashDays,
  });
}

// ─── Cancel Subscription ─────────────────────────────────────────
export async function cancelSubscription(userId) {
  const subscription = await Subscription.findOne({
    userId,
    status: {
      $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.AUTHENTICATED, SUBSCRIPTION_STATUS.PENDING],
    },
  });

  if (!subscription) {
    throw Object.assign(new Error("No active subscription found."), { status: 404 });
  }

  // Cancel on Razorpay (at end of current billing cycle)
  await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId, true);

  subscription.cancelledAt = new Date();
  subscription.cancelReason = "user_requested";
  await subscription.save();

  // Update user status — plan stays active until period ends, mark as cancel_scheduled
  await User.findByIdAndUpdate(userId, {
    "subscription.status": "cancel_scheduled",
  });

  const planName = PLANS[subscription.planKey]?.name || subscription.planKey;
  await notify(
    userId,
    "Subscription Cancelled",
    `Your ${planName} plan will remain active until ${subscription.currentPeriodEnd?.toLocaleDateString() || "the end of your billing period"}.`,
  );

  return {
    message: "Subscription cancelled. It will remain active until the current billing period ends.",
    endsAt: subscription.currentPeriodEnd,
  };
}

// ─── Get Subscription Details ────────────────────────────────────
export async function getSubscriptionDetails(userId) {
  const user = await User.findById(userId)
    .select("subscription storageUsed storageLimit bandwidthUsed bandwidthLimit")
    .lean();

  if (!user) {
    throw Object.assign(new Error("User not found."), { status: 404 });
  }

  const planKey = user.subscription?.plan || PLAN_KEYS.FREE;
  const plan = PLANS[planKey];

  const result = {
    plan: {
      key: planKey,
      name: plan?.name || "Spark Free",
      storage: plan?.storage || PLANS[PLAN_KEYS.FREE].storage,
      bandwidth: plan?.bandwidth || PLANS[PLAN_KEYS.FREE].bandwidth,
      maxUpload: plan?.maxUpload ?? null,
      trashDays: plan?.trashDays || 5,
      price: plan?.price || { monthly: 0, yearly: 0 },
    },
    usage: {
      storageUsed: user.storageUsed || 0,
      storageLimit: user.storageLimit,
      bandwidthUsed: user.bandwidthUsed || 0,
      bandwidthLimit: user.bandwidthLimit,
    },
    subscription: null,
  };

  // Fetch active subscription details if any
  if (user.subscription?.subscriptionId) {
    const sub = await Subscription.findById(user.subscription.subscriptionId).lean();
    if (sub) {
      result.subscription = {
        id: sub._id,
        razorpaySubscriptionId: sub.razorpaySubscriptionId,
        status: sub.status,
        period: sub.period,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        paymentMethod: sub.paymentMethod,
        cancelledAt: sub.cancelledAt,
      };

      // Include pending downgrade info if present
      if (sub.pendingPlanChange?.newPlanKey) {
        result.subscription.pendingPlanChange = {
          newPlanKey: sub.pendingPlanChange.newPlanKey,
          newPlanName: PLANS[sub.pendingPlanChange.newPlanKey]?.name || sub.pendingPlanChange.newPlanKey,
          newPeriod: sub.pendingPlanChange.newPeriod,
          effectiveAfter: sub.pendingPlanChange.effectiveAfter,
          scheduledAt: sub.pendingPlanChange.scheduledAt,
        };
      }
    }
  }

  return result;
}

// ─── Get Invoices from Razorpay ──────────────────────────────────
export async function getInvoices(userId) {
  // Find ALL subscriptions for this user (not just the latest)
  const subscriptions = await Subscription.find({
    userId,
    razorpaySubscriptionId: { $exists: true, $ne: "" },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!subscriptions.length) {
    return [];
  }

  try {
    // Fetch invoices from all subscriptions in parallel
    const invoicePromises = subscriptions.map(async (sub) => {
      try {
        const invoices = await razorpay.invoices.all({
          subscription_id: sub.razorpaySubscriptionId,
        });
        return (invoices.items || []).map((inv) => ({
          id: inv.id,
          date: inv.date ? new Date(inv.date * 1000).toLocaleDateString("en-IN") : null,
          dateRaw: inv.date || 0,
          amount: inv.amount ? (inv.amount / 100).toFixed(2) : "0.00",
          currency: inv.currency || "INR",
          status: inv.status,
          invoiceUrl: inv.short_url || null,
        }));
      } catch {
        return [];
      }
    });

    const allInvoices = (await Promise.all(invoicePromises)).flat();

    // Sort by date descending and deduplicate by invoice ID
    const seen = new Set();
    return allInvoices
      .sort((a, b) => b.dateRaw - a.dateRaw)
      .filter((inv) => {
        if (seen.has(inv.id)) return false;
        seen.add(inv.id);
        return true;
      })
      .map(({ dateRaw, ...inv }) => inv);
  } catch {
    // If Razorpay API fails, return empty (don't break the page)
    return [];
  }
}

// ─── Change Plan (Upgrade / Downgrade) ───────────────────────────
export async function changePlan(userId, newPlanKey, period) {
  // 1. Validate new plan
  const newPlan = PLANS[newPlanKey];
  if (!newPlan || newPlanKey === PLAN_KEYS.FREE) {
    throw Object.assign(new Error("Invalid plan. To downgrade to free, cancel your subscription."), { status: 400 });
  }

  const razorpayPlanId = getRazorpayPlanId(newPlanKey, period);
  if (!razorpayPlanId) {
    throw Object.assign(
      new Error(`Razorpay plan ID not configured for ${newPlanKey}/${period}.`),
      { status: 500 },
    );
  }

  // 2. Find current active subscription
  const currentSub = await Subscription.findOne({
    userId,
    status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.AUTHENTICATED] },
  });

  if (!currentSub) {
    throw Object.assign(new Error("No active subscription found. Use the subscribe flow for new subscriptions."), { status: 404 });
  }

  // 3. Same plan check
  if (currentSub.planKey === newPlanKey) {
    throw Object.assign(new Error("You are already on this plan."), { status: 400 });
  }

  // 4. Determine upgrade vs downgrade
  const upgrading = isUpgrade(currentSub.planKey, newPlanKey);

  if (upgrading) {
    return handleUpgrade(userId, currentSub, newPlanKey, period, razorpayPlanId);
  } else {
    return handleDowngrade(userId, currentSub, newPlanKey, period, razorpayPlanId);
  }
}

// ─── Handle Upgrade ──────────────────────────────────────────────
async function handleUpgrade(userId, currentSub, newPlanKey, period, razorpayPlanId) {
  const user = await User.findById(userId).select("name email subscription").lean();
  if (!user) throw Object.assign(new Error("User not found."), { status: 404 });

  let customerId = user.subscription?.razorpayCustomerId || currentSub.razorpayCustomerId;

  // Create new Razorpay subscription (payment required)
  const subscriptionPayload = {
    plan_id: razorpayPlanId,
    total_count: period === "yearly" ? 5 : 60,
    customer_notify: 1,
    notes: {
      userId: userId.toString(),
      planKey: newPlanKey,
      period,
      changeType: "upgrade",
      oldSubscriptionId: currentSub.razorpaySubscriptionId,
    },
  };
  if (customerId) {
    subscriptionPayload.customer_id = customerId;
  }

  const rzpSubscription = await razorpay.subscriptions.create(subscriptionPayload);

  // Store new subscription in DB
  const newSubscription = await Subscription.create({
    userId,
    razorpaySubscriptionId: rzpSubscription.id,
    razorpayPlanId,
    razorpayCustomerId: customerId || "",
    planKey: newPlanKey,
    period,
    status: SUBSCRIPTION_STATUS.CREATED,
  });

  const newPlan = PLANS[newPlanKey];
  return {
    subscriptionId: newSubscription._id,
    razorpaySubscriptionId: rzpSubscription.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    planName: newPlan.name,
    amount: newPlan.price[period],
    changeType: "upgrade",
  };
}

// ─── Verify Upgrade Payment ──────────────────────────────────────
export async function verifyUpgradePayment(razorpayPaymentId, razorpaySubscriptionId, razorpaySignature) {
  // 1. HMAC verification
  const body = razorpayPaymentId + "|" + razorpaySubscriptionId;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    throw Object.assign(new Error("Payment verification failed — invalid signature."), { status: 400 });
  }

  // 2. Find the new subscription
  const newSub = await Subscription.findOne({ razorpaySubscriptionId });
  if (!newSub) {
    throw Object.assign(new Error("Subscription not found."), { status: 404 });
  }

  // 3. Find and cancel the OLD active subscription immediately
  const oldSub = await Subscription.findOne({
    userId: newSub.userId,
    status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.AUTHENTICATED] },
    _id: { $ne: newSub._id },
  });

  if (oldSub) {
    // Cancel any scheduled future subscription (either downgrade target or continuation)
    if (oldSub.pendingPlanChange && oldSub.pendingPlanChange.newRazorpaySubscriptionId) {
      const pendingRzpId = oldSub.pendingPlanChange.newRazorpaySubscriptionId;
      const pendingDbId = oldSub.pendingPlanChange.newSubscriptionId;

      try {
        await razorpay.subscriptions.cancel(pendingRzpId, false); // Cancel immediately
      } catch (err) {
        console.warn(`[Upgrade] Failed to cancel pending future subscription ${pendingRzpId}: ${err.message}`);
      }

      if (pendingDbId) {
        await Subscription.findByIdAndUpdate(pendingDbId, {
          status: SUBSCRIPTION_STATUS.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: "upgraded_prior",
        });
      }
    }

    try {
      await razorpay.subscriptions.cancel(oldSub.razorpaySubscriptionId, false); // Cancel immediately for upgrades
    } catch (err) {
      console.warn(`[Upgrade] Failed to cancel old Razorpay subscription ${oldSub.razorpaySubscriptionId}: ${err.message}`);
    }

    oldSub.status = SUBSCRIPTION_STATUS.CANCELLED;
    oldSub.cancelledAt = new Date();
    oldSub.cancelReason = "upgraded";
    // Clear pending plan change structure on the old cancelled subscription
    oldSub.pendingPlanChange = {
      newPlanKey: null,
      newPeriod: null,
      newRazorpaySubscriptionId: null,
      newSubscriptionId: null,
      scheduledAt: null,
      effectiveAfter: null,
    };
    await oldSub.save();
  }

  // 4. Activate new subscription
  newSub.status = SUBSCRIPTION_STATUS.AUTHENTICATED;
  await newSub.save();

  await activateSubscription(razorpaySubscriptionId);

  const updatedSub = await Subscription.findOne({ razorpaySubscriptionId }).lean();
  const planName = PLANS[updatedSub.planKey]?.name || updatedSub.planKey;

  // 5. Notify user
  const oldPlanName = oldSub ? (PLANS[oldSub.planKey]?.name || oldSub.planKey) : "previous plan";
  await notify(
    updatedSub.userId,
    "Plan Upgraded",
    `You've upgraded from ${oldPlanName} to ${planName}. Your new limits are active immediately!`,
  );

  return {
    success: true,
    changeType: "upgrade",
    subscription: {
      id: updatedSub._id,
      planKey: updatedSub.planKey,
      period: updatedSub.period,
      status: updatedSub.status,
      planName,
    },
  };
}

// ─── Handle Downgrade ────────────────────────────────────────────
async function handleDowngrade(userId, currentSub, newPlanKey, period, razorpayPlanId) {
  const user = await User.findById(userId).select("name email subscription").lean();
  if (!user) throw Object.assign(new Error("User not found."), { status: 404 });

  // If there is ANY pending plan change (either a same-plan continuation or a different downgrade), cancel it
  if (currentSub.pendingPlanChange?.newPlanKey) {
    // If the user wants to schedule a downgrade to the exact same plan key and period that is already pending, throw error
    if (
      currentSub.pendingPlanChange.newPlanKey === newPlanKey &&
      currentSub.pendingPlanChange.newPeriod === period
    ) {
      throw Object.assign(
        new Error(`A downgrade to ${PLANS[newPlanKey]?.name || newPlanKey} (${period}) is already scheduled.`),
        { status: 400 },
      );
    }

    const pendingRzpId = currentSub.pendingPlanChange.newRazorpaySubscriptionId;
    const pendingDbId = currentSub.pendingPlanChange.newSubscriptionId;

    if (pendingDbId) {
      await Subscription.findByIdAndUpdate(pendingDbId, {
        status: SUBSCRIPTION_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: "superseded_by_downgrade",
      });
    }

    if (pendingRzpId) {
      try {
        await razorpay.subscriptions.cancel(pendingRzpId, false); // Cancel immediately
      } catch (err) {
        console.warn(`[Downgrade] Failed to cancel existing pending subscription ${pendingRzpId}: ${err.message}`);
      }
    }

    // Clear the pendingPlanChange so the new downgrade can be set
    currentSub.pendingPlanChange = {
      newPlanKey: null,
      newPeriod: null,
      newRazorpaySubscriptionId: null,
      newSubscriptionId: null,
      scheduledAt: null,
      effectiveAfter: null,
    };
    currentSub.cancelReason = "";
    await currentSub.save();
  }

  let customerId = user.subscription?.razorpayCustomerId || currentSub.razorpayCustomerId;

  // Create new Razorpay subscription (auth only — delayed start)
  // start_at tells Razorpay to keep the sub in 'authenticated' state
  // until the old subscription's billing cycle ends.
  const startAt = currentSub.currentPeriodEnd
    ? Math.floor(new Date(currentSub.currentPeriodEnd).getTime() / 1000)
    : null;

  const subscriptionPayload = {
    plan_id: razorpayPlanId,
    total_count: period === "yearly" ? 5 : 60,
    customer_notify: 0,
    notes: {
      userId: userId.toString(),
      planKey: newPlanKey,
      period,
      changeType: "downgrade",
      oldSubscriptionId: currentSub.razorpaySubscriptionId,
    },
  };
  if (startAt) {
    subscriptionPayload.start_at = startAt;
  }
  if (customerId) {
    subscriptionPayload.customer_id = customerId;
  }

  const rzpSubscription = await razorpay.subscriptions.create(subscriptionPayload);

  // Store new subscription in DB (status: created, waiting for auth)
  const newSubscription = await Subscription.create({
    userId,
    razorpaySubscriptionId: rzpSubscription.id,
    razorpayPlanId,
    razorpayCustomerId: customerId || "",
    planKey: newPlanKey,
    period,
    status: SUBSCRIPTION_STATUS.CREATED,
  });

  const newPlan = PLANS[newPlanKey];
  return {
    subscriptionId: newSubscription._id,
    razorpaySubscriptionId: rzpSubscription.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    planName: newPlan.name,
    amount: newPlan.price[period],
    changeType: "downgrade",
    effectiveAfter: currentSub.currentPeriodEnd,
  };
}

// ─── Verify Downgrade Auth ───────────────────────────────────────
export async function verifyDowngradeAuth(razorpayPaymentId, razorpaySubscriptionId, razorpaySignature) {
  // 1. HMAC verification
  const body = razorpayPaymentId + "|" + razorpaySubscriptionId;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    throw Object.assign(new Error("Authentication verification failed — invalid signature."), { status: 400 });
  }

  // 2. Find the new (downgrade) subscription
  const newSub = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId },
    { status: SUBSCRIPTION_STATUS.AUTHENTICATED },
    { new: true },
  );
  if (!newSub) {
    throw Object.assign(new Error("Subscription not found."), { status: 404 });
  }

  // 3. Find the OLD active subscription and schedule end-of-cycle cancellation
  const oldSub = await Subscription.findOne({
    userId: newSub.userId,
    status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.AUTHENTICATED] },
    _id: { $ne: newSub._id },
  });

  if (!oldSub) {
    throw Object.assign(new Error("Current active subscription not found."), { status: 404 });
  }

  // Cancel old subscription at end of billing cycle
  await razorpay.subscriptions.cancel(oldSub.razorpaySubscriptionId, true);

  // Store pending plan change info on old subscription
  oldSub.pendingPlanChange = {
    newPlanKey: newSub.planKey,
    newPeriod: newSub.period,
    newRazorpaySubscriptionId: newSub.razorpaySubscriptionId,
    newSubscriptionId: newSub._id,
    scheduledAt: new Date(),
    effectiveAfter: oldSub.currentPeriodEnd,
  };
  oldSub.cancelReason = "downgrade_scheduled";
  await oldSub.save();

  // 4. Update user status
  await User.findByIdAndUpdate(newSub.userId, {
    "subscription.status": "downgrade_scheduled",
  });

  const oldPlanName = PLANS[oldSub.planKey]?.name || oldSub.planKey;
  const newPlanName = PLANS[newSub.planKey]?.name || newSub.planKey;
  const endsAt = oldSub.currentPeriodEnd?.toLocaleDateString("en-IN", {
    month: "short", day: "numeric", year: "numeric",
  }) || "end of billing period";

  await notify(
    newSub.userId,
    "Downgrade Scheduled",
    `Your plan will change from ${oldPlanName} to ${newPlanName} after ${endsAt}. You'll keep your current features until then.`,
  );

  return {
    success: true,
    changeType: "downgrade",
    subscription: {
      id: newSub._id,
      planKey: newSub.planKey,
      period: newSub.period,
      status: "downgrade_scheduled",
      planName: newPlanName,
      effectiveAfter: oldSub.currentPeriodEnd,
    },
  };
}

// ─── Cancel Scheduled Downgrade ──────────────────────────────────
export async function cancelScheduledDowngrade(userId) {
  // 1. Find the old (current active) subscription with a pending downgrade
  const oldSub = await Subscription.findOne({
    userId,
    cancelReason: "downgrade_scheduled",
    "pendingPlanChange.newPlanKey": { $ne: null },
  });

  if (!oldSub) {
    throw Object.assign(new Error("No pending downgrade found."), { status: 404 });
  }

  // 2. Cancel the pre-authenticated new subscription
  const newRzpSubId = oldSub.pendingPlanChange.newRazorpaySubscriptionId;
  const newSubId = oldSub.pendingPlanChange.newSubscriptionId;

  // IMPORTANT: Mark the new sub's cancelReason in DB BEFORE calling Razorpay
  // cancel, to prevent the webhook from reverting user to free.
  if (newSubId) {
    await Subscription.findByIdAndUpdate(newSubId, {
      status: SUBSCRIPTION_STATUS.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: "downgrade_cancelled_by_user",
    });
  }

  if (newRzpSubId) {
    try {
      await razorpay.subscriptions.cancel(newRzpSubId, false);
    } catch (err) {
      console.warn(`[CancelDowngrade] Failed to cancel new Razorpay subscription ${newRzpSubId}: ${err.message}`);
    }
  }

  // 3. Handle the old subscription.
  // Razorpay does NOT support un-cancelling a scheduled cancellation.
  // The old sub will still cancel at cycle end. To keep the user on their
  // current plan, we create a NEW subscription for the SAME plan with
  // start_at = old sub's cycle end. This ensures seamless continuation.
  const oldPlanRzpId = getRazorpayPlanId(oldSub.planKey, oldSub.period);
  const startAt = oldSub.currentPeriodEnd
    ? Math.floor(new Date(oldSub.currentPeriodEnd).getTime() / 1000)
    : null;

  let continuationSubId = null;

  if (oldPlanRzpId && startAt) {
    try {
      const continuationPayload = {
        plan_id: oldPlanRzpId,
        total_count: oldSub.period === "yearly" ? 5 : 60,
        customer_notify: 0,
        start_at: startAt,
        notes: {
          userId: userId.toString(),
          planKey: oldSub.planKey,
          period: oldSub.period,
          changeType: "continuation",
        },
      };
      if (oldSub.razorpayCustomerId) {
        continuationPayload.customer_id = oldSub.razorpayCustomerId;
      }

      const rzpContinuation = await razorpay.subscriptions.create(continuationPayload);

      const contSub = await Subscription.create({
        userId,
        razorpaySubscriptionId: rzpContinuation.id,
        razorpayPlanId: oldPlanRzpId,
        razorpayCustomerId: oldSub.razorpayCustomerId || "",
        planKey: oldSub.planKey,
        period: oldSub.period,
        status: SUBSCRIPTION_STATUS.AUTHENTICATED,
      });

      continuationSubId = contSub._id;

      // Point the old sub's pendingPlanChange to the continuation (same plan)
      oldSub.pendingPlanChange = {
        newPlanKey: oldSub.planKey,
        newPeriod: oldSub.period,
        newRazorpaySubscriptionId: rzpContinuation.id,
        newSubscriptionId: contSub._id,
        scheduledAt: new Date(),
        effectiveAfter: oldSub.currentPeriodEnd,
      };
      oldSub.cancelReason = "continuation";
      await oldSub.save();
    } catch (err) {
      console.error(`[CancelDowngrade] Failed to create continuation subscription: ${err.message}`);
      // Fall through — at minimum clear the downgrade
    }
  }

  // If continuation failed, just clear the downgrade intent
  if (!continuationSubId) {
    oldSub.pendingPlanChange = {
      newPlanKey: null,
      newPeriod: null,
      newRazorpaySubscriptionId: null,
      newSubscriptionId: null,
      scheduledAt: null,
      effectiveAfter: null,
    };
    oldSub.cancelReason = "downgrade_undone";
    await oldSub.save();
  }

  // 4. Restore user subscription status to active
  await User.findByIdAndUpdate(userId, {
    "subscription.status": "active",
  });

  const planName = PLANS[oldSub.planKey]?.name || oldSub.planKey;
  await notify(
    userId,
    "Downgrade Cancelled",
    `Your scheduled downgrade has been cancelled. You'll continue on the ${planName} plan.`,
  );

  return {
    message: `Downgrade cancelled. You remain on the ${planName} plan.`,
  };
}

// ─── Handle Webhook Events ───────────────────────────────────────
export async function handleWebhookEvent(event, payload) {
  const handlers = {
    "subscription.activated": handleSubscriptionActivated,
    "subscription.charged": handleSubscriptionCharged,
    "subscription.pending": handleSubscriptionPending,
    "subscription.halted": handleSubscriptionHalted,
    "subscription.cancelled": handleSubscriptionCancelled,
    "subscription.completed": handleSubscriptionCompleted,
    "payment.captured": handlePaymentCaptured,
    "payment.failed": handlePaymentFailed,
  };

  const handler = handlers[event];
  if (handler) {
    await handler(payload);
  } else {
    console.log(`[Webhook] Unhandled event: ${event}`);
  }
}

// ─── Webhook Event Handlers ──────────────────────────────────────

async function handleSubscriptionActivated(payload) {
  const sub = payload.subscription?.entity;
  if (!sub) return;

  // Check if this subscription is a pending-downgrade target that shouldn't
  // be activated yet (it has start_at in the future — Razorpay should not
  // fire this, but guard against race conditions).
  const dbSub = await Subscription.findOne({ razorpaySubscriptionId: sub.id }).lean();
  if (dbSub) {
    // Check if there's an older subscription with a pendingPlanChange pointing to this one
    const parentSub = await Subscription.findOne({
      userId: dbSub.userId,
      "pendingPlanChange.newRazorpaySubscriptionId": sub.id,
      cancelReason: "downgrade_scheduled",
    }).lean();

    if (parentSub) {
      // The old subscription is still active/scheduled — this is the delayed
      // downgrade sub being activated by Razorpay after start_at.
      // Clean up the parent's pendingPlanChange and proceed with activation.
      await Subscription.findByIdAndUpdate(parentSub._id, {
        pendingPlanChange: {
          newPlanKey: null,
          newPeriod: null,
          newRazorpaySubscriptionId: null,
          newSubscriptionId: null,
          scheduledAt: null,
          effectiveAfter: null,
        },
      });
    }
  }

  await activateSubscription(sub.id);
}

async function handleSubscriptionCharged(payload) {
  const sub = payload.subscription?.entity;
  if (!sub) return;

  const subscription = await Subscription.findOne({ razorpaySubscriptionId: sub.id });
  if (!subscription) return;

  // Update billing period
  if (sub.current_start) {
    subscription.currentPeriodStart = new Date(sub.current_start * 1000);
  }
  if (sub.current_end) {
    subscription.currentPeriodEnd = new Date(sub.current_end * 1000);
  }
  subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
  await subscription.save();

  // Ensure user is still marked as active
  await User.findByIdAndUpdate(subscription.userId, {
    "subscription.status": "active",
  });

  const planName = PLANS[subscription.planKey]?.name || subscription.planKey;
  await notify(
    subscription.userId,
    "Payment Successful",
    `Your ${planName} subscription has been renewed successfully.`,
  );
}

async function handleSubscriptionPending(payload) {
  const sub = payload.subscription?.entity;
  if (!sub) return;

  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: sub.id },
    { status: SUBSCRIPTION_STATUS.PENDING },
    { new: true },
  );

  if (subscription) {
    await User.findByIdAndUpdate(subscription.userId, {
      "subscription.status": "past_due",
    });

    await notify(
      subscription.userId,
      "Payment Pending",
      "Your subscription payment is pending. Please update your payment method to avoid service interruption.",
    );
  }
}

async function handleSubscriptionHalted(payload) {
  const sub = payload.subscription?.entity;
  if (!sub) return;

  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: sub.id },
    { status: SUBSCRIPTION_STATUS.HALTED },
    { new: true },
  );

  if (subscription) {
    // Downgrade to free
    await syncPlanLimits(subscription.userId, PLAN_KEYS.FREE);
    await User.findByIdAndUpdate(subscription.userId, {
      "subscription.plan": PLAN_KEYS.FREE,
      "subscription.status": "past_due",
    });

    await notify(
      subscription.userId,
      "Subscription Halted",
      "Your subscription has been halted due to repeated payment failures. Your account has been downgraded to the free plan.",
    );
  }
}

async function handleSubscriptionCancelled(payload) {
  const sub = payload.subscription?.entity;
  if (!sub) return;

  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: sub.id },
    {
      status: SUBSCRIPTION_STATUS.CANCELLED,
      cancelledAt: new Date(),
    },
    { new: true },
  );

  if (!subscription) return;

  // ─── Skip reversion for upgraded subscriptions ───────────────
  // When a user upgrades, the old subscription is cancelled immediately.
  // The webhook fires asynchronously — we must NOT revert to free,
  // because the new (upgraded) subscription is already active.
  if (subscription.cancelReason === "upgraded" || subscription.cancelReason === "upgraded_prior") {
    console.log(`[Webhook] Skipping reversion for upgraded subscription ${sub.id} (user already on new plan).`);
    return;
  }

  // ─── Skip reversion for cancelled downgrade/continuation subs 
  // When a user undoes a scheduled downgrade, or schedules a downgrade over
  // a continuation subscription, the future subscription is cancelled.
  // Don't revert — the user is still on their plan.
  if (subscription.cancelReason === "downgrade_cancelled_by_user" || subscription.cancelReason === "superseded_by_downgrade") {
    console.log(`[Webhook] Skipping reversion for cancelled future subscription ${sub.id} (${subscription.cancelReason}).`);
    return;
  }

  // ─── Handle downgrade-scheduled or continuation ──────────────
  // The old subscription ends at cycle end. A new subscription (either
  // a downgrade or same-plan continuation) has start_at set — Razorpay
  // will activate it automatically. Don't revert to free.
  if (subscription.cancelReason === "downgrade_scheduled" || subscription.cancelReason === "continuation") {
    console.log(`[Webhook] Old subscription ${sub.id} cancelled (${subscription.cancelReason}). Razorpay will start continuation/downgrade sub automatically.`);
    return;
  }

  // ─── Handle downgrade-undone (no continuation sub created) ───
  // The downgrade was undone but continuation sub couldn't be created.
  // Keep user on their current plan — they'll need to re-subscribe
  // when the cycle ends.
  if (subscription.cancelReason === "downgrade_undone") {
    console.log(`[Webhook] Old subscription ${sub.id} cancelled (downgrade undone). Syncing current plan limits.`);
    // Re-sync the old plan limits to ensure they're correct
    await syncPlanLimits(subscription.userId, subscription.planKey);
    await User.findByIdAndUpdate(subscription.userId, {
      "subscription.status": "none",
      "subscription.subscriptionId": null,
    });
    await notify(
      subscription.userId,
      "Subscription Ended",
      `Your ${PLANS[subscription.planKey]?.name || subscription.planKey} billing cycle has ended. Please re-subscribe to continue your plan.`,
    );
    return;
  }

  // ─── No special case — revert to free plan ───────────────────
  await syncPlanLimits(subscription.userId, PLAN_KEYS.FREE);
  await User.findByIdAndUpdate(subscription.userId, {
    "subscription.plan": PLAN_KEYS.FREE,
    "subscription.status": "none",
    "subscription.subscriptionId": null,
  });

  const planName = PLANS[subscription.planKey]?.name || subscription.planKey;
  await notify(
    subscription.userId,
    "Subscription Ended",
    `Your ${planName} plan has ended. You're now on the Spark Free plan.`,
  );
}

async function handleSubscriptionCompleted(payload) {
  // Same behavior as cancelled — subscription cycle is finished
  await handleSubscriptionCancelled(payload);
}

async function handlePaymentCaptured(payload) {
  const payment = payload.payment?.entity;
  if (!payment) return;

  // Update payment method info if available
  if (payment.method && payment.subscription_id) {
    const updateData = {
      "paymentMethod.type": payment.method,
    };

    if (payment.card?.last4) {
      updateData["paymentMethod.last4"] = payment.card.last4;
    }

    await Subscription.findOneAndUpdate(
      { razorpaySubscriptionId: payment.subscription_id },
      updateData,
    );
  }
}

async function handlePaymentFailed(payload) {
  const payment = payload.payment?.entity;
  if (!payment || !payment.subscription_id) return;

  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: payment.subscription_id,
  });

  if (subscription) {
    await notify(
      subscription.userId,
      "Payment Failed",
      "A payment attempt for your subscription failed. Please check your payment method.",
    );
  }
}
