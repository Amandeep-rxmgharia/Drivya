import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
  Trash2,
  Check,
  CheckSquare,
  Minus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { easeSmooth } from "@/lib/motion-presets";
import { FileRow } from "./FileRow";
import { ShareModal } from "./ShareModal";
import { FilePreviewModal } from "./FilePreviewModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  fetchShareMap,
  createShare,
} from "../../../api/shares.js";
import { toggleStar as toggleStarApi } from "../../../api/starred.js";
import { bulkTrash as bulkTrashApi } from "../../../api/drive.js";

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
    starred: d.isStarred,
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
    starred: f.isStarred,
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
  onBulkTrash,
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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isTrashingBulk, setIsTrashingBulk] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const [starred, setStarred] = useState({});
  const [shareMap, setShareMap] = useState({});
  const [sharingFile, setSharingFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("grid");
  const [sortOpen, setSortOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [searchParams] = useSearchParams();
  const selectId = searchParams.get("select");

  const scrolledRef = useRef(false);

  // Sync selectedId with currentDirId and selectId parameter
  useEffect(() => {
    if (selectId) {
      setSelectedId(selectId);
      setActiveId(selectId);
      setSelectedIds(new Set([selectId]));
      scrolledRef.current = false; // reset so we scroll again
    } else {
      setSelectedId(null);
      setActiveId(null);
      setSelectedIds(new Set());
      setIsSelectMode(false);
    }
  }, [currentDirId, selectId]);

  // Scroll to the selected file once items have loaded
  useEffect(() => {
    if (!selectId || isLoading || allItems.length === 0 || scrolledRef.current) return;
    // Small delay to let the FileRow DOM nodes render
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-file-id="${selectId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        scrolledRef.current = true;
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [selectId, isLoading, allItems]);

  // Load share status for file badges
  useEffect(() => {
    fetchShareMap()
      .then(setShareMap)
      .catch(() => setShareMap({}));
  }, [currentDirId]);

  // Sync starred state with loaded items
  useEffect(() => {
    const initialStarred = {};
    allItems.forEach((item) => {
      if (item.starred) {
        initialStarred[item.id] = true;
      }
    });
    setStarred(initialStarred);
  }, [allItems]);

  const handleShareUpdated = useCallback((resourceId, share) => {
    if (share) {
      setShareMap((prev) => ({ ...prev, [resourceId]: share }));
    }
  }, []);

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

  const allVisibleSelected = useMemo(
    () =>
      visibleFiles.length > 0 &&
      visibleFiles.every((f) => selectedIds.has(f.id)),
    [visibleFiles, selectedIds],
  );

  const isIndeterminate = useMemo(
    () =>
      selectedIds.size > 0 &&
      visibleFiles.some((f) => selectedIds.has(f.id)) &&
      !allVisibleSelected,
    [selectedIds, visibleFiles, allVisibleSelected],
  );

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds(new Set());
        setSelectedId(null);
        setActiveId(null);
        setLastSelectedId(null);
      }
      return next;
    });
  }, []);

  const handleToggleSelect = useCallback((id, e) => {
    e?.stopPropagation?.();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastSelectedId(id);
    setActiveId(id);
    setSelectedId(id);
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allVisible =
        visibleFiles.length > 0 &&
        visibleFiles.every((f) => prev.has(f.id));
      if (allVisible) {
        return new Set();
      } else {
        return new Set(visibleFiles.map((f) => f.id));
      }
    });
  }, [visibleFiles]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectedId(null);
    setActiveId(null);
    setLastSelectedId(null);
    setIsSelectMode(false);
  }, []);

  const handleItemClick = useCallback(
    (id, e) => {
      const item = allItems.find((f) => f.id === id);
      if (!item) return;

      // In select mode, clicking anywhere on item toggles its selection
      if (isSelectMode) {
        handleToggleSelect(id, e);
        return;
      }

      // Shift + click: range selection
      if (e?.shiftKey && lastSelectedId) {
        const lastIdx = visibleFiles.findIndex((f) => f.id === lastSelectedId);
        const currIdx = visibleFiles.findIndex((f) => f.id === id);
        if (lastIdx !== -1 && currIdx !== -1) {
          const start = Math.min(lastIdx, currIdx);
          const end = Math.max(lastIdx, currIdx);
          const rangeIds = visibleFiles.slice(start, end + 1).map((f) => f.id);
          setIsSelectMode(true);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            rangeIds.forEach((rid) => next.add(rid));
            return next;
          });
          setActiveId(id);
          return;
        }
      }

      // Ctrl / Cmd + click: toggle individual selection
      if (e?.ctrlKey || e?.metaKey) {
        setIsSelectMode(true);
        handleToggleSelect(id, e);
        return;
      }

      // Normal click on folder -> navigate
      if (item.isDirectory && onNavigate) {
        onNavigate(id);
        setSelectedIds(new Set());
        setSelectedId(null);
        setActiveId(null);
        setLastSelectedId(null);
        setIsSelectMode(false);
        return;
      }

      // Normal click on file -> select it
      setSelectedId(id);
      setActiveId(id);
      setSelectedIds(new Set([id]));
      setLastSelectedId(id);
    },
    [allItems, visibleFiles, lastSelectedId, onNavigate, handleToggleSelect, isSelectMode],
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

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      if (selectedId === id) setSelectedId(null);
      if (activeId === id) setActiveId(null);
    },
    [allItems, onDeleteDir, onTrashFile, selectedId, activeId],
  );

  const handleExecuteBulkTrash = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const fileIds = [];
    const directoryIds = [];

    for (const id of selectedIds) {
      const item = allItems.find((f) => f.id === id);
      if (item?.isDirectory) {
        directoryIds.push(id);
      } else if (item) {
        fileIds.push(id);
      }
    }

    setIsTrashingBulk(true);
    try {
      if (onBulkTrash) {
        await onBulkTrash({ fileIds, directoryIds });
      } else {
        await bulkTrashApi({ fileIds, directoryIds });
        await onRefresh?.();
      }

      const count = selectedIds.size;
      setToastMessage(`Moved ${count} item${count !== 1 ? "s" : ""} to trash.`);
      setSelectedIds(new Set());
      setSelectedId(null);
      setActiveId(null);
      setLastSelectedId(null);
      setIsSelectMode(false);
      setConfirmBulkDelete(false);
      window.dispatchEvent(new CustomEvent("refresh-drive"));
    } catch (err) {
      console.error("Bulk trash failed:", err);
      setToastMessage(err.response?.data?.message || "Failed to move items to trash.");
    } finally {
      setIsTrashingBulk(false);
    }
  }, [selectedIds, allItems, onBulkTrash, onRefresh]);

  const handleCopyLink = useCallback(
    async (id) => {
      const file = allItems.find((f) => f.id === id);
      if (!file || file.isDirectory) return;

      try {
        let share = shareMap[id];
        if (!share) {
          const result = await createShare({ resourceId: id });
          share = result.share;
          setShareMap((prev) => ({ ...prev, [id]: share }));
        }

        const url = share.fullLinkUrl || `http://${share.linkUrl}`;
        await navigator.clipboard.writeText(url);
        setToastMessage(`Link for "${file.name}" copied to clipboard!`);
      } catch {
        setToastMessage(`Failed to copy link for "${file.name}".`);
      }
    },
    [allItems, shareMap],
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

  const toggleStar = async (id) => {
    const item = allItems.find((f) => f.id === id);
    if (!item) return;

    try {
      const resourceType = item.isDirectory ? "directory" : "file";
      const res = await toggleStarApi(resourceType, id);
      setStarred((prev) => ({ ...prev, [id]: res.isStarred }));
      setToastMessage(
        res.isStarred
          ? `"${item.name}" added to Starred.`
          : `"${item.name}" removed from Starred.`,
      );
    } catch (err) {
      console.error("Failed to toggle star:", err);
      setToastMessage("Failed to update star status.");
    }
  };

  const handleShare = (id) => {
    const file = allItems.find((f) => f.id === id);
    if (file && !file.isDirectory) setSharingFile(file);
  };

  const handlePreview = useCallback(
    (file) => {
      if (file && !file.isDirectory) {
        setPreviewFile(file);
      }
    },
    [],
  );

  const handlePreviewNavigate = useCallback(
    (file) => {
      setPreviewFile(file);
    },
    [],
  );

  // Get only non-directory files for prev/next navigation in preview
  const previewableFiles = useMemo(
    () => visibleFiles.filter((f) => !f.isDirectory),
    [visibleFiles],
  );

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

      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();

      if (e.altKey && !isShift && key === "d") {
        if (selectedId) {
          e.preventDefault();
          handleDownload(selectedId);
        }
        return;
      }

      if (e.altKey && key === "c") {
        if (selectedId) {
          e.preventDefault();
          handleCopyLink(selectedId);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === "a") {
        if (visibleFiles.length > 0) {
          e.preventDefault();
          setIsSelectMode(true);
          setSelectedIds(new Set(visibleFiles.map((f) => f.id)));
        }
        return;
      }

      if (e.key === "Escape") {
        if (isSelectMode || selectedIds.size > 0) {
          e.preventDefault();
          handleClearSelection();
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.size > 1) {
          e.preventDefault();
          setConfirmBulkDelete(true);
        } else if (selectedIds.size === 1) {
          e.preventDefault();
          const singleId = Array.from(selectedIds)[0];
          handleDelete(singleId);
        } else if (selectedId) {
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
  }, [
    selectedId,
    selectedIds,
    visibleFiles,
    handleDownload,
    handleCopyLink,
    handleDelete,
    handleRename,
    handleClearSelection,
  ]);

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
          className="inline-flex items-center gap-1.5 rounded-lg px- py-1 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors font-medium"
        >
          <Home className="h-3.5 w-3.5" />
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

            {/* <p className="mt-1 text-sm text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${visibleFiles.length} item${visibleFiles.length === 1 ? "" : "s"}`}
            </p> */}
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

            {/* Select mode button */}
            <button
              type="button"
              onClick={toggleSelectMode}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all cursor-pointer",
                isSelectMode
                  ? "border-primary/50 bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                  : "border-border bg-secondary/40 text-foreground hover:bg-secondary",
              )}
              aria-pressed={isSelectMode}
              title={isSelectMode ? "Exit selection mode" : "Select items"}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>{isSelectMode ? "Cancel" : "Select"}</span>
            </button>

            {/* Bulk trash action button in header */}
            {isSelectMode && selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(true)}
                disabled={isTrashingBulk}
                className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-2.5 sm:px-3 text-xs font-semibold text-destructive hover:bg-destructive hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50 animate-fade-in"
              >
                {isTrashingBulk ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Delete ({selectedIds.size})</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* List header (list view only) */}
      {!isGrid && !isLoading && visibleFiles.length > 0 && (
        <div className="hidden md:grid md:grid-cols-[1fr_auto] gap-10 border-b border-border/60 px-5 py-2.5 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_6rem_4.5rem] gap-8 lg:gap-11 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground items-center">
            <div className="flex items-center gap-3">
              {isSelectMode && (
                <MasterCheckbox
                  checked={allVisibleSelected}
                  indeterminate={isIndeterminate}
                  onToggle={handleToggleSelectAll}
                />
              )}
              <span className={cn(!isSelectMode && "pl-5")}>Name</span>
            </div>
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
                shared: Boolean(
                  shareMap[file.id]?.linkActive && !file.isDirectory,
                ),
              }}
              index={i}
              selected={selectedIds.has(file.id)}
              active={activeId === file.id}
              selectMode={isSelectMode}
              onSelect={handleItemClick}
              onToggleSelect={handleToggleSelect}
              onStar={toggleStar}
              onShare={handleShare}
              onDownload={handleDownload}
              onPreview={handlePreview}
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
            onShareUpdated={handleShareUpdated}
          />
        )}
      </AnimatePresence>

      {/* File preview modal */}
      <AnimatePresence>
        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            files={previewableFiles}
            onClose={() => setPreviewFile(null)}
            onDownload={onDownload}
            onNavigateFile={handlePreviewNavigate}
          />
        )}
      </AnimatePresence>

      {/* Confirm Bulk Delete Modal */}
      <AnimatePresence>
        {confirmBulkDelete && (
          <ConfirmModal
            title={`Move ${selectedIds.size} item${selectedIds.size !== 1 ? "s" : ""} to trash?`}
            description="Files will be moved to Trash and can be restored anytime. Folders will be removed and their contents moved to Trash."
            confirmLabel={isTrashingBulk ? "Moving..." : "Move to trash"}
            onConfirm={handleExecuteBulkTrash}
            onCancel={() => !isTrashingBulk && setConfirmBulkDelete(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {isSelectMode && selectedIds.size > 0 && (
          <FloatingBulkBar
            selectedCount={selectedIds.size}
            allSelected={allVisibleSelected}
            isTrashing={isTrashingBulk}
            onToggleSelectAll={handleToggleSelectAll}
            onMoveToTrash={() => setConfirmBulkDelete(true)}
            onClear={handleClearSelection}
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

/* ───────────────────────── Master Checkbox ───────────────────────── */

function MasterCheckbox({ checked, indeterminate, onToggle }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      onClick={onToggle}
      className={cn(
        "inline-flex h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded-md border text-xs transition-all duration-150 cursor-pointer select-none",
        checked || indeterminate
          ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
          : "border-muted-foreground/40 bg-background/80 hover:border-primary hover:bg-secondary/70",
      )}
      title={checked ? "Deselect all" : "Select all"}
    >
      {checked ? (
        <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3]" />
      ) : indeterminate ? (
        <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3]" />
      ) : null}
    </button>
  );
}

/* ───────────────────────── Floating Bulk Actions Bar ───────────────────────── */

function FloatingBulkBar({
  selectedCount,
  allSelected,
  isTrashing,
  onToggleSelectAll,
  onMoveToTrash,
  onClear,
}) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-2xl border border-border/80 bg-background/95 dark:bg-card/95 backdrop-blur-xl pointer-events-auto"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {selectedCount}
        </span>
        <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
          {selectedCount === 1 ? "item selected" : "items selected"}
        </span>
      </div>

      <div className="h-4 w-px bg-border/80" />

      <button
        type="button"
        onClick={onToggleSelectAll}
        className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors cursor-pointer px-1 whitespace-nowrap"
      >
        {allSelected ? "Deselect all" : "Select all"}
      </button>

      <button
        type="button"
        onClick={onMoveToTrash}
        disabled={isTrashing}
        className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all cursor-pointer shadow-sm disabled:opacity-50 whitespace-nowrap"
      >
        {isTrashing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        <span>Move to trash</span>
      </button>

      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
        title="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>,
    document.body,
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
    const timer = setTimeout(onClose, 2000);
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
      window.dispatchEvent(
        new CustomEvent("open-upload-modal", {
          detail: { files: e.dataTransfer.files },
        })
      );
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
