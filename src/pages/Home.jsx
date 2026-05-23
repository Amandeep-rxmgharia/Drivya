import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Command,
  FolderPlus,
  KeyRound,
  Loader2,
  LogIn,
  MoreHorizontal,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { easeSmooth } from "@/lib/motion-presets";
import { FilesLayout } from "../components/dashboard/FilesLayout.jsx";
import {
  card,
  subtleHover,
  chip,
  iconBtn,
  primaryBtn,
  ghostBtn,
  viewport,
  loopEase,
  stagger,
  fadeUp,
  fadeInView,
  Kbd,
} from "@/components/dashboard/dashboard-tokens";

/* ───────────────────────── Hero ───────────────────────── */

function HeroSection() {
  return (
    <motion.section
      {...fadeInView(0, 20)}
      className={`${card} ${subtleHover} relative overflow-hidden p-6 md:p-10`}
    >
       <div className="absolute inset-0 z-0 opacity-15 dark:opacity-20 pointer-events-none flex items-center justify-end">
          <svg
            className="w-full h-full max-w-lg"
            viewBox="0 0 500 500"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Grid */}
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Logistic Lines Paths */}
            <path
              d="M50 100 H250 V280 H450"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M100 200 H350 V380 H400"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
            <path
              d="M50 400 H200 V320 H450"
              stroke="var(--primary)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Glowing moving nodes */}
            <motion.circle
              r="4"
              fill="var(--primary)"
              className="drop-shadow-primary-glow"
              animate={{
                offsetDistance: ["0%", "100%"],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                offsetPath: "path('M50 100 H250 V280 H450')",
              }}
            />
            <motion.circle
              r="4"
              fill="var(--accent)"
              animate={{
                offsetDistance: ["0%", "100%"],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                offsetPath: "path('M100 200 H350 V380 H400')",
              }}
            />
          </svg>
        </div>
      {/* ambient glow — same language as landing page */}
      <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-ambient-primary blur-3xl opacity-80 pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-ambient-primary blur-3xl opacity-50 pointer-events-none" />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
        className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10"
      >
        <motion.div className="max-w-xl">
          <motion.div variants={fadeUp} className={chip}>
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
            All systems operational
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-foreground"
          >
            Good morning, <span className="text-gradient">Amelia</span>.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-3 text-muted-foreground leading-relaxed max-w-lg"
          >
            You uploaded{" "}
            <span className="font-semibold text-foreground">42 files</span> this
            week — 12% more than last week. Your vault is fully encrypted and
            synced across 3 devices.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-2.5">
            <button className={primaryBtn}>
              <UploadCloud className="h-4 w-4" /> Upload File
            </button>
            <button className={ghostBtn}>
              <FolderPlus className="h-4 w-4" /> Upload Folder
            </button>
            <button className={ghostBtn}>
              <Plus className="h-4 w-4" /> Create Folder
            </button>
            <button className={ghostBtn}>
              <Share2 className="h-4 w-4" /> Share File
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          animate={{ y: [0, -6, 0] }}
          transition={{
            y: { duration: 5.5, repeat: Infinity, ease: loopEase, delay: 0.8 },
          }}
        >
          <StorageDonut />
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

