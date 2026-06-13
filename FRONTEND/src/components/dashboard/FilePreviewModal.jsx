import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  FileText,
  HardDrive,
  Loader2,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { easeSmooth } from "@/lib/motion-presets";
import { detectFileKind, getFileTypeStyle } from "@/lib/file-types";
import { FileTypeIcon } from "./FileTypeIcon";
import { getFilePreviewUrl } from "../../../api/drive.js";
import api, { getCurrentUser } from "../../../api/auth.js";

/* ─── Helpers ────────────────────────────────────────────────────── */

function formatSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

const PREVIEWABLE_IMAGE_EXTS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico",
]);

const PREVIEWABLE_VIDEO_EXTS = new Set([
  "mp4", "webm", "mov", "ogg",
]);

const PREVIEWABLE_AUDIO_EXTS = new Set([
  "mp3", "wav", "ogg", "flac", "aac", "m4a",
]);

const PREVIEWABLE_PDF_EXTS = new Set(["pdf"]);

const PREVIEWABLE_TEXT_EXTS = new Set([
  "txt", "md", "json", "js", "jsx", "ts", "tsx", "py", "rb", "go",
  "rs", "java", "c", "cpp", "h", "css", "scss", "html", "xml",
  "yaml", "yml", "sql", "sh", "bash", "csv", "log", "env",
  "toml", "ini", "cfg", "conf", "vue", "svelte",
]);

function getPreviewType(fileName) {
  const ext = fileName?.split(".").pop()?.toLowerCase() || "";
  if (PREVIEWABLE_IMAGE_EXTS.has(ext)) return "image";
  if (PREVIEWABLE_VIDEO_EXTS.has(ext)) return "video";
  if (PREVIEWABLE_AUDIO_EXTS.has(ext)) return "audio";
  if (PREVIEWABLE_PDF_EXTS.has(ext)) return "pdf";
  if (PREVIEWABLE_TEXT_EXTS.has(ext)) return "text";
  return "unsupported";
}

/* ─── Preview Renderers ──────────────────────────────────────────── */

function ImagePreview({ url, fileName }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const lastPointer = useRef({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 5));
  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(z - 0.5, 1);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handlePointerDown = (e) => {
    if (zoom <= 1) return;
    setPanning(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!panning) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = () => setPanning(false);

  if (error) return <PreviewError message="Failed to load image" />;

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/5 dark:bg-white/5 rounded-xl">
      {!loaded && <PreviewLoading />}
      <div
        className={cn(
          "flex items-center justify-center w-full h-full",
          zoom > 1 ? "cursor-grab" : "cursor-zoom-in",
          panning && "cursor-grabbing",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => zoom === 1 && handleZoomIn()}
      >
        <img
          src={url}
          alt={fileName}
          crossOrigin="use-credentials"
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
            opacity: loaded ? 1 : 0,
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          draggable={false}
        />
      </div>

      {/* Zoom controls */}
      {loaded && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl border border-border/60 bg-background/90 backdrop-blur-md p-1 shadow-elegant">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs font-medium text-foreground tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function VideoPreview({ url }) {
  const [error, setError] = useState(false);

  if (error) return <PreviewError message="Failed to load video" />;

  return (
    <div className="relative flex flex-1 items-center justify-center bg-black rounded-xl overflow-hidden">
      <video
        src={url}
        crossOrigin="use-credentials"
        controls
        controlsList="nodownload"
        className="max-w-full max-h-full"
        onError={() => setError(true)}
      />
    </div>
  );
}

function AudioPreview({ url, kind }) {
  const [error, setError] = useState(false);
  const { icon: Icon, iconColor, tile } = getFileTypeStyle(kind);

  if (error) return <PreviewError message="Failed to load audio" />;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      {/* Visual icon */}
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "flex h-24 w-24 items-center justify-center rounded-3xl border-2",
            tile,
          )}
        >
          <Icon className={cn("h-12 w-12", iconColor)} />
        </motion.div>
        {/* Pulsing ring */}
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "absolute inset-0 rounded-3xl border-2",
            tile,
          )}
        />
      </div>
      <audio
        src={url}
        crossOrigin="use-credentials"
        controls
        controlsList="nodownload"
        className="w-full max-w-md"
        onError={() => setError(true)}
      />
    </div>
  );
}

