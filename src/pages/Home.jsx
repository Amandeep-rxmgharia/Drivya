import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Clock,
  Eye,
  LayoutGrid,
  List,
  Search,
  Upload,
  FileStack,
} from "lucide-react";
import { easeSmooth } from "@/lib/motion-presets";
import { RecentTimeline } from "@/components/recent/RecentTimeline";
import { FilePreviewModal } from "@/components/recent/FilePreviewModal";
import { RECENT_FILES } from "./RecentFiles";
import { cn } from "@/lib/utils";
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

const WEEKLY_DATA = {
  uploads: {
    label: "Uploads",
    title: "Weekly Uploads",
    change: "↑ 12%",
    rawValues: [5, 8, 4, 9, 6, 7, 3],
    suffix: "uploads",
  },
  opened: {
    label: "Opened",
    title: "Weekly Opens",
    change: "↑ 8%",
    rawValues: [15, 22, 12, 28, 18, 20, 13],
    suffix: "files",
  },
  downloads: {
    label: "Downloads",
    title: "Weekly Downloads",
    change: "↓ 4%",
    rawValues: [2, 4, 1, 5, 3, 3, 0],
    suffix: "files",
  },
};

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function AnalyticsCard() {
  const [metric, setMetric] = useState("uploads");
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const activeData = WEEKLY_DATA[metric];
  const maxVal = Math.max(...activeData.rawValues);
  const labels = ["M", "T", "W", "T", "F", "S", "S"];

  const totalValue = activeData.rawValues.reduce((sum, val) => sum + val, 0);
  const totalText = `${totalValue} ${activeData.suffix}`;

  return (
    <div className={`${card} p-6 animate-fade-in`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            {activeData.title}
          </div>
          <div className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-foreground h-8 flex items-center">
            {hoveredIdx !== null ? (
              <span className="animate-fade-in text-lg font-medium text-foreground/90">
                {activeData.rawValues[hoveredIdx]} {metric} on {DAY_NAMES[hoveredIdx]}
              </span>
            ) : (
              <>
                {totalText}
                <span className={cn(
                  "ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-md align-middle",
                  activeData.change.startsWith("↑")
                    ? "text-primary bg-primary/10"
                    : "text-destructive bg-destructive/10"
                )}>
                  {activeData.change}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex rounded-xl border border-border bg-secondary/40 p-0.5 self-start sm:self-center">
          {Object.keys(WEEKLY_DATA).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMetric(key);
                setHoveredIdx(null);
              }}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer",
                metric === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {WEEKLY_DATA[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative mt-8 h-36 flex items-end gap-3 px-1">
        {/* Background coordinate grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
          <div className="border-b border-dashed border-foreground w-full" />
          <div className="border-b border-dashed border-foreground w-full" />
          <div className="border-b border-dashed border-foreground w-full" />
          <div className="border-b border-dashed border-foreground w-full" />
        </div>

        {activeData.rawValues.map((v, i) => {
          const heightPercent = (v / maxVal) * 100;
          const isHighest = v === maxVal;
          const isHovered = hoveredIdx === i;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Value tooltip bubble on top of active/hovered bar */}
              <div className="relative w-full h-8 flex items-center justify-center">
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="absolute -top-3 z-10 px-2 py-0.5 rounded bg-foreground text-background text-[10px] font-bold shadow-sm whitespace-nowrap"
                    >
                      {v}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bar */}
              <div className="relative w-full h-full flex items-end">
                <motion.div
                  key={`${metric}-${i}`}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    type: "spring",
                    damping: 16,
                    stiffness: 110,
                    delay: i * 0.03,
                  }}
                  style={{
                    originY: 1,
                    height: `${heightPercent}%`,
                    willChange: "transform",
                  }}
                  className={cn(
                    "w-full rounded-md transition-colors duration-200",
                    isHighest
                      ? "bg-gradient-primary shadow-glow"
                      : "bg-secondary/75 hover:bg-secondary/90",
                    isHovered && "ring-2 ring-primary/40 shadow-glow"
                  )}
                />
              </div>

              {/* Label */}
              <span className={cn(
                "text-[10.5px] font-semibold transition-colors duration-200 mt-1",
                isHovered ? "text-foreground" : "text-muted-foreground/60"
              )}>
                {labels[i]}
              </span>
            </div>
          );
        })}
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

