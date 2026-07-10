import { useState, useMemo } from "react";
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
  HardDrive,
  Wifi,
  Trash2,
  Lock,
  ShieldCheck,
  Infinity,
  ChevronRight,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  card,
  subtleHover,
  chip,
} from "@/components/dashboard/dashboard-tokens";
import { createSubscription, verifyPayment } from "../../api/subscription.js";

// ─── Plan Definitions ────────────────────────────────────────────
const GB = 1024 * 1024 * 1024;
const TB = 1024 * GB;
const MB = 1024 * 1024;

const PLANS = [
  {
    key: "free",
    name: "Drivya Starter",
    shortName: "Starter",
    icon: Zap,
    price: { monthly: 0, yearly: 0 },
    storage: 5 * GB,
    storageLabel: "5 GB",
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
    name: "Drivya Lite",
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
  },
  {
    key: "boost",
    name: "Drivya Plus",
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
  },
  {
    key: "pro",
    name: "Drivya Pro",
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
  },
  {
    key: "apex",
    name: "Drivya Max",
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
  },
];

const PAID_PLANS = PLANS.filter((p) => p.key !== "free");

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

  const [yearly, setYearly] = useState(true);
  const [status, setStatus] = useState("idle"); // idle | creating | verifying | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [successPlan, setSuccessPlan] = useState(null);

  const handleBack = () => navigate("/dashboard/settings/billing");

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

  // ─── Razorpay Checkout Flow ────────────────────────────────────
  const handleSubscribe = async () => {
    if (selectedPlan === "free" || selectedPlan === currentPlan) return;

    setStatus("creating");
    setErrorMsg("");

    try {
      // 1. Create subscription on backend
      const data = await createSubscription(selectedPlan, period);

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        subscription_id: data.razorpaySubscriptionId,
        name: "Drivya",
        description: `${data.planName} Plan — ${yearly ? "Yearly" : "Monthly"}`,
        handler: async (response) => {
          // 3. Verify payment
          setStatus("verifying");
          try {
            const result = await verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            });

            // 4. Success
            setSuccessPlan(result.subscription);
            setStatus("success");
            handleSuccessSideEffects(result.subscription);
          } catch (err) {
            setErrorMsg(err.response?.data?.message || "Payment verification failed.");
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
        err.response?.data?.message || "Failed to create subscription. Please try again.",
      );
      setStatus("error");
    }
  };

  const handleSuccessSideEffects = (subscription) => {
    setUserProfile((prev) => ({
      ...prev,
      subscription: {
        ...prev?.subscription,
        plan: subscription.planKey,
        status: "active",
      },
    }));

    // Toast event
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("add-drivya-notification", {
          detail: {
            title: "Subscription Activated",
            description: `You are now on the ${subscription.planName} Plan. Thank you for your support!`,
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
              <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
            </div>

            <h1 className="text-3xl font-display font-bold tracking-tight mb-2">
              Subscription Active
            </h1>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              Your drive storage space has been upgraded to{" "}
              <span className="text-gradient font-bold">
                {successPlan?.planName || "new tier"}
              </span>{" "}
              limits immediately.
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
            {/* ─── Hero Banner (matches Settings/Home hero pattern) ─── */}
            <section
              className={`${card} ${subtleHover} relative overflow-hidden p-6 md:p-8 animate-fade-in`}
            >
              {/* Ambient glows — same as Home/Settings */}
              <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-ambient-primary blur-3xl opacity-80 pointer-events-none" />
              <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-ambient-primary blur-3xl opacity-50 pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <div className={chip}>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
                    {currentPlan === "free" ? "Free Plan" : `${currentPlanObj.name} · Active`}
                  </div>
                  <h1 className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-foreground">
                    <span className="text-gradient">Upgrade</span> your plan
                  </h1>
                  <p className="mt-2 text-muted-foreground leading-relaxed max-w-lg text-sm">
                    Select the storage tier that fits your workflow. All paid plans include
                    unlimited file uploads, priority support, and extended trash recovery.
                  </p>
                </div>

                {/* Billing toggle */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 border border-border/60 shrink-0 self-start sm:self-center">
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

              {/* Quick stats row — same pattern as Settings/Home */}
              <div className="relative flex items-center gap-3 mt-6 flex-wrap">
                <button
                  onClick={handleBack}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 px-3.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Billing
                </button>
              </div>
            </section>

            {/* ─── Main Content Grid ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Left Column: Plan Selector + Specs (col-span-8) */}
              <div className="lg:col-span-8 space-y-6">

                {/* Plan Selector — uses glass card pattern from SettingSection */}
                <section className="rounded-2xl glass shadow-elegant animate-fade-in">
                  {/* Section Header — matches SettingSection header */}
                  <div className="border-b border-border/60 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
                          Select Plan
                        </h3>
                        <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                          Choose the tier that matches your storage needs.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Segmented Tab Bar */}
                  <div className="px-6 py-5">
                    <div className="p-1.5 rounded-xl border border-border/40 bg-secondary/20 flex w-full">
                      {PAID_PLANS.map((plan) => {
                        const isSelected = selectedPlan === plan.key;
                        const isCurrent = currentPlan === plan.key;
                        return (
                          <button
                            key={plan.key}
                            onClick={() => setSelectedPlan(plan.key)}
                            className={cn(
                              "relative flex-1 py-3 text-center rounded-lg cursor-pointer transition-all focus:outline-none",
                              isSelected ? "" : "hover:text-foreground",
                            )}
                          >
                            {/* Active indicator */}
                            {isSelected && (
                              <motion.div
                                layoutId="activeTabSelector"
                                className="absolute inset-0 bg-background border border-border/40 rounded-lg shadow-sm"
                                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                              />
                            )}

                            <div className="relative flex flex-col items-center justify-center z-10">
                              <span className={cn(
                                "text-xs font-bold transition-colors",
                                isSelected ? "text-foreground" : "text-muted-foreground",
                              )}>
                                {plan.shortName}
                              </span>
                              <span className={cn(
                                "text-[10px] font-medium mt-0.5 transition-colors",
                                isSelected ? "text-muted-foreground" : "text-muted-foreground/60",
                              )}>
                                {plan.storageLabel}
                              </span>

                              {isCurrent && (
                                <span className="absolute -top-1.5 -right-1 text-[8px] bg-primary/20 text-primary border border-primary/20 px-1 rounded scale-[0.8] font-bold uppercase tracking-widest leading-none">
                                  Active
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>




                {/* Plan Specs Dashboard */}
                <section className="rounded-2xl glass shadow-elegant animate-fade-in">
                  <div className="border-b border-border/60 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
                          Plan Resources
                        </h3>
                        <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                          What's included with {activePlan.name}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-5">
                    {/* Stat grid — matches Settings/Home stat pattern */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            Bandwidth
                          </span>
                          <Wifi className="h-3.5 w-3.5 text-primary/80" />
                        </div>
                        <div className="font-display text-lg font-semibold text-foreground">
                          {activePlan.bandwidthLabel}
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
                          per month
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            Max File Size
                          </span>
                          <Infinity className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                        <div className="font-display text-lg font-semibold text-foreground">
                          {activePlan.maxUploadLabel}
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
                          per upload
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            Trash Recovery
                          </span>
                          <Trash2 className="h-3.5 w-3.5 text-rose-400/80" />
                        </div>
                        <div className="font-display text-lg font-semibold text-foreground">
                          {activePlan.trashDays} Days
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
                          file retention
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Checkout Summary (col-span-4) */}
              <div className="lg:col-span-4">
                <div className="sticky top-6 rounded-2xl glass shadow-elegant animate-fade-in">
                  {/* Section Header */}
                  <div className="border-b border-border/60 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Lock className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
                          Checkout
                        </h3>
                        <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                          Review your order details.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="px-6 py-5 space-y-4 border-b border-border/40">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full inline-block"
                          style={{ backgroundColor: activePlan.color }}
                        />
                        {activePlan.name}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Billing</span>
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
                  </div>

                  {/* Price */}
                  <div className="px-6 py-5 border-b border-border/40">
                    <div className="flex justify-between items-baseline">
                      <span className="font-medium text-xs text-muted-foreground">Total</span>
                      <div className="text-right">
                        <span className="text-2xl font-display font-extrabold text-foreground">
                          ₹{priceDisplay}
                        </span>
                        <span className="text-xs text-muted-foreground ml-0.5">
                          /{yearly ? "yr" : "mo"}
                        </span>
                      </div>
                    </div>

                    {yearly && activePlan.price.monthly > 0 && (
                      <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Save ₹{monthlySavings}/yr with annual billing
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="px-6 py-5 space-y-3">
                    {selectedPlan === "free" ? (
                      <div className="w-full py-2.5 text-center text-xs font-medium text-muted-foreground/80 rounded-xl border border-border/40 bg-secondary/20">
                        {currentPlan === "free"
                          ? "Default Starter active"
                          : "Cancel subscription in billing to downgrade"}
                      </div>
                    ) : selectedPlan === currentPlan ? (
                      <div className="w-full py-2.5 text-center text-xs font-medium text-muted-foreground/80 rounded-xl border border-border/40 bg-secondary/20">
                        This plan is currently active
                      </div>
                    ) : (
                      <button
                        onClick={handleSubscribe}
                        disabled={status === "creating" || status === "verifying"}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary h-10 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {status === "creating" ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Creating order…
                          </>
                        ) : status === "verifying" ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Verifying payment…
                          </>
                        ) : (
                          <>
                            Confirm & Pay
                            <ChevronRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    )}

                    <p className="text-[9px] text-muted-foreground/60 text-center flex items-center justify-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      Razorpay Secured · Cancel anytime
                    </p>
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
