import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "./Section";

export function CTA() {
  return (
    <Section>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative overflow-hidden rounded-3xl glass p-12 md:p-20 text-center shadow-elegant"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,oklch(0.7_0.2_255/0.35),transparent_70%)]" />
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-[oklch(0.65_0.25_290/0.4)] blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-[oklch(0.7_0.2_255/0.4)] blur-3xl" />

        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight">
          Start storing <span className="text-gradient">smarter</span> with Drivya.
        </h2>
        <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
          Join hundreds of thousands of creators and teams already moving faster.
        </p>
        <Button size="lg" className="mt-8 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow group">
          Create Free Account
          <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </motion.div>
    </Section>
  );
}
