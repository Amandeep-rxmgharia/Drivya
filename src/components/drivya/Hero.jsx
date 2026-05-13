import { motion } from "motion/react";
import { ArrowRight, Play, Shield, Zap, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "./DashboardMockup";
import { easeSmooth } from "@/lib/motion-presets";

const heroStagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.06,
    },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "tween", duration: 0.82, ease: easeSmooth },
  },
};

export function Hero() {
  return (
    <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden">
      <div className="absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]">
        <div
          className="absolute inset-0 opacity-[0.38] dark:opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--hero-grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--hero-grid-line) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          variants={heroStagger}
          initial="hidden"
          animate="show"
          className="min-w-0"
        >
          <motion.span
            variants={heroItem}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground font-medium"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
            New · Drivya 2.0 with AI search
          </motion.span>

          <motion.h1
            variants={heroItem}
            className="mt-5 font-display text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] text-foreground"
          >
            Your files. <span className="text-gradient">Anywhere.</span>{" "}
            Instantly.
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed font-normal"
          >
            The cloud storage built for modern teams. Upload, organize and share
            at the speed of thought — with end-to-end encryption baked in.
          </motion.p>

          <motion.div variants={heroItem} className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow group"
            >
              Get Started Free
              <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border bg-secondary/30 backdrop-blur"
            >
              <Play className="mr-1 h-4 w-4" /> Watch Demo
            </Button>
          </motion.div>

          <motion.div
            variants={heroItem}
            className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground"
          >
            {[
              { icon: HardDrive, label: "10GB Free Storage" },
              { icon: Shield, label: "End-to-End Encryption" },
              { icon: Zap, label: "Lightning Fast Uploads" },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-2">
                <t.icon className="h-4 w-4 text-primary shrink-0" />
                {t.label}
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{
            type: "tween",
            duration: 0.78,
            ease: easeSmooth,
            delay: 0.06,
          }}
          className="min-w-0 flex justify-center lg:justify-end"
        >
          <DashboardMockup />
        </motion.div>
      </div>
    </section>
  );
}
