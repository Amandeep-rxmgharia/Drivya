import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Section } from "./Section";
import { DashboardMockup } from "./DashboardMockup";
import { easeSmooth } from "@/lib/motion-presets";

const points = [
  "Drag-to-upload with resumable transfers",
  "Nested folders, tags and smart filters",
  "One-click shareable links",
  "Inline preview for 100+ file types",
  "Universal AI-powered search",
];

export function Showcase() {
  return (
    <Section>
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ type: "tween", duration: 0.78, ease: easeSmooth }}
        >
          <span className="text-sm font-medium text-primary">Product</span>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold tracking-tight">
            A workspace your <span className="text-gradient">files deserve.</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Drivya replaces the messy stack of folders, attachments and chat threads with one beautifully fast home for
            everything you create.
          </p>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </span>
                <span className="text-foreground/90">{p}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ type: "tween", duration: 0.78, ease: easeSmooth, delay: 0.06 }}
        >
          <DashboardMockup />
        </motion.div>
      </div>
    </Section>
  );
}