/* ───────────────────────── Recent Files Section ───────────────────────── */

function getTimeGroup(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekStart) return "This Week";
  return "Earlier";
}

function formatRelativeTime(date) {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const FILTER_TABS = [
  { id: "all", label: "All", icon: FileStack },
  { id: "opened", label: "Opened", icon: Eye },
  { id: "uploaded", label: "Uploaded", icon: Upload },
];

function RecentFilesSection() {
  const [files, setFiles] = useState(RECENT_FILES);
  const [activeFilter, setActiveFilter] = useState("all");
  const [view, setView] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFileId, setPreviewFileId] = useState(null);

  const previewFile = useMemo(() => {
    return files.find((f) => f.id === previewFileId) || null;
  }, [files, previewFileId]);

  const handleToggleStar = (id) => {
    setFiles((prevFiles) =>
      prevFiles.map((f) =>
        f.id === id ? { ...f, starred: !f.starred } : f
      )
    );
  };

  const filteredFiles = useMemo(() => {
    let list = [...files];

    // filter by type
    if (activeFilter !== "all") {
      list = list.filter((f) => f.type === activeFilter);
    }

    // filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.owner.toLowerCase().includes(q),
      );
    }

    return list;
  }, [files, activeFilter, searchQuery]);

  // Group by time period
  const grouped = useMemo(() => {
    const groups = {};
    const order = ["Today", "Yesterday", "This Week", "Earlier"];

    filteredFiles.forEach((file) => {
      const group = getTimeGroup(file.lastOpened);
      if (!groups[group]) groups[group] = [];
      groups[group].push(file);
    });

    // Sort files within each group by lastOpened descending
    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) => b.lastOpened - a.lastOpened),
    );

    return order
      .filter((g) => groups[g])
      .map((g) => ({ label: g, files: groups[g] }));
  }, [filteredFiles]);

  const uploadingCount = files.filter(
    (f) => f.uploadStatus === "uploading",
  ).length;

  return (
    <>
      <section
        className={cn(card, "overflow-hidden animate-fade-in")}
        aria-labelledby="recent-files-heading"
      >
        {/* Toolbar */}
        <header className="border-b border-border px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter tabs */}
            <div className="flex items-center gap-3">
              <div
                className="flex rounded-xl border border-border bg-secondary/40 p-0.5"
                role="tablist"
              >
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
                      activeFilter === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Uploading indicator */}
              {uploadingCount > 0 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(chip, "gap-2")}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <span className="text-[11px] font-medium">
                    {uploadingCount} uploading
                  </span>
                </motion.div>
              )}
            </div>

            {/* Right-side controls */}
            <div className="flex items-center gap-2">
              {/* Search within recent */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search recent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-44 rounded-xl border border-border bg-secondary/30 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* View toggle */}
              <div className="flex rounded-xl border border-border bg-secondary/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    view === "list"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="List view"
                  aria-pressed={view === "list"}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    view === "grid"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Timeline groups */}
        <div className="divide-y divide-border/60">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary/50">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                No recent files
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
                Files you open or upload will appear here, grouped by when you
                last accessed them.
              </p>
            </div>
          ) : (
            grouped.map((group, gi) => (
              <RecentTimeline
                key={group.label}
                label={group.label}
                files={group.files}
                view={view}
                index={gi}
                formatTime={formatRelativeTime}
                onPreview={(file) => setPreviewFileId(file.id)}
                onStar={handleToggleStar}
              />
            ))
          )}
        </div>
      </section>

      {/* Preview modal */}
      <AnimatePresence>
        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFileId(null)}
            formatTime={formatRelativeTime}
            onStar={handleToggleStar}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ───────────────────────── Home page ───────────────────────── */

export default function Home() {
  return (
    <>
      <HeroSection />

      <div className="lg:col-span-2 space-y-6">
        <AnalyticsCard />
        <RecentFilesSection />
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
