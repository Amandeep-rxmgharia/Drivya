import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  ChevronDown,
  Cloud,
  Command,
  Download,
  Folder,
  FolderPlus,
  Home,
  KeyRound,
  Loader2,
  LogIn,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCw,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { easeSmooth, tweenEnter } from "@/lib/motion-presets";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Link } from "react-router-dom";
import { RecentFiles as RecentFilesPanel } from "./RecentFiles";


/* ───────────────────────── Tokens / helpers ─────────────────────────
   Aligned with the Drivya landing page design system:
   - semantic color tokens (background / foreground / primary / muted / border)
   - glass surfaces, soft elegant shadows, font-display headings
   - calm motion (easeSmooth) — no bright dashboard colors
*/

const card = "rounded-2xl glass shadow-elegant";
const subtleHover =
  "transition-[box-shadow,transform,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-glow";
const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground";
const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors";
const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 h-10 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90 active:translate-y-px transition-all";
const ghostBtn =
  "inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3.5 h-10 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary/70 transition-colors";

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

/* ───────────────────────── Motion (landing-page style) ───────────────────────── */

const viewport = { once: true, margin: "-60px" };
const loopEase = [0.45, 0.05, 0.55, 0.95];

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "tween", duration: 0.72, ease: easeSmooth },
  },
};

function fadeInView(delay = 0, y = 16) {
  return {
    initial: { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport,
    transition: { type: "tween", duration: 0.68, ease: easeSmooth, delay },
  };
}

/* ───────────────────────── Sidebar ───────────────────────── */

const navMain = [
  { icon: Home, label: "Home", to: "home" },
  { icon: Folder, label: "My Drive", to: "drive", count: 248 },
  { icon: Share2, label: "Shared Files", to: "shared", count: 14 },
  { icon: Loader2, label: "Recent", to: "recent" },
  { icon: Star, label: "Starred", to: "starred" },
  { icon: Trash2, label: "Trash", to: "trash" },
];

function Sidebar({ collapsed, onClose, mobileOpen }) {
  const [active, setActive] = useState("home");

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-background/40 backdrop-blur-sm lg:hidden"
        />
      )}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={tweenEnter(0.78, 0.04)}
        className={[
          "fixed inset-y-0 left-0 z-40 h-full lg:relative lg:inset-auto shrink-0",
          "bg-background/60 backdrop-blur-xl border-r border-border/70",
          "flex flex-col transition-[width,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          collapsed ? "w-[76px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* brand */}
        <div className="h-16 flex items-center px-5 border-b border-border/60">
          <a href="/dashboard/home" className="flex items-center gap-2.5 group">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Cloud className="h-4 w-4 text-primary-foreground" />
            </span>
            {!collapsed && (
              <div className="flex flex-col leading-none">
                <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                  Drivya
                </span>
                <span className="text-[10.5px] font-medium text-muted-foreground mt-1">
                  Personal · Pro
                </span>
              </div>
            )}
          </a>
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-7">
          <SidebarGroup
            label="Library"
            items={navMain}
            active={active}
            setActive={setActive}
            collapsed={collapsed}
          />
        </nav>

        {/* storage card */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tweenEnter(0.65, 0.2)}
            className="m-3 rounded-2xl glass p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/90">
                Storage
              </span>
              <span className={chip}>
                <Sparkles className="h-3 w-3 text-primary" /> Pro
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "62%" }}
                transition={{ type: "tween", duration: 1.1, delay: 0.35, ease: easeSmooth }}
                className="h-full rounded-full bg-gradient-primary"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>156 GB of 250 GB</span>
              <button className="font-semibold text-foreground hover:text-primary transition-colors">
                Upgrade
              </button>
            </div>
          </motion.div>
        )}

        <motion.div className="px-3 pb-3 pt-1">
          <button
            onClick={() => setActive("settings")}
            className={[
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active === "settings"
                ? "bg-secondary/70 text-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>Settings</span>}
          </button>
        </motion.div>
      </motion.aside>
    </>
  );
}

