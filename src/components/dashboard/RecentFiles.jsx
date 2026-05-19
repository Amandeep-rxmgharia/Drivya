import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowUpDown,
  ChevronDown,
  FileStack,
  FolderOpen,
  LayoutGrid,
  List,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { easeSmooth } from "@/lib/motion-presets";
import { FileRow } from "./FileRow";

const card = "rounded-2xl glass shadow-elegant";
const viewport = { once: true, margin: "-60px" };

function fadeInView(delay = 0, y = 16) {
  return {
    initial: { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport,
    transition: { type: "tween", duration: 0.68, ease: easeSmooth, delay },
  };
}

export const RECENT_FILES = [
  {
    id: "1",
    name: "Brand Guidelines v3.pdf",
    size: "4.2 MB",
    modifiedAt: "May 12, 2026",
    owner: "Amelia M.",
    starred: true,
  },
  {
    id: "2",
    name: "Q4-keynote-final.mp4",
    size: "128 MB",
    modifiedAt: "May 12, 2026",
    owner: "Lukas R.",
    shared: true,
  },
  {
    id: "3",
    name: "Hero-shot-005.png",
    size: "8.1 MB",
    modifiedAt: "May 12, 2026, 12:10 PM",
    owner: "Amelia M.",
    starred: true,
    shared: true,
  },
  {
    id: "4",
    name: "investor-deck.key",
    size: "12.4 MB",
    modifiedAt: "May 12, 2026",
    owner: "Maya P.",
    uploadProgress: 64,
  },
  {
    id: "5",
    name: "client-archives.zip",
    size: "640 MB",
    modifiedAt: "May 12, 2026",
    owner: "Amelia M.",
  },
  {
    id: "6",
    name: "Design System",
    size: "248 items",
    modifiedAt: "May 11, 2026",
    owner: "Team",
    kind: "folder",
    shared: true,
  },
];

const SORT_OPTIONS = [
  { id: "modified", label: "Modified" },
  { id: "name", label: "Name" },
  { id: "size", label: "Size" },
];

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "starred", label: "Starred" },
  { id: "shared", label: "Shared" },
];

export function RecentFiles({ files = RECENT_FILES, className }) {
  const [selectedId, setSelectedId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [starred, setStarred] = useState(() =>
    Object.fromEntries(files.filter((f) => f.starred).map((f) => [f.id, true])),
  );
  const [sortBy, setSortBy] = useState("modified");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("list");
  const [sortOpen, setSortOpen] = useState(false);

  const visibleFiles = useMemo(() => {
    let list = [...files];
    if (filter === "starred") list = list.filter((f) => starred[f.id] || f.starred);
    if (filter === "shared") list = list.filter((f) => f.shared);
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") return a.size.localeCompare(b.size);
      return a.modifiedAt.localeCompare(b.modifiedAt);
    });
    return list;
  }, [files, filter, sortBy, starred]);

  const toggleStar = (id) => {
    setStarred((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <motion.section
      {...fadeInView(0.12)}
      className={cn(card, "overflow-hidden", className)}
      aria-labelledby="recent-files-heading"
    >
      <header className="border-b border-white/[0.06] px-5 py-5 sm:px-6 sm:py-6">
        <motion.div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <motion.div>
            <motion.div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-primary">
                <FileStack className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                Library
              </span>
            </motion.div>
            <h3
              id="recent-files-heading"
              className="mt-3 font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl"
            >
              Recent files
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {visibleFiles.length} item{visibleFiles.length === 1 ? "" : "s"} · Across all folders
            </p>
          </motion.div>

          <motion.div className="flex flex-wrap items-center gap-2">
            <motion.div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-0.5" role="tablist">
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
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>

            <motion.div className="relative">
              <button
                type="button"
                onClick={() => setSortOpen((o) => !o)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-foreground/90 hover:bg-white/[0.06] transition-colors"
                aria-expanded={sortOpen}
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                {SORT_OPTIONS.find((s) => s.id === sortBy)?.label}
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", sortOpen && "rotate-180")}
                />
              </button>
              {sortOpen && (
                <motion.div className="absolute right-0 z-20 mt-2 min-w-[140px] rounded-xl border border-border bg-popover p-1 shadow-elegant">
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
                          ? "bg-secondary/80 text-foreground"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>

            <motion.div className="hidden sm:flex rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  view === "list"
                    ? "bg-white/10 text-foreground"
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
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label="Grid view"
                aria-pressed={view === "grid"}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      </header>

      <motion.div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_auto] md:gap-4 px-5 sm:px-6 py-2">
        <motion.div className="grid grid-cols-[minmax(7rem,1fr)_5.5rem_4.5rem] gap-6 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
          <span className="w-[188px] text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 pr-1">Name</span>
          <span >Modified</span>
          <span className="">Size</span>
        </motion.div>
        <span className="w-[188px] text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 pr-1">
          Actions
        </span>
      </motion.div>

      <motion.div
        className={cn(
          "file-list-scroll max-h-[min(520px,60vh)] overflow-y-auto py-2",
          view === "grid" ? "grid  grid-cols-1 sm:grid-cols-2 gap-2 px-3 sm:px-4" : "flex flex-col gap-3"
        )}
        role="list"
      >
        {visibleFiles.length === 0 ? (
          <EmptyState />
        ) : (
          visibleFiles.map((file, i) => (
            <FileRow
              viewType={view}
              key={file.id}
              file={{ ...file, starred: Boolean(starred[file.id] ?? file.starred) }}
              index={i}
              selected={selectedId === file.id}
              active={activeId === file.id}
              onSelect={(id) => {
                setSelectedId(id);
                setActiveId(id);
              }}
              onStar={toggleStar}
            />
          ))
        )}
      </motion.div>

      <footer className="border-t border-white/[0.06] p-4 sm:p-5">
        <DropZone />
      </footer>
    </motion.section>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "tween", duration: 0.6, ease: easeSmooth }}
      className="mx-4 my-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-14 text-center"
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary shadow-glow">
        <FolderOpen className="h-6 w-6" />
      </span>
      <h4 className="mt-5 font-display text-base font-semibold text-foreground">No files here yet</h4>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
        Upload documents, images, or folders to see them in your recent list.
      </p>
      <button
        type="button"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 h-10 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
      >
        <UploadCloud className="h-4 w-4" />
        Upload files
      </button>
    </motion.div>
  );
}

function DropZone() {
  const [dragOver, setDragOver] = useState(false);

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      animate={{
        borderColor: dragOver ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)",
        backgroundColor: dragOver ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
      }}
      transition={{ duration: 0.25, ease: easeSmooth }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center",
        dragOver && "shadow-glow",
      )}
    >
      <UploadCloud className="h-5 w-5 text-primary drop-shadow-primary-glow" />
      <p className="mt-2 text-sm font-medium text-foreground">
        Drop files to upload · <span className="text-primary">browse</span>
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Encrypted in transit · Resumable uploads
      </p>
    </motion.div>
  );
}
