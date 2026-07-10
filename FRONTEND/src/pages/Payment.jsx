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
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSubscription, verifyPayment } from "../../api/subscription.js";

// ─── Plan Definitions ────────────────────────────────────────────
const GB = 1024 * 1024 * 1024;
const TB = 1024 * GB;
const MB = 1024 * 1024;

const PLANS = [
  {
    key: "free",
    name: "Spark Free",
    icon: Zap,
    price: { monthly: 0, yearly: 0 },
    storage: 5 * GB,
    storageLabel: "5 GB",
    bandwidth: 10 * GB,
    bandwidthLabel: "10 GB",
    maxUpload: 150 * MB,
    maxUploadLabel: "150 MB",
    trashDays: 5,
    features: ["5 GB Storage", "10 GB Bandwidth", "150 MB Max Upload", "5-Day Trash Recovery", "Basic Support"],
    gradient: "from-slate-500/20 to-slate-600/20",
    accentColor: "text-slate-400",
    borderColor: "border-slate-500/20",
    ringColor: "ring-slate-400/30",
  },
  {
    key: "spark_go",
    name: "Spark Go",
    icon: Rocket,
    price: { monthly: 39, yearly: 399 },
    storage: 50 * GB,
    storageLabel: "50 GB",
    bandwidth: 25 * GB,
    bandwidthLabel: "25 GB",
    maxUpload: null,
    maxUploadLabel: "Unlimited",
    trashDays: 15,
    features: ["50 GB Storage", "25 GB Bandwidth", "Unlimited Upload Size", "15-Day Trash Recovery", "Priority Support"],
    gradient: "from-blue-500/20 to-cyan-500/20",
    accentColor: "text-blue-400",
    borderColor: "border-blue-500/20",
    ringColor: "ring-blue-400/30",
  },
  {
    key: "boost",
    name: "Boost",
    icon: Shield,
    price: { monthly: 149, yearly: 1499 },
    storage: 100 * GB,
    storageLabel: "100 GB",
    bandwidth: 70 * GB,
    bandwidthLabel: "70 GB",
    maxUpload: null,
    maxUploadLabel: "Unlimited",
    trashDays: 30,
    features: ["100 GB Storage", "70 GB Bandwidth", "Unlimited Upload Size", "30-Day Trash Recovery", "Priority Support"],
    gradient: "from-violet-500/20 to-purple-500/20",
    accentColor: "text-violet-400",
    borderColor: "border-violet-500/20",
    ringColor: "ring-violet-400/30",
  },
  {
    key: "pro",
    name: "Pro",
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
    features: ["500 GB Storage", "300 GB Bandwidth", "Unlimited Upload Size", "45-Day Trash Recovery", "Premium Support"],
    gradient: "from-amber-500/20 to-orange-500/20",
    accentColor: "text-amber-400",
    borderColor: "border-amber-500/20",
    ringColor: "ring-amber-400/30",
  },
  {
    key: "apex",
    name: "Apex",
    icon: Sparkles,
    price: { monthly: 699, yearly: 6999 },
    storage: 1 * TB,
    storageLabel: "1 TB",
    bandwidth: 700 * GB,
    bandwidthLabel: "700 GB",
    maxUpload: null,
    maxUploadLabel: "Unlimited",
    trashDays: 60,
    features: ["1 TB Storage", "700 GB Bandwidth", "Unlimited Upload Size", "60-Day Trash Recovery", "Dedicated Support"],
    gradient: "from-rose-500/20 to-pink-500/20",
    accentColor: "text-rose-400",
    borderColor: "border-rose-500/20",
    ringColor: "ring-rose-400/30",
  },
];

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile, setUserProfile } = useOutletContext();

  const currentPlan = userProfile?.subscription?.plan || "free";

  // State
  const initialPlan = searchParams.get("plan")?.toLowerCase() || "pro";
  const [selectedPlan, setSelectedPlan] = useState(
    PLANS.find((p) => p.key === initialPlan)?.key || "pro",
  );
  const [yearly, setYearly] = useState(true);
  const [status, setStatus] = useState("idle"); // idle | creating | verifying | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [successPlan, setSuccessPlan] = useState(null);

  const handleBack = () => navigate("/dashboard/settings/billing");

  const activePlan = useMemo(
    () => PLANS.find((p) => p.key === selectedPlan) || PLANS[3],
    [selectedPlan],
  );

  const period = yearly ? "yearly" : "monthly";
  const priceDisplay = activePlan.price[period];
  const monthlySavings = yearly
    ? activePlan.price.monthly * 12 - activePlan.price.yearly
    : 0;

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
    // Update local user profile
    setUserProfile((prev) => ({
      ...prev,
      subscription: {
        ...prev?.subscription,
        plan: subscription.planKey,
        status: "active",
      },
    }));

    // Dispatch notification event
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("add-drivya-notification", {
          detail: {
            title: "Subscription Activated",
            description: `You are now on the Drivya ${subscription.planName} Plan. Thank you for your support!`,
            type: "success",
            actionPath: "/dashboard/settings/billing",
            actionLabel: "View Billing",
          },
        }),
      );
    }, 500);
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="relative min-h-[calc(100vh-10rem)] w-full py-2">
      <AnimatePresence mode="wait">
        {/* ─── Success Screen ─── */}
        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 mb-6"
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-display font-bold tracking-tight mb-2"
            >
              Welcome to{" "}
              <span className="text-gradient">
                {successPlan?.planName || "your new plan"}
              </span>
              !
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-muted-foreground max-w-md mb-8"
            >
              Your subscription is now active. All upgraded features are available immediately.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex gap-3"
            >
              <Button
                onClick={() => navigate("/dashboard/home")}
                className="bg-gradient-primary text-primary-foreground shadow-glow"
              >
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/settings/billing")}
              >
                View Billing
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* ─── Error Screen ─── */}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 border border-destructive/30 mb-6">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">
              Payment Failed
            </h2>
            <p className="text-muted-foreground max-w-md mb-6">
              {errorMsg || "Something went wrong. Please try again."}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setStatus("idle");
                  setErrorMsg("");
                }}
                className="bg-gradient-primary text-primary-foreground shadow-glow"
              >
                Try Again
              </Button>
              <Button variant="outline" onClick={handleBack}>
                Back to Billing
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── Plan Selection (Idle) ─── */}
        {(status === "idle" || status === "creating" || status === "verifying") && (
          <motion.div
            key="plan-selection"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary/35 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight">
                  Choose Your Plan
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upgrade to unlock more storage, bandwidth, and features
                </p>
              </div>
            </div>

            {/* Period Toggle */}
            <div className="flex items-center justify-center gap-3">
              <span
                className={`text-sm font-medium cursor-pointer transition-colors ${!yearly ? "text-foreground" : "text-muted-foreground"}`}
                onClick={() => setYearly(false)}
              >
                Monthly
              </span>
              <button
                onClick={() => setYearly((p) => !p)}
                className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${yearly ? "bg-primary" : "bg-secondary"}`}
              >
                <motion.div
                  className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md"
                  animate={{ left: yearly ? "calc(100% - 1.625rem)" : "0.125rem" }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
              <span
                className={`text-sm font-medium cursor-pointer transition-colors ${yearly ? "text-foreground" : "text-muted-foreground"}`}
                onClick={() => setYearly(true)}
              >
                Yearly
              </span>
              {yearly && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="ml-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold"
                >
                  Save up to 17%
                </motion.span>
              )}
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.key;
                const isCurrent = currentPlan === plan.key;
                const price = plan.price[period];
                const Icon = plan.icon;

                return (
                  <motion.div
                    key={plan.key}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => !isCurrent && setSelectedPlan(plan.key)}
                    className={`relative rounded-2xl p-5 cursor-pointer transition-all duration-300 border ${
                      plan.featured
                        ? "ring-2 ring-amber-400/40 border-amber-500/30"
                        : isSelected
                          ? `ring-2 ${plan.ringColor} ${plan.borderColor}`
                          : "border-border hover:border-border/80"
                    } ${
                      isSelected
                        ? `bg-gradient-to-br ${plan.gradient}`
                        : "bg-secondary/10 hover:bg-secondary/20"
                    }`}
                  >
                    {/* Featured Badge */}
                    {plan.featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-glow">
                        Most Popular
                      </div>
                    )}

                    {/* Current Plan Badge */}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                        Current Plan
                      </div>
                    )}

                    {/* Plan Icon & Name */}
                    <div className="flex items-center gap-2.5 mb-4 mt-1">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${plan.gradient} ${plan.accentColor}`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="font-display font-bold text-base tracking-tight">
                        {plan.name}
                      </h3>
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      {plan.key === "free" ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-display font-bold">
                            Free
                          </span>
                          <span className="text-xs text-muted-foreground">
                            forever
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-display font-bold">
                            ₹{price}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            /{yearly ? "yr" : "mo"}
                          </span>
                        </div>
                      )}
                      {yearly && plan.key !== "free" && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          ₹{Math.round(plan.price.yearly / 12)}/mo billed
                          yearly
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-5">
                      {plan.features.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <Check
                            className={`h-3.5 w-3.5 flex-shrink-0 ${plan.accentColor}`}
                          />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {isCurrent ? (
                      <div className="w-full py-2 text-center text-xs font-semibold text-muted-foreground rounded-xl border border-border bg-secondary/20">
                        Current Plan
                      </div>
                    ) : plan.key === "free" ? (
                      <div className="w-full py-2 text-center text-xs font-medium text-muted-foreground/60 rounded-xl">
                        Included
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlan(plan.key);
                        }}
                        className={`w-full py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                          isSelected
                            ? "bg-gradient-primary text-primary-foreground shadow-glow"
                            : "bg-secondary/30 hover:bg-secondary/50 text-foreground border border-border"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select Plan"}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Order Summary & Subscribe */}
            {selectedPlan !== "free" && selectedPlan !== currentPlan && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl glass p-6 max-w-lg mx-auto"
              >
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Order Summary
                </h3>

                <div className="space-y-3 text-sm mb-5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-semibold">{activePlan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billing</span>
                    <span className="font-medium">
                      {yearly ? "Yearly" : "Monthly"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <HardDrive className="h-3.5 w-3.5" /> Storage
                    </span>
                    <span className="font-medium">{activePlan.storageLabel}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Wifi className="h-3.5 w-3.5" /> Bandwidth
                    </span>
                    <span className="font-medium">
                      {activePlan.bandwidthLabel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" /> Trash Recovery
                    </span>
                    <span className="font-medium">
                      {activePlan.trashDays} Days
                    </span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between items-baseline">
                    <span className="font-semibold">Total</span>
                    <div className="text-right">
                      <span className="text-xl font-display font-bold">
                        ₹{priceDisplay}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        /{yearly ? "year" : "month"}
                      </span>
                    </div>
                  </div>
                  {monthlySavings > 0 && (
                    <p className="text-[11px] text-emerald-400 text-right">
                      You save ₹{monthlySavings}/year with yearly billing
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSubscribe}
                  disabled={status === "creating" || status === "verifying"}
                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow h-11 text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  {status === "creating" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating subscription...
                    </>
                  ) : status === "verifying" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying payment...
                    </>
                  ) : (
                    <>
                      Subscribe to {activePlan.name} — ₹{priceDisplay}
                      {yearly ? "/yr" : "/mo"}
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center mt-3 flex items-center justify-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Secured by Razorpay · Cancel anytime
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
