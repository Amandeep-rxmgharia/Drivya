import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  Eye,
  LayoutGrid,
  List,
  Search,
  Upload,
  FileStack,
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
];

export function RecentFilesView({ initialFiles, titleId = "recent-files-heading" }) {
  const [files, setFiles] = useState(initialFiles);
  const [activeFilter, setActiveFilter] = useState("all");
  const [view, setView] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFileId, setPreviewFileId] = useState(null);
  const [sharingFile, setSharingFile] = useState(null);

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

    // filter by type
    if (activeFilter !== "all") {
      list = list.filter((f) => f.type === activeFilter);
    }

    // filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) || f.owner.toLowerCase().includes(q),
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
        aria-labelledby={titleId}
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
                onShare={handleShare}
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
