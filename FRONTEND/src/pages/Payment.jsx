import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  CreditCard,
  Lock,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Check,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PLANS = {
  free: {
    name: "Free",
    price: { m: 0, y: 0 },
    storage: "10 GB",
  },
  pro: {
    name: "Pro",
    price: { m: 12, y: 9 },
    storage: "2 TB",
  },
  team: {
    name: "Team",
    price: { m: 24, y: 19 },
    storage: "5 TB",
  },
};

const PROMO_CODES = {
  DRIVYA20: { discount: 0.20, type: "percent", desc: "20% off your purchase" },
  WELCOME10: { discount: 0.10, type: "percent", desc: "10% off your purchase" },
  FREE100: { discount: 1.00, type: "percent", desc: "100% off your purchase" },
  SAVE5: { discount: 5.00, type: "fixed", desc: "$5.00 off your purchase" },
};

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile, setUserProfile } = useOutletContext();

  // Route back or default if no history
  const handleBack = () => {
    navigate("/dashboard/settings/billing");
  };

  // State for Plan Selection
  const initialPlan = searchParams.get("plan")?.toLowerCase() || "pro";
  const [selectedPlan, setSelectedPlan] = useState(PLANS[initialPlan] ? initialPlan : "pro");
  const [yearly, setYearly] = useState(true);

  // Card details state
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardBrand, setCardBrand] = useState("unknown");

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [activePromo, setActivePromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [promoSuccessMsg, setPromoSuccessMsg] = useState("");

  // Payment method state: "card" | "paypal" | "gpay"
  const [paymentMethod, setPaymentMethod] = useState("card");

  // Processing state: "idle" | "processing" | "success"
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [processingStep, setProcessingStep] = useState(0);

  // Errors validation state
  const [errors, setErrors] = useState({});

  // Detect card brand based on card numbers
  useEffect(() => {
    const cleanNumber = cardNumber.replace(/\D/g, "");
    if (cleanNumber.startsWith("4")) {
      setCardBrand("visa");
    } else if (cleanNumber.startsWith("5")) {
      setCardBrand("mastercard");
    } else if (cleanNumber.startsWith("34") || cleanNumber.startsWith("37")) {
      setCardBrand("amex");
    } else if (cleanNumber.startsWith("6")) {
      setCardBrand("discover");
    } else {
      setCardBrand("unknown");
    }
  }, [cardNumber]);

  // Format Card Number (adds space every 4 digits)
  const handleCardNumberChange = (e) => {
    const input = e.target.value.replace(/\D/g, "");
    if (input.length > 16) return;
    const formatted = input.match(/.{1,4}/g)?.join(" ") || "";
    setCardNumber(formatted);
    if (errors.cardNumber) {
      setErrors((prev) => ({ ...prev, cardNumber: null }));
    }
  };

  // Format Expiry Date (MM/YY)
  const handleExpiryChange = (e) => {
    const input = e.target.value.replace(/\D/g, "");
    if (input.length > 4) return;
    let formatted = input;
    if (input.length > 2) {
      formatted = `${input.slice(0, 2)}/${input.slice(2)}`;
    }
    setCardExpiry(formatted);
    if (errors.cardExpiry) {
      setErrors((prev) => ({ ...prev, cardExpiry: null }));
    }
  };

  // Expiry date verification
  const handleCvcChange = (e) => {
    const input = e.target.value.replace(/\D/g, "");
    if (input.length > 4) return; // AMEX is 4, others 3
    setCardCvc(input);
    if (errors.cardCvc) {
      setErrors((prev) => ({ ...prev, cardCvc: null }));
    }
  };

  // Handle Promo Code Apply
  const applyPromoCode = () => {
    setPromoError("");
    setPromoSuccessMsg("");
    const code = promoInput.toUpperCase().trim();
    if (!code) return;

    if (PROMO_CODES[code]) {
      setActivePromo({ code, ...PROMO_CODES[code] });
      setPromoSuccessMsg(`Coupon "${code}" applied: ${PROMO_CODES[code].desc}`);
    } else {
      setPromoError("Invalid promotional code.");
      setActivePromo(null);
    }
  };

  // Calculate pricing breakdown
  const planDetails = PLANS[selectedPlan];
  const monthlyPrice = yearly ? planDetails.price.y : planDetails.price.m;
  const cycleMultiplier = yearly ? 12 : 1;
  const baseSubtotal = monthlyPrice * cycleMultiplier;

  let discountAmount = 0;
  if (activePromo) {
    if (activePromo.type === "percent") {
      discountAmount = baseSubtotal * activePromo.discount;
    } else if (activePromo.type === "fixed") {
      discountAmount = Math.min(baseSubtotal, activePromo.discount);
    }
  }

  const subtotalAfterDiscount = Math.max(0, baseSubtotal - discountAmount);
  // Estimate Tax: 8.5%
  const estimatedTax = subtotalAfterDiscount * 0.085;
  const totalCost = subtotalAfterDiscount + estimatedTax;

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    if (paymentMethod === "card") {
      if (!cardHolder.trim()) newErrors.cardHolder = "Cardholder name is required";
      
      const cleanNumber = cardNumber.replace(/\D/g, "");
      if (cleanNumber.length < 15) {
        newErrors.cardNumber = "Card number must be 15 or 16 digits";
      }
      
      if (cardExpiry.length < 5) {
        newErrors.cardExpiry = "Expiry must be MM/YY";
      } else {
        const [month, year] = cardExpiry.split("/");
        const m = parseInt(month, 10);
        if (m < 1 || m > 12) {
          newErrors.cardExpiry = "Invalid month";
        }
      }
      
      if (cardCvc.length < 3) {
        newErrors.cardCvc = "CVC must be 3 or 4 digits";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Simulated Payment Gateways steps
  const steps = [
    "Validating payment credentials...",
    "Contacting secure authorization gateway...",
    "Processing bank transaction...",
    "Finalizing subscription...",
  ];

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setPaymentStatus("processing");
    setProcessingStep(0);

    // Sequence through the progress steps
    const interval = setInterval(() => {
      setProcessingStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setPaymentStatus("success");
          handleSuccessSideEffects();
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
  };

  // Generate success billing invoices & notifications
  const handleSuccessSideEffects = () => {
    // 1. Update user profile tier
    const updatedTier = planDetails.name;
    setUserProfile((prev) => ({ ...prev, tier: updatedTier }));

    // 2. Add Invoice to localStorage list
    const newInvoice = {
      id: `INV-${new Date().getFullYear()}-07`,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      amount: `$${totalCost.toFixed(2)}`,
      status: "Paid",
    };

    const savedInvoices = localStorage.getItem("drivya-invoices");
    let invoicesList = [];
    if (savedInvoices) {
      try {
        invoicesList = JSON.parse(savedInvoices);
      } catch (e) {
        // ignore
      }
    }
    localStorage.setItem("drivya-invoices", JSON.stringify([newInvoice, ...invoicesList]));

    // 3. Dispatch global custom event for visual dashboard notification & toast
    setTimeout(() => {
      const event = new CustomEvent("add-drivya-notification", {
        detail: {
          title: "Subscription Activated",
          description: `You are now on the Drivya ${updatedTier} Plan. Thank you for your support!`,
          type: "success",
          actionPath: "/dashboard/settings/billing",
          actionLabel: "View Billing",
        },
      });
      window.dispatchEvent(event);
    }, 500);
  };

  return (
    <div className="relative min-h-[calc(100vh-10rem)] w-full py-2">
      <AnimatePresence mode="wait">
        {paymentStatus === "idle" && (
          <motion.div
            key="checkout-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left Column: Form details */}
            <div className="lg:col-span-7 space-y-6">
              {/* Back & Title */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary/35 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">Checkout</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">Secure 256-bit SSL transaction</p>
                </div>
              </div>

              {/* Payment Methods tabs */}
              <div className="rounded-2xl glass p-5 space-y-6">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
                    Payment Method
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "card", label: "Credit Card", icon: CreditCard },
                      { id: "paypal", label: "PayPal", isIcon: true, logo: "https://www.paypalobjects.com/webstatic/mktg/logo-center/PP_Logo_logo_image_128x32.png" },
                      { id: "gpay", label: "Google Pay", isIcon: true, logo: "gpay" },
                    ].map((method) => {
                      const isSelected = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "border-primary/40 bg-primary/[0.04] shadow-sm text-foreground"
                              : "border-border bg-secondary/15 hover:bg-secondary/35 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {method.icon && <method.icon className="h-5 w-5" />}
                          {!method.icon && method.id === "gpay" && (
                            <span className="font-display font-bold text-sm tracking-tight">
                              <span className="text-blue-500">G</span>
                              <span className="text-red-500">o</span>
                              <span className="text-yellow-500">o</span>
                              <span className="text-blue-500">g</span>
                              <span className="text-green-500">l</span>
                              <span className="text-red-500">e</span> Pay
                            </span>
                          )}
                          {!method.icon && method.id === "paypal" && (
                            <span className="font-display font-semibold italic text-blue-600 dark:text-blue-400 text-sm">
                              PayPal
                            </span>
                          )}
                          <span className="text-[11px] font-semibold">{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional Form Render */}
                {paymentMethod === "card" && (
                  <form onSubmit={handlePaymentSubmit} className="space-y-6">
                    {/* Live Visual Card Preview Container */}
                    <div className="flex justify-center py-2 perspective-1000">
                      <div
                        className={`relative w-full max-w-sm h-48 rounded-2xl p-6 transition-transform duration-700 preserve-3d shadow-glow text-white select-none ${
                          isFlipped ? "rotate-y-180" : ""
                        }`}
                        style={{
                          background: "linear-gradient(135deg, oklch(0.55 0.16 285), oklch(0.48 0.17 255))",
                        }}
                      >
                        {/* Front Side */}
                        <div className="absolute inset-0 p-6 flex flex-col justify-between backface-hidden">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[9px] uppercase tracking-widest opacity-80">Credit Card</p>
                              <Sparkles className="h-6 w-6 mt-1 text-primary-glow animate-pulse" />
                            </div>
                            <div className="h-8 w-12 flex items-center justify-end font-display font-bold text-lg italic uppercase tracking-wider opacity-90">
                              {cardBrand === "visa" && "Visa"}
                              {cardBrand === "mastercard" && "Mastercard"}
                              {cardBrand === "amex" && "Amex"}
                              {cardBrand === "discover" && "Discover"}
                              {cardBrand === "unknown" && "Card"}
                            </div>
                          </div>
                          
                          {/* Card Number display */}
                          <div className="text-xl md:text-2xl font-mono tracking-widest py-2">
                            {cardNumber || "•••• •••• •••• ••••"}
                          </div>

                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[8px] uppercase tracking-widest opacity-75">Card Holder</p>
                              <p className="text-sm font-semibold tracking-wide truncate max-w-[180px]">
                                {cardHolder.toUpperCase() || "NAME SURNAME"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] uppercase tracking-widest opacity-75">Expires</p>
                              <p className="text-sm font-semibold tracking-wide font-mono">
                                {cardExpiry || "MM/YY"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Back Side (flipped) */}
                        <div className="absolute inset-0 rounded-2xl flex flex-col justify-between py-6 rotate-y-180 backface-hidden">
                          <div className="w-full h-10 bg-neutral-900 mt-2" />
                          <div className="px-6 flex justify-end items-center">
                            <div className="text-right mr-3">
                              <p className="text-[8px] uppercase tracking-widest opacity-75">Secure CVC</p>
                              <div className="bg-white text-black font-mono font-semibold px-3 py-1 rounded text-sm italic tracking-widest w-16 text-center">
                                {cardCvc || "•••"}
                              </div>
                            </div>
                          </div>
                          <div className="px-6 text-[8px] tracking-wider opacity-60">
                            Authorized signature. Not valid unless signed. PCI-DSS compliant secure chip.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-foreground/90 mb-1.5">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          placeholder="Amelia Moreau"
                          value={cardHolder}
                          onChange={(e) => {
                            setCardHolder(e.target.value);
                            if (errors.cardHolder) setErrors((prev) => ({ ...prev, cardHolder: null }));
                          }}
                          className={`h-10 w-full rounded-xl border bg-secondary/20 px-3.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/10 ${
                            errors.cardHolder ? "border-destructive focus:border-destructive" : "border-border focus:border-primary/50"
                          }`}
                        />
                        {errors.cardHolder && (
                          <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {errors.cardHolder}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground/90 mb-1.5">
                          Card Number
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="4000 1234 5678 9010"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            className={`h-10 w-full rounded-xl border bg-secondary/20 pl-3.5 pr-12 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/10 ${
                              errors.cardNumber ? "border-destructive focus:border-destructive" : "border-border focus:border-primary/50"
                            }`}
                          />
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground italic uppercase">
                            {cardBrand !== "unknown" && cardBrand}
                          </div>
                        </div>
                        {errors.cardNumber && (
                          <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {errors.cardNumber}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-foreground/90 mb-1.5">
                            Expiration Date
                          </label>
                          <input
                            type="text"
                            placeholder="MM / YY"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            className={`h-10 w-full rounded-xl border bg-secondary/20 px-3.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/10 text-center ${
                              errors.cardExpiry ? "border-destructive focus:border-destructive" : "border-border focus:border-primary/50"
                            }`}
                          />
                          {errors.cardExpiry && (
                            <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> {errors.cardExpiry}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-foreground/90 mb-1.5">
                            CVC / CVV
                          </label>
                          <input
                            type="password"
                            placeholder="•••"
                            value={cardCvc}
                            onChange={handleCvcChange}
                            onFocus={() => setIsFlipped(true)}
                            onBlur={() => setIsFlipped(false)}
                            className={`h-10 w-full rounded-xl border bg-secondary/20 px-3.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/10 text-center ${
                              errors.cardCvc ? "border-destructive focus:border-destructive" : "border-border focus:border-primary/50"
                            }`}
                          />
                          {errors.cardCvc && (
                            <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> {errors.cardCvc}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-opacity cursor-pointer mt-4"
                    >
                      <Lock className="h-4 w-4" />
                      Pay ${totalCost.toFixed(2)} Securely
                    </button>
                  </form>
                )}

                {paymentMethod === "paypal" && (
                  <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-border rounded-xl bg-secondary/5 text-center">
                    <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <h3 className="font-display font-semibold text-base">PayPal Checkout</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
                      You will be redirected to PayPal's secure gateway to authorize this billing agreement.
                    </p>
                    <button
                      type="button"
                      onClick={handlePaymentSubmit}
                      className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black px-6 text-xs font-bold transition-colors w-full max-w-xs cursor-pointer shadow-md"
                    >
                      Pay with <span className="italic font-extrabold text-blue-800">PayPal</span>
                    </button>
                  </div>
                )}

                {paymentMethod === "gpay" && (
                  <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-border rounded-xl bg-secondary/5 text-center">
                    <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <h3 className="font-display font-semibold text-base">Google Pay Checkout</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
                      Complete checkout instantly using cards stored in your Google Account.
                    </p>
                    <button
                      type="button"
                      onClick={handlePaymentSubmit}
                      className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-black hover:bg-neutral-900 text-white px-6 text-xs font-bold transition-colors w-full max-w-xs cursor-pointer shadow-md"
                    >
                      Pay with <span className="font-bold">Google Pay</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Order Summary & Promo code */}
            <div className="lg:col-span-5 space-y-6">
              {/* Summary Card */}
              <div className="rounded-2xl glass p-5 space-y-5">
                <h3 className="font-display font-semibold text-base">Order Summary</h3>

                {/* Plan picker inside summary */}
                <div className="space-y-3">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Choose Plan
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(PLANS).map((pKey) => {
                      if (pKey === "free") return null; // free doesn't require checkout page usually, but supported
                      const plan = PLANS[pKey];
                      const isSelected = selectedPlan === pKey;
                      return (
                        <button
                          key={pKey}
                          type="button"
                          onClick={() => setSelectedPlan(pKey)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-primary/40 bg-primary/[0.04] text-foreground"
                              : "border-border bg-secondary/10 hover:bg-secondary/30 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className="block font-semibold text-xs text-foreground">{plan.name}</span>
                          <span className="block text-[11px] text-muted-foreground mt-0.5">
                            {plan.storage} Storage
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Billing interval picker */}
                <div className="flex items-center justify-between py-1.5 border-t border-b border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground">Billing Interval</span>
                  <div className="inline-flex rounded-xl bg-secondary/40 p-0.5 border border-border">
                    <button
                      type="button"
                      onClick={() => setYearly(false)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                        !yearly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setYearly(true)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                        yearly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Yearly (25% off)
                    </button>
                  </div>
                </div>

                {/* Invoice calculations details */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {planDetails.name} Plan ({yearly ? "Yearly" : "Monthly"})
                    </span>
                    <span className="font-semibold text-foreground font-mono">
                      ${monthlyPrice.toFixed(2)}/mo
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal ({yearly ? "12 months" : "1 month"})</span>
                    <span className="font-semibold text-foreground font-mono">${baseSubtotal.toFixed(2)}</span>
                  </div>

                  {activePromo && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>Promo Discount ({activePromo.code})</span>
                      <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Estimated Tax (8.5%)
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                    </span>
                    <span className="font-semibold text-foreground font-mono">${estimatedTax.toFixed(2)}</span>
                  </div>

                  <div className="my-1.5 h-px bg-border/60" />

                  <div className="flex justify-between text-base font-bold">
                    <span>Total due today</span>
                    <span className="font-mono bg-gradient-text bg-clip-text text-transparent">
                      ${totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Promo input card */}
              <div className="rounded-2xl glass p-5 space-y-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Promo Code
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="DRIVYA20"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="h-10 flex-1 rounded-xl border border-border bg-secondary/20 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                  />
                  <button
                    type="button"
                    onClick={applyPromoCode}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-secondary/35 hover:bg-secondary/60 text-xs font-semibold px-4 transition-all cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {promoError && (
                  <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3 animate-bounce" /> {promoError}
                  </p>
                )}
                {promoSuccessMsg && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium animate-pulse">
                    <Check className="h-3 w-3" /> {promoSuccessMsg}
                  </p>
                )}
                <div className="text-[10px] text-muted-foreground/60 leading-normal leading-relaxed mt-2">
                  Try standard test codes: <span className="font-mono text-foreground/80">DRIVYA20</span> (20% off), <span className="font-mono text-foreground/80">WELCOME10</span> (10% off), or <span className="font-mono text-foreground/80">FREE100</span> (100% off).
                </div>
              </div>

              {/* Secure checkout assurances */}
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-secondary/10 border border-border/40 text-xs text-muted-foreground leading-normal leading-relaxed select-none">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>PCI-DSS Compliant Security:</strong> We do not store your credit card digits on our servers. All transaction details are encrypted using banking grade standards.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Your subscription renews automatically. You can modify, downgrade or cancel your subscription at any time under settings.
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {paymentStatus === "processing" && (
          <motion.div
            key="checkout-processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-24 px-6 text-center max-w-md mx-auto"
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-glow">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </div>

            <h2 className="font-display text-xl font-bold text-foreground">Authorizing Transaction</h2>
            <p className="text-xs text-muted-foreground mt-2 max-w-sm">
              Please do not close this window or click back. We are processing your payment securely.
            </p>

            {/* Stepper Progress bar */}
            <div className="w-full mt-8 space-y-3.5">
              {steps.map((step, idx) => {
                const isActive = idx === processingStep;
                const isCompleted = idx < processingStep;
                return (
                  <div
                    key={step}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? "border-primary bg-primary/[0.03] text-foreground font-semibold"
                        : isCompleted
                        ? "border-emerald-500/20 bg-emerald-500/[0.02] text-muted-foreground"
                        : "border-transparent bg-transparent text-muted-foreground/40"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isActive
                          ? "bg-primary text-primary-foreground animate-pulse"
                          : isCompleted
                          ? "bg-emerald-500 text-white"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                    </div>
                    <span className="text-xs">{step}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {paymentStatus === "success" && (
          <motion.div
            key="checkout-success"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-lg mx-auto"
          >
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6 shadow-md shadow-emerald-500/10">
              <CheckCircle2 className="h-12 w-12 animate-bounce" />
            </div>

            <h2 className="font-display text-2xl font-bold text-foreground">Payment Successful!</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Thank you for subscribing! Your account has been upgraded, and your invoice details are available below.
            </p>

            {/* Receipt Summary */}
            <div className="w-full mt-8 rounded-2xl glass p-6 space-y-4 text-left border border-border">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="font-display font-semibold text-sm">Receipt Summary</span>
                <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Success
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                <div>
                  <span className="text-muted-foreground block">Invoice ID</span>
                  <span className="font-semibold text-foreground font-mono mt-0.5 block">
                    INV-{new Date().getFullYear()}-07
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Billing Plan</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{planDetails.name} Plan</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Date Paid</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Renew Date</span>
                  <span className="font-semibold text-foreground mt-0.5 block">Jul 1, 2026</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-border/40 mt-1 flex justify-between items-center text-sm">
                  <span className="font-semibold text-foreground">Total Billed</span>
                  <span className="font-bold text-foreground font-mono">${totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => navigate("/dashboard/settings/billing")}
              className="mt-8 w-full max-w-xs bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-11 rounded-xl text-sm font-semibold cursor-pointer"
            >
              Return to Billing Settings
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
