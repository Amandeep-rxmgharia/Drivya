import { motion } from "motion/react";
import { Section, SectionHeading } from "./Section";
import { easeSmooth } from "@/lib/motion-presets";

const items = [
  {
    name: "Maya Patel",
    role: "Design Lead, Northwind",
    quote:
      "Drivya feels like the cloud storage Apple would build. Our team finally has a tool that just gets out of the way.",
  },
  {
    name: "Daniel Cho",
    role: "Founder, Loopcraft",
    quote: "Switched from three tools to Drivya in a weekend. Search alone is worth the price of admission.",
  },
  {
    name: "Sara Ali",
    role: "CS Student, MIT",
    quote: "Free tier is generous, the UI is beautiful, and uploads are stupidly fast. Couldn't ask for more.",
  },
  {
    name: "Lukas Berg",
    role: "Engineer, Spotify",
    quote: "Their API is clean and the encryption story holds up. We're piping training data through Drivya.",
  },
  {
    name: "Priya Rao",
    role: "Photographer",
    quote: "Sharing 200GB shoots used to be a nightmare. Now it's literally one link.",
  },
  {
    name: "Tomás Vega",
    role: "PM, Gridline",
    quote: "The polish is unreal. Every interaction feels intentional and fast.",
  },
];

export function Testimonials() {
  return (
    <Section>
      <SectionHeading eyebrow="Loved by teams" title="Words from people who ship." />
      <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "tween", duration: 0.68, ease: easeSmooth, delay: (i % 3) * 0.08 }}
            className="glass rounded-2xl p-6 hover:shadow-glow transition-shadow"
          >
            <p className="text-foreground/90 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                {t.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
