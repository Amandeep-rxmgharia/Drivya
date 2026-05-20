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
    modifiedAt: "May 12, 2026",
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
  {
    id: "7",
    name: "api-routes.ts",
    size: "24 KB",
    modifiedAt: "May 10, 2026",
    owner: "Dev",
    kind: "code",
  },
  {
    id: "8",
    name: "podcast-ep12.mp3",
    size: "48 MB",
    modifiedAt: "May 9, 2026",
    owner: "Marketing",
    kind: "audio",
  },
  {
    id: "9",
    name: "launch-assets",
    size: "1.2 GB",
    modifiedAt: "May 8, 2026",
    owner: "Design",
    kind: "folder",
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
  const [view, setView] = useState("grid");
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

  const isGrid = view === "grid";

  return (
    <motion.section
      {...fadeInView(0.12)}
      className={cn(card, "overflow-hidden", className)}
      aria-labelledby="recent-files-heading"
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
              id="recent-files-heading"
              className="mt-3 font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl"
            >
              Recent files
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {visibleFiles.length} item{visibleFiles.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

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

      {!isGrid && (
        <div className="hidden md:grid md:grid-cols-[1fr_auto] gap-4 border-b border-border/60 px-5 py-2 sm:px-6">
          <motion.div className="grid grid-cols-[minmax(0,1fr)_6rem_4.5rem] gap-6 pl-14 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span>Name</span>
            <span>Modified</span>
            <span className="text-right">Size</span>
          </motion.div>
          <span className="w-36 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground pr-1">
            Actions
          </span>
        </div>
      )}

      <div
        className={cn(
          "file-list-scroll max-h-[min(560px,65vh)] overflow-y-auto p-npm run dev -- --host3 sm:p-4",
          isGrid
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            : "flex flex-col gap-2",
        )}
        role="list"
      >
        {visibleFiles.length === 0 ? (
          <EmptyState />
        ) : (
          visibleFiles.map((file, i) => (
            <FileRow
              key={file.id}
              viewType={view}
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
      </div>

      <footer className="border-t border-border p-4 sm:p-5">
        <DropZone />
      </footer>
    </motion.section>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full mx-auto flex max-w-sm flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-14 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary/60 text-primary">
        <FolderOpen className="h-5 w-5" />
      </span>
      <h4 className="mt-4 font-display text-base font-semibold text-foreground">No files here yet</h4>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Upload documents, images, or folders to see them in your recent list.
      </p>
      <button
        type="button"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 h-9 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
      >
        <UploadCloud className="h-4 w-4" />
        Upload files
      </button>
    </div>
  );
}

function DropZone() {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
        dragOver
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-secondary/30 hover:bg-secondary/50",
      )}
    >
      <UploadCloud className="h-5 w-5 text-primary" />
      <p className="mt-2 text-sm font-medium text-foreground">
        Drop files to upload · <span className="text-primary">browse</span>
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Encrypted in transit · Resumable uploads
      </p>
    </div>
  );
}
