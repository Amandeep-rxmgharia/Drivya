import { motion } from "motion/react";
import { easeSmooth } from "@/lib/motion-presets";

export function Section({ id, children, className = "" }) {
  return (
    <section id={id} className={`relative py-24 md:py-32 ${className}`}>
      <div className="mx-auto max-w-7xl px-6">{children}</div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, description, center = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ type: "tween", duration: 0.78, ease: easeSmooth }}
      className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}
    >
      {eyebrow && (
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
          {eyebrow}
        </span>
      )}
      <h2 className="mt-4 font-display text-4xl md:text-5xl font-semibold tracking-tight text-gradient">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-muted-foreground text-lg leading-relaxed font-normal">
          {description}
        </p>
      )}
    </motion.div>
  );
}
