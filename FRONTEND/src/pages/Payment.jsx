import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
  Zap,
  Shield,
  Crown,
  Rocket,
  Wifi,
  Trash2,
  Lock,
  ShieldCheck,
  Infinity,
  ChevronRight,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  card,
  subtleHover,
  chip,
} from "@/components/dashboard/dashboard-tokens";
import { createSubscription, verifyPayment, changePlan, verifyPlanChange, getSubscription } from "../../api/subscription.js";

// ─── Plan Definitions ────────────────────────────────────────────
const GB = 1024 * 1024 * 1024;
const TB = 1024 * GB;
const MB = 1024 * 1024;

const PLANS = [
  {
    key: "free",
    name: "Starter",
    shortName: "Starter",
    icon: Zap,
    price: { monthly: 0, yearly: 0 },
    storage: 2 * GB,
    storageLabel: "2 GB",
    bandwidth: 10 * GB,
    bandwidthLabel: "10 GB",
    maxUpload: 150 * MB,
    maxUploadLabel: "150 MB",
    trashDays: 5,
    color: "#64748b",
    glowColor: "rgba(148, 163, 184, 0.08)",
  },
  {
    key: "spark_go",
    name: "Lite",
    shortName: "Lite",
    icon: Rocket,
    price: { monthly: 39, yearly: 399 },
    storage: 50 * GB,
    storageLabel: "50 GB",
    bandwidth: 25 * GB,
    bandwidthLabel: "25 GB",
    maxUpload: null,
    maxUploadLabel: "Unlimited",
    trashDays: 15,
    color: "#3b82f6",
    glowColor: "rgba(59, 130, 246, 0.15)",
    perks: ["Unlimited file uploads", "Email support", "15-day trash recovery"],
  },
  {
    key: "boost",
    name: "Plus",
    shortName: "Plus",
    icon: Shield,
    price: { monthly: 149, yearly: 1499 },
    storage: 100 * GB,
    storageLabel: "100 GB",
    bandwidth: 70 * GB,
    bandwidthLabel: "70 GB",
    maxUpload: null,
    maxUploadLabel: "Unlimited",
    trashDays: 30,
    color: "#8b5cf6",
    glowColor: "rgba(139, 92, 246, 0.15)",
    perks: [
      "Unlimited file uploads",
      "Priority email support",
      "30-day trash recovery",
      "Advanced sharing controls",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    shortName: "Pro",
    icon: Crown,
    featured: true,
    price: { monthly: 399, yearly: 3999 },
    storage: 500 * GB,
    storageLabel: "500 GB",
    bandwidth: 300 * GB,
    bandwidthLabel: "300 GB",
    maxUpload: null,
    maxUploadLabel: "Unlimited",
    trashDays: 45,
    color: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.2)",
    perks: [
      "Unlimited file uploads",
      "24/7 priority support",
      "45-day trash recovery",
      "Version history",
    ],
  },
  {
    key: "apex",
    name: "Max",
    shortName: "Max",
    icon: Sparkles,
    price: { monthly: 699, yearly: 6999 },
    storage: 1 * TB,
    storageLabel: "1 TB",
    bandwidth: 700 * GB,
    bandwidthLabel: "700 GB",
    maxUpload: null,
    maxUploadLabel: "Unlimited",
    trashDays: 60,
    color: "#f43f5e",
    glowColor: "rgba(244, 63, 94, 0.15)",
    perks: [
      "Unlimited file uploads",
      "Dedicated support line",
      "60-day trash recovery",
      "Early access to features",
    ],
  },
];

const PAID_PLANS = PLANS.filter((p) => p.key !== "free");

// Plan ordering for upgrade/downgrade detection
const PLAN_ORDER = { free: 0, spark_go: 1, boost: 2, pro: 3, apex: 4 };

