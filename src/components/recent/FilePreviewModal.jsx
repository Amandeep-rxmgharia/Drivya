import { useEffect } from "react";
import { motion } from "motion/react";
import {
  Calendar,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  HardDrive,
  Loader2,
  Pencil,
  Share2,
  Star,
  Trash2,
  Upload,
  User,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { easeSmooth } from "@/lib/motion-presets";
import { detectFileKind, getFileTypeStyle } from "@/lib/file-types";
import { FileTypeIcon } from "@/components/dashboard/FileTypeIcon";
import { iconBtn } from "@/components/dashboard/dashboard-tokens";

/* ───────────────────────── Preview Placeholder ───────────────────────── */

function PreviewPlaceholder({ kind }) {
  const { icon: Icon, iconColor, tile } = getFileTypeStyle(kind);

  return (
    <div className="w-full h-40 sm:h-48 rounded-xl border border-border bg-secondary/20 overflow-hidden flex items-center justify-center">
      <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl border-2", tile)}>
        <Icon className={cn("h-8 w-8", iconColor)} />
      </div>
    </div>
  );
}

/* ───────────────────────── Modal (right-side slider like SharedFiles) ───────────────────────── */

export function FilePreviewModal({ file, onClose, formatTime, onStar }) {
  // Escape key handler
  useEffect(() => {
    if (!file) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [file, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!file) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [file]);

  if (!file) return null;

  const kind = detectFileKind(file.name, file.kind);
  const { label: kindLabel } = getFileTypeStyle(kind);

  const isUploading = file.uploadStatus === "uploading";

  return (
    <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel — full-screen sheet on mobile, side slider on tablet+ */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: easeSmooth }}
            className={cn(
              "fixed z-50 overflow-y-auto bg-background shadow-elegant",
              /* Mobile: full width & height */
              "inset-0",
              /* Tablet (md): right-side slider */
              "md:inset-y-0 md:inset-x-auto md:right-0 md:w-[420px] md:max-w-[85vw] md:border-l md:border-border",
              /* Desktop (lg): wider slider */
              "lg:w-[460px]",
              /* Mobile: round top corners for sheet feel */
              "rounded-t-2xl md:rounded-t-none",
            )}
            style={{ scrollbarGutter: "stable", WebkitOverflowScrolling: "touch" }}
          >
            {/* Mobile drag handle indicator */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            <div className="px-4 pb-6 pt-2 space-y-5 sm:px-5 md:p-6 md:space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileTypeIcon kind={kind} size="lg" />
                  <div className="min-w-0">
                    <h2 className="font-display text-base sm:text-lg font-semibold text-foreground truncate">{file.name}</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{file.size} · {kindLabel}</p>
                  </div>
                </div>
                <button type="button" onClick={onClose} className={cn(iconBtn, "h-9 w-9 shrink-0")}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap items-center gap-2">
                {file.type === "uploaded" ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/8 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    <Upload className="h-3 w-3" /> Uploaded
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/8 px-2 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
                    <Eye className="h-3 w-3" /> Opened
                  </span>
                )}
                {file.uploadStatus === "complete" && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Upload complete
                  </span>
                )}
                {file.uploadStatus === "failed" && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                    <XCircle className="h-3 w-3" /> Upload failed
                  </span>
                )}
                {file.starred && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                    <Star className="h-2.5 w-2.5 fill-current" /> Starred
                  </span>
                )}
                {file.shared && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                    <Share2 className="h-2.5 w-2.5" /> Shared
                  </span>
                )}
              </div>

              {/* Preview area */}
              <PreviewPlaceholder kind={kind} />

              {/* Upload progress if active */}
              {isUploading && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 sm:p-4">
                  <div className="flex items-center justify-between text-xs font-medium text-primary mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading…
                    </span>
                    <span className="tabular-nums">{file.uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-primary/20">
                    <motion.div
                      className="h-full rounded-full bg-gradient-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${file.uploadProgress}%` }}
                      transition={{ duration: 0.8, ease: easeSmooth }}
                    />
                  </div>
                </div>
              )}

              {/* File Details */}
              <div className="rounded-xl border border-border bg-secondary/30 p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">File Details</div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-sm text-foreground/80">
                    <Clock className="h-4 w-4 text-muted-foreground" /> Last accessed
                  </span>
                  <span className="text-xs font-medium text-foreground/80 bg-secondary/50 px-2 py-0.5 rounded-md">
                    {formatTime(file.lastOpened)}
                  </span>
                </div>

                <div className="h-px bg-border/60" />

                <div className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-sm text-foreground/80">
                    <Calendar className="h-4 w-4 text-muted-foreground" /> Date
                  </span>
                  <span className="text-xs font-medium text-foreground/80 bg-secondary/50 px-2 py-0.5 rounded-md">
                    {file.lastOpened.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="h-px bg-border/60" />

                <div className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-sm text-foreground/80">
                    <User className="h-4 w-4 text-muted-foreground" /> Owner
                  </span>
                  <span className="text-xs font-medium text-foreground/80 bg-secondary/50 px-2 py-0.5 rounded-md">
                    {file.owner}
                  </span>
                </div>

                <div className="h-px bg-border/60" />

                <div className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-sm text-foreground/80">
                    <HardDrive className="h-4 w-4 text-muted-foreground" /> Size
                  </span>
                  <span className="text-xs font-medium text-foreground/80 bg-secondary/50 px-2 py-0.5 rounded-md">
                    {file.size}
                  </span>
                </div>

                <div className="h-px bg-border/60" />

                <div className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-sm text-foreground/80">
                    <FileText className="h-4 w-4 text-muted-foreground" /> Type
                  </span>
                  <span className="text-xs font-medium text-foreground/80 bg-secondary/50 px-2 py-0.5 rounded-md">
                    {kindLabel}
                  </span>
                </div>
              </div>

              {/* File Actions */}
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 mb-2 sm:mb-3">File Actions</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="inline-flex h-11 sm:h-10 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" /> Open
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 sm:h-10 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 text-sm font-medium text-foreground/80 hover:bg-secondary/70 transition-colors"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onStar?.(file.id)}
                    className={cn(
                      "inline-flex h-11 sm:h-10 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
                      file.starred
                        ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "border-border bg-secondary/40 text-foreground/80 hover:bg-secondary/70"
                    )}
                  >
                    <Star className={cn("h-4 w-4", file.starred && "fill-current")} />
                    {file.starred ? "Unstar" : "Star"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 sm:h-10 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 text-sm font-medium text-foreground/80 hover:bg-secondary/70 transition-colors"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="inline-flex h-11 sm:h-10 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 text-sm font-medium text-foreground/80 hover:bg-secondary/70 transition-colors"
                  >
                    <Pencil className="h-4 w-4" /> Rename
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 sm:h-10 items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>

              {/* Bottom safe area spacer for mobile */}
              <div className="h-4 md:h-0" />
            </div>
          </motion.div>
    </>
  );
}
