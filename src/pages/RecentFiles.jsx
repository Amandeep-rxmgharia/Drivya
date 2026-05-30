import { useState, useMemo } from "react";
import { AnimatePresence } from "motion/react";
import { motion } from "motion/react";
import {
  Clock,
  Eye,
  LayoutGrid,
  List,
  Search,
  TrendingUp,
  Upload,
  FileStack,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  card,
  subtleHover,
  chip,
} from "@/components/dashboard/dashboard-tokens";
import { RecentTimeline } from "@/components/recent/RecentTimeline";
import { FilePreviewModal } from "@/components/recent/FilePreviewModal";

/* ───────────────────────── Mock data ───────────────────────── */

const RECENT_FILES = [
  // Today – opened
  {
    id: "r1",
    name: "Brand Guidelines v3.pdf",
    size: "4.2 MB",
    lastOpened: new Date(Date.now() - 12 * 60 * 1000),
    type: "opened",
    owner: "Amelia M.",
    starred: true,
    shared: true,
    kind: "pdf",
  },
  {
    id: "r2",
    name: "Q4-keynote-final.pptx",
    size: "18.6 MB",
    lastOpened: new Date(Date.now() - 45 * 60 * 1000),
    type: "opened",
    owner: "Amelia M.",
    kind: "document",
  },
  {
    id: "r3",
    name: "Hero-shot-005.png",
    size: "8.1 MB",
    lastOpened: new Date(Date.now() - 2 * 60 * 60 * 1000),
    type: "uploaded",
    uploadStatus: "complete",
    owner: "Amelia M.",
    starred: true,
    kind: "image",
  },
  {
    id: "r4",
    name: "api-routes.ts",
    size: "24 KB",
    lastOpened: new Date(Date.now() - 3 * 60 * 60 * 1000),
    type: "uploaded",
    uploadStatus: "uploading",
    uploadProgress: 72,
    owner: "Dev Team",
    kind: "code",
  },

  // Yesterday
  {
    id: "r5",
    name: "investor-deck.key",
    size: "12.4 MB",
    lastOpened: new Date(Date.now() - 26 * 60 * 60 * 1000),
    type: "opened",
    owner: "Maya P.",
    shared: true,
    kind: "document",
  },
  {
    id: "r6",
    name: "podcast-ep12.mp3",
    size: "48 MB",
    lastOpened: new Date(Date.now() - 28 * 60 * 60 * 1000),
    type: "uploaded",
    uploadStatus: "complete",
    owner: "Marketing",
    kind: "audio",
  },
  {
    id: "r7",
    name: "Design System",
    size: "248 items",
    lastOpened: new Date(Date.now() - 30 * 60 * 60 * 1000),
    type: "opened",
    owner: "Team",
    kind: "folder",
    shared: true,
  },

  // This week
  {
    id: "r8",
    name: "launch-assets",
    size: "1.2 GB",
    lastOpened: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    type: "opened",
    owner: "Design",
    kind: "folder",
  },
  {
    id: "r9",
    name: "client-archives.zip",
    size: "640 MB",
    lastOpened: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    type: "uploaded",
    uploadStatus: "complete",
    owner: "Amelia M.",
    kind: "archive",
  },
  {
    id: "r10",
    name: "onboarding-video.mp4",
    size: "256 MB",
    lastOpened: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000),
    type: "uploaded",
    uploadStatus: "failed",
    owner: "HR Team",
    kind: "video",
  },
  {
    id: "r11",
    name: "financial-report-Q3.xlsx",
    size: "2.8 MB",
    lastOpened: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    type: "opened",
    owner: "Finance",
    kind: "document",
    starred: true,
  },

  // Earlier
  {
    id: "r12",
    name: "app-mockup-v2.fig",
    size: "34 MB",
    lastOpened: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    type: "opened",
    owner: "Design",
    kind: "image",
    shared: true,
  },
  {
    id: "r13",
    name: "team-photo-2026.jpg",
    size: "5.6 MB",
    lastOpened: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    type: "uploaded",
    uploadStatus: "complete",
    owner: "Amelia M.",
    kind: "image",
  },
];

/* ───────────────────────── Helpers ───────────────────────── */

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

/* ───────────────────────── Stats row (matches SharedFiles StatMini) ───────────────────────── */

function StatMini({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border shrink-0",
          accent
            ? "border-accent/20 bg-accent/10 text-accent"
            : "border-primary/20 bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-lg font-semibold tracking-tight text-foreground tabular-nums leading-none">
          {value}
        </div>
        <div className="text-[10px] font-medium text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function StatsRow() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatMini icon={Eye} label="Opened today" value="12" />
      <StatMini icon={Upload} label="Uploaded today" value="5" />
      <StatMini icon={TrendingUp} label="This week" value="48" />
      <StatMini icon={Zap} label="Avg. per day" value="8.4" accent />
    </div>
  );
}

/* ───────────────────────── Main Page ───────────────────────── */

export default function RecentFiles() {
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
      {/* Page header */}
      <section className={`${card} ${subtleHover} relative overflow-hidden p-6 md:p-10 animate-fade-in`}>
        {/* ambient glows */}
        <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-ambient-primary blur-3xl opacity-80 pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-ambient-primary blur-3xl opacity-50 pointer-events-none" />

        <div className="relative flex flex-col gap-8">
          <div className="max-w-xl">
            <div className={chip}>
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
              All activity tracked
            </div>
            <h1 className="mt-5 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-foreground">
              Recent <span className="text-gradient">Activity</span>
            </h1>
            <p className="mt-3 text-muted-foreground leading-relaxed max-w-lg">
              Files you've opened and uploaded recently. You have{" "}
              <span className="font-semibold text-foreground">{filteredFiles.length} recent files</span>{" "}
              across your activity history.
            </p>
          </div>

          {/* stat row */}
          <StatsRow />
        </div>
      </section>

      {/* Main content card */}
      <section
        className={cn(card, "overflow-hidden animate-fade-in")}
        aria-labelledby="recent-heading"
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
