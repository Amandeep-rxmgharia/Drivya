import { useState } from "react";
import { motion } from "motion/react";
import {
  Box,
  Cloud,
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
  Kbd,
} from "@/components/dashboard/dashboard-tokens";

/* ───────────────────────── Hero ───────────────────────── */

function HeroSection() {
  return (
    <section
      className={`${card} ${subtleHover} relative overflow-hidden p-6 md:p-10 animate-fade-in`}
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

            {/* Static nodes at path endpoints */}
            <circle cx="450" cy="280" r="4" fill="var(--primary)" className="drop-shadow-primary-glow" />
            <circle cx="400" cy="380" r="4" fill="var(--accent)" className="drop-shadow-primary-glow" />
          </svg>
        </div>
      {/* ambient glow — same language as landing page */}
      <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-ambient-primary blur-3xl opacity-80 pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-ambient-primary blur-3xl opacity-50 pointer-events-none" />
      <div
        className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10"
      >
        <div className="max-w-xl">
          <div className={chip}>
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
            All systems operational
          </div>
          <h1
            className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-foreground"
          >
            Good morning, <span className="text-gradient">Amelia</span>.
          </h1>
          <p
            className="mt-3 text-muted-foreground leading-relaxed max-w-lg"
          >
            You uploaded{" "}
            <span className="font-semibold text-foreground">42 files</span> this
            week — 12% more than last week. Your vault is fully encrypted and
            synced across 3 devices.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {/* Google Drive Button */}
            <button className="group relative inline-flex h-11 items-center gap-3 overflow-hidden rounded-xl border border-primary/20 bg-primary/5 px-4 text-sm font-semibold text-foreground shadow-sm backdrop-blur-md transition-all duration-300 hover:scale-104 cursor-pointer active:scale-[0.98]">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-x-full " />
              <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-background shadow-sm ring-1 ring-border/50 transition-all duration-300 group-hover:ring-primary/40 group-hover:shadow-[0_0_12px_-3px_var(--color-primary)]">
                <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 3.5h13.12l-3.43 6H6.28M15.66 15H2.55l3.43 6h13.11"/>
                </svg>
              </div>
              <span className="relative z-10 bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-transparent">Import from Google</span>
            </button>

            {/* Dropbox Button */}
            <button className="group relative inline-flex h-11 items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-secondary/30 px-4 text-sm font-medium text-foreground/90 shadow-sm backdrop-blur-md transition-all duration-300 hover:scale-104 cursor-pointer active:scale-[0.98]">
              <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-background shadow-sm ring-1 ring-border/50 transition-all duration-300 group-hover:ring-[#0061FF]/40 group-hover:shadow-[0_0_12px_-3px_#0061FF]">
                <Box className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#0061FF] transition-colors" />
              </div>
              <span className="relative z-10">Connect Dropbox</span>
            </button>

            {/* OneDrive Button */}
            <button className="group relative inline-flex h-11 items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-secondary/30 px-4 text-sm font-medium text-foreground/90 shadow-sm backdrop-blur-md transition-all duration-300 cursor-pointer hover:scale-104 active:scale-[0.98]">
              <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-background shadow-sm ring-1 ring-border/50 transition-all duration-300 group-hover:ring-[#0078D4]/40 group-hover:shadow-[0_0_12px_-3px_#0078D4]">
                <Cloud className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#0078D4] transition-colors" />
              </div>
              <span className="relative z-10">Connect OneDrive</span>
            </button>
          </div>
        </div>

        <div>
          <StorageDonut />
        </div>
      </div>
    </section>
  );
}

function StorageDonut() {
  const used = 62;
  const r = 56;
  const c = 2 * Math.PI * r;
  return (
    <div
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
            transition={{ duration: 0.8, ease: easeSmooth }}
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
          { l: "Images", v: 64 },
          { l: "Videos", v: 48 },
          { l: "Documents", v: 32 },
          { l: "Archives", v: 12 },
        ].map((t, i) => (
          <div
            key={t.l}
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
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Analytics ───────────────────────── */

function AnalyticsCard() {
  const days = [42, 58, 35, 70, 52, 88, 64];
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className={`${card} ${subtleHover} p-6 animate-fade-in`}>
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
            <div
              style={{ height: `${v}%` }}
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
    </div>
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
    <div className={`${card} p-6 animate-fade-in`}>
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
          <li
            key={i}
            className="relative flex gap-3"
          >
            <div
              className={`relative z-10 h-8 w-8 rounded-full ring-4 ring-background flex items-center justify-center border border-border/60 ${
                a.accent
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "bg-secondary/70 text-foreground/80"
              }`}
            >
              <a.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 pt-0.5">
              <div className="text-sm text-foreground/90">{a.text}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {a.when}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ───────────────────────── Home page ───────────────────────── */

export default function Home() {
  return (
    <>
      <HeroSection />

      <div className="lg:col-span-2 space-y-6">
        <AnalyticsCard />
        <FilesLayout layoutHeader='Recent files' />
        <ActivityTimeline />
      </div>

      <div
        className="flex items-center justify-between text-xs text-muted-foreground/80 pt-2"
      >
        <div className="flex items-center gap-2">
          <Command className="h-3.5 w-3.5" />
          <span>
            Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search · <Kbd>U</Kbd> to upload
          </span>
        </div>
        <div>Drivya · v3.4 · Encrypted</div>
      </div>
    </>
  );
}
