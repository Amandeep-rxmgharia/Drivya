import { useState, useMemo, useCallback, useEffect, memo, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpDown,
  ChevronDown,
  Code2,
  Download,
  Eye,
  FileStack,
  FileText,
  Film,
  Folder,
  Image,
  LayoutGrid,
  List,
  Search,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Undo2,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { easeSmooth } from "@/lib/motion-presets";
import { detectFileKind } from "@/lib/file-types";
import { FileTypeIcon } from "@/components/dashboard/FileTypeIcon";
import {
  card,
  subtleHover,
  chip,
} from "@/components/dashboard/dashboard-tokens";
import { FilePreviewModal } from "@/components/recent/FilePreviewModal";
import { ShareModal } from "@/components/dashboard/ShareModal";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import {
  listStarred,
  toggleStar as toggleStarApi,
  unstarAll as unstarAllApi,
} from "../../api/starred.js";
import { downloadFile } from "../../api/drive.js";
import { useOutletContext } from "react-router-dom";

/* ───────────────────────── Mock Data ───────────────────────── */

const STARRED_FILES = [];

/* ───────────────────────── Helpers ───────────────────────── */

function formatRelativeTime(date) {
  console.log(date);
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

function formatBytes(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

const CATEGORY_MAP = {
  Documents: ["pdf", "document"],
  Images: ["image"],
  Media: ["audio", "video"],
  Code: ["code"],
  Folders: ["folder"],
  Other: ["archive", "file"],
};

const CATEGORY_ICONS = {
  Documents: FileText,
  Images: Image,
  Media: Film,
  Code: Code2,
  Folders: Folder,
  Other: FileStack,
};

function getCategoryForKind(kind) {
  for (const [cat, kinds] of Object.entries(CATEGORY_MAP)) {
    if (kinds.includes(kind)) return cat;
  }
  return "Other";
}

const FILTER_TABS = [
  { id: "all", label: "All", icon: Star },
  { id: "Documents", label: "Documents", icon: FileText },
  { id: "Images", label: "Images", icon: Image },
  { id: "Media", label: "Media", icon: Film },
  { id: "Code", label: "Code", icon: Code2 },
];

const SORT_OPTIONS = [
  { id: "starred", label: "Date Starred" },
  { id: "name", label: "Name" },
  { id: "size", label: "Size" },
  { id: "type", label: "Type" },
];

const rowEase = "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

/* ───────────────────────── Stats ───────────────────────── */

const StatMini = memo(function StatMini({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1.5 sm:gap-3 rounded-xl border border-border/60 bg-secondary/30 px-2 py-2.5 sm:px-4 sm:py-3">
      <div
        className={cn(
          "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border shrink-0",
          accent
            ? "border-accent/20 bg-accent/10 text-accent"
            : "border-primary/20 bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-sm sm:text-lg font-semibold tracking-tight text-foreground tabular-nums leading-none">
          {value}
        </div>
        <div className="text-[9px] sm:text-[10px] font-medium text-muted-foreground mt-0.5 sm:mt-1">
          {label}
        </div>
      </div>
    </div>
  );
});

/* ───────────────────────── Hero ───────────────────────── */

function StarredHero({ files }) {
  const totalStarred = files.length;
  const sharedCount = files.filter((f) => f.shared).length;
  const recentCount = files.filter(
    (f) => Date.now() - f.starredAt.getTime() < 7 * 24 * 60 * 60 * 1000,
  ).length;

  return (
    <section
      className={`${card} ${subtleHover} relative overflow-hidden p-5 sm:p-6 md:p-10 animate-fade-in`}
    >
      {/* ambient glows */}
      <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-ambient-primary blur-3xl opacity-80 pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-ambient-primary blur-3xl opacity-50 pointer-events-none" />

      <div className="relative flex flex-col gap-6 sm:gap-8">
        <div className="max-w-xl">
          <div className={chip}>
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            Your favorites
          </div>
          <h1 className="mt-4 sm:mt-5 font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-foreground">
            Starred <span className="text-gradient">Files</span>
          </h1>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg">
            Quick access to your most important files. You have{" "}
            <span className="font-semibold text-foreground">
              {totalStarred} starred items
            </span>
            .
          </p>
        </div>

        {/* stat row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatMini icon={Star} label="Total Starred" value={totalStarred} />
          <StatMini icon={Share2} label="Shared" value={sharedCount} />
          <StatMini
            icon={Sparkles}
            label="Added this week"
            value={recentCount}
            accent
          />
        </div>
      </div>
    </section>
  );
}

/* PinnedCollections removed — single-user, no collections */

/* ───────────────────────── Undo Toast ───────────────────────── */

function UndoToast({ file, onUndo, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-elegant border border-border/60 bg-background/90 dark:bg-card/90 backdrop-blur-xl text-sm font-medium text-foreground pointer-events-auto"
    >
      <Star className="h-4 w-4 text-muted-foreground" />
      <span>
        Removed <span className="font-semibold">{file.name}</span> from starred
      </span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
      >
        <Undo2 className="h-3 w-3" />
        Undo
      </button>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>,
    document.body,
  );
}

/* ───────────────────────── File Actions Toolbar ───────────────────────── */

function FileActions({ file, visible, compact, onStar, onPreview, onShare, onDownload }) {
  const stop = (e) => e.stopPropagation();
  const btn =
    "inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

  return (
    <div
      role="toolbar"
      aria-label="File actions"
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-border bg-background/80 p-0.5 backdrop-blur-sm",
        "transition-all duration-200",
        visible
          ? "opacity-100"
          : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
        compact ? "" : "max-md:opacity-100 max-md:pointer-events-auto",
      )}
      onClick={stop}
      onKeyDown={stop}
    >
      <button
        type="button"
        className={cn(btn, "text-amber-600 dark:text-amber-400")}
        title="Unstar"
        onClick={() => onStar?.(file.id)}
      >
        <Star className="h-3.5 w-3.5 fill-current" />
      </button>
      <button
        type="button"
        className={cn(btn, "hover:text-primary")}
        title="Quick preview"
        onClick={() => onPreview?.(file)}
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn}
        title="Share"
        onClick={() => onShare?.(file)}
      >
        <Share2 className="h-3.5 w-3.5" />
      </button>
      {file.resourceType === "file" && (
        <button
          type="button"
          className={btn}
          title="Download"
          onClick={() => onDownload?.(file.id, file.name)}
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      )}
      {!compact && (
        <button
          type="button"
          className={cn(btn, "hover:text-destructive")}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── Starred File Row ───────────────────────── */

function StarredFileRow({ file, view, onStar, onPreview, onShare, onDownload }) {
  const [hovered, setHovered] = useState(false);
  const { ref: revealRef, isVisible } = useScrollReveal();
  const kind = detectFileKind(file.name, file.resourceType === "directory" ? "folder" : file.mimeType);
  const isGrid = view === "grid";

  if (isGrid) {
    return (
      <article
        ref={revealRef}
        role="listitem"
        className={cn("group", "min-w-0")}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.35s ease-out, transform 0.35s ease-out",
          willChange: isVisible ? "auto" : "opacity, transform",
        }}
      >
        <div
          className={cn(
            "relative w-full text-left rounded-xl border outline-none",
            "bg-card border-border shadow-sm dark:bg-card/50 dark:backdrop-blur-sm dark:shadow-none",
            rowEase,
            "transition-[transform,box-shadow,border-color,background-color]",
            hovered && [
              "-translate-y-px border-primary/25 bg-secondary/60",
              "shadow-sm dark:shadow-[0_8px_24px_-12px_rgba(59,130,246,0.2)]",
            ],
            "flex h-full flex-col p-4",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <FileTypeIcon kind={kind} />
            <FileActions
              file={file}
              visible={hovered}
              compact
              onStar={onStar}
              onPreview={onPreview}
              onShare={onShare}
              onDownload={onDownload}
            />
          </div>

          <div className="mt-3 min-w-0 flex-1 space-y-1.5">
            <h4 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground">
              {file.name}
            </h4>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {file.resourceType === "file" ? formatBytes(file.size) : ""}
            </p>
          </div>

          {/* Bottom badges & time */}
          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/50">
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
              <Star className="h-2.5 w-2.5 fill-current" /> Starred
            </span>
            {file.shared && (
              <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/25 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                <Share2 className="h-2.5 w-2.5" /> Shared
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center text-[10px] text-muted-foreground">
            <Star className="h-3 w-3 mr-1 text-amber-500/60" />
            {formatRelativeTime(file.starredAt)}
          </div>
        </div>
      </article>
    );
  }

  // List view
  return (
    <article
      ref={revealRef}
      role="listitem"
      className={cn("group", "px-1 sm:px-2")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.35s ease-out, transform 0.35s ease-out",
        willChange: isVisible ? "auto" : "opacity, transform",
      }}
    >
      <div
        className={cn(
          "relative w-full text-left rounded-xl border outline-none",
          "bg-card border-border shadow-sm dark:bg-card/50 dark:backdrop-blur-sm dark:shadow-none",
          rowEase,
          "transition-[transform,box-shadow,border-color,background-color]",
          hovered && [
            "-translate-y-px border-primary/25 bg-secondary/60",
            "shadow-sm dark:shadow-[0_8px_24px_-12px_rgba(59,130,246,0.2)]",
          ],
          "p-3.5 sm:p-4",
        )}
      >
        <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-6">
          <div className="flex min-w-0 items-start gap-3 sm:items-center md:grid md:grid-cols-[minmax(0,1fr)_6rem_4.5rem] md:gap-8 lg:gap-11">
            {/* Name + icon */}
            <div className="flex min-w-0 items-center gap-3">
              <FileTypeIcon kind={kind} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate text-sm font-semibold text-foreground sm:text-[15px]">
                    {file.name}
                  </h4>
                  <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                    <Star className="h-2.5 w-2.5 fill-current" /> Starred
                  </span>
                  {file.shared && (
                    <span className="inline-flex items-center gap-0.5 rounded-md border border-violet-500/25 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                      <Share2 className="h-2.5 w-2.5" /> Shared
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground md:hidden">
                  {formatRelativeTime(file.starredAt)} · {file.resourceType === "file" ? formatBytes(file.size) : ""}
                </p>
              </div>
            </div>

            {/* Starred date */}
            <div className="hidden md:flex md:items-center text-left text-sm tabular-nums text-muted-foreground">
              {formatRelativeTime(file.starredAt)}
            </div>

            {/* Size */}
            <div className="hidden md:flex md:items-center md:justify-start text-right text-sm font-medium tabular-nums text-foreground/80">
              {file.resourceType === "file" ? formatBytes(file.size) : ""}
            </div>
          </div>

          {/* Actions column */}
          <div className="flex items-center justify-between gap-3 md:justify-end md:w-36 md:pr-1">
            <FileActions
              file={file}
              visible={hovered}
              onStar={onStar}
              onPreview={onPreview}
              onShare={onShare}
              onDownload={onDownload}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

/* ───────────────────────── Category Group ───────────────────────── */

function CategoryGroup({
  category,
  files,
  view,
  index,
  onStar,
  onPreview,
  onShare,
  onDownload,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const CatIcon = CATEGORY_ICONS[category] || FileStack;
  const isGrid = view === "grid";

  return (
    <div
      className="animate-fade-in"
      style={{
        animationDelay: `${0.05 + index * 0.05}s`,
        animationFillMode: "both",
      }}
    >
      {/* Group header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-secondary/50">
          <CatIcon className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          {category}
        </span>
        <span className="rounded-md bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {files.length}
        </span>
        <div className="flex-1" />
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            collapsed && "-rotate-90",
          )}
        />
      </button>

      {/* List column headings (only in list view) */}
      {!collapsed && !isGrid && (
        <div className="hidden md:grid md:grid-cols-[1fr_auto] gap-10 border-b border-border/60 px-5 py-2 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_6rem_4.5rem] gap-8 lg:gap-11 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span className="pl-5">Name</span>
            <span>Starred</span>
            <span>Size</span>
          </div>
          <span className="w-36 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground pr-1">
            Actions
          </span>
        </div>
      )}

      {/* Files */}
      {!collapsed && (
        <div
          className={cn(
            "px-4 sm:px-4 pb-4",
            isGrid
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              : "flex flex-col gap-2",
          )}
          role="list"
        >
          {files.map((file) => (
            <StarredFileRow
              key={file.id}
              file={file}
              view={view}
              onStar={onStar}
              onPreview={onPreview}
              onShare={onShare}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Empty State ───────────────────────── */

function EmptyState({ hasFilters }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
          <Star className="h-7 w-7 text-amber-500" />
        </div>
        <motion.div
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="h-3 w-3 text-amber-500" />
        </motion.div>
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
        {hasFilters ? "No matching starred files" : "No starred files yet"}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm leading-relaxed">
        {hasFilters
          ? "Try adjusting your filters or search to find what you're looking for."
          : "Star files from any view to quickly access them here. Your most important files, always one click away."}
      </p>
    </div>
  );
}

/* ───────────────────────── Main Page ───────────────────────── */

export default function StarredFiles() {
  const { setIsOutletLoading } = useOutletContext?.() || {};
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (setIsOutletLoading) {
      setIsOutletLoading(loading);
    }
    return () => {
      if (setIsOutletLoading) setIsOutletLoading(false);
    };
  }, [loading, setIsOutletLoading]);
  const [error, setError] = useState(null);

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("starred");
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState("grid");

  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  const fetchStarred = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listStarred();
      const parsedStarred = (res.starred || []).map((item) => ({
        ...item,
        starredAt: new Date(item.starredAt),
      }));
      setFiles(parsedStarred);
    } catch (err) {
      console.error("Failed to fetch starred files:", err);
      setError(err.response?.data?.message || "Failed to load starred files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStarred();
  }, []);

  useEffect(() => {
    if (!filterDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterDropdownOpen]);

  const activeTab = FILTER_TABS.find((t) => t.id === activeFilter) || FILTER_TABS[0];
  const ActiveTabIcon = activeTab.icon;
  const [previewFile, setPreviewFile] = useState(null);
  const [sharingFile, setSharingFile] = useState(null);
  const [undoFile, setUndoFile] = useState(null);

  const handleUnstar = useCallback(
    async (id) => {
      const file = files.find((f) => f.id === id);
      if (!file) return;

      try {
        await toggleStarApi(file.resourceType, id);
        setUndoFile(file);
        setFiles((prev) => prev.filter((f) => f.id !== id));
      } catch (err) {
        console.error("Failed to unstar:", err);
      }
    },
    [files],
  );

  const handleUndo = useCallback(async () => {
    if (!undoFile) return;
    try {
      await toggleStarApi(undoFile.resourceType, undoFile.id);
      setFiles((prev) => {
        const newList = [...prev, undoFile];
        newList.sort((a, b) => b.starredAt - a.starredAt);
        return newList;
      });
      setUndoFile(null);
    } catch (err) {
      console.error("Failed to undo unstar:", err);
    }
  }, [undoFile]);

  const handleDismissUndo = useCallback(() => {
    setUndoFile(null);
  }, []);

  const handleShare = useCallback((file) => {
    setSharingFile(file);
  }, []);

  const handleShareUpdated = useCallback((id, isShared) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, shared: isShared } : f)),
    );
    fetchStarred()
  }, []);

  const handlePreview = useCallback((file) => {
    setPreviewFile(file);
  }, []);

  const handleDownload = useCallback(async (fileId, fileName) => {
    try {
      await downloadFile(fileId, fileName);
    } catch (err) {
      console.error("Download failed:", err);
    }
  }, []);

  // Filtered & sorted files
  const filteredFiles = useMemo(() => {
    let list = [...files];

    // Filter by category
    if (activeFilter !== "all") {
      list = list.filter((f) => {
        const kind = detectFileKind(f.name, f.resourceType === "directory" ? "folder" : f.mimeType);
        return getCategoryForKind(kind) === activeFilter;
      });
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") {
        const sa = a.size || 0;
        const sb = b.size || 0;
        return sa - sb;
      }
      if (sortBy === "type") {
        const ka = detectFileKind(a.name, a.resourceType === "directory" ? "folder" : a.mimeType);
        const kb = detectFileKind(b.name, b.resourceType === "directory" ? "folder" : b.mimeType);
        return ka.localeCompare(kb);
      }
      // Default: date starred (newest first)
      return b.starredAt - a.starredAt;
    });

    return list;
  }, [files, activeFilter, searchQuery, sortBy]);

  // Group by category
  const grouped = useMemo(() => {
    const order = ["Documents", "Images", "Media", "Code", "Other"];
    const groups = {};

    filteredFiles.forEach((file) => {
      const kind = detectFileKind(file.name, file.resourceType === "directory" ? "folder" : file.mimeType);
      const cat = getCategoryForKind(kind);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(file);
    });

    return order
      .filter((cat) => groups[cat])
      .map((cat) => ({ category: cat, files: groups[cat] }));
  }, [filteredFiles]);

  const hasFilters = activeFilter !== "all" || searchQuery.trim() !== "";

  return (
    <>
      {/* Hero */}
      <StarredHero files={files} />

      {/* Main content card */}
      <section
        className={cn(card, "overflow-hidden animate-fade-in")}
        aria-labelledby="starred-heading"
        style={{ animationDelay: "0.1s", animationFillMode: "both" }}
      >
        {/* Toolbar */}
        <header className="border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Top row: filter tabs (horizontally scrollable on mobile) */}
            <div className="flex items-center justify-between gap-3 w-full">
              {/* Mobile/Tablet view: Dropdown */}
              <div className="relative lg:hidden" ref={filterDropdownRef}>
                <button
                  type="button"
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  aria-expanded={filterDropdownOpen}
                >
                  <ActiveTabIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{activeTab?.label || "All"}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform text-muted-foreground",
                      filterDropdownOpen && "rotate-180"
                    )}
                  />
                </button>
                {filterDropdownOpen && (
                  <div className="absolute left-0 z-30 mt-2 min-w-[160px] rounded-xl border border-border bg-popover p-1 shadow-elegant animate-fade-in">
                    {FILTER_TABS.map((tab) => {
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveFilter(tab.id);
                            setFilterDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 cursor-pointer",
                            activeFilter === tab.id
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                          )}
                        >
                          <TabIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Desktop view: Tabs */}
              <div className="hidden lg:block -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide w-fit">
                <div
                  className="flex rounded-xl border border-border bg-secondary/40 p-0.5 w-max sm:w-auto"
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
                        "inline-flex items-center gap-1 sm:gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-all duration-200 whitespace-nowrap",
                        activeFilter === tab.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <tab.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="hidden xs:inline sm:inline">
                        {tab.label}
                      </span>
                      <span className="xs:hidden sm:hidden">
                        {tab.id === "all" ? "All" : tab.label.slice(0, 3)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom row: search, sort, view */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-0 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search starred..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full sm:w-44 rounded-xl border border-border bg-secondary/30 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Sort */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortOpen((o) => !o)}
                  className="inline-flex h-9 items-center gap-1.5 sm:gap-2 rounded-xl border border-border bg-secondary/40 px-2.5 sm:px-3 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  aria-expanded={sortOpen}
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">
                    {SORT_OPTIONS.find((s) => s.id === sortBy)?.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      sortOpen && "rotate-180",
                    )}
                  />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 z-20 mt-2 min-w-[140px] rounded-xl border border-border bg-popover p-1 shadow-elegant animate-fade-in">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSortBy(opt.id);
                          setSortOpen(false);
                        }}
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          sortBy === opt.id
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
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

        {/* Category groups */}
        <div className="divide-y divide-border/60">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading starred items...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="h-12 w-12 rounded-xl border border-destructive/30 bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h4 className="font-display text-base font-semibold text-foreground">Something went wrong</h4>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm">{error}</p>
              <button
                type="button"
                onClick={fetchStarred}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 h-9 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
            </div>
          ) : grouped.length === 0 ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            grouped.map((group, gi) => (
              <CategoryGroup
                key={group.category}
                category={group.category}
                files={group.files}
                view={view}
                index={gi}
                onStar={handleUnstar}
                onPreview={handlePreview}
                onShare={handleShare}
                onDownload={handleDownload}
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
            onClose={() => setPreviewFile(null)}
            formatTime={formatRelativeTime}
            onStar={handleUnstar}
            onShare={handleShare}
          />
        )}
      </AnimatePresence>

      {/* Share modal */}
      <AnimatePresence>
        {sharingFile && (
          <ShareModal
            file={files.find((f) => f.id === sharingFile.id) || sharingFile}
            onClose={() => setSharingFile(null)}
            onShareUpdated={handleShareUpdated}
          />
        )}
      </AnimatePresence>

      {/* Undo toast */}
      <AnimatePresence>
        {undoFile && (
          <UndoToast
            file={undoFile}
            onUndo={handleUndo}
            onClose={handleDismissUndo}
          />
        )}
      </AnimatePresence>
    </>
  );
}