function SidebarGroup({ label, items, active, setActive, collapsed }) {
  return (
    <div>
      {!collapsed && (
        <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
          {label}
        </div>
      )}
      <ul className="space-y-0.5">
        {items.map((it, i) => {
          const isActive = active === it.to;
          return (
            <motion.li
              key={it.to}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                type: "tween",
                duration: 0.55,
                delay: 0.12 + i * 0.05,
                ease: easeSmooth,
              }}
            >
              <button
                onClick={() => setActive(it.to)}
                className={[
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary/80 text-foreground border border-border/60 shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                  collapsed ? "justify-center" : "",
                ].join(" ")}
                title={collapsed ? it.label : undefined}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-gradient-primary shadow-glow" />
                )}
                <it.icon
                  className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{it.label}</span>
                    {it.count != null && (
                      <span className="text-[10.5px] font-semibold text-muted-foreground/70">
                        {it.count}
                      </span>
                    )}
                    {it.badge && (
                      <span className="rounded-md bg-gradient-primary px-1.5 py-0.5 text-[9.5px] font-semibold text-primary-foreground shadow-glow">
                        {it.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────────────────────── Topbar ───────────────────────── */

function Topbar({ onToggleSidebar, onMobileMenu, sidebarCollapsed }) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={tweenEnter(0.72, 0.1)}
      className="shrink-0 z-20 bg-background/60 backdrop-blur-xl border-b border-border/70"
    >
      <div className="h-16 flex items-center gap-3 px-4 md:px-6">
        <button onClick={onMobileMenu} className={`${iconBtn} lg:hidden`}>
          <Menu className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleSidebar}
          className={`${iconBtn} hidden lg:inline-flex`}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>

        {/* search */}
        <div className="flex-1 max-w-2xl">
          <div className="group relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files, folders, people…"
              className="h-10 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-24 text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </div>
          </div>
        </div>

        {/* mini storage */}
        <div className="hidden xl:flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 h-10">
          <Cloud className="h-4 w-4 text-primary" />
          <div className="w-24 h-1.5 rounded-full bg-secondary/80 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "62%" }}
              transition={{ type: "tween", duration: 1.1, delay: 0.25, ease: easeSmooth }}
              className="h-full rounded-full bg-gradient-primary"
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            156 / 250 GB
          </span>
        </div>

        <button className={`${primaryBtn} hidden md:inline-flex`}>
          <Upload className="h-4 w-4" />
          Upload
        </button>

        <ThemeToggle className="hidden sm:inline-flex" />

        <button className={`${iconBtn} relative`}>
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary shadow-glow ring-2 ring-background" />
        </button>

        {/* profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl pl-1 pr-2 h-10 hover:bg-secondary/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-primary ring-1 ring-border flex items-center justify-center text-xs font-semibold text-primary-foreground shadow-glow">
              AM
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-popover shadow-elegant p-2">
              <div className="px-3 py-2.5">
                <div className="text-sm font-semibold text-foreground">
                  Amelia Moreau
                </div>
                <div className="text-xs text-muted-foreground">
                  amelia@drivya.com
                </div>
              </div>
              <div className="my-1 h-px bg-border" />
              {["Account", "Billing", "Security", "Sign out"].map((l) => (
                <button
                  key={l}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-foreground/80 hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function HeroSection() {
  return (
    <motion.section
      {...fadeInView(0, 20)}
      className={`${card} ${subtleHover} relative overflow-hidden p-6 md:p-10`}
    >
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

/* ───────────────────────── Upload queue ───────────────────────── */

const uploads = [
  {
    name: "campaign-cut-final.mp4",
    size: "284 MB",
    progress: 72,
    speed: "8.4 MB/s",
    state: "uploading",
  },
  {
    name: "asset-pack-2025.zip",
    size: "1.2 GB",
    progress: 41,
    speed: "12.1 MB/s",
    state: "uploading",
  },
  {
    name: "logo-master.ai",
    size: "44 MB",
    progress: 100,
    speed: "—",
    state: "done",
  },
  {
    name: "annual-report.pdf",
    size: "62 MB",
    progress: 0,
    speed: "—",
    state: "failed",
  },
];

function UploadQueue({ setShowUploadQueue }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={tweenEnter(0.65)}
      className={`${card} p-6`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">
            Upload queue
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            2 active · avg 20.5 MB/s
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadQueue(false)}
          className={iconBtn}
          aria-label="Close upload queue"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={tweenEnter(0.55, 0.1)}
        className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/20 p-6 text-center hover:bg-secondary/40 hover:border-primary/40 transition-colors cursor-pointer"
      >
        <UploadCloud className="h-6 w-6 text-primary mx-auto drop-shadow-primary-glow" />
        <div className="mt-2 text-sm font-medium text-foreground">
          Drop files here or <span className="text-primary">browse</span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Max 5 GB per file · End-to-end encrypted
        </div>
      </motion.div>

      <ul className="mt-4 space-y-3">
        {uploads.map((u, i) => (
          <motion.li
            key={u.name}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              type: "tween",
              duration: 0.62,
              delay: 0.15 + i * 0.1,
              ease: easeSmooth,
            }}
            className="rounded-xl border border-border/60 bg-secondary/20 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-secondary/70 border border-border/60 flex items-center justify-center">
                {u.state === "done" ? (
                  <ShieldCheck className="h-4 w-4 text-primary" />
                ) : u.state === "failed" ? (
                  <RotateCw className="h-4 w-4 text-destructive" />
                ) : (
                  <Loader2 className="h-4 w-4 text-foreground/80 animate-spin" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-sm font-medium text-foreground truncate">
                    {u.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">
                    {u.state === "uploading"
                      ? `${u.speed} · ${u.size}`
                      : u.state === "failed"
                        ? "Failed"
                        : "Complete"}
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-secondary/80 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${u.progress}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: easeSmooth }}
                    className={`h-full rounded-full ${
                      u.state === "failed"
                        ? "bg-destructive"
                        : u.state === "done"
                          ? "bg-primary"
                          : "bg-gradient-primary"
                    }`}
                  />
                </div>
              </div>
              {u.state === "failed" && (
                <button className="text-xs font-semibold text-foreground hover:text-primary transition-colors">
                  Retry
                </button>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

/* ───────────────────────── Shared files widget ───────────────────────── */

const shared = [
  { name: "Brand kit 2025", peers: 4, when: "Today" },
  { name: "Investor materials", peers: 7, when: "Yesterday" },
  { name: "Q3 financials", peers: 2, when: "Mar 12" },
];

function SharedWidget() {
  return (
    <motion.div {...fadeInView(0.1)} className={`${card} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base font-semibold text-foreground">
          Shared with team
        </h3>
        <button className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          View all
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {shared.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{
              type: "tween",
              duration: 0.68,
              delay: (i % 3) * 0.07,
              ease: easeSmooth,
            }}
            whileHover={{ y: -2 }}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-secondary/20 p-4 hover:border-primary/40 hover:shadow-glow transition-all cursor-pointer"
          >
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-ambient-primary blur-2xl opacity-60 pointer-events-none" />
            <div className="relative">
              <div className="h-9 w-9 rounded-xl bg-gradient-primary shadow-glow flex items-center justify-center">
                <Folder className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="mt-5 text-sm font-semibold text-foreground">
                {s.name}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex -space-x-1.5">
                  {Array.from({ length: Math.min(s.peers, 3) }).map((_, i) => (
                    <div
                      key={i}
                      className="h-5 w-5 rounded-full bg-gradient-primary ring-2 ring-background text-[9px] font-semibold flex items-center justify-center text-primary-foreground"
                      style={{ opacity: 1 - i * 0.18 }}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {s.when}
                </span>
              </div>
            </div>
          </motion.div>
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
  { icon: KeyRound, text: "API key rotated", when: "2 days ago" },
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
              transition={{ type: "tween", duration: 0.45, delay: i * 0.08 + 0.05, ease: easeSmooth }}
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

/* ───────────────────────── Security panel ───────────────────────── */

function SecurityPanel() {
  return (
    <motion.div {...fadeInView(0.12)} className={`${card} relative overflow-hidden p-6`}>
      <div className="absolute -bottom-16 -right-12 h-48 w-48 rounded-full bg-ambient-primary blur-3xl opacity-70 pointer-events-none" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary shadow-glow flex items-center justify-center text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              Security
            </h3>
            <p className="text-xs text-muted-foreground">
              Your account is protected
            </p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold border border-primary/20">
          2FA on
        </span>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2.5">
        {[
          { icon: ShieldCheck, l: "End-to-end encrypted" },
          { icon: KeyRound, l: "Hardware key paired" },
          { icon: Users, l: "Secure sharing" },
          { icon: LogIn, l: "Session monitoring" },
        ].map((b, i) => (
          <motion.div
            key={b.l}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "tween", duration: 0.55, delay: i * 0.06, ease: easeSmooth }}
            className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/20 px-3 py-2.5"
          >
            <b.icon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground/90">
              {b.l}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="relative mt-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 mb-2">
          Active sessions
        </div>
        <ul className="space-y-2">
          {[
            { d: "MacBook Pro · Safari", loc: "Lisbon, PT", current: true },
            { d: "iPhone 15 · iOS app", loc: "Lisbon, PT" },
            { d: "Chrome · Windows", loc: "Berlin, DE" },
          ].map((s, i) => (
            <motion.li
              key={s.d}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ type: "tween", duration: 0.55, delay: i * 0.07, ease: easeSmooth }}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-3 py-2.5"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{s.d}</div>
                <div className="text-[11px] text-muted-foreground">{s.loc}</div>
              </div>
              {s.current ? (
                <span className="text-[10.5px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-md px-1.5 py-0.5">
                  This device
                </span>
              ) : (
                <button className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors">
                  Revoke
                </button>
              )}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/* ───────────────────────── Dashboard ───────────────────────── */

export function Dashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUploadQueue,setShowUploadQueue] = useState(true)
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden text-foreground">
      {/* ambient page glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, var(--ambient-radial-large), transparent), radial-gradient(ellipse 60% 40% at 90% 30%, var(--ambient-blob-b), transparent)",
        }}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <motion.div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar
            sidebarCollapsed={collapsed}
            onToggleSidebar={() => setCollapsed((c) => !c)}
            onMobileMenu={() => setMobileOpen(true)}
          />
          <main
            className="dashboard-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 space-y-6"
            style={{ scrollbarGutter: "stable" }}
          >
            <HeroSection />

            <motion.div {...fadeInView(0.06)} className="">
              <motion.div style={{ transform: "none" }} className="lg:col-span-2 space-y-6">
                <AnalyticsCard />
                <RecentFilesPanel />
                <ActivityTimeline />
              </motion.div>
              <motion.div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {/* {showUploadQueue && (
                    <UploadQueue
                      key="upload-queue"
                      setShowUploadQueue={setShowUploadQueue}
                    />
                  )} */}
                </AnimatePresence>
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
          </main>
        </motion.div>
      </div>
    </div>
  );
}
