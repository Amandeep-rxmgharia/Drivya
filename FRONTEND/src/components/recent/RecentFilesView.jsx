import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  Eye,
  LayoutGrid,
  List,
  Loader2,
  Search,
  Upload,
  Download,
  Pencil,
  Trash2,
  FileStack,
  AlertCircle,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { card, chip } from "@/components/dashboard/dashboard-tokens";
import { RecentTimeline } from "@/components/recent/RecentTimeline";
import { FilePreviewModal } from "@/components/recent/FilePreviewModal";
import { ShareModal } from "@/components/dashboard/ShareModal";
import { getTimeGroup, formatRelativeTime } from "@/lib/date-utils";

const FILTER_TABS = [
  { id: "all", label: "All", icon: FileStack },
  { id: "opened", label: "Opened", icon: Eye },
  { id: "uploaded", label: "Uploaded", icon: Upload },
  { id: "downloaded", label: "Downloaded", icon: Download },
  { id: "renamed", label: "Renamed", icon: Pencil },
  { id: "trashed", label: "Trashed", icon: Trash2 },
  { id: "restored", label: "Restored", icon: RotateCcw },
];

/**
 * RecentFilesView — displays recent activity files in a timeline layout.
 *
 * Props:
 *   initialFiles  – static file array (legacy/fallback, used if fetchFn is not provided)
 *   fetchFn        – async (filter) => { items, nextCursor, pagination }
 *   titleId        – aria label id
 *   limit          – per-page limit (default 20)
 */
