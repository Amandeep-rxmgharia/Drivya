import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  CreditCard,
  Receipt,
  Sparkles,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Crown,
  Loader2,
  AlertCircle,
  XCircle,
  Zap,
  Rocket,
  Shield,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Info,
  ArrowRight,
  X,
  Undo2,
} from "lucide-react";
import {
  SettingSection,
} from "../setting-primitives";
import {
  getSubscription,
  getInvoices,
  cancelSubscription,
  cancelScheduledDowngrade,
  getContinuationAuth,
  verifyContinuationAuth,
} from "../../../../api/subscription.js";

const PLAN_NAMES = {
  free: "Starter",
  spark_go: "Lite",
  boost: "Plus",
  pro: "Pro",
  apex: "Max",
};

const PLAN_ICONS = {
  free: Zap,
  spark_go: Rocket,
  boost: Shield,
  pro: Crown,
  apex: Sparkles,
};

const PLAN_STYLES = {
  free: {
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    text: "text-slate-500 dark:text-slate-400",
    border: "border-slate-500/20 dark:border-slate-500/30",
    glow: "rgba(148, 163, 184, 0.12)",
  },
  spark_go: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-500 dark:text-blue-400",
    border: "border-blue-500/20 dark:border-blue-500/30",
    glow: "rgba(59, 130, 246, 0.2)",
  },
  boost: {
    bg: "bg-violet-500/10 dark:bg-violet-500/20",
    text: "text-violet-500 dark:text-violet-400",
    border: "border-violet-500/20 dark:border-violet-500/30",
    glow: "rgba(139, 92, 246, 0.2)",
  },
  pro: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-500 dark:text-amber-400",
    border: "border-amber-500/20 dark:border-amber-500/30",
    glow: "rgba(245, 158, 11, 0.25)",
  },
  apex: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-500 dark:text-rose-400",
    border: "border-rose-500/20 dark:border-rose-500/30",
    glow: "rgba(244, 63, 94, 0.2)",
  },
};