function StorageDonut() {
  const used = 62;
  const r = 56;
  const c = 2 * Math.PI * r;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={viewport}
      transition={{ type: "tween", duration: 0.78, ease: easeSmooth }}
      className="flex items-center gap-5 rounded-2xl border border-border/60 bg-secondary/30 p-5"
    >
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={r}
            stroke="var(--color-border)"
            strokeWidth="12"
            fill="none"
          />
          <motion.circle
            cx="70"
            cy="70"
            r={r}
            stroke="url(#g-storage)"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (c * used) / 100 }}
            transition={{ duration: 1.2, ease: easeSmooth }}
          />
          <defs>
            <linearGradient id="g-storage" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-primary-glow)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-2xl font-semibold tracking-tight text-foreground">
            156
            <span className="text-muted-foreground text-sm font-medium">
              {" "}
              GB
            </span>
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">
            of 250 GB
          </div>
        </div>
      </div>
      <div className="space-y-2 min-w-[140px]">
        {[
          { l: "Images", v: 64, w: "w-2" },
          { l: "Videos", v: 48 },
          { l: "Documents", v: 32 },
          { l: "Archives", v: 12 },
        ].map((t, i) => (
          <motion.div
            key={t.l}
            initial={{ opacity: 0, x: 8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              type: "tween",
              duration: 0.55,
              delay: 0.25 + i * 0.08,
              ease: easeSmooth,
            }}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="h-2 w-2 rounded-full bg-gradient-primary"
              style={{ opacity: 1 - i * 0.18 }}
            />
            <span className="text-muted-foreground flex-1">{t.l}</span>
            <span className="font-semibold text-foreground tabular-nums">
              {t.v} GB
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ───────────────────────── Analytics ───────────────────────── */

function AnalyticsCard() {
  const days = [42, 58, 35, 70, 52, 88, 64];
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <motion.div {...fadeInView(0.08)} className={`${card} ${subtleHover} p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            Weekly activity
          </div>
          <div className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-foreground">
            42 uploads
            <span className="ml-2 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md align-middle">
              ↑ 12%
            </span>
          </div>
        </div>
        <button className={iconBtn}>
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-6 flex items-end gap-3 h-32">
        {days.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: `${v}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: easeSmooth }}
              className={`w-full rounded-md transition-colors ${
                i === 5
                  ? "bg-gradient-primary shadow-glow"
                  : "bg-secondary/80 hover:bg-secondary"
              }`}
            />
            <span className="text-[10.5px] font-medium text-muted-foreground/80">
              {labels[i]}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ───────────────────────── Activity timeline ───────────────────────── */

const activities = [
  {
    icon: UploadCloud,
    text: "You uploaded 12 files to Brand kit 2025",
    when: "10 min ago",
  },
  {
    icon: Share2,
    text: "Shared Q3 financials with finance@drivya.com",
    when: "1 hr ago",
  },
  {
    icon: LogIn,
    text: "New login from MacBook Pro · Lisbon, PT",
    when: "3 hr ago",
  },
  {
    icon: ShieldCheck,
    text: "End-to-end encryption enabled for Vault",
    when: "Yesterday",
    accent: true,
  },
  { icon: Loader2, text: "API key rotated", when: "2 days ago" },
];

function ActivityTimeline() {
  return (
    <motion.div {...fadeInView(0.14)} className={`${card} p-6`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-base font-semibold text-foreground">
          Activity
        </h3>
        <span className={chip}>
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />{" "}
          Live
        </span>
      </div>
      <ol className="relative space-y-4">
        <span
          className="absolute left-[15px] top-2 bottom-2 w-px bg-border"
          aria-hidden
        />
        {activities.map((a, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              type: "tween",
              duration: 0.55,
              delay: i * 0.08,
              ease: easeSmooth,
            }}
            className="relative flex gap-3"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                type: "tween",
                duration: 0.45,
                delay: i * 0.08 + 0.05,
                ease: easeSmooth,
              }}
              className={`relative z-10 h-8 w-8 rounded-full ring-4 ring-background flex items-center justify-center border border-border/60 ${
                a.accent
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "bg-secondary/70 text-foreground/80"
              }`}
            >
              <a.icon className="h-4 w-4" />
            </motion.div>
            <div className="flex-1 pt-0.5">
              <div className="text-sm text-foreground/90">{a.text}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {a.when}
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </motion.div>
  );
}

/* ───────────────────────── Home page ───────────────────────── */

export default function Home() {
  return (
    <>
      <HeroSection />

      <motion.div {...fadeInView(0.06)} className="">
        <motion.div
          style={{ transform: "none" }}
          className="lg:col-span-2 space-y-6"
        >
          <AnalyticsCard />
          <FilesLayout layoutHeader='Recent files' />
          <ActivityTimeline />
        </motion.div>
      </motion.div>

      <motion.div
        {...fadeInView(0.18)}
        className="flex items-center justify-between text-xs text-muted-foreground/80 pt-2"
      >
        <div className="flex items-center gap-2">
          <Command className="h-3.5 w-3.5" />
          <span>
            Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search · <Kbd>U</Kbd> to upload
          </span>
        </div>
        <div>Drivya · v3.4 · Encrypted</div>
      </motion.div>
    </>
  );
}