export function RecentFilesView({
  initialFiles,
  fetchFn,
  titleId = "recent-files-heading",
  limit = 20,
}) {
  const [files, setFiles] = useState(initialFiles || []);
  const [activeFilter, setActiveFilter] = useState("all");
  const [view, setView] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFileId, setPreviewFileId] = useState(null);
  const [sharingFile, setSharingFile] = useState(null);

  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);

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

  // Async state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchIdRef = useRef(0);

  // Fetch activities from API
  const fetchActivities = useCallback(
    async (filter, cursor = null) => {
      if (!fetchFn) return;

      const id = ++fetchIdRef.current;

      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const actionParam = filter === "all" ? undefined : filter;
        const result = await fetchFn({
          action: actionParam,
          limit,
          cursor: cursor || undefined,
        });

        // Stale request guard
        if (id !== fetchIdRef.current) return;

        if (cursor) {
          // Append to existing
          setFiles((prev) => [...prev, ...result.items]);
        } else {
          setFiles(result.items);
        }
        setNextCursor(result.nextCursor);
        setHasMore(result.pagination?.hasNextPage || false);
      } catch (err) {
        if (id !== fetchIdRef.current) return;
        console.error("Failed to fetch activities:", err);
        setError("Failed to load recent activity. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [fetchFn, limit],
  );

  // Fetch on mount and when filter changes
  useEffect(() => {
    if (fetchFn) {
      fetchActivities(activeFilter);
    }
  }, [activeFilter, fetchActivities]);

  // Update from initialFiles if no fetchFn
  useEffect(() => {
    if (!fetchFn && initialFiles) {
      setFiles(initialFiles);
    }
  }, [initialFiles, fetchFn]);

  const handleLoadMore = () => {
    if (nextCursor && hasMore && !loadingMore) {
      fetchActivities(activeFilter, nextCursor);
    }
  };

  const previewFile = useMemo(() => {
    return files.find((f) => f.id === previewFileId) || null;
  }, [files, previewFileId]);

  const handleToggleStar = (id) => {
    setFiles((prevFiles) =>
      prevFiles.map((f) => (f.id === id ? { ...f, starred: !f.starred } : f)),
    );
  };

  const handleShare = (file) => {
    setSharingFile(file);
  };

  const handleShareUpdated = (id, isShared) => {
    setFiles((prevFiles) =>
      prevFiles.map((f) => (f.id === id ? { ...f, shared: isShared } : f)),
    );
  };

  const filteredFiles = useMemo(() => {
    let list = [...files];

    // When using API, filtering by type is done server-side
    // Only apply client-side filter for static/initialFiles mode
    if (!fetchFn && activeFilter !== "all") {
      list = list.filter((f) => f.type === activeFilter);
    }

    // Search is always client-side
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.owner && f.owner.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [files, activeFilter, searchQuery, fetchFn]);

  // Group by time period
  const grouped = useMemo(() => {
    const groups = {};
    const order = ["Today", "Yesterday", "This Week", "Earlier"];

    filteredFiles.forEach((file) => {
      const dateVal = file.lastOpened
        ? file.lastOpened instanceof Date
          ? file.lastOpened
          : new Date(file.lastOpened)
        : new Date();
      const group = getTimeGroup(dateVal);
      if (!groups[group]) groups[group] = [];
      groups[group].push(file);
    });

    // Sort files within each group by lastOpened descending
    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) => {
        const da = a.lastOpened instanceof Date ? a.lastOpened : new Date(a.lastOpened);
        const db = b.lastOpened instanceof Date ? b.lastOpened : new Date(b.lastOpened);
        return db - da;
      }),
    );

    return order
      .filter((g) => groups[g])
      .map((g) => ({ label: g, files: groups[g] }));
  }, [filteredFiles]);

  const uploadingCount = files.filter(
    (f) => f.uploadStatus === "uploading",
  ).length;

  // Format time — handle both Date objects and ISO strings
  const formatTime = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return formatRelativeTime(d);
  };

  return (
    <>
      <section
        className={cn(card, "animate-fade-in")}
        aria-labelledby={titleId}
      >
        {/* Toolbar */}
        <header className="border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Top row: filter tabs & uploading status indicator */}
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

              {/* Desktop view: Tabs with horizontal scroll support */}
              <div className="hidden lg:block -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
                <div
                  className="flex rounded-xl border border-border bg-secondary/40 p-0.5 sm:w-auto"
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
                        "inline-flex items-center gap-1 sm:gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer",
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

              {/* Uploading indicator */}
              {uploadingCount > 0 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(chip, "gap-2 shrink-0")}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <span className="text-[11px] font-medium whitespace-nowrap">
                    {uploadingCount} uploading
                  </span>
                </motion.div>
              )}
            </div>

            {/* Bottom row: search, view toggle */}
            <div className="flex items-center gap-2">
              {/* Search within recent */}
              <div className="relative flex-1 min-w-0 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search recent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full sm:w-44 rounded-xl border border-border bg-secondary/30 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Spacer on large screens */}
              <div className="flex-1 hidden sm:block" />

              {/* View toggle */}
              <div className="flex rounded-xl border border-border bg-secondary/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer",
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
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer",
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

        {/* Content */}
        <div className="divide-y divide-border/60">
          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary/50">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                Loading activity...
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
                Fetching your recent files and actions.
              </p>
            </div>
          ) : error ? (
            /* Error state */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                Something went wrong
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
                {error}
              </p>
              <button
                type="button"
                onClick={() => fetchActivities(activeFilter)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
            </div>
          ) : grouped.length === 0 ? (
            /* Empty state */
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
            <>
              {grouped.map((group, gi) => (
                <RecentTimeline
                  key={group.label}
                  label={group.label}
                  files={group.files}
                  view={view}
                  index={gi}
                  formatTime={formatTime}
                  onPreview={(file) => setPreviewFileId(file.id)}
                  onStar={handleToggleStar}
                  onShare={handleShare}
                />
              ))}

              {/* Load more button */}
              {hasMore && (
                <div className="flex justify-center py-6">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load more"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Preview modal */}
      <AnimatePresence>
        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFileId(null)}
            formatTime={formatTime}
            onStar={handleToggleStar}
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
    </>
  );
}
