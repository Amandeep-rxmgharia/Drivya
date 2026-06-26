import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  Receipt,
  MapPin,
  Users,
  Sparkles,
  Download,
  ArrowUpRight,
  Check,
  Crown,
} from "lucide-react";
import {
  SettingSection,
  SettingRow,
  SettingBanner,
} from "../setting-primitives";
import { SettingInput, SettingSelect } from "../setting-controls";

const MOCK_INVOICES = [
  { id: "INV-2026-06", date: "Jun 1, 2026", amount: "$12.00", status: "Paid" },
  { id: "INV-2026-05", date: "May 1, 2026", amount: "$12.00", status: "Paid" },
  { id: "INV-2026-04", date: "Apr 1, 2026", amount: "$12.00", status: "Paid" },
  { id: "INV-2026-03", date: "Mar 1, 2026", amount: "$12.00", status: "Paid" },
];

export default function BillingSection({ userProfile }) {
  const [billingCountry, setBillingCountry] = useState("us");
  const navigate = useNavigate();

  const currentTier = userProfile?.tier || "Free";

  const [invoices] = useState(() => {
    const saved = localStorage.getItem("drivya-invoices");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    localStorage.setItem("drivya-invoices", JSON.stringify(MOCK_INVOICES));
    return MOCK_INVOICES;
  });

  // Details based on plan
  let priceStr = "$0";
  let billingCycle = "/month · Free tier";
  let storageVal = "10 GB";
  let devicesVal = "2";
  let maxFileVal = "100 MB";
  let renewsVal = "Never";
  let mainButtonLabel = "Upgrade to Pro";
  let mainButtonPlan = "pro";
  let secondaryButtonLabel = "Upgrade to Team";
  let secondaryButtonPlan = "team";

  if (currentTier === "Pro") {
    priceStr = "$12";
    billingCycle = "/month · Billed monthly";
    storageVal = "2 TB";
    devicesVal = "Unlimited";
    maxFileVal = "50 GB";
    renewsVal = "Jul 1, 2026";
    mainButtonLabel = "Upgrade to Team";
    mainButtonPlan = "team";
    secondaryButtonLabel = "Downgrade Plan";
    secondaryButtonPlan = "free";
  } else if (currentTier === "Team") {
    priceStr = "$24";
    billingCycle = "/month · Billed monthly";
    storageVal = "5 TB";
    devicesVal = "Unlimited";
    maxFileVal = "250 GB";
    renewsVal = "Jul 1, 2026";
    mainButtonLabel = "Manage Seats";
    mainButtonPlan = "";
    secondaryButtonLabel = "Downgrade Plan";
    secondaryButtonPlan = "pro";
  }

  const handleButtonClick = (plan) => {
    if (!plan) return;
    navigate(`/dashboard/payment?plan=${plan}`);
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <SettingSection
        id="current-plan"
        icon={Crown}
        title="Current Plan"
        description="Your subscription and plan details."
      >
        <div className="px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow text-primary-foreground">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <div className="font-display text-xl font-semibold tracking-tight text-foreground">
                  {currentTier} Plan
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  <span className="font-display text-2xl font-bold text-foreground">
                    {priceStr}
                  </span>
                  <span className="text-xs">{billingCycle}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleButtonClick(mainButtonPlan)}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-opacity cursor-pointer"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                {mainButtonLabel}
              </button>
              <button 
                onClick={() => handleButtonClick(secondaryButtonPlan)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
              >
                {secondaryButtonLabel}
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Storage", value: storageVal },
              { label: "Devices", value: devicesVal },
              { label: "Max File", value: maxFileVal },
              { label: "Renews", value: renewsVal },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border/60 bg-secondary/20 p-3 text-center"
              >
                <div className="font-display text-sm font-semibold text-foreground">
                  {stat.value}
                </div>
                <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SettingSection>

      {/* Payment Methods */}
      <SettingSection
        id="payment-methods"
        icon={CreditCard}
        title="Payment Methods"
        description="Manage your payment instruments."
      >
        <div className="px-6 py-3">
          <div className="rounded-xl border border-primary/15 bg-primary/[0.02] p-3.5 flex items-center gap-3">
            <div className="flex h-10 w-14 items-center justify-center rounded-lg border border-border bg-background text-foreground">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Visa ending in 4242
                </span>
                <span className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                  Primary
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Expires 12/2028
              </div>
            </div>
            <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              Update
            </button>
          </div>

          <button 
            onClick={() => navigate("/dashboard/payment")}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-dashed border-border hover:border-primary/40 bg-secondary/20 hover:bg-primary/5 px-4 text-xs font-medium text-muted-foreground hover:text-primary transition-all w-full justify-center cursor-pointer"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Add Payment Method
          </button>
        </div>
      </SettingSection>

      {/* Billing History */}
      <SettingSection
        id="billing-history"
        icon={Receipt}
        title="Billing History"
        description="Past invoices and payment records."
      >
        <div className="px-6 py-3">
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
                  <div className="text-sm font-medium text-foreground">
                    {inv.id}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {inv.date}
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {inv.amount}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-2.5 w-2.5" />
                  {inv.status}
                </span>
                <button className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </SettingSection>
    </div>
  );
}