// Log-scaled fill so 2 GB → 1 TB reads as a meaningful gradient instead of
// every paid tier's bar looking almost full next to the free tier.
const MAX_STORAGE_LOG = Math.log2(PLANS[PLANS.length - 1].storage);
const MIN_STORAGE_LOG = Math.log2(PLANS[0].storage);
function capacityPercent(storageBytes) {
  const pct =
    ((Math.log2(storageBytes) - MIN_STORAGE_LOG) /
      (MAX_STORAGE_LOG - MIN_STORAGE_LOG)) *
      88 +
    12; // floor at 12% so even the smallest tier shows a visible sliver
  return Math.min(100, Math.max(12, pct));
}

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile, setUserProfile } = useOutletContext();

  const currentPlan = userProfile?.subscription?.plan || "free";

  // State
  const initialPlan = searchParams.get("plan")?.toLowerCase() || "pro";
  const [selectedPlan, setSelectedPlan] = useState(() => {
    const matched = PLANS.find((p) => p.key === initialPlan);
    if (matched) return matched.key;
    return "pro";
  });

  const [yearly, setYearly] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | creating | verifying | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [successPlan, setSuccessPlan] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState(null); // "monthly" | "yearly" | null
  const handleBack = () => navigate("/dashboard/settings/billing");

  // Fetch current subscription period on mount
  useEffect(() => {
    if (currentPlan === "free") return;
    let cancelled = false;
    (async () => {
      try {
        const sub = await getSubscription();
        if (!cancelled && sub?.subscription?.period) {
          setCurrentPeriod(sub.subscription.period);
        }
      } catch {
        // Silently fail — period detection is non-critical
      }
    })();
    return () => { cancelled = true; };
  }, [currentPlan]);
  const activePlan = useMemo(
    () => PLANS.find((p) => p.key === selectedPlan) || PLANS[3],
    [selectedPlan],
  );

  const currentPlanObj = useMemo(
    () => PLANS.find((p) => p.key === currentPlan) || PLANS[0],
    [currentPlan],
  );

  const period = yearly ? "yearly" : "monthly";
  const priceDisplay = activePlan.price[period];
  const monthlyEquivalent = yearly
    ? Math.round(activePlan.price.yearly / 12)
    : activePlan.price.monthly;

  const monthlySavings = yearly
    ? activePlan.price.monthly * 12 - activePlan.price.yearly
    : 0;

  // Space increase calculations
  const spaceIncreaseLabel = useMemo(() => {
    if (!currentPlanObj || !activePlan) return "";
    const diff = activePlan.storage - currentPlanObj.storage;
    if (diff <= 0) return "";
    if (diff >= TB) return `+${(diff / TB).toFixed(0)} TB`;
    return `+${(diff / GB).toFixed(0)} GB`;
  }, [currentPlanObj, activePlan]);

  const storageGrowthMultiplier = useMemo(() => {
    if (!currentPlanObj || !activePlan) return 1;
    return Math.round(activePlan.storage / currentPlanObj.storage);
  }, [currentPlanObj, activePlan]);

  // ─── Change type detection ──────────────────────────────────────
  const selectedPeriod = yearly ? "yearly" : "monthly";
  const changeType = useMemo(() => {
    if (selectedPlan === currentPlan) {
      // Same plan — check if billing cycle is changing
      if (currentPeriod && selectedPeriod !== currentPeriod) return "billing_cycle_change";
      return "same";
    }
    if (currentPlan === "free") return "new";
    if (selectedPlan === "free") return "free";
    return (PLAN_ORDER[selectedPlan] ?? 0) > (PLAN_ORDER[currentPlan] ?? 0) ? "upgrade" : "downgrade";
  }, [selectedPlan, currentPlan, currentPeriod, selectedPeriod]);

  const hasActiveSub = currentPlan !== "free";

  // ─── Razorpay Checkout Flow ────────────────────────────────────
  const handleSubscribe = async () => {
    if (selectedPlan === "free" || changeType === "same") return;

    setStatus("creating");
    setErrorMsg("");

    try {
      // 1. Create subscription on backend (new sub or plan change)
      const data = hasActiveSub
        ? await changePlan(selectedPlan, period)
        : await createSubscription(selectedPlan, period);

      const isAuthOnly = data.changeType === "downgrade" || data.changeType === "billing_cycle_change";

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        subscription_id: data.razorpaySubscriptionId,
        name: "Drivya",
        description: isAuthOnly
          ? `Authorize ${data.planName} Plan — ${yearly ? "Yearly" : "Monthly"}`
          : `${data.planName} Plan — ${yearly ? "Yearly" : "Monthly"}`,
        handler: async (response) => {
          // 3. Verify payment / auth
          setStatus("verifying");
          try {
            let result;
            if (hasActiveSub) {
              result = await verifyPlanChange({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                changeType: data.changeType,
              });
            } else {
              result = await verifyPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              });
            }

            // 4. Success
            setSuccessPlan({ ...result.subscription, changeType: result.changeType });
            setStatus("success");
            handleSuccessSideEffects(result.subscription, result.changeType);
          } catch (err) {
            setErrorMsg(err.response?.data?.message || "Verification failed.");
            setStatus("error");
          }
        },
        prefill: {
          name: userProfile?.name || "",
          email: userProfile?.email || "",
        },
        theme: {
          color: "#7c3aed",
        },
        modal: {
          ondismiss: () => {
            setStatus("idle");
          },
          confirm_close: true,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setErrorMsg(
          response.error?.description || "Payment failed. Please try again.",
        );
        setStatus("error");
      });
      rzp.open();
      setStatus("idle"); // modal is now open, reset button state
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Failed to process. Please try again.",
      );
      setStatus("error");
    }
  };

  const handleSuccessSideEffects = (subscription, resultChangeType) => {
    const isScheduledChange = resultChangeType === "downgrade" || resultChangeType === "billing_cycle_change";
    setUserProfile((prev) => ({
      ...prev,
      subscription: {
        ...prev?.subscription,
        plan: isScheduledChange ? prev?.subscription?.plan : subscription.planKey,
        status: isScheduledChange
          ? (resultChangeType === "billing_cycle_change" ? "billing_cycle_change_scheduled" : "downgrade_scheduled")
          : "active",
      },
    }));

    // Trigger dashboard profile update
    window.dispatchEvent(new CustomEvent("refresh-drive"));

    // Toast event
    const toastMap = {
      downgrade: {
        title: "Downgrade Scheduled",
        description: `Your plan will change to ${subscription.planName} after the current billing cycle ends.`,
      },
      billing_cycle_change: {
        title: "Billing Cycle Change Scheduled",
        description: `Your billing will switch to ${subscription.period} after the current cycle ends.`,
      },
    };
    const toast = toastMap[resultChangeType] || {
      title: "Subscription Activated",
      description: `You are now on the ${subscription.planName} Plan. Thank you for your support!`,
    };

    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("add-drivya-notification", {
          detail: {
            title: toast.title,
            description: toast.description,
            type: "success",
            actionPath: "/dashboard/settings/billing",
            actionLabel: "View Billing",
          },
        }),
      );
    }, 500);
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-[calc(100vh-8rem)] w-full select-none space-y-6 pb-8">
      <AnimatePresence mode="wait">

        {/* ═══════════════════════════════════════════
            SUCCESS STATE
        ═══════════════════════════════════════════ */}
        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto"
          >
            <div className="relative mb-6">
              <div className={`h-20 w-20 rounded-2xl flex items-center justify-center ${(successPlan?.changeType === "downgrade" || successPlan?.changeType === "billing_cycle_change") ? "bg-blue-500/10 border border-blue-500/25" : "bg-emerald-500/10 border border-emerald-500/25"}`}>
                <CheckCircle2 className={`h-10 w-10 ${(successPlan?.changeType === "downgrade" || successPlan?.changeType === "billing_cycle_change") ? "text-blue-400" : "text-emerald-400"}`} />
              </div>
            </div>

            <h1 className="text-3xl font-display font-bold tracking-tight mb-2">
              {successPlan?.changeType === "billing_cycle_change"
                ? "Billing Cycle Change Scheduled"
                : successPlan?.changeType === "downgrade"
                  ? "Downgrade Scheduled"
                  : successPlan?.changeType === "upgrade"
                    ? "Plan Upgraded"
                    : "Subscription Active"}
            </h1>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              {successPlan?.changeType === "billing_cycle_change" ? (
                <>Your <span className="text-gradient font-bold">{successPlan?.planName || "plan"}</span> billing will switch to{" "}<span className="font-semibold text-foreground">{successPlan?.period}</span>{" "}after the current cycle ends{successPlan?.effectiveAfter ? ` on ${new Date(successPlan.effectiveAfter).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}` : ""}. No changes until then.</>
              ) : successPlan?.changeType === "downgrade" ? (
                <>Your plan will change to{" "}<span className="text-gradient font-bold">{successPlan?.planName || "new tier"}</span>{" "}after the current billing cycle ends{successPlan?.effectiveAfter ? ` on ${new Date(successPlan.effectiveAfter).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}` : ""}.  You'll keep your current features until then.</>
              ) : (
                <>Your drive storage space has been {successPlan?.changeType === "upgrade" ? "upgraded" : "set"} to{" "}<span className="text-gradient font-bold">{successPlan?.planName || "new tier"}</span>{" "}limits immediately.</>
              )}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => navigate("/dashboard/home")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 h-10 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-opacity cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-5 h-10 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                View Billing
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════
            ERROR STATE
        ═══════════════════════════════════════════ */}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto"
          >
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 border border-destructive/25 flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-destructive animate-pulse" />
            </div>

            <h2 className="text-2xl font-display font-bold mb-2">
              Payment Failed
            </h2>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              {errorMsg || "The payment could not be processed. Please try again."}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStatus("idle");
                  setErrorMsg("");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 h-10 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-opacity cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-5 h-10 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                Go Back
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════
            MAIN PRICING VIEW
        ═══════════════════════════════════════════ */}
        {(status === "idle" || status === "creating" || status === "verifying") && (
          <motion.div
            key="plan-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* ─── Hero Banner ─── */}
            <section
              className={`${card} ${subtleHover} relative overflow-hidden p-6 md:p-8 animate-fade-in`}
            >
              <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-ambient-primary blur-3xl opacity-80 pointer-events-none" />
              <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-ambient-primary blur-3xl opacity-50 pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                <div>

                  <div className={chip}>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
                    {currentPlan === "free" ? "Free Plan" : `${currentPlanObj.name} · Active`}
                  </div>
                  <h1 className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-foreground">
                    <span className="text-gradient">Upgrade</span> your storage
                  </h1>
                  <p className="mt-2 text-muted-foreground leading-relaxed max-w-lg text-sm">
                    Pick the tier that fits your workflow. Every paid plan includes
                    unlimited uploads, priority support, and extended trash recovery.
                  </p>
                </div>

                {/* Billing toggle */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 border border-border/60 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setYearly(false)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-tight transition-all cursor-pointer",
                      !yearly
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setYearly(true)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1.5",
                      yearly
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Yearly
                    <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-500 rounded px-1.5 py-0.5 font-bold leading-none">
                      –17%
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {/* ─── Pricing Cards (2×2, left) + Order Summary (right) ─── */}
            <div className="relative">
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-40 w-[70%] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

              <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left: 4 cards, 2 per row */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAID_PLANS.map((plan) => {
                  const Icon = plan.icon;
                  const isSelected = selectedPlan === plan.key;
                  const isCurrent = currentPlan === plan.key;
                  const gaugePct = capacityPercent(plan.storage);
                  const planPrice = plan.price[period];

                  return (
                    <motion.button
                      key={plan.key}
                      onClick={() => setSelectedPlan(plan.key)}
                      whileHover={{ y: -3 }}
                      whileTap={{ y: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={cn(
                        "relative text-left rounded-2xl p-5 cursor-pointer flex flex-col overflow-hidden",
                        "border backdrop-blur-sm transition-colors duration-200",
                        isSelected
                          ? "border-primary/50 bg-gradient-to-b from-primary/[0.08] via-secondary/40 to-secondary/20 shadow-glow"
                          : "border-border/50 bg-gradient-to-b from-secondary/20 to-secondary/[0.03] hover:border-border",
                      )}
                    >
                      {/* Top accent line for the featured tier */}
                      {plan.featured && (
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-primary" />
                      )}

                      {/* Ambient glow behind the icon, only when selected */}
                      {isSelected && (
                        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
                      )}

                      <div className="relative flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                              isSelected
                                ? "bg-primary/15 text-primary"
                                : "bg-secondary/60 text-muted-foreground",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </div>
                          <span className="text-[13px] font-medium text-foreground">
                            {plan.shortName}
                          </span>
                        </div>
                        {plan.featured ? (
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                            Popular
                          </span>
                        ) : isCurrent ? (
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground border border-border/70 rounded-full px-2 py-0.5">
                            Active
                          </span>
                        ) : null}
                      </div>

                      {/* Price */}
                      <div className="relative flex items-baseline gap-1 mb-0.5">
                        <span className="font-display text-[28px] leading-none font-semibold tracking-tight text-foreground tabular-nums">
                          ₹{planPrice}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          /{yearly ? "yr" : "mo"}
                        </span>
                      </div>
                      <div className="h-4 mb-5">
                        {yearly && (
                          <span className="text-[10px] text-muted-foreground/70">
                            ≈ ₹{Math.round(planPrice / 12)}/mo billed annually
                          </span>
                        )}
                      </div>

                      {/* Capacity gauge — signature element */}
                      <div className="relative mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            Storage
                          </span>
                          <span className="text-[11px] font-medium text-foreground">
                            {plan.storageLabel}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                          <motion.div
                            className={cn(
                              "h-full rounded-full",
                              isSelected ? "bg-gradient-primary" : "bg-muted-foreground/40",
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${gaugePct}%` }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                      </div>

                      {/* Mini stats */}
                      <div className="relative flex items-center gap-3 mb-4 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Wifi className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                          {plan.bandwidthLabel}/mo
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Trash2 className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                          {plan.trashDays}d trash
                        </span>
                      </div>

                      <div className="relative h-px bg-border/50 mb-4" />

                      {/* Perks */}
                      <ul className="relative space-y-1.5 mb-5 flex-1">
                        {(plan.perks || []).slice(0, 4).map((perk) => (
                          <li
                            key={perk}
                            className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug"
                          >
                            <Check
                              className={cn(
                                "h-3 w-3 mt-0.5 shrink-0",
                                isSelected ? "text-primary" : "text-foreground/50",
                              )}
                              strokeWidth={2}
                            />
                            {perk}
                          </li>
                        ))}
                      </ul>

                      {/* Select indicator */}
                      <div
                        className={cn(
                          "relative flex items-center justify-center gap-1.5 rounded-xl h-9 text-[11px] font-semibold transition-colors",
                          isSelected
                            ? "bg-gradient-primary text-primary-foreground shadow-glow"
                            : "border border-border/60 text-muted-foreground",
                        )}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Selected
                          </>
                        ) : (
                          "Select plan"
                        )}
                      </div>
                    </motion.button>
                  );
                })}
                </div>

                {/* Right: Order summary, docked beside the cards */}
                <div className="lg:col-span-5">
                  <div className="sticky top-6 rounded-2xl glass shadow-elegant animate-fade-in overflow-hidden">
                    <div className="border-b border-border/60 px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                          <Lock className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
                            Order Summary
                          </h3>
                          <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                            Review before you confirm.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Line items */}
                    <div className="px-6 py-5 space-y-3.5 border-b border-dashed border-border/60">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="font-semibold text-foreground">
                          {activePlan.name}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Billing cycle</span>
                        <span className="font-medium text-foreground capitalize">
                          {yearly ? "Yearly" : "Monthly"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Storage</span>
                        <span className="font-medium text-foreground">
                          {activePlan.storageLabel}
                        </span>
                      </div>
                      {yearly && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Monthly equivalent</span>
                          <span className="font-medium text-foreground">
                            ₹{monthlyEquivalent}/mo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div className="px-6 py-5 border-b border-border/40">
                      <div className="flex justify-between items-baseline">
                        <span className="font-medium text-xs text-muted-foreground">
                          {changeType === "billing_cycle_change" ? "Due today" : "Total due today"}
                        </span>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`${activePlan.key}-${period}-${changeType}`}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.18 }}
                            className="text-right"
                          >
                            {changeType === "billing_cycle_change" ? (
                              <>
                                <span className="text-2xl font-display font-extrabold text-foreground">
                                  ₹0 
                                </span>
                              
                              </>
                            ) : (
                              <>
                                <span className="text-2xl font-display font-extrabold text-foreground">
                                  ₹{priceDisplay}
                                </span>
                                <span className="text-xs text-muted-foreground ml-0.5">
                                  /{yearly ? "yr" : "mo"}
                                </span>
                              </>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {changeType === "billing_cycle_change" ? (
                        <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-blue-500/8 border border-blue-500/15">
                          <RefreshCw className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            ₹{priceDisplay}/{yearly ? "yr" : "mo"} starts after current cycle ends
                          </span>
                        </div>
                      ) : yearly && activePlan.price.monthly > 0 ? (
                        <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Save ₹{monthlySavings}/yr with annual billing
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* CTA */}
                    <div className="px-6 py-5 space-y-3">
                      {selectedPlan === "free" ? (
                        <div className="w-full py-2.5 text-center text-xs font-medium text-muted-foreground/80 rounded-xl border border-border/40 bg-secondary/20">
                          {currentPlan === "free"
                            ? "Default Starter active"
                            : "Cancel subscription in billing to downgrade"}
                        </div>
                      ) : changeType === "same" ? (
                        <div className="w-full py-2.5 text-center text-xs font-medium text-muted-foreground/80 rounded-xl border border-border/40 bg-secondary/20">
                          This plan is currently active
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={handleSubscribe}
                            disabled={status === "creating" || status === "verifying"}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary h-11 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {status === "creating" ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {changeType === "downgrade" || changeType === "billing_cycle_change" ? "Scheduling…" : "Creating order…"}
                              </>
                            ) : status === "verifying" ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Verifying…
                              </>
                            ) : changeType === "billing_cycle_change" ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5" />
                                Switch to {yearly ? "Yearly" : "Monthly"}
                                <ChevronRight className="h-3.5 w-3.5" />
                              </>
                            ) : changeType === "upgrade" ? (
                              <>
                                Upgrade & Pay ₹{priceDisplay}
                                <ChevronRight className="h-3.5 w-3.5" />
                              </>
                            ) : changeType === "downgrade" ? (
                              <>
                                Schedule Downgrade
                                <ChevronRight className="h-3.5 w-3.5" />
                              </>
                            ) : (
                              <>
                                Confirm & Pay ₹{priceDisplay}
                                <ChevronRight className="h-3.5 w-3.5" />
                              </>
                            )}
                          </button>
                          {changeType === "billing_cycle_change" && (
                            <p className="text-[10px] text-muted-foreground/70 text-center">
                              Takes effect at end of current billing cycle. No charge today.
                            </p>
                          )}
                          {changeType === "upgrade" && (
                            <p className="text-[10px] text-muted-foreground/70 text-center">
                              Your current plan will be cancelled immediately.
                            </p>
                          )}
                          {changeType === "downgrade" && (
                            <p className="text-[10px] text-muted-foreground/70 text-center">
                              Current plan stays active until the billing cycle ends. New plan starts after.
                            </p>
                          )}
                        </>
                      )}

                      <p className="text-[9px] text-muted-foreground/60 text-center flex items-center justify-center gap-1.5">
                        <Shield className="h-3 w-3" />
                        Razorpay Secured · Cancel anytime
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}