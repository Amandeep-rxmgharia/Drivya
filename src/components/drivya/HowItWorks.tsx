import { motion } from "motion/react";
import { Upload, FolderKanban, Share2 } from "lucide-react";
import { Section, SectionHeading } from "./Section";

const steps = [
  { icon: Upload, title: "Upload", desc: "Drop files from any device — we handle the rest." },
  { icon: FolderKanban, title: "Organize", desc: "Smart folders and AI tags keep things tidy." },
  { icon: Share2, title: "Share", desc: "Send a link. Control access. Done." },
];

export function HowItWorks() {
  return (
    <Section>
      <SectionHeading eyebrow="How it works" title="Three steps. Zero friction." />
      <div className="mt-16 relative grid md:grid-cols-3 gap-6">
        <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="relative text-center"
          >
            <div className="mx-auto relative h-20 w-20 rounded-2xl glass flex items-center justify-center shadow-glow">
              <s.icon className="h-8 w-8 text-primary" />
              <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gradient-primary text-xs font-semibold flex items-center justify-center text-primary-foreground">
                {i + 1}
              </span>
            </div>
            <h3 className="mt-6 font-display text-xl font-semibold">{s.title}</h3>
            <p className="mt-2 text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
