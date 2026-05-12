import { motion } from "motion/react";
import {
  MousePointer2, FolderTree, Share2, Search, RefreshCw, Activity, Eye, Cpu,
} from "lucide-react";
import { Section, SectionHeading } from "./Section";

const features = [
  { icon: MousePointer2, title: "Drag & Drop Uploads", desc: "Drop hundreds of files at once. Resumable, parallelized, blazing fast." },
  { icon: FolderTree, title: "Smart File Organization", desc: "Auto-tagging and folders that stay tidy without lifting a finger." },
  { icon: Share2, title: "Secure File Sharing", desc: "Share links with passwords, expirations and granular permissions." },
  { icon: Search, title: "Instant Search", desc: "Find any file in milliseconds — search inside docs, images and PDFs." },
  { icon: RefreshCw, title: "Multi-device Sync", desc: "Mac, Windows, iOS, Android, Web. Always in sync, always offline-ready." },
  { icon: Activity, title: "Real-time Progress", desc: "Live upload telemetry with bandwidth, ETA and per-file detail." },
  { icon: Eye, title: "Fast File Preview", desc: "Open and stream 100+ formats without downloading a single byte." },
  { icon: Cpu, title: "AI-ready Infrastructure", desc: "Pipe storage into your models with first-class API and webhooks." },
];

export function Features() {
  return (
    <Section id="features">
      <SectionHeading
        eyebrow="Features"
        title="Everything you need. Nothing you don't."
        description="A focused toolset designed for teams who care about speed, polish and security."
      />

      <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
            className="group relative glass rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 hover:shadow-glow overflow-hidden"
          >
            <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/20 via-transparent to-accent/20 pointer-events-none" />
            <div className="relative">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary/20 border border-primary/30 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
