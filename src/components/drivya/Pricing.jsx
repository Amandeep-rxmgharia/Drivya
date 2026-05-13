import { useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "./Section";
import { easeSmooth } from "@/lib/motion-presets";

const plans = [
  {
    name: "Free",
    price: { m: 0, y: 0 },
    desc: "For personal projects and getting started.",
    features: ["10 GB storage", "Basic sharing", "2-device sync", "Community support"],
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: { m: 12, y: 9 },
    desc: "For creators and power users.",
    features: ["2 TB storage", "Advanced sharing & links", "Unlimited devices", "Priority support", "AI search"],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Team",
    price: { m: 24, y: 19 },
    desc: "For growing teams and businesses.",
    features: ["Per-seat 5 TB", "SSO & SCIM", "Audit logs", "Admin controls", "24/7 support"],
    cta: "Contact Sales",
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(true);

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
            { k: true, l: "Yearly · save 25%" },
          ].map((opt) => (
            <button
              key={opt.l}
              type="button"
              onClick={() => setYearly(opt.k)}
              className={`px-4 py-1.5 text-sm rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                yearly === opt.k
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {plans.map((p, i) => {
          const price = yearly ? p.price.y : p.price.m;
          return (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "tween", duration: 0.68, ease: easeSmooth, delay: i * 0.09 }}
              className={`relative rounded-2xl p-7 transition-all duration-300 ${
                p.highlighted
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
              <h3 className="font-display text-xl font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl font-semibold">${price}</span>
                <span className="text-muted-foreground text-sm">/mo</span>
              </div>
              <Button
                className={`mt-6 w-full ${
                  p.highlighted
                    ? "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                    : "bg-secondary text-foreground hover:bg-secondary/70"
                }`}
              >
                {p.cta}
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