function PdfPreview({ url }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <PreviewError message="Failed to load PDF. Try downloading the file instead." />
    );
  }

  return (
    <div className="flex flex-1 rounded-xl overflow-hidden border border-border">
      <iframe
        src={url}
        title="PDF Preview"
        className="w-full h-full min-h-[500px] bg-white"
        onError={() => setError(true)}
      />
    </div>
  );
}

function TextPreview({ url }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.get(url, { responseType: "text" })
      .then((res) => {
        if (!cancelled) {
          const text = res.data;
          // Limit to 50KB for display
          const truncated = text.length > 50_000
            ? text.slice(0, 50_000) + "\n\n... [truncated — file too large for preview]"
            : text;
          setContent(truncated);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load file");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [url]);

  if (loading) return <PreviewLoading />;
  if (error) return <PreviewError message={`Failed to load file: ${error}`} />;

  const lines = content?.split("\n") || [];

  return (
    <div className="flex flex-1 overflow-auto rounded-xl border border-border bg-card/50">
      <div className="flex min-w-0 w-full">
        {/* Line numbers */}
        <div className="sticky left-0 shrink-0 select-none border-r border-border bg-secondary/30 px-3 py-4 text-right font-mono text-[11px] leading-[1.7] text-muted-foreground/50">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {/* Code content */}
        <pre className="flex-1 overflow-x-auto p-4 font-mono text-[12px] leading-[1.7] text-foreground/90 whitespace-pre">
          {content}
        </pre>
      </div>
    </div>
  );
}

function UnsupportedPreview({ kind, fileName, onDownload }) {
  const { icon: Icon, iconColor, tile, label } = getFileTypeStyle(kind);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-2xl border-2",
          tile,
        )}
      >
        <Icon className={cn("h-10 w-10", iconColor)} />
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold text-foreground">
          No preview available
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Preview is not supported for <span className="font-medium text-foreground">{label}</span> files.
          Download the file to view it locally.
        </p>
      </div>
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 h-10 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 active:translate-y-px transition-all cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Download file
        </button>
      )}
    </div>
  );
}

/* ─── Shared States ──────────────────────────────────────────────── */

function PreviewLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <div className="absolute inset-0 h-10 w-10 rounded-full bg-primary/10 animate-ping" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          Loading preview…
        </p>
      </div>
    </div>
  );
}

function PreviewError({ message }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <div>
        <h4 className="font-display text-base font-semibold text-foreground">
          Preview failed
        </h4>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
          {message}
        </p>
      </div>
    </div>
  );
}

/* ─── Main Modal ─────────────────────────────────────────────────── */

