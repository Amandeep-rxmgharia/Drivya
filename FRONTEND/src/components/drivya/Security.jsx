import { motion } from "motion/react";
import { Shield, Lock, Fingerprint, ShieldCheck } from "lucide-react";
import { Section, SectionHeading } from "./Section";
import { easeSmooth } from "@/lib/motion-presets";

const items = [
  {
    icon: Fingerprint,
    title: "Two-factor authentication",
    desc: "TOTP-based 2FA with encrypted secrets and one-time backup codes for account recovery.",
  },
  {
    icon: Lock,
    title: "Protected sharing",
    desc: "Password-protect any share link, set expiration dates, and control view or download permissions.",
  },
  {
    icon: Shield,
    title: "Secure sessions",
    desc: "HttpOnly cookie auth with Redis-backed sessions, login alerts, and instant session revocation.",
  },
  {
    icon: ShieldCheck,
    title: "Attack prevention",
    desc: "Built-in NoSQL injection and XSS sanitization, rate limiting, and Helmet security headers.",
  },
];

export function Security() {
  return (
    <Section id="security">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: "tween", duration: 0.88, ease: easeSmooth }}
          className="relative aspect-square max-w-md mx-auto"
        >
          <div className="absolute inset-0 rounded-full blur-2xl bg-[radial-gradient(closest-side,var(--ambient-radial-large),transparent)]" />
          <div className="absolute inset-8 rounded-full border border-primary/30 animate-pulse" />
          <div className="absolute inset-16 rounded-full border border-primary/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: easeSmooth }}
              className="relative h-40 w-40 rounded-3xl glass flex items-center justify-center shadow-glow"
            >
              <Shield className="h-20 w-20 text-primary drop-shadow-primary-glow" />
            </motion.div>
          </div>
        </motion.div>

        <div>
          <SectionHeading
            eyebrow="Security"
            title="Your files, your control."
            description="Every layer of Drivya is built with security in mind — from authentication to file sharing."
            center={false}
          />
          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            {items.map((it, i) => (
              <motion.div
                key={it.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  type: "tween",
                  duration: 0.65,
                  ease: easeSmooth,
                  delay: i * 0.08,
                }}
                className="glass rounded-2xl p-5 hover:shadow-glow transition-shadow"
              >
                <it.icon className="h-5 w-5 text-primary" />
                <h4 className="mt-3 font-semibold">{it.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
