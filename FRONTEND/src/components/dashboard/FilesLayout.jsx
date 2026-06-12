import { useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  FileStack,
  FolderOpen,
  Home,
  LayoutGrid,
  List,
  UploadCloud,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { easeSmooth } from "@/lib/motion-presets";
import { FileRow } from "./FileRow";
import { ShareModal } from "./ShareModal";

const card = "rounded-2xl glass shadow-elegant";

const SORT_OPTIONS = [
  { id: "name", label: "Name" },
  { id: "modified", label: "Modified" },
  { id: "size", label: "Size" },
];

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "folders", label: "Folders" },
  { id: "files", label: "Files" },
];

/**
 * Format bytes into human-readable size.
 */
function formatSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

/**
 * Format a Date/ISO string to a readable date.
 */
function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Normalize backend directory/file data into the shape FileRow expects.
 */
function normalizeItems(directories = [], files = []) {
  const dirs = directories.map((d) => ({
    id: d._id,
    name: d.name,
    size: "",
    modifiedAt: formatDate(d.updatedAt),
    kind: "folder",
    isDirectory: true,
    _raw: d,
  }));

  const fls = files.map((f) => ({
    id: f._id,
    name: f.originalName,
    size: formatSize(f.size),
    rawSize: f.size,
    modifiedAt: formatDate(f.updatedAt),
    kind: undefined, // auto-detect from filename
    isDirectory: false,
    mimeType: f.mimeType,
    _raw: f,
  }));

  return [...dirs, ...fls];
}

