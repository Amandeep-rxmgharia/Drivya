import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "./Section";
import { easeSmooth } from "@/lib/motion-presets";

export function CTA() {
  return (
    <Section>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: "tween", duration: 0.82, ease: easeSmooth }}
        className="relative overflow-hidden rounded-3xl glass p-12 md:p-20 text-center shadow-elegant"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,var(--ambient-blob-c),transparent_70%)]" />
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full blur-3xl bg-[radial-gradient(closest-side,var(--ambient-blob-b),transparent)]" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full blur-3xl bg-[radial-gradient(closest-side,var(--ambient-blob-a),transparent)]" />

        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight text-foreground">
          Start storing <span className="text-gradient">smarter</span> with Drivya.
        </h2>
        <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
          Join hundreds of thousands of creators and teams already moving faster.
        </p>
        <Button size="lg" className="mt-8 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow group">
          Create Free Account
          <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
        </Button>
      </motion.div>
    </Section>
  );
}
