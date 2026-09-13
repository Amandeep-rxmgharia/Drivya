import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
  File,
  Clock,
  GripHorizontal,
  Sparkles,
} from "lucide-react";
import { useUpload } from "../../context/UploadContext";
import { detectFileKind, getFileTypeStyle } from "@/lib/file-types.js";
import { easeSmooth } from "@/lib/motion-presets";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

export function UploadManagerWidget() {
  const {
    tasks,
    isOpen,
    isMinimized,
    isUploading,
    activeCount,
    completedCount,
    failedCount,
    totalCount,
    overallProgress,
    cancelTask,
    retryTask,
    cancelAll,
    clearCompleted,
    removeTask,
    toggleMinimize,
    closeWidget,
  } = useUpload();

  const dragControls = useDragControls();
  const [isHovered, setIsHovered] = useState(false);
  const [autoDismissCountdown, setAutoDismissCountdown] = useState(null);
  const dismissTimerRef = useRef(null);

  // Calculate queued count
  const queuedCount = tasks.filter((t) => t.status === "queued").length;
  const inProgressCount = tasks.filter((t) =>
    ["presigning", "uploading", "confirming"].includes(t.status)
  ).length;

  // Auto-remove after all uploads successfully complete (2 seconds)
  const allCompletedSuccessfully =
    totalCount > 0 &&
    completedCount === totalCount &&
    activeCount === 0 &&
    failedCount === 0;

  useEffect(() => {
    if (allCompletedSuccessfully) {
      setAutoDismissCountdown(2);
      const countdownInterval = setInterval(() => {
        setAutoDismissCountdown((prev) => (prev > 1 ? prev - 1 : 1));
      }, 1000);

      const timer = setTimeout(() => {
        clearCompleted();
        closeWidget();
      }, 2000);

      return () => {
        clearInterval(countdownInterval);
        clearTimeout(timer);
      };
    } else {
      setAutoDismissCountdown(null);
    }
  }, [allCompletedSuccessfully, clearCompleted, closeWidget]);

  if (!isOpen || tasks.length === 0) {
    return null;
  }

  // ─── Render Minimized Pill ──────────────────────────────────────────────
  if (isMinimized) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="fixed bottom-6 right-24 z-40 cursor-grab active:cursor-grabbing select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          onClick={toggleMinimize}
          className="relative flex items-center gap-2.5 rounded-full border border-border/80 bg-card/90 px-3.5 py-2 shadow-xl backdrop-blur-xl hover:border-primary/40 transition-all hover:shadow-glow overflow-hidden"
        >
          {/* Subtle animated background shimmer when uploading */}
          {isUploading && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent pointer-events-none"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
            />
          )}

          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />

          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : failedCount > 0 ? (
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            )}
          </div>

          <div className="text-xs font-medium text-foreground pr-1">
            {isUploading ? (
              <span>
                Uploading ({overallProgress}%)
                {queuedCount > 0 && (
                  <span className="text-muted-foreground ml-1">
                    · {queuedCount} queued
                  </span>
                )}
              </span>
            ) : failedCount > 0 ? (
              <span className="text-destructive">
                {completedCount}/{totalCount} done ({failedCount} failed)
              </span>
            ) : (
              <span className="text-emerald-500 font-medium">
                All {completedCount} uploaded!
                {autoDismissCountdown !== null && (
                  <span className="text-muted-foreground text-[10px] ml-1">
                    ({autoDismissCountdown}s)
                  </span>
                )}
              </span>
            )}
          </div>

          <button
            type="button"
            aria-label="Expand upload manager"
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    );
  }

  // ─── Render Expanded Manager Card ───────────────────────────────────────
  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 25, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-24 z-40 w-96 max-w-[calc(100vw-7rem)] overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-2xl"
    >
      {/* Ambient background glow */}
      <div
        className={`absolute -top-16 -right-16 h-36 w-36 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          allCompletedSuccessfully
            ? "bg-emerald-500/20"
            : failedCount > 0
            ? "bg-destructive/15"
            : "bg-primary/20"
        }`}
      />

      {/* Draggable Header */}
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="flex items-center justify-between border-b border-border/60 bg-secondary/40 px-4 py-2.5 cursor-grab active:cursor-grabbing select-none transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="h-4 w-4 text-muted-foreground/60 shrink-0" />

          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors shadow-sm ${
              allCompletedSuccessfully
                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                : isUploading
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "bg-secondary text-foreground"
            }`}
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : allCompletedSuccessfully ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <UploadCloud className="h-3.5 w-3.5" />
            )}
          </div>

          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
              {allCompletedSuccessfully ? (
                <span className="text-emerald-500 flex items-center gap-1">
                  Uploads Complete
                  <Sparkles className="h-3 w-3 animate-pulse text-emerald-400" />
                </span>
              ) : isUploading ? (
                <span>
                  Uploading {inProgressCount} item{inProgressCount > 1 ? "s" : ""}
                </span>
              ) : failedCount > 0 ? (
                <span>Completed with {failedCount} issue{failedCount > 1 ? "s" : ""}</span>
              ) : (
                <span>Upload Manager</span>
              )}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {allCompletedSuccessfully ? (
                autoDismissCountdown !== null ? (
                  <span className="text-muted-foreground">
                    Closing automatically in {autoDismissCountdown}s
                  </span>
                ) : (
                  "All files saved to drive"
                )
              ) : (
                <span>
                  {completedCount} of {totalCount} completed
                  {queuedCount > 0 && ` · ${queuedCount} queued`}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Window controls */}
        <div
          className="flex items-center gap-1 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Minimize button */}
          <button
            type="button"
            onClick={toggleMinimize}
            aria-label="Minimize upload dock"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              if (isUploading) {
                if (
                  window.confirm(
                    "Uploads are still in progress. Cancel active uploads and close?"
                  )
                ) {
                  cancelAll();
                  closeWidget();
                }
              } else {
                closeWidget();
              }
            }}
            aria-label="Close upload dock"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="relative px-4 pt-3 pb-2.5 border-b border-border/40 bg-secondary/15">
        <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
          <span className="text-muted-foreground flex items-center gap-1.5">
            {isUploading && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            )}
            {allCompletedSuccessfully
              ? "All files ready"
              : isUploading
              ? `Processing (${activeCount} active)`
              : "Completed"}
          </span>
          <span className="text-foreground tabular-nums font-semibold">
            {overallProgress}%
          </span>
        </div>

        <div className="relative h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-all duration-200 ${
              allCompletedSuccessfully
                ? "bg-emerald-500 shadow-glow"
                : "bg-gradient-primary shadow-glow"
            }`}
            style={{ width: `${overallProgress}%` }}
          />
          {/* Progress bar light shimmer animation */}
          {isUploading && (
            <motion.div
              className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            />
          )}
        </div>
      </div>

      {/* Queue & Task List */}
      <div className="max-h-60 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
        <AnimatePresence initial={false}>
          {tasks.map((task, idx) => {
            const kind = detectFileKind(task.name, task.type);
            const style = getFileTypeStyle(kind);
            const isQueued = task.status === "queued";
            const isInFlight = ["presigning", "uploading", "confirming"].includes(
              task.status
            );
            const isCompleted = task.status === "completed";
            const isFailed = task.status === "error" || task.status === "aborted";

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, height: 0, overflow: "hidden", marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className={`relative flex items-center gap-3 rounded-xl border p-2.5 transition-all ${
                  isInFlight
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : isCompleted
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : isFailed
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border/40 bg-secondary/20"
                }`}
              >
                {/* File Icon */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${style.bg} ${style.border} ${style.color}`}
                >
                  <File className="h-4 w-4" />
                </div>

                {/* File Info & Progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground truncate">
                      {task.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                      {formatBytes(task.size)}
                    </span>
                  </div>

                  {/* Stage text / Queue indicator */}
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span
                      className={`text-[10px] flex items-center gap-1 truncate ${
                        isCompleted
                          ? "text-emerald-500 font-medium"
                          : isFailed
                          ? "text-destructive font-medium"
                          : isInFlight
                          ? "text-primary font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isQueued && (
                        <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      )}
                      {task.error || task.stageText || `${task.progress}%`}
                    </span>

                    {task.status === "uploading" && (
                      <span className="text-[10px] tabular-nums text-foreground/80 font-medium">
                        {task.progress}%
                      </span>
                    )}
                  </div>

                  {/* Per-task Micro Progress Bar */}
                  {isInFlight && (
                    <div className="relative mt-1.5 h-1 w-full rounded-full bg-secondary/60 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          task.status === "confirming"
                            ? "bg-gradient-to-r from-primary via-emerald-400 to-primary animate-pulse"
                            : "bg-gradient-primary"
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Action button */}
                <div className="flex items-center gap-1 shrink-0">
                  {task.status === "confirming" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : isInFlight || isQueued ? (
                    <button
                      type="button"
                      onClick={() => cancelTask(task.id)}
                      title="Cancel upload"
                      aria-label="Cancel upload"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : isCompleted ? (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        title="Dismiss"
                        aria-label="Dismiss item"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : isFailed ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => retryTask(task.id)}
                        title="Retry upload"
                        aria-label="Retry upload"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-primary hover:bg-primary/10 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        title="Dismiss"
                        aria-label="Dismiss item"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer Summary & Actions */}
      <div className="flex items-center justify-between border-t border-border/60 bg-secondary/30 px-4 py-2 text-xs">
        {allCompletedSuccessfully ? (
          <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Auto-closing shortly…
          </span>
        ) : completedCount > 0 ? (
          <button
            type="button"
            onClick={clearCompleted}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear completed ({completedCount})
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {queuedCount > 0
              ? `${queuedCount} file${queuedCount > 1 ? "s" : ""} waiting in queue`
              : isUploading
              ? "Uploading in background…"
              : "Ready"}
          </span>
        )}

        <div className="flex items-center gap-2">
          {allCompletedSuccessfully ? (
            <button
              type="button"
              onClick={clearCompleted}
              className="text-[11px] font-medium text-primary hover:underline transition-colors"
            >
              Dismiss now
            </button>
          ) : isUploading ? (
            <button
              type="button"
              onClick={cancelAll}
              className="text-[11px] font-medium text-destructive hover:underline transition-colors"
            >
              Cancel all
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
