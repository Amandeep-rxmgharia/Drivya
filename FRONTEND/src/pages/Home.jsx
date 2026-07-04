import { useState, useMemo, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "motion/react";
import dropboxLogo from '../../assets/images/Dropbox-Icon.svg'
import GDriveLogo from '../../assets/images/Google_Drive_Logo.svg'
import {
  Box,
  Cloud,
  Command,
} from "lucide-react";
import { RecentFilesView } from "@/components/recent/RecentFilesView";
import { listActivities, getActivityStats } from "../../api/activities.js";
import { cn } from "@/lib/utils";
import {
  card,
  subtleHover,
  chip,
  Kbd,
} from "@/components/dashboard/dashboard-tokens";
import { GoogleDriveModal } from "@/components/dashboard/GoogleDriveModal";
import { DropboxModal } from "@/components/dashboard/DropboxModal";

/* ───────────────────────── Hero ───────────────────────── */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n;
}

function formatBytes(bytes) {
  if (bytes == null) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

function HeroSection({ userProfile, onImportGoogle, onImportDropbox }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getActivityStats()
      .then((res) => {
        if (res?.stats) setStats(res.stats);
      })
      .catch(() => {});
  }, []);

  const displayName = userProfile?.displayName || userProfile?.name || "there";
  const uploadCount = stats?.uploadedThisWeek ?? 0;
  console.log(stats);
  const changeText = stats?.weeklyData?.uploads?.change || "0%";
  const storageUsed = userProfile?.storageUsed || 0;
  const storageLimit = userProfile?.storageLimit || 1073741824;

  return (
    <section
      className={`${card} ${subtleHover} relative overflow-hidden p-6 md:p-10 animate-fade-in`}
    >
      <div className="absolute inset-0 z-0 opacity-13 dark:opacity-13 pointer-events-none flex items-center justify-end">
        <svg
          className="w-full h-full max-w-lg"
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <path d="M50 100 H250 V280 H450" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
          <path d="M100 200 H350 V380 H400" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 4" />
          <path d="M50 400 H200 V320 H450" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="450" cy="280" r="4" fill="var(--primary)" className="drop-shadow-primary-glow" />
          <circle cx="400" cy="380" r="4" fill="var(--accent)" className="drop-shadow-primary-glow" />
        </svg>
      </div>
      <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-ambient-primary blur-3xl opacity-80 pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-ambient-primary blur-3xl opacity-50 pointer-events-none" />
      <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-start gap-0">
        <div className="max-w-xl">
          <div className={chip}>
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
            All systems operational
          </div>
          <h1 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-foreground">
            {getGreeting()}, <span className="text-gradient">{displayName}</span>.
          </h1>
          <p  className="mt-3 text-muted-foreground leading-relaxed max-w-lg">
            {uploadCount > 0 ? (
              <>You uploaded <span className="font-semibold text-foreground">{formatNumber(uploadCount)} {uploadCount === 1 ? "file" : "files"}</span> this week — <span className="font-semibold text-foreground">{changeText}</span> vs last week.</>
            ) : (
              <>Your vault is fully encrypted and synced across your devices.</>
            )}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={onImportGoogle}
              className="group relative inline-flex h-11 items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-secondary/30 px-4 text-sm font-semibold text-foreground shadow-sm backdrop-blur-md transition-all duration-300 hover:scale-104 cursor-pointer active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-x-full" />
              <div className="flex h-5 w-5 items-center justify-center">
                              <img src={GDriveLogo} alt="" />
              </div>
              <span className="relative z-10 bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-transparent">
                Import from Google
              </span>
            </button>

            <button
              onClick={onImportDropbox}
              className="group   relative inline-flex h-11 items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-secondary/30 px-4 text-sm font-medium text-foreground/90 shadow-sm backdrop-blur-md transition-all duration-300 hover:scale-104 cursor-pointer active:scale-[0.98]"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-background shadow-sm ring-1 ring-border/50 transition-all duration-300 group-hover:ring-[#0061FF]/40 group-hover:shadow-[0_0_12px_-3px_#0061FF]">
              <img src={dropboxLogo} alt="" />
              </div>
              <span className="relative z-10">Import from Dropbox</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


/* ───────────────────────── Analytics ───────────────────────── */

const WEEKLY_DATA = {
  uploads: {
    label: "Uploads",
    title: "Weekly Uploads",
    change: null,
    rawValues: [0, 0, 0, 0, 0, 0, 0],
    suffix: "uploads",
  },
  opened: {
    label: "Opened",
    title: "Weekly Opens",
    change: null,
    rawValues: [0, 0, 0, 0, 0, 0, 0],
    suffix: "files",
  },
  downloads: {
    label: "Downloads",
    title: "Weekly Downloads",
    change: null,
    rawValues: [0, 0, 0, 0, 0, 0, 0],
    suffix: "files",
  },
};

function AnalyticsCard() {
  const [metric, setMetric] = useState("uploads");
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const chartRef = useRef(null);
  const [statsData, setStatsData] = useState(null);

  useEffect(() => {
    let active = true;
    getActivityStats()
      .then((res) => {
        if (active && res?.stats?.weeklyData) {
          setStatsData(res.stats.weeklyData);
        }
      })
      .catch((err) => {
        console.error("Failed to load activity stats:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (chartRef.current && !chartRef.current.contains(e.target)) {
        setHoveredIdx(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  const activeWeeklyData = statsData || WEEKLY_DATA;
  const activeData = activeWeeklyData[metric];

  const labels = useMemo(() => {
    if (!statsData) {
      return ["M", "T", "W", "T", "F", "S", "S"];
    }
    const days = [];
    const date = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(date);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString("en-US", { weekday: "narrow" });
      days.push(dayStr);
    }
    return days;
  }, [statsData]);

  const dayNames = useMemo(() => {
    if (!statsData) {
      return [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
    }
    const names = [];
    const date = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(date);
      d.setDate(d.getDate() - i);
      const nameStr = d.toLocaleDateString("en-US", { weekday: "long" });
      names.push(nameStr);
    }
    return names;
  }, [statsData]);

  const maxVal = Math.max(...activeData.rawValues);

  const totalValue = activeData.rawValues.reduce((sum, val) => sum + val, 0);
  const totalText = `${totalValue} ${activeData.suffix}`;

  // SVG Chart layout mapping
  const chartHeight = 110;
  const chartWidth = 500;
  const paddingX = 20;

  // Map 7 values to coordinate points
  const points = activeData.rawValues.map((v, i) => {
    const x = paddingX + (i / 6) * (chartWidth - paddingX * 2);
    const ratio = maxVal > 0 ? v / maxVal : 0;
    const y = chartHeight - ratio * chartHeight;
    return { x, y, value: v, label: labels[i], dayName: dayNames[i] };
  });

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp1y = p0.y;
      const cp2x = p0.x + (2 * (p1.x - p0.x)) / 3;
      const cp2y = p1.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [points]);

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
      : "";

  return (
    <div
      className={`${card} p-6 animate-fade-in relative overflow-hidden group/card`}
    >
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
                {activeData.rawValues[hoveredIdx]} {metric} on{" "}
                {dayNames[hoveredIdx]}
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

        <div className="flex rounded-xl border border-border/80 bg-secondary/30 p-0.5 self-start sm:self-center">
          {Object.keys(activeWeeklyData).map((key) => {
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
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-all duration-300",
                    isSelected
                      ? "bg-primary shadow-glow"
                      : "bg-muted-foreground/40",
                  )}
                />
                {activeWeeklyData[key].label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={chartRef}
        className="relative mt-10 h-44 grid grid-cols-[2.5rem_1fr] items-start z-10"
      >
        <div className="h-[110px] flex flex-col justify-between text-[10px] font-semibold tracking-wider font-mono text-muted-foreground/50 pr-2.5 text-right pointer-events-none select-none">
          {[maxVal, Math.round(maxVal / 2), 0].map((tick, i) => (
            <span key={i} className="leading-none">
              {tick}
            </span>
          ))}
        </div>

        <div className="h-full flex flex-col relative">
          <div className="relative h-[110px] w-full">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              className="overflow-visible"
            >
              <defs>
                <linearGradient
                  id="chart-area-grad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--primary)"
                    stopOpacity="0.2"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--primary)"
                    stopOpacity="0.0"
                  />
                </linearGradient>

                <linearGradient
                  id="chart-line-grad"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
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

          <div className="relative h-6 mt-4 border-t border-border/30 pt-2 pointer-events-none select-none">
            {labels.map((lbl, idx) => {
              const xPos =
                ((paddingX + (idx / 6) * (chartWidth - paddingX * 2)) /
                  chartWidth) *
                100;
              return (
                <span
                  key={idx}
                  style={{ left: `${xPos}%` }}
                  className={cn(
                    "absolute -translate-x-1/2 text-[10px] font-bold tracking-wider transition-colors duration-200 text-center leading-none",
                    hoveredIdx === idx
                      ? "text-foreground"
                      : "text-muted-foreground/40",
                  )}
                >
                  {lbl}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Home page ───────────────────────── */

export default function Home() {
  const { userProfile } = useOutletContext?.() || {};
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isDropboxModalOpen, setIsDropboxModalOpen] = useState(false);

  // Check URL params for ?google=connected or ?dropbox=connected
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      setIsGoogleModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get("dropbox") === "connected") {
      setIsDropboxModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <>
      <HeroSection
        userProfile={userProfile}
        onImportGoogle={() => setIsGoogleModalOpen(true)}
        onImportDropbox={() => setIsDropboxModalOpen(true)}
      />

      <div className="lg:col-span-2 space-y-6">
        <AnalyticsCard />
        <RecentFilesView fetchFn={listActivities} titleId="recent-files-heading" limit={10} />
      </div>

      <GoogleDriveModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        currentDirId={null}
        userProfile={userProfile}
      />

      <DropboxModal
        isOpen={isDropboxModalOpen}
        onClose={() => setIsDropboxModalOpen(false)}
        currentDirId={null}
        userProfile={userProfile}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground/80 pt-2">
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
