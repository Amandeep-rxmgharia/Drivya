import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Check, Zap, Rocket, Shield, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "./Section";
import { easeSmooth } from "@/lib/motion-presets";

const plans = [
  {
    name: "Lite",
    icon: Rocket,
    price: { m: 39, y: 399 },
    desc: "For creators and everyday users.",
    features: [
      "50 GB storage",
      "25 GB monthly bandwidth",
      "Up to 2 GB file upload",
      "Email support",
      "15-day trash recovery",
    ],
    cta: "Start Lite",
    planKey: "spark_go",
  },
  {
    name: "Plus",
    icon: Shield,
    price: { m: 149, y: 1499 },
    desc: "For power users who need more room.",
    features: [
      "100 GB storage",
      "70 GB monthly bandwidth",
      "Up to 10 GB file upload",
      "Priority email support",
      "30-day trash recovery",
    ],
    cta: "Start Plus",
    planKey: "boost",
  },
  {
    name: "Pro",
    icon: Crown,
    price: { m: 399, y: 3999 },
    desc: "For professionals and growing teams.",
    features: [
      "500 GB storage",
      "300 GB monthly bandwidth",
      "Up to 50 GB file upload",
      "24/7 priority support",
      "45-day trash recovery",
    ],
    cta: "Start Pro",
    highlighted: true,
    planKey: "pro",
  },
  {
    name: "Max",
    icon: Sparkles,
    price: { m: 699, y: 6999 },
    desc: "For those who need it all.",
    features: [
      "1 TB storage",
      "700 GB monthly bandwidth",
      "Unlimited file upload size",
      "60-day trash recovery",
      "Early access to features",
    ],
    cta: "Start Max",
    planKey: "apex",
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <Section id="pricing">
      <SectionHeading
        eyebrow="Pricing"
        title="Simple pricing that scales with you."
        description="Start free. Upgrade when you outgrow it."
      />

      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full glass p-1">
          {[
            { k: false, l: "Monthly" },
            { k: true, l: "Yearly · save ~17%" },
          ].map((opt) => (
            <button
              key={opt.l}
              type="button"
              onClick={() => setYearly(opt.k)}
              className={`px-4 py-1.5 text-sm rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${yearly === opt.k
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {plans.map((p, i) => {
          const price = yearly ? p.price.y : p.price.m;
          const Icon = p.icon;
          return (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                type: "tween",
                duration: 0.68,
                ease: easeSmooth,
                delay: i * 0.09,
              }}
              className={`relative rounded-2xl p-7 transition-all duration-300 ${p.highlighted
                  ? "glass border-primary/50 shadow-glow scale-[1.02]"
                  : "glass"
                }`}
            >
              {p.highlighted && (
                <>
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/40 via-transparent to-accent/40 -z-10 blur-sm" />
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                    Most popular
                  </span>
                </>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.highlighted ? "bg-primary/15 text-primary" : "bg-secondary/60 text-muted-foreground"
                  }`}>
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <h3 className="font-display text-xl font-semibold">{p.name}</h3>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tabular-nums">
                  {price === 0 ? "Free" : `₹${price}`}
                </span>
                {price > 0 && (
                  <span className="text-muted-foreground text-sm">
                    /{yearly ? "yr" : "mo"}
                  </span>
                )}
              </div>
              {yearly && price > 0 && (
                <p className="mt-1 text-xs text-muted-foreground/70">
                  ≈ ₹{Math.round(price / 12)}/mo billed annually
                </p>
              )}
              <Button
                asChild
                className={`mt-6 w-full cursor-pointer ${p.highlighted
                    ? "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                    : "bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
              >
                <Link to={`/dashboard/payment?plan=${p.planKey}`}>
                  {p.cta}
                </Link>
              </Button>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}