export function FilesLayout({
  layoutHeader = "My Drive",
  directories = [],
  files = [],
  breadcrumb = [],
  currentDir = null,
  isLoading = false,
  error = null,
  currentDirId = null,
  onNavigate,
  onBreadcrumbNav,
  onRefresh,
  onDownload,
  onTrashFile,
  onDeleteDir,
  onRenameDir,
  onRenameFile,
  className,
}) {
  const allItems = useMemo(
    () => normalizeItems(directories, files),
    [directories, files],
  );

  const [selectedId, setSelectedId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [starred, setStarred] = useState({});
  const [sharingFile, setSharingFile] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("grid");
  const [sortOpen, setSortOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Reset selection when directory changes
  useEffect(() => {
    setSelectedId(null);
    setActiveId(null);
  }, [currentDirId]);

  // Filter & sort
  const visibleFiles = useMemo(() => {
    let list = [...allItems];
    if (filter === "folders") list = list.filter((f) => f.isDirectory);
    if (filter === "files") list = list.filter((f) => !f.isDirectory);

    list.sort((a, b) => {
      // Always put directories first
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") return (a.rawSize || 0) - (b.rawSize || 0);
      // modified
      return (
        new Date(b._raw?.updatedAt || 0) - new Date(a._raw?.updatedAt || 0)
      );
    });

    return list;
  }, [allItems, filter, sortBy]);

  const handleItemClick = useCallback(
    (id) => {
      const item = allItems.find((f) => f.id === id);
      if (item?.isDirectory && onNavigate) {
        onNavigate(id);
      } else {
        setSelectedId(id);
        setActiveId(id);
      }
    },
    [allItems, onNavigate],
  );

  const handleDownload = useCallback(
    (id) => {
      const file = allItems.find((f) => f.id === id);
      if (file && !file.isDirectory && onDownload) {
        onDownload(id, file.name);
        setToastMessage(`Downloading "${file.name}"...`);
      }
    },
    [allItems, onDownload],
  );

  const handleDelete = useCallback(
    (id) => {
      const item = allItems.find((f) => f.id === id);
      if (!item) return;

      if (item.isDirectory) {
        onDeleteDir?.(id);
        setToastMessage(`Folder "${item.name}" deleted.`);
      } else {
        onTrashFile?.(id);
        setToastMessage(`"${item.name}" moved to Trash.`);
      }

      if (selectedId === id) setSelectedId(null);
    },
    [allItems, onDeleteDir, onTrashFile, selectedId],
  );

  const handleCopyLink = useCallback(
    (id) => {
      const file = allItems.find((f) => f.id === id);
      if (file) {
        const mockLink = `https://drivya.com/s/${file.id}`;
        navigator.clipboard
          .writeText(mockLink)
          .then(() =>
            setToastMessage(
              `Link for "${file.name}" copied to clipboard!`,
            ),
          )
          .catch(() =>
            setToastMessage(`Failed to copy link for "${file.name}".`),
          );
      }
    },
    [allItems],
  );

  const handleRename = useCallback(
    async (id, newName) => {
      const item = allItems.find((f) => f.id === id);
      if (!item) return;

      try {
        if (item.isDirectory) {
          await onRenameDir?.(id, newName);
          setToastMessage(`Folder renamed to "${newName}".`);
        } else {
          await onRenameFile?.(id, newName);
          setToastMessage(`File renamed to "${newName}".`);
        }
      } catch (err) {
        const msg = err?.response?.data?.message || "Rename failed.";
        setToastMessage(msg);
        throw err;
      }
    },
    [allItems, onRenameDir, onRenameFile],
  );

  const toggleStar = (id) => {
    setStarred((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShare = (id) => {
    const file = allItems.find((f) => f.id === id);
    if (file) setSharingFile(file);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const shortcutsEnabled =
        localStorage.getItem("drivya-shortcuts") !== "false";
      if (!shortcutsEnabled) return;

      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      )
        return;

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();

      if (isCmdOrCtrl && !isShift && key === "d") {
        if (selectedId) {
          e.preventDefault();
          handleDownload(selectedId);
        }
        return;
      }

      if (isCmdOrCtrl && isShift && key === "c") {
        if (selectedId) {
          e.preventDefault();
          handleCopyLink(selectedId);
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          handleDelete(selectedId);
        }
      }

      if (key === "f2") {
        if (selectedId) {
          e.preventDefault();
          // Dispatch a custom event that FileRow listens to for rename
          window.dispatchEvent(
            new CustomEvent("trigger-rename", { detail: { id: selectedId } }),
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, handleDownload, handleCopyLink, handleDelete, handleRename]);

  const isGrid = view === "grid";

  // ─── Breadcrumb ──────────────────────────────────────────────
  const renderBreadcrumb = () => {
    if (!breadcrumb || breadcrumb.length === 0) return null;

    return (
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm flex-wrap"
      >
        <button
          type="button"
          onClick={() => onBreadcrumbNav?.(null, true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors font-medium"
        >
          <Home className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">My Drive</span>
        </button>

        {breadcrumb.slice(1).map((dir, i) => {
          const isLast = i === breadcrumb.length - 2;
          return (
            <div key={dir._id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <button
                type="button"
                onClick={() => !isLast && onBreadcrumbNav?.(dir._id, false)}
                className={cn(
                  "rounded-lg px-2 py-1 transition-colors font-medium",
                  isLast
                    ? "text-foreground cursor-default"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                )}
              >
                {dir.name}
              </button>
            </div>
          );
        })}
      </nav>
    );
  };

  return (
    <section
      className={cn(card, "overflow-hidden animate-fade-in", className)}
      aria-labelledby="files-heading"
    >
      <header className="border-b border-border px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-secondary/50 text-primary">
                <FileStack className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Library
              </span>
            </div>
            <h3
              id="files-heading"
              className="mt-3 font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl"
            >
              {layoutHeader}
            </h3>

            {/* Breadcrumb */}
            <div className="mt-2">{renderBreadcrumb()}</div>

            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${visibleFiles.length} item${visibleFiles.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter tabs */}
            <div
              className="flex rounded-xl border border-border bg-secondary/40 p-0.5"
              role="tablist"
            >
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === opt.id}
                  onClick={() => setFilter(opt.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    filter === opt.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortOpen((o) => !o)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                aria-expanded={sortOpen}
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                {SORT_OPTIONS.find((s) => s.id === sortBy)?.label}
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

      {/* List header (list view only) */}
      {!isGrid && !isLoading && visibleFiles.length > 0 && (
        <div className="hidden md:grid md:grid-cols-[1fr_auto] gap-10 border-b border-border/60 px-5 py-2 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_6rem_4.5rem] gap-8 lg:gap-11 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span className="pl-5">Name</span>
            <span>Modified</span>
            <span>Size</span>
          </div>
          <span className="w-36 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground pr-1">
            Actions
          </span>
        </div>
      )}

      {/* Content area */}
      <div
        className={cn(
          "p-4 sm:p-4",
          isGrid
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            : "flex flex-col gap-2",
        )}
        role="list"
      >
        {isLoading ? (
          <LoadingSkeleton isGrid={isGrid} />
        ) : error ? (
          <ErrorState message={error} onRetry={onRefresh} />
        ) : visibleFiles.length === 0 ? (
          <EmptyState />
        ) : (
          visibleFiles.map((file, i) => (
            <FileRow
              key={file.id}
              viewType={view}
              file={{
                ...file,
                starred: Boolean(starred[file.id]),
              }}
              index={i}
              selected={selectedId === file.id}
              active={activeId === file.id}
              onSelect={handleItemClick}
              onStar={toggleStar}
              onShare={handleShare}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onRename={handleRename}
              onCopyLink={handleCopyLink}
            />
          ))
        )}
      </div>

      {/* Share modal */}
      <AnimatePresence>
        {sharingFile && (
          <ShareModal
            file={sharingFile}
            onClose={() => setSharingFile(null)}
            onShareUpdated={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <FilesToast
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />
        )}
      </AnimatePresence>

      {/* Drop zone footer */}
      <footer className="border-t border-border p-4 sm:p-5">
        <DropZone currentDirId={currentDirId} onRefresh={onRefresh} />
      </footer>
    </section>
  );
}

/* ───────────────────────── Loading Skeleton ───────────────────────── */

function LoadingSkeleton({ isGrid }) {
  const items = Array.from({ length: 6 });

  if (isGrid) {
    return items.map((_, i) => (
      <div
        key={i}
        className="rounded-xl border border-border bg-card/50 p-4 animate-pulse"
        style={{ animationDelay: `${i * 80}ms` }}
      >
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 rounded-xl bg-secondary/60" />
          <div className="h-7 w-16 rounded-lg bg-secondary/40" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-4 w-3/4 rounded bg-secondary/50" />
          <div className="h-3 w-1/2 rounded bg-secondary/30" />
        </div>
      </div>
    ));
  }

  return items.map((_, i) => (
    <div
      key={i}
      className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-4 animate-pulse"
      style={{ animationDelay: `${i * 80}ms` }}
    >
      <div className="h-10 w-10 rounded-xl bg-secondary/60 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-secondary/50" />
        <div className="h-3 w-1/3 rounded bg-secondary/30" />
      </div>
    </div>
  ));
}

/* ───────────────────────── Error State ───────────────────────── */

function ErrorState({ message, onRetry }) {
  return (
    <div className="col-span-full mx-auto flex max-w-sm flex-col items-center justify-center rounded-xl px-6 py-14 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" />
      </span>
      <h4 className="mt-4 font-display text-base font-semibold text-foreground">
        Something went wrong
      </h4>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 h-9 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── Empty State ───────────────────────── */

function EmptyState() {
  return (
    <div className="col-span-full mx-auto flex max-w-sm flex-col items-center justify-center rounded-xl px-6 py-14 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary/60 text-primary">
        <FolderOpen className="h-5 w-5" />
      </span>
      <h4 className="mt-4 font-display text-base font-semibold text-foreground">
        This folder is empty
      </h4>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Upload documents, images, or create folders to get started.
      </p>
      <button
        type="button"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("open-upload-modal"))
        }
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 h-9 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
      >
        <UploadCloud className="h-4 w-4" />
        Upload files
      </button>
    </div>
  );
}

/* ───────────────────────── Sleek Files Toast ───────────────────────── */

function FilesToast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="fixed top-28 right-15 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-elegant border border-white/10 dark:border-white/5 bg-background/90 dark:bg-card/90 backdrop-blur-md text-xs font-semibold text-foreground pointer-events-auto"
    >
      <span className="h-2 w-2 rounded-full bg-primary shadow-glow animate-pulse shrink-0" />
      <span className="leading-tight">{message}</span>
    </motion.div>,
    document.body,
  );
}

/* ───────────────────────── Drop Zone ───────────────────────── */

function DropZone({ currentDirId, onRefresh }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useState(null);

  const handleFileDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files.length > 0) {
      // Trigger upload via FAB's upload modal or directly
      // For now, dispatch the event that opens the upload modal
      window.dispatchEvent(new CustomEvent("open-upload-modal"));
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleFileDrop}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
        dragOver
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-secondary/30 hover:bg-secondary/50",
      )}
    >
      <UploadCloud className="h-5 w-5 text-primary" />
      <p className="mt-2 text-sm font-medium text-foreground">
        Drop files to upload ·{" "}
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("open-upload-modal"))
          }
          className="text-primary hover:underline"
        >
          browse
        </button>
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Encrypted in transit · Resumable uploads
      </p>
    </div>
  );
}
