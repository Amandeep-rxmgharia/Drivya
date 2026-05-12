import { motion } from "motion/react";
import { Section } from "./Section";

const logos = ["Linear", "Vercel", "Notion", "Framer", "Figma", "Loom", "Stripe"];

const stats = [
  { value: "120M+", label: "Files uploaded" },
  { value: "850K", label: "Active users" },
  { value: "99.99%", label: "Uptime SLA" },
  { value: "8.4 PB", label: "Storage served" },
];

export function SocialProof() {
  return (
    <Section className="py-16 md:py-20">
      <p className="text-center text-sm text-muted-foreground">
        Trusted by creators, developers and students at fast-moving teams
      </p>
      <div className="mt-8 flex flex-wrap justify-center items-center gap-x-10 gap-y-6 opacity-70">
        {logos.map((l) => (
          <span key={l} className="font-display text-xl md:text-2xl tracking-tight text-muted-foreground/80 hover:text-foreground transition-colors">
            {l}
          </span>
        ))}
      </div>

      <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
            className="glass rounded-2xl p-6 text-center hover:shadow-glow transition-shadow"
          >
            <div className="font-display text-3xl md:text-4xl font-semibold text-gradient">{s.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
