import { useState, useMemo, useRef, useEffect } from "react";
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
  const chartRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (chartRef.current && !chartRef.current.contains(e.target)) {
        setHoveredIdx(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  const activeData = WEEKLY_DATA[metric];
  const maxVal = Math.max(...activeData.rawValues);
  const labels = ["M", "T", "W", "T", "F", "S", "S"];

  const totalValue = activeData.rawValues.reduce((sum, val) => sum + val, 0);
  const totalText = `${totalValue} ${activeData.suffix}`;

  // SVG Chart layout mapping
  const chartHeight = 110;
  const chartWidth = 500;
  const paddingX = 25;
  const paddingY = 20;

  // Map 7 values to coordinate points
  const points = activeData.rawValues.map((v, i) => {
    const x = paddingX + (i / 6) * (chartWidth - paddingX * 2);
    // Avoid division by zero if maxVal is 0
    const ratio = maxVal > 0 ? v / maxVal : 0;
    const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
    return { x, y, value: v, label: labels[i], dayName: DAY_NAMES[i] };
  });

  // Construct SVG Path for the curved line
  const linePath = points.reduce((path, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    // Simple straight segment line looks clean and highly technical
    return `${path} L ${p.x} ${p.y}`;
  }, "");

  // Construct closed path for the filled gradient area under the line
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
    : "";

  // Helper values for Y-axis coordinates
  const yAxisTicks = [maxVal, Math.round(maxVal / 2), 0];

  return (
    <div className={`${card} p-6 animate-fade-in relative overflow-hidden group/card`}>
      {/* Ambient background glow using theme primary color */}
      <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full blur-3xl opacity-15 bg-primary pointer-events-none transition-all duration-500" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
            {activeData.title}
          </div>
          <div className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground h-8 flex items-center">
            {hoveredIdx !== null ? (
              <span className="animate-fade-in text-base sm:text-lg font-medium text-foreground/90">
                {activeData.rawValues[hoveredIdx]} {metric} on {DAY_NAMES[hoveredIdx]}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {totalText}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md align-middle text-primary bg-primary/10 transition-colors duration-300">
                  {activeData.change}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Metric Selector Tabs (Uses theme primary button state) */}
        <div className="flex rounded-xl border border-border/80 bg-secondary/30 p-0.5 self-start sm:self-center">
          {Object.keys(WEEKLY_DATA).map((key) => {
            const isSelected = metric === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMetric(key);
                  setHoveredIdx(null);
                }}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-300 cursor-pointer flex items-center gap-1.5",
                  isSelected
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full transition-all duration-300", isSelected ? "bg-primary shadow-glow" : "bg-muted-foreground/40")} />
                {WEEKLY_DATA[key].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={chartRef} className="relative mt-8 h-40 grid grid-cols-[2.5rem_1fr] items-end z-10">
        
        {/* Y-Axis Value Labels */}
        <div className="h-[110px] flex flex-col justify-between text-[10px] font-semibold tracking-wider font-mono text-muted-foreground/50 pr-2.5 text-right pointer-events-none select-none">
          {yAxisTicks.map((tick, i) => (
            <span key={i} className="leading-none">{tick}</span>
          ))}
        </div>

        {/* Graph Display Area */}
        <div className="h-full flex flex-col justify-end relative">
          
          {/* Coordinates Gridlines */}
          <div className="absolute inset-x-0 h-[110px] bottom-[30px] flex flex-col justify-between pointer-events-none py-1">
            <div className="border-b border-dashed border-border/40 w-full" />
            <div className="border-b border-dashed border-border/40 w-full" />
            <div className="border-b border-dashed border-border/40 w-full" />
          </div>

          {/* Interactive Line Graph SVG */}
          <div className="relative h-[110px] w-full">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              className="overflow-visible"
            >
              <defs>
                {/* Theme-compliant Area gradient */}
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>

                {/* Theme-compliant Line stroke gradient */}
                <linearGradient id="chart-line-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="50%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--primary)" />
                </linearGradient>
              </defs>

              {/* Area filled gradient */}
              <motion.path
                key={`area-${metric}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                d={areaPath}
                fill="url(#chart-area-grad)"
                style={{ willChange: "opacity" }}
              />

              {/* Curve Line */}
              <motion.path
                key={`line-${metric}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                d={linePath}
                fill="none"
                stroke="url(#chart-line-grad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ willChange: "opacity" }}
              />

              {/* Active Column Vertical Line Tracker */}
              {hoveredIdx !== null && (
                <line
                  x1={points[hoveredIdx].x}
                  y1="0"
                  x2={points[hoveredIdx].x}
                  y2={chartHeight}
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="pointer-events-none"
                />
              )}

            </svg>

            {/* Glow circle indicator on the hovered data point */}
            {hoveredIdx !== null && (
              <div
                style={{
                  position: "absolute",
                  left: `${(points[hoveredIdx].x / chartWidth) * 100}%`,
                  top: `${(points[hoveredIdx].y / chartHeight) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
                className="pointer-events-none z-10 flex items-center justify-center"
              >
                <div className="absolute w-4 h-4 rounded-full bg-primary opacity-30 animate-fade-in" />
                <div className="absolute w-2.5 h-2.5 rounded-full bg-primary border-2 border-card shadow-sm animate-fade-in" />
              </div>
            )}

            {/* Float Tooltip over nearest point using relative absolute mapping */}
            {hoveredIdx !== null && (
              <div
                style={{
                  position: "absolute",
                  left: `${(points[hoveredIdx].x / chartWidth) * 100}%`,
                  top: `${(points[hoveredIdx].y / chartHeight) * 100}%`,
                  transform: "translate(-50%, -130%)",
                }}
                className="z-10 px-2.5 py-1 rounded-lg border border-border/80 bg-background/95 text-foreground text-[10px] font-bold shadow-elegant backdrop-blur-sm pointer-events-none select-none whitespace-nowrap animate-fade-in"
              >
                {points[hoveredIdx].value}
              </div>
            )}

            {/* Invisible interactive hover grid hitboxes */}
            <div className="absolute inset-0 flex">
              {points.map((p, i) => (
                <div
                  key={i}
                  className="flex-1 h-full cursor-pointer relative"
                  onPointerEnter={(e) => {
                    if (e.nativeEvent.pointerType === "touch") return;
                    setHoveredIdx(i);
                  }}
                  onPointerLeave={(e) => {
                    if (e.nativeEvent.pointerType === "touch") return;
                    setHoveredIdx(null);
                  }}
                  onClick={(e) => {
                    if (e.nativeEvent.pointerType === "touch") {
                      setHoveredIdx((prev) => (prev === i ? null : i));
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Day Label Axis aligned perfectly under columns */}
          <div className="h-6 flex justify-between px-[14px] mt-2 border-t border-border/30 pt-1 pointer-events-none select-none">
            {labels.map((lbl, idx) => (
              <span
                key={idx}
                className={cn(
                  "text-[10px] font-bold tracking-wider transition-colors duration-200 w-6 text-center leading-none",
                  hoveredIdx === idx ? "text-foreground" : "text-muted-foreground/40"
                )}
              >
                {lbl}
              </span>
            ))}
          </div>

        </div>
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