export function FilePreviewModal({
  file,
  files = [],
  onClose,
  onDownload,
  onNavigateFile,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef(null);

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Perform auth check before loading the preview URLs natively
  useEffect(() => {
    if (!file) return;

    let active = true;
    setIsAuthChecking(true);
    setAuthError(null);

    getCurrentUser()
      .then(() => {
        if (active) {
          setIsAuthChecking(false);
        }
      })
      .catch((err) => {
        if (active) {
          setAuthError(err);
          setIsAuthChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [file?.id]);

  // Compute current index for prev/next
  const currentIndex = useMemo(() => {
    if (!file || files.length === 0) return -1;
    return files.findIndex((f) => f.id === file.id);
  }, [file, files]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev) onNavigateFile?.(files[currentIndex - 1]);
  }, [hasPrev, files, currentIndex, onNavigateFile]);

  const goToNext = useCallback(() => {
    if (hasNext) onNavigateFile?.(files[currentIndex + 1]);
  }, [hasNext, files, currentIndex, onNavigateFile]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!file) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      }
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [file, onClose, goToPrev, goToNext]);

  // Lock body scroll
  useEffect(() => {
    if (!file) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [file]);

  if (!file) return null;

  const kind = detectFileKind(file.name, file.kind);
  const { label: kindLabel } = getFileTypeStyle(kind);
  const previewType = getPreviewType(file.name);
  const previewUrl = getFilePreviewUrl(file.id);
  const sizeStr = typeof file.size === "string" ? file.size : formatSize(file.size || file.rawSize);

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Flex container wrapper for centering and sizing */}
      <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none p-3 sm:p-5">
        {/* Modal container */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: "tween", duration: 0.25, ease: easeSmooth }}
          className={cn(
            "relative flex flex-col pointer-events-auto",
            "bg-background border border-border/60 shadow-elegant",
            "rounded-2xl overflow-hidden",
            "w-full h-full",
            "md:w-[90vw] md:max-w-5xl md:h-[88vh] md:max-h-[800px]",
          )}
          onClick={(e) => e.stopPropagation()}
        >
        {/* ── Header ── */}
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileTypeIcon kind={kind} size="sm" />
            <div className="min-w-0">
              <h2 className="font-display text-sm sm:text-base font-semibold text-foreground truncate">
                {file.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <FileText className="h-2.5 w-2.5" />
                  {kindLabel}
                </span>
                {sizeStr && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <HardDrive className="h-2.5 w-2.5" />
                    {sizeStr}
                  </span>
                )}
                {files.length > 1 && (
                  <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                    {currentIndex + 1} / {files.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1 shrink-0">
            {onDownload && (
              <button
                type="button"
                onClick={() => onDownload(file.id, file.name)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ── Content area ── */}
        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          {/* Prev button */}
          {hasPrev && (
            <button
              type="button"
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-background/90 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/80 backdrop-blur-sm shadow-sm transition-all cursor-pointer"
              title="Previous file (←)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Preview renderer */}
          <div className="flex flex-1 min-h-0 p-3 sm:p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: easeSmooth }}
                className="flex flex-1 min-h-0"
              >
                {isAuthChecking ? (
                  <PreviewLoading />
                ) : authError ? (
                  <PreviewError message="Authentication expired. Redirecting..." />
                ) : (
                  <>
                    {previewType === "image" && (
                      <ImagePreview url={previewUrl} fileName={file.name} />
                    )}
                    {previewType === "video" && (
                      <VideoPreview url={previewUrl} />
                    )}
                    {previewType === "audio" && (
                      <AudioPreview url={previewUrl} kind={kind} />
                    )}
                    {previewType === "pdf" && (
                      <PdfPreview url={previewUrl} />
                    )}
                    {previewType === "text" && (
                      <TextPreview url={previewUrl} />
                    )}
                    {previewType === "unsupported" && (
                      <UnsupportedPreview
                        kind={kind}
                        fileName={file.name}
                        onDownload={onDownload ? () => onDownload(file.id, file.name) : null}
                      />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Next button */}
          {hasNext && (
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-background/90 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/80 backdrop-blur-sm shadow-sm transition-all cursor-pointer"
              title="Next file (→)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* ── Footer — keyboard hints ── */}
        <footer className="hidden sm:flex items-center justify-center gap-4 border-t border-border px-4 py-2 shrink-0">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] rounded border border-border bg-secondary/50 px-1 text-[9px] font-medium">
                Esc
              </kbd>
              Close
            </span>
            {files.length > 1 && (
              <>
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] rounded border border-border bg-secondary/50 px-1 text-[9px] font-medium">
                    ←
                  </kbd>
                  <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] rounded border border-border bg-secondary/50 px-1 text-[9px] font-medium">
                    →
                  </kbd>
                  Navigate
                </span>
              </>
            )}
          </div>
        </footer>
        </motion.div>
      </div>
    </>,
    document.body,
  );
}
