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
  await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId, {
    cancel_at_cycle_end: true,
  });

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
    }
  }

  return result;
}

// ─── Get Invoices from Razorpay ──────────────────────────────────
export async function getInvoices(userId) {
  const subscription = await Subscription.findOne({
    userId,
    razorpaySubscriptionId: { $exists: true, $ne: "" },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!subscription) {
    return [];
  }

  try {
    const invoices = await razorpay.invoices.all({
      subscription_id: subscription.razorpaySubscriptionId,
    });

    return (invoices.items || []).map((inv) => ({
      id: inv.id,
      date: inv.date ? new Date(inv.date * 1000).toLocaleDateString("en-IN") : null,
      amount: inv.amount ? (inv.amount / 100).toFixed(2) : "0.00",
      currency: inv.currency || "INR",
      status: inv.status,
      invoiceUrl: inv.short_url || null,
    }));
  } catch {
    // If Razorpay API fails, return empty (don't break the page)
    return [];
  }
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

  if (subscription) {
    // Revert to free plan
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