export default function BillingSection({ userProfile }) {
  const navigate = useNavigate();

  const [subData, setSubData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelDowngradeLoading, setCancelDowngradeLoading] = useState(false);
  const [continuationAuthLoading, setContinuationAuthLoading] = useState(false);
  const [continuationAuthError, setContinuationAuthError] = useState("");

  // Fetch subscription + invoices on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [sub, inv] = await Promise.all([
          getSubscription(),
          getInvoices(),
        ]);
        if (!cancelled) {
          setSubData(sub);
          setInvoices(inv.invoices || []);
        }
      } catch {
        // Silently fail — show fallback UI
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Derived values
  const planKey = subData?.plan?.key || userProfile?.subscription?.plan || "free";
  const planName = PLAN_NAMES[planKey] || "Spark Free";
  const isFreePlan = planKey === "free";
  const style = PLAN_STYLES[planKey] || PLAN_STYLES.free;
  const IconComponent = PLAN_ICONS[planKey] || Zap;
  const subscription = subData?.subscription;
    const period = subscription?.period || "monthly";

  const pendingPlanChange = subscription?.pendingPlanChange;
  const isActive = subscription?.status === "active" || subscription?.status === "authenticated";
  const isCancelled = subscription?.cancelledAt != null;
  const isContinuation = subscription?.cancelReason === "continuation";
  const continuationAuth = subscription?.continuationAuth;
  const isDowngradeScheduled =
    (userProfile?.subscription?.status === "downgrade_scheduled" || !!pendingPlanChange) &&
    (!pendingPlanChange || pendingPlanChange.newPlanKey !== planKey);
  const isBillingCycleChangeScheduled =
    !!pendingPlanChange &&
    pendingPlanChange.newPlanKey === planKey &&
    pendingPlanChange.newPeriod &&
    pendingPlanChange.newPeriod !== period;

  // Format price display
  const price = subData?.plan?.price || { monthly: 0, yearly: 0 };
  const priceVal = price[period] || 0;
  const priceStr = isFreePlan ? "₹0" : `₹${priceVal}`;
  const billingCycle = isFreePlan
    ? " · Free forever"
    : period === "yearly"
      ? ` /year · Billed yearly`
      : ` /month · Billed monthly`;

  // Format storage display
  function formatSize(bytes) {
    if (!bytes) return "—";
    const tb = 1024 * 1024 * 1024 * 1024;
    const gb = 1024 * 1024 * 1024;
    if (bytes >= tb) return `${(bytes / tb).toFixed(0)} TB`;
    return `${(bytes / gb).toFixed(0)} GB`;
  }

  const storageVal = formatSize(subData?.plan?.storage);
  const bandwidthVal = formatSize(subData?.plan?.bandwidth);
  const trashDaysVal = subData?.plan?.trashDays ? `${subData.plan.trashDays} Days` : "5 Days";
  const renewsVal = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : isFreePlan
      ? "Never"
      : "—";

  // Payment method
  const paymentMethod = subscription?.paymentMethod;
  const hasPaymentMethod = paymentMethod?.last4 || paymentMethod?.type;

  // Cancel handler
  const handleCancel = async () => {
    setCancelLoading(true);
    setCancelError("");
    try {
      await cancelSubscription();
      // Refresh data
      const sub = await getSubscription();
      setSubData(sub);
      setShowCancelConfirm(false);
      window.dispatchEvent(new CustomEvent("refresh-drive"));
    } catch (err) {
      setCancelError(err.response?.data?.message || "Failed to cancel. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  // Cancel scheduled downgrade handler
  const handleCancelDowngrade = async () => {
    setCancelDowngradeLoading(true);
    setCancelError("");
    try {
      await cancelScheduledDowngrade();
      // Refresh data
      const sub = await getSubscription();
      setSubData(sub);
      window.dispatchEvent(new CustomEvent("refresh-drive"));
    } catch (err) {
      setCancelError(err.response?.data?.message || "Failed to cancel downgrade. Please try again.");
    } finally {
      setCancelDowngradeLoading(false);
    }
  };

  // Continuation auth handler — opens Razorpay Checkout for auth-only
  const handleContinuationAuth = async () => {
    setContinuationAuthLoading(true);
    setContinuationAuthError("");
    try {
      // 1. Get the continuation sub's Razorpay details
      const data = await getContinuationAuth();

      // 2. Open Razorpay Checkout for auth-only
      const options = {
        key: data.razorpayKeyId,
        subscription_id: data.razorpaySubscriptionId,
        name: "Drivya",
        description: `Authorize ${data.planName} Plan Continuation — ${data.period === "yearly" ? "Yearly" : "Monthly"}`,
        handler: async (response) => {
          // 3. Verify the auth signature
          try {
            await verifyContinuationAuth({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            });

            // 4. Refresh subscription data
            const sub = await getSubscription();
            setSubData(sub);
            window.dispatchEvent(new CustomEvent("refresh-drive"));

            // Toast success
            window.dispatchEvent(
              new CustomEvent("add-drivya-notification", {
                detail: {
                  title: "Autopay Authorized",
                  description: `Your ${data.planName} plan continuation is now authorized for seamless billing.`,
                  type: "success",
                  actionPath: "/dashboard/settings/billing",
                  actionLabel: "View Billing",
                },
              }),
            );
          } catch (err) {
            setContinuationAuthError(err.response?.data?.message || "Authorization verification failed.");
          }
        },
        theme: {
          color: "#7c3aed",
        },
        modal: {
          ondismiss: () => {
            setContinuationAuthLoading(false);
          },
          confirm_close: true,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setContinuationAuthError(
          response.error?.description || "Authorization failed. Please try again.",
        );
      });
      rzp.open();
      setContinuationAuthLoading(false); // modal is now open
    } catch (err) {
      setContinuationAuthError(err.response?.data?.message || "Failed to start authorization. Please try again.");
      setContinuationAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <SettingSection
        id="current-plan"
        title="Current Plan"
        description="Your subscription and plan details."
      >
        <div className="px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${style.bg} ${style.text} ${style.border} transition-all duration-300`}
                style={{ boxShadow: `0 0 14px ${style.glow}` }}
              >
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {planName}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${style.bg} ${style.text} ${style.border}`}>
                    Active
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-baseline gap-1">
                  <span className="font-semibold text-foreground">
                    {priceStr}
                  </span>
                  <span>{billingCycle}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isFreePlan ? (
                <button
                  onClick={() => navigate("/dashboard/payment?plan=pro")}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Upgrade Plan
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/dashboard/payment")}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Change Plan
                  </button>
                  {isActive && !isCancelled && !isDowngradeScheduled && !isBillingCycleChangeScheduled && (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  {isCancelled && !isDowngradeScheduled && (!isContinuation || continuationAuth?.needed) && (
                    <span className="inline-flex h-9 items-center gap-1.5 px-3 text-[11px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <AlertCircle className="h-3 w-3" />
                      Cancels {renewsVal}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Storage", value: storageVal },
              { label: "Bandwidth", value: bandwidthVal },
              { label: "Trash Recovery", value: trashDaysVal },
              { label: "Renews", value: renewsVal },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border/40 bg-secondary/10 p-3 text-center transition-all duration-200 hover:border-border/60 hover:bg-secondary/20"
              >
                <div className="text-sm font-medium text-foreground">
                  {stat.value}
                </div>
                <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SettingSection>

      {/* Refund Details & History */}
      {subData?.refundHistory && subData.refundHistory.length > 0 && (
        <SettingSection
          id="recent-refund"
          icon={Undo2}
          title="Upgrade Refunds"
          description="History of refunds processed for upgrading your plans."
        >
          <div className="px-6 py-3">
            <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/30 bg-secondary/5">
              {subData.refundHistory.map((refund, idx) => (
                <div
                  key={refund.id}
                  className={`flex items-center justify-between p-4 hover:bg-secondary/10 transition-colors gap-3 ${
                    idx === 0 ? "bg-emerald-500/[0.02]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Plan Shift Icons */}
                    <div className="flex items-center gap-1 bg-secondary/35 p-1 rounded-lg border border-border/40 shrink-0">
                      {(() => {
                        const OldIcon = PLAN_ICONS[refund.oldPlanKey] || Zap;
                        const oldStyle = PLAN_STYLES[refund.oldPlanKey] || PLAN_STYLES.free;
                        return (
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded border ${oldStyle.bg} ${oldStyle.text} ${oldStyle.border}`}
                            title={`From: ${refund.oldPlanName}`}
                          >
                            <OldIcon className="h-3.5 w-3.5" />
                          </div>
                        );
                      })()}
                      
                      <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                      
                      {(() => {
                        const nextPlanKey = refund.newPlanKey || "pro";
                        const nextStyle = PLAN_STYLES[nextPlanKey] || PLAN_STYLES.pro;
                        const NextIcon = PLAN_ICONS[nextPlanKey] || Crown;
                        return (
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded border ${nextStyle.bg} ${nextStyle.text} ${nextStyle.border}`}
                            title={`To: ${refund.newPlanName || "Pro"}`}
                          >
                            <NextIcon className="h-3.5 w-3.5" />
                          </div>
                        );
                      })()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs hidden md:inline font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">
                          {refund.oldPlanName} to {refund.newPlanName || "Pro"}
                        </span>
                        {idx === 0 && (
                          <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full">
                            Latest
                          </span>
                        )}
                        <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {refund.type === "full" ? "Full Refund" : "Prorated"}
                        </span>
                      </div>
                      <div className="text-[10px]  text-muted-foreground mt-0.5 truncate max-w-[160px] sm:max-w-none">
                        {new Date(refund.processedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })} • {refund.razorpayRefundId || "Refund Initiated"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      +₹{refund.amount.toFixed(2)}
                    </div>
                    {refund.type === "prorated" ? (
                      <div className="text-[9px] text-muted-foreground/80">
                        fee ₹{refund.gatewayCharges.toFixed(2)}
                      </div>
                    ) : (
                      undefined
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SettingSection>
      )}

      {/* Continuation Auth Required Banner */}
      {continuationAuth?.needed && (
        <SettingSection
          id="continuation-auth"
          icon={ShieldCheck}
          title="Authorization Required"
          description="Authorize autopay to ensure uninterrupted service."
        >
          <div className="px-6 py-5">
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">
                      Autopay Authorization Needed
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      Your <span className="font-semibold text-foreground">{continuationAuth.planName}</span> plan
                      continuation requires payment method authorization to ensure automatic billing
                      when your current cycle ends{subscription?.currentPeriodEnd ? (
                        <> on <span className="font-medium text-foreground">{renewsVal}</span></>
                      ) : null}.
                      Without authorization, your subscription may lapse.
                    </div>
                    {continuationAuthError && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <XCircle className="h-3 w-3" /> {continuationAuthError}
                      </p>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <button
                    onClick={handleContinuationAuth}
                    disabled={continuationAuthLoading}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    {continuationAuthLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    )}
                    Authorize Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </SettingSection>
      )}

      {/* Scheduled Downgrade */}
      {isDowngradeScheduled && pendingPlanChange && (
        <SettingSection
          id="scheduled-downgrade"
          icon={ArrowDownRight}
          title="Scheduled Downgrade"
          description="Details of your upcoming plan change."
        >
          <div className="px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between rounded-xl border border-blue-500/20 bg-blue-500/[0.02] p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                
                {/* Visual Transition */}
                <div className="flex items-center gap-2 bg-secondary/20 p-2.5 rounded-xl border border-border/40">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border ${style.bg} ${style.text} ${style.border}`}
                      style={{ boxShadow: `0 0 10px ${style.glow}` }}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="text-blue-500/60 flex items-center justify-center">
                    <ArrowDownRight className="h-4 w-4" />
                  </div>

                  {(() => {
                    const nextPlanKey = pendingPlanChange?.newPlanKey || "free";
                    const nextStyle = PLAN_STYLES[nextPlanKey] || PLAN_STYLES.free;
                    const NextIconComponent = PLAN_ICONS[nextPlanKey] || Zap;
                    return (
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border ${nextStyle.bg} ${nextStyle.text} ${nextStyle.border}`}
                          style={{ boxShadow: `0 0 10px ${nextStyle.glow}` }}
                        >
                          <NextIconComponent className="h-4 w-4" />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Plan change explanation text */}
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                    Downgrade Scheduled
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    Changing from <span className="font-semibold text-foreground">{planName}</span> to{" "}
                    <span className="font-semibold text-foreground">
                      {PLAN_NAMES[pendingPlanChange?.newPlanKey] || pendingPlanChange?.newPlanName || "Starter Plan"}
                    </span>{" "}
                    on <span className="font-medium text-foreground">{renewsVal}</span>.
                  </div>
                </div>
              </div>

              {/* Undo downgrade button */}
              <div className="shrink-0">
                <button
                  onClick={handleCancelDowngrade}
                  disabled={cancelDowngradeLoading}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 text-xs font-semibold text-blue-500 hover:bg-blue-500/10 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cancelDowngradeLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Undo Downgrade
                </button>
              </div>
            </div>
          </div>
        </SettingSection>
      )}

      {/* Scheduled Billing Cycle Change */}
      {isBillingCycleChangeScheduled && pendingPlanChange && (
        <SettingSection
          id="scheduled-cycle-change"
          icon={RefreshCw}
          title="Scheduled Cycle Change"
          description="Details of your upcoming billing cycle switch."
        >
          <div className="px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between rounded-xl border border-blue-500/20 bg-blue-500/[0.02] p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">

                {/* Visual Transition */}
                <div className="flex items-center gap-2 bg-secondary/20 p-2.5 rounded-xl border border-border/40">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border ${style.bg} ${style.text} ${style.border}`}
                      style={{ boxShadow: `0 0 10px ${style.glow}` }}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1 capitalize">{period}</span>
                  </div>

                  <div className="text-blue-500/60 flex items-center justify-center">
                    <RefreshCw className="h-4 w-4" />
                  </div>

                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border ${style.bg} ${style.text} ${style.border}`}
                      style={{ boxShadow: `0 0 10px ${style.glow}` }}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1 capitalize">{pendingPlanChange.newPeriod}</span>
                  </div>
                </div>

                {/* Cycle change explanation text */}
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                    Billing Cycle Change Scheduled
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    Switching <span className="font-semibold text-foreground">{planName}</span> from{" "}
                    <span className="font-semibold text-foreground capitalize">{period}</span> to{" "}
                    <span className="font-semibold text-foreground capitalize">
                      {pendingPlanChange.newPeriod}
                    </span>{" "}
                    billing on <span className="font-medium text-foreground">{renewsVal}</span>.
                  </div>
                </div>
              </div>

              {/* Undo cycle change button */}
              <div className="shrink-0">
                <button
                  onClick={handleCancelDowngrade}
                  disabled={cancelDowngradeLoading}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 text-xs font-semibold text-blue-500 hover:bg-blue-500/10 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cancelDowngradeLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Undo Cycle Change
                </button>
              </div>
            </div>
          </div>
        </SettingSection>
      )}

      {/* Payment Method */}
      {!isFreePlan && (
        <SettingSection
          id="payment-methods"
          icon={CreditCard}
          title="Payment Method"
          description="Your payment instrument on file."
        >
          <div className="px-6 py-3">
            {hasPaymentMethod ? (
              <div className="rounded-xl border border-primary/15 bg-primary/[0.02] p-3.5 flex items-center gap-3">
                <div className="flex h-10 w-14 items-center justify-center rounded-lg border border-border bg-background text-foreground">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground capitalize">
                      {paymentMethod.type || "Card"} ending in{" "}
                      {paymentMethod.last4 || "****"}
                    </span>
                    <span className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-secondary/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Payment method details will appear here after your first payment.
                </p>
              </div>
            )}
          </div>
        </SettingSection>
      )}

      {/* Billing History */}
      <SettingSection
        id="billing-history"
        icon={Receipt}
        title="Billing History"
        description="Past invoices and payment records."
      >
        <div className="px-6 py-3">
          {invoices.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-secondary/10 p-6 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No invoices yet.{" "}
                {isFreePlan && (
                  <button
                    onClick={() => navigate("/dashboard/payment")}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Upgrade to a paid plan
                  </button>
                )}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
              {/* Header */}
              <div className="grid grid-cols-[1fr_5rem_4rem_3rem] gap-3 bg-secondary/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                <span>Invoice</span>
                <span>Amount</span>
                <span>Status</span>
                <span></span>
              </div>
              {/* Rows */}
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="grid grid-cols-[1fr_5rem_4rem_3rem] gap-3 items-center px-4 py-3 hover:bg-secondary/20 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground truncate">
                      {inv.id}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {inv.date}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    ₹{inv.amount}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="h-2.5 w-2.5" />
                    {inv.status || "Paid"}
                  </span>
                  {inv.invoiceUrl ? (
                    <a
                      href={inv.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <div className="h-7 w-7" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingSection>

      {/* Cancel Subscription Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <CancelSubscriptionModal
            isOpen={showCancelConfirm}
            onClose={() => {
              setShowCancelConfirm(false);
              setCancelError("");
            }}
            onConfirm={handleCancel}
            planName={planName}
            renewsVal={renewsVal}
            loading={cancelLoading}
            error={cancelError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Cancel Subscription Modal ───────────────────────── */

function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  planName,
  renewsVal,
  loading,
  error,
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card/95 dark:bg-card/80 dark:backdrop-blur-xl shadow-elegant overflow-hidden p-6"
      >
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold text-foreground">
              Cancel Subscription?
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Your <span className="font-semibold text-foreground">{planName}</span> benefits will remain active until <span className="font-medium text-foreground">{renewsVal}</span>. After that, you'll be downgraded to the free plan.
            </p>
          </div>
        </div>

        {/* Error reporting */}
        {error && (
          <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-secondary/40 px-3.5 h-9 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
          >
            Keep Plan
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-destructive px-3.5 h-9 text-xs font-semibold text-destructive-foreground shadow-sm hover:opacity-90 active:translate-y-px transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            Cancel Subscription
          </button>
        </div>
      </motion.div>
    </div>
  );
}
