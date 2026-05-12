import { motion } from "motion/react";
import { Shield, Lock, Server, KeyRound } from "lucide-react";
import { Section, SectionHeading } from "./Section";
import { easeSmooth } from "@/lib/motion-presets";

const items = [
  {
    icon: Lock,
    title: "End-to-end encryption",
    desc: "AES-256 at rest, TLS 1.3 in flight, zero-knowledge keys.",
  },
  {
    icon: Server,
    title: "Secure cloud backups",
    desc: "Geo-redundant snapshots across 3 regions, every 6 hours.",
  },
  {
    icon: Shield,
    title: "Privacy-focused",
    desc: "GDPR & SOC 2 Type II certified. We never train on your data.",
  },
  {
    icon: KeyRound,
    title: "Advanced protection",
    desc: "SSO, SCIM, audit logs, 2FA and per-link passwords.",
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
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,oklch(0.7_0.2_255/0.3),transparent)] blur-2xl" />
          <div className="absolute inset-8 rounded-full border border-primary/30 animate-pulse" />
          <div className="absolute inset-16 rounded-full border border-primary/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: easeSmooth }}
              className="relative h-40 w-40 rounded-3xl glass flex items-center justify-center shadow-glow"
            >
              <Shield className="h-20 w-20 text-primary drop-shadow-[0_0_20px_oklch(0.7_0.2_255/0.8)]" />
            </motion.div>
          </div>
        </motion.div>

        <div>
          <SectionHeading
            eyebrow="Security"
            title="Protected by design."
            description="Your files are sacred. We engineered Drivya so no one — not even us — can read them."
            center={false}
          />
          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            {items.map((it, i) => (
              <motion.div
                key={it.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "tween", duration: 0.65, ease: easeSmooth, delay: i * 0.08 }}
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
