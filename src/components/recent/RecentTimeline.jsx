import { useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { motion } from "motion/react";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  Download,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Share2,
  Star,
  Trash2,
  Upload,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { easeSmooth } from "@/lib/motion-presets";
import { detectFileKind } from "@/lib/file-types";
import { FileTypeIcon } from "@/components/dashboard/FileTypeIcon";

const rowEase = "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

/* ───────────────────────── Upload Status Badge ───────────────────────── */

function UploadStatusBadge({ status, progress }) {
  if (!status) return null;

  const configs = {
    complete: {
      icon: CheckCircle2,
      label: "Uploaded",
      cls: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    uploading: {
      icon: Loader2,
      label: `${progress ?? 0}%`,
      cls: "border-primary/25 bg-primary/10 text-primary",
      spin: true,
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      cls: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400",
    },
  };

  const cfg = configs[status] ?? configs.complete;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        cfg.cls,
      )}
    >
      <cfg.icon
        className={cn("h-3 w-3", cfg.spin && "animate-spin")}
      />
      {cfg.label}
    </span>
  );
}

/* ───────────────────────── Activity type indicator ───────────────────────── */

function ActivityBadge({ type }) {
  // if (type === "uploaded") {
  //   return (
  //     <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/8 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
  //       <Upload className="h-3 w-3" />
  //       Uploaded
  //     </span>
  //   );
  // }
  if(type === 'opened') {
    return (
    <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/8 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
      <Eye className="h-3 w-3" />
      Opened
    </span>
  );
  }
}

/* ───────────────────────── File Actions Toolbar ───────────────────────── */
/* Matches the SharedFiles FileActions pattern exactly */

function FileActions({ file, visible, compact, onPreview, onStar }) {
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
        className={cn(btn, file.starred && "text-amber-600 dark:text-amber-400")}
        title={file.starred ? "Unstar" : "Star"}
        aria-pressed={file.starred}
        onClick={() => onStar?.(file.id)}
      >
        <Star className={cn("h-3.5 w-3.5", file.starred && "fill-current")} />
      </button>
      <button type="button" className={cn(btn, "hover:text-primary")} title="Quick preview" onClick={() => onPreview?.(file)}>
        <Eye className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} title="Share">
        <Share2 className="h-3.5 w-3.5" />
      </button>
      {/* <button type="button" className={btn} title="Download">
        <Download className="h-3.5 w-3.5" />
      </button> */}
      <button type="button" className={cn(btn, "hover:text-destructive")} title="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {/* {!compact && (
        <button type="button" className={btn} title="Details" onClick={() => onPreview?.(file)}>
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      )} */}
    </div>
  );
}

/* ───────────────────────── Upload progress mini bar ───────────────────────── */

function UploadProgressBar({ progress }) {
  return (
    <div className="mt-2 w-full">
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full rounded-full bg-gradient-primary shadow-glow"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: easeSmooth }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────── File Row (Recent variant) ───────────────────────── */
/* Uses useScrollReveal for consistent scroll animation with other tabs */

function RecentFileRow({ file, view, formatTime, onPreview, onStar }) {
  const [hovered, setHovered] = useState(false);
  const { ref: revealRef, isVisible } = useScrollReveal();
  const kind = detectFileKind(file.name, file.kind);
  const isGrid = view === "grid";
  const isUploading = file.uploadStatus === "uploading";

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
              onPreview={onPreview}
              onStar={onStar}
            />
          </div>

          <div className="mt-3 min-w-0 flex-1 space-y-1.5">
            <h4 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground">
              {file.name}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5">
              <ActivityBadge type={file.type} />
              {file.uploadStatus && (
                <UploadStatusBadge
                  status={file.uploadStatus}
                  progress={file.uploadProgress}
                />
              )}
            </div>
            {isUploading && <UploadProgressBar progress={file.uploadProgress} />}
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {file.size} · {formatTime(file.lastOpened)}
            </p>
          </div>

          {/* Bottom badges */}
          {(file.starred || file.shared) && (
            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/50">
              {file.starred && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  <Star className="h-2.5 w-2.5 fill-current" /> Starred
                </span>
              )}
              {file.shared && (
                <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/25 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                  <Share2 className="h-2.5 w-2.5" /> Shared
                </span>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }

  // List view — matches FileRow / SharedFileCard list layout exactly
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
                  <ActivityBadge type={file.type} />
                  {file.uploadStatus && (
                    <UploadStatusBadge
                      status={file.uploadStatus}
                      progress={file.uploadProgress}
                    />
                  )}
                  {file.starred && (
                    <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      <Star className="h-2.5 w-2.5 fill-current" /> Starred
                    </span>
                  )}
                  {file.shared && (
                    <span className="inline-flex items-center gap-0.5 rounded-md border border-violet-500/25 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                      <Share2 className="h-2.5 w-2.5" /> Shared
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground md:hidden">
                  {formatTime(file.lastOpened)} · {file.size}
                </p>
                {isUploading && <UploadProgressBar progress={file.uploadProgress} />}
              </div>
            </div>

            {/* Time column */}
            <div className="hidden md:flex md:items-center text-left text-sm tabular-nums text-muted-foreground">
              {formatTime(file.lastOpened)}
            </div>

            {/* Size column */}
            <div className="hidden md:flex md:items-center md:justify-start text-right text-sm font-medium tabular-nums text-foreground/80">
              {file.size}
            </div>
          </div>

          {/* Actions column */}
          <div className="flex items-center justify-between gap-3 md:justify-end md:w-36 md:pr-1">
            <FileActions
              file={file}
              visible={hovered}
              onPreview={onPreview}
              onStar={onStar}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

/* ───────────────────────── Timeline Group ───────────────────────── */

const GROUP_ICONS = {
  Today: CalendarDays,
  Yesterday: Clock,
  "This Week": CalendarDays,
  Earlier: CalendarDays,
};

export function RecentTimeline({
  label,
  files,
  view,
  index,
  formatTime,
  onPreview,
  onStar,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const GroupIcon = GROUP_ICONS[label] || CalendarDays;
  const isGrid = view === "grid";

  return (
    <div
      className="animate-fade-in"
      style={{ animationDelay: `${0.05 + index * 0.05}s`, animationFillMode: "both" }}
    >
      {/* Group header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-secondary/50">
          <GroupIcon className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">{label}</span>
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
        <div className="hidden md:grid md:grid-cols-[1fr_auto] gap-10 border-b border-border/60 px-5 py-2 sm:px-6 mx-4 sm:mx-5">
          <div className="grid grid-cols-[minmax(0,1fr)_6rem_4.5rem] gap-8 lg:gap-11 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span className="pl-5">Name</span>
            <span>Accessed</span>
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
            <RecentFileRow
              key={file.id}
              file={file}
              view={view}
              formatTime={formatTime}
              onPreview={onPreview}
              onStar={onStar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
