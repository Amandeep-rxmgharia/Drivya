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
import GDriveLogo from "../../../assets/images/Google_Drive_Logo.svg";
import dropboxLogo from "../../../assets/images/Dropbox-Icon.svg";

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
  const constraintsRef = useRef(null);
  const [, setIsHovered] = useState(false);
  const [autoDismissCountdown, setAutoDismissCountdown] = useState(null);

  // Calculate queued count and in-progress count
  const queuedCount = tasks.filter((t) => t.status === "queued").length;
  const inProgressCount = tasks.filter((t) =>
    ["presigning", "uploading", "confirming"].includes(t.status)
  ).length;

  const hasCloudTasks = tasks.some((t) =>
    ["google-drive", "dropbox"].includes(t.source)
  );

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

  return (
    <>
      {/* Viewport boundary for drag constraints to guarantee widget stays inside screen */}
      <div
        ref={constraintsRef}
        className="fixed inset-3 sm:inset-5 pointer-events-none z-40"
      />

      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={constraintsRef}
        dragElastic={0}
        dragMomentum={false}
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed top-20 right-4 sm:right-6 z-40 w-96 max-w-[calc(100vw-2rem)] sm:max-w-96 max-h-[calc(100dvh-6rem)] flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-2xl"
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

        {/* Draggable Header (Anchored at the top) */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          onClick={isMinimized ? toggleMinimize : undefined}
          className={`flex items-center justify-between px-4 py-2.5 cursor-grab active:cursor-grabbing select-none transition-colors shrink-0 ${
            isMinimized
              ? "hover:bg-secondary/40 cursor-pointer"
              : "border-b border-border/60 bg-secondary/40"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <GripHorizontal className="h-4 w-4 text-muted-foreground/60 shrink-0" />

            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors shadow-sm ${
                allCompletedSuccessfully
                  ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                  : isUploading
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : failedCount > 0
                  ? "bg-destructive/15 text-destructive border border-destructive/30"
                  : "bg-secondary text-foreground"
              }`}
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : allCompletedSuccessfully ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : failedCount > 0 ? (
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" />
              )}
            </div>

            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                {allCompletedSuccessfully ? (
                  <span className="text-emerald-500 flex items-center gap-1">
                    Transfers Complete
                    <Sparkles className="h-3 w-3 animate-pulse text-emerald-400" />
                  </span>
                ) : isUploading ? (
                  <span>
                    {hasCloudTasks ? "Transferring" : "Uploading"}{" "}
                    {isMinimized
                      ? `(${overallProgress}%)`
                      : `${inProgressCount} item${inProgressCount > 1 ? "s" : ""}`}
                  </span>
                ) : failedCount > 0 ? (
                  <span className="text-destructive">
                    Completed with {failedCount} issue{failedCount > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>{hasCloudTasks ? "Transfer Manager" : "Upload Manager"}</span>
                )}
              </h4>
              <p className="text-[11px] text-muted-foreground truncate">
                {allCompletedSuccessfully ? (
                  autoDismissCountdown !== null ? (
                    <span>Closing in {autoDismissCountdown}s</span>
                  ) : (
                    "All files saved to drive"
                  )
                ) : isMinimized ? (
                  <span>
                    {completedCount}/{totalCount} done
                    {queuedCount > 0 && ` · ${queuedCount} queued`}
                  </span>
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
            {/* Collapse/Expand button:
                - When collapsed: ChevronDown to expand from up to bottom
                - When expanded: ChevronUp to collapse from bottom to up
            */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMinimize();
              }}
              aria-label={isMinimized ? "Expand upload manager" : "Collapse upload manager"}
              title={isMinimized ? "Expand" : "Collapse"}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors"
            >
              {isMinimized ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isUploading) {
                  if (
                    window.confirm(
                      "Transfers are still in progress. Cancel active items and close?"
                    )
                  ) {
                    cancelAll();
                    closeWidget();
                  }
                } else {
                  closeWidget();
                }
              }}
              aria-label="Close upload manager"
              title="Close"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Body:
            Expands from up to bottom (height: 0 -> auto)
            Collapses from bottom to up (height: auto -> 0, transformOrigin: top)
        */}
        <motion.div
          initial={false}
          animate={{
            height: isMinimized ? 0 : "auto",
            opacity: isMinimized ? 0 : 1,
          }}
          transition={{
            height: { type: "spring", stiffness: 350, damping: 30 },
            opacity: { duration: 0.18 },
          }}
          style={{ transformOrigin: "top" }}
          className="overflow-hidden flex flex-col min-h-0"
        >
          {/* Overall Progress Bar */}
          <div className="relative px-4 pt-3 pb-2.5 border-b border-border/40 bg-secondary/15 shrink-0">
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
          <div className="flex-1 min-h-0 max-h-60 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
            <AnimatePresence initial={false}>
              {tasks.map((task) => {
                const kind = detectFileKind(task.name, task.type);
                const style = getFileTypeStyle(kind);
                const isQueued = task.status === "queued";
                const isInFlight = ["presigning", "uploading", "confirming"].includes(
                  task.status
                );
                const isCompleted = task.status === "completed";
                const isFailed = task.status === "error" || task.status === "aborted";
                const isGoogle = task.source === "google-drive";
                const isDropbox = task.source === "dropbox";

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
                    {/* File Icon with optional Cloud badge */}
                    <div className="relative shrink-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${style.bg} ${style.border} ${style.color}`}
                      >
                        <File className="h-4 w-4" />
                      </div>
                      {isGoogle && (
                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-border shadow-xs p-0.5">
                          <img src={GDriveLogo} alt="Google Drive" className="h-full w-full object-contain" />
                        </div>
                      )}
                      {isDropbox && (
                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-border shadow-xs p-0.5">
                          <img src={dropboxLogo} alt="Dropbox" className="h-full w-full object-contain" />
                        </div>
                      )}
                    </div>

                    {/* File Info & Progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                          {task.name}
                          {isGoogle && (
                            <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                              Google
                            </span>
                          )}
                          {isDropbox && (
                            <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                              Dropbox
                            </span>
                          )}
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
                          title="Cancel item"
                          aria-label="Cancel item"
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
                            title="Retry item"
                            aria-label="Retry item"
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
          <div className="flex items-center justify-between border-t border-border/60 bg-secondary/30 px-4 py-2 text-xs shrink-0">
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
                  ? "Transferring in background…"
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
      </motion.div>
    </>
  );
}
