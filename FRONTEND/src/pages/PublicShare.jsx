import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  Globe,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Edit,
  Save,
  X,
  Check,
  Share2,
  HardDrive,
  KeyRound,
  FileImage,
  FileVideo,
  FileAudio,
  ChevronLeft,
  Minimize2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { easeSmooth } from "@/lib/motion-presets";
import { detectFileKind, getFileTypeStyle } from "@/lib/file-types";
import { FileTypeIcon } from "@/components/dashboard/FileTypeIcon";
import api from "../../api/auth.js";

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

function ImagePreview({ url }) {
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
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/5 dark:bg-white/5 rounded-2xl border border-border/50 min-h-[400px]">
      {!loaded && <PreviewLoading />}
      <div
        className={cn(
          "flex items-center justify-center w-full h-full p-4",
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
          alt="Shared content"
          className="max-w-full max-h-[70vh] object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
            opacity: loaded ? 1 : 0,
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          draggable={false}
        />
      </div>

      {loaded && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl border border-border bg-background/90 backdrop-blur-md p-1 shadow-elegant">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs font-semibold text-foreground tabular-nums">
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
    <div className="relative flex flex-1 items-center justify-center bg-black rounded-2xl overflow-hidden border border-border/50 max-h-[70vh]">
      <video
        src={url}
        controls
        controlsList="nodownload"
        className="max-w-full max-h-[70vh]"
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
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-12 bg-secondary/15 rounded-2xl border border-border/50">
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
    <div className="flex flex-1 rounded-2xl overflow-hidden border border-border/50 min-h-[500px]">
      <iframe
        src={url}
        title="PDF Preview"
        className="w-full h-full bg-white"
        onError={() => setError(true)}
      />
    </div>
  );
}

function PreviewLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-16">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <div className="absolute inset-0 h-10 w-10 rounded-full bg-primary/10 animate-ping" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          Loading file preview…
        </p>
      </div>
    </div>
  );
}

function PreviewError({ message }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center bg-secondary/5 rounded-2xl border border-destructive/10">
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

function UnsupportedPreview({ kind, onDownload }) {
  const { icon: Icon, iconColor, tile, label } = getFileTypeStyle(kind);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-12 text-center bg-secondary/10 rounded-2xl border border-border/50">
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

/* ─── Main PublicShare Page ─────────────────────────────────────── */

export default function PublicShare() {
  const { token } = useParams();
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Password authorization state
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlockError, setUnlockError] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  // Text file preview & edit state
  const [textContent, setTextContent] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [signedAccount, setSignedAccount] = useState(null)
  // Fetch metadata on mount or when token/accessToken changes
  const fetchMetadata = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const response = await api.get(`/public/shares/${token}`, { headers });
      setMetadata(response.data.share);
      setRequiresPassword(response.data.share.requiresPassword);
      setAuthRequired(response.data.share.requiresAuth);
      setIsAuthenticated(response.data.share.isAuthenticated);
      setIsAuthorized(response.data.share.isAuthorized);
      setSignedAccount(response.data?.share.signedAccount)
    } catch (err) {
      if (err.response?.status === 401) {
        if (err.response?.data?.code === "AUTH_REQUIRED") {
          setAuthRequired(true);
          setIsAuthenticated(false);
          setIsAuthorized(false);
        } else {
          setRequiresPassword(true);
        }
      } else {
        setError(
          err.response?.data?.message ||
          "Failed to retrieve shared file details."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Fetch text file content
  const fetchTextContent = useCallback(async () => {
    if (!metadata || getPreviewType(metadata.name) !== "text") return;

    setTextLoading(true);
    setTextError(null);
    try {
      const headers = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const previewUrl = `/public/shares/${token}/preview`;
      const response = await api.get(previewUrl, {
        headers,
        responseType: "text",
      });

      // Truncate preview if it's huge, but store full content for editing
      const text = response.data;
      setTextContent(text);
      setEditValue(text);
    } catch (err) {
      console.log(err.response?.data);
      setTextError(err.response?.data?.message || "Failed to load file text.");
      setSignedAccount(JSON.parse(err.response?.data)?.signedAccount)
    } finally {
      setTextLoading(false);
    }
  }, [metadata, token, accessToken]);
  useEffect(() => {
    if (metadata) {
      fetchTextContent();
    }
  }, [metadata, fetchTextContent]);

  // Handle password submission
  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setUnlocking(true);
    setUnlockError(null);
    try {
      const response = await api.post(`/public/shares/${token}/access`, {
        password: password.trim(),
      });
      const tokenVal = response.data.accessToken;
      setAccessToken(tokenVal);
      setRequiresPassword(false);

      // Re-fetch the full metadata to populate file details & counts
      const metaRes = await api.get(`/public/shares/${token}`, {
        headers: { Authorization: `Bearer ${tokenVal}` }
      });
      setMetadata(metaRes.data.share);
      setRequiresPassword(metaRes.data.share.requiresPassword);
      setAuthRequired(metaRes.data.share.requiresAuth);
      setIsAuthenticated(metaRes.data.share.isAuthenticated);
      setIsAuthorized(metaRes.data.share.isAuthorized);
    } catch (err) {
      setUnlockError(err.response?.data?.message || "Incorrect password.");
    } finally {
      setUnlocking(false);
    }
  };

  // Handle file download
  const handleDownload = async () => {
    if (!metadata) return;
    try {
      const headers = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      // Step 1: Obtain a short-lived download token
      const { data } = await api.post(`/public/shares/${token}/download-token`, {}, { headers });

      // Step 2: Navigate hidden iframe to the public download URL
      const downloadUrl = `${api.defaults.baseURL}/public/shares/download/${data.token}`;
      let iframe = document.getElementById("__drivya_download_frame");
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "__drivya_download_frame";
        iframe.style.display = "none";
        document.body.appendChild(iframe);
      }
      iframe.src = downloadUrl;
    } catch (err) {
      // alert("Download failed: Permission denied or expired share.");
    }
  };

  // Save changes to text file content
  const handleSaveChanges = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const headers = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      await api.put(
        `/public/shares/${token}/edit`,
        { content: editValue },
        { headers }
      );
      setTextContent(editValue);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Re-fetch metadata to update size dynamically
      const metaRes = await api.get(`/public/shares/${token}`, { headers });
      setMetadata(metaRes.data.share);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save edits.");
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut Alt+S inside editor
  const handleEditorKeyDown = (e) => {
    if (e.altKey && e.key === "s") {
      e.preventDefault();
      handleSaveChanges();
    }
  };

  const kind = metadata ? detectFileKind(metadata.name, metadata.mimeType) : "file";
  const previewType = metadata ? getPreviewType(metadata.name) : "unsupported";
  const sizeStr = metadata ? formatSize(metadata.size) : "";

  // Preview URL query binding
  const filePreviewUrl = useMemo(() => {
    if (!metadata) return "";
    let url = `${api.defaults.baseURL}/public/shares/${token}/preview`;
    if (accessToken) {
      url += `?accessToken=${encodeURIComponent(accessToken)}`;
    }
    return url;
  }, [token, metadata, accessToken]);

  const textLines = editValue.split("\n");

  return (
    <div className="min-h-screen bg-background relative flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
      {/* High-quality Glowing Ambient Backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[130px] pointer-events-none animate-pulse" />

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-semibold">
              Verifying cloud share link…
            </p>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md rounded-3xl border border-white/10 dark:border-white/5 bg-background/80 dark:bg-card/85 shadow-elegant backdrop-blur-lg p-6 sm:p-8 text-center space-y-6"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Unable to Access
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {error}
              </p>
            </div>
          </motion.div>
        ) : authRequired && !isAuthenticated ? (
          /* ── Authentication Required Screen ── */
          <motion.div
            key="auth-required"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md rounded-3xl border border-white/10 dark:border-white/5 bg-background/80 dark:bg-card/85 shadow-elegant backdrop-blur-lg p-6 sm:p-8"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-glow">
                <Globe className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                  Restricted Access
                </h2>
                <p className="text-xs text-muted-foreground/80 font-medium tracking-wide uppercase">
                  Authorized Users Only
                </p>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                This share link is restricted. Please sign in to verify your access permissions.
              </p>
              <button
                onClick={() => {
                  window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
                }}
                className="mt-4 w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 active:scale-98 transition-all cursor-pointer"
              >
                Sign in to Access
              </button>
            </div>
          </motion.div>
        ) : authRequired && isAuthenticated && !isAuthorized ? (
          /* ── Unauthorized Access Screen ── */
          <motion.div
            key="unauthorized"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md rounded-3xl border border-white/10 dark:border-white/5 bg-background/80 dark:bg-card/85 shadow-elegant backdrop-blur-lg p-6 sm:p-8"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/10 text-destructive shadow-glow">
                <UserX className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                  Permission Denied
                </h2>
                <p className="text-xs text-muted-foreground/80 font-medium tracking-wide uppercase">
                  Access Unauthorized
                </p>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                You are currently signed in, but you do not have permission to access this shared file. Please contact the owner for access.
              </p>
              <div className="mt-4 flex flex-col gap-2 w-full">
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">
                  Signed in as
                </p>
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/50 text-xs font-medium text-foreground truncate">
                  {signedAccount ? signedAccount : ''}
                </div>
              </div>
            </div>
          </motion.div>
        ) : requiresPassword ? (
          /* ── Password Authentication Screen ── */
          <motion.div
            key="password"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md rounded-3xl border border-white/10 dark:border-white/5 bg-background/80 dark:bg-card/85 shadow-elegant backdrop-blur-lg p-6 sm:p-8"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-500 shadow-glow animate-pulse">
                <Lock className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                  Security Lock
                </h2>
                <p className="text-xs text-muted-foreground/80 font-medium tracking-wide uppercase">
                  Protected Shared File
                </p>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                The owner has restricted access to this link. Please enter the security key to unlock.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="mt-6 space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter security password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-border/80 bg-secondary/15 pl-11 pr-11 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {unlockError && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/25 rounded-xl px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={unlocking || !password.trim()}
                className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {unlocking ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Unlock Shared File"
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          /* ── Main View Screen ── */
          <motion.div
            key="viewer"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-full max-w-4xl rounded-3xl border border-white/10 dark:border-white/5 bg-background/80 dark:bg-card/85 shadow-elegant backdrop-blur-lg flex flex-col overflow-hidden"
          >
            {/* Header */}
            <header className="border-b border-border px-5 py-4 sm:px-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <FileTypeIcon kind={kind} size="lg" />
                <div className="min-w-0">
                  <h1 className="font-display text-sm sm:text-base font-bold text-foreground truncate max-w-[200px] sm:max-w-md">
                    {metadata.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-bold text-muted-foreground/80 bg-secondary/50 border border-border/30 px-2 py-0.5 rounded-lg">
                      {sizeStr}
                    </span>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Globe className="h-3 w-3 animate-pulse" />
                      Shared Link
                    </span>

                    {metadata?.sharedBy?.label ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/80 bg-secondary/50 border border-border/30 px-2 py-0.5 rounded-lg">
                        {metadata.sharedBy?.avatarUrl ? (() => {
                          const raw = metadata.sharedBy.avatarUrl;
                          const isHttp = raw.startsWith("http://") || raw.startsWith("https://");
                          const isRootPath = raw.startsWith("/");
                          const resolvedSrc = isRootPath
                            ? `${api.defaults.baseURL}${raw}`
                            : isHttp
                              ? raw
                              : null; // unknown/relative format, don’t try to load
                          if (!resolvedSrc) return null;

                          return (
                            <img
                              src={resolvedSrc}
                              alt={`${metadata.sharedBy.label} avatar`}
                              className="h-4 w-4 rounded-full object-cover border border-border/60"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          );
                        })() : null}

                        <span>
                          Shared by{" "}
                          <span className="text-foreground font-semibold">
                            {metadata.sharedBy.label}
                          </span>
                        </span>

                        {metadata.sharedBy?.email ? (
                          <span className="text-muted-foreground/80 font-medium">
                            {" "}
                            · {metadata.sharedBy.email}
                          </span>
                        ) : null}
                      </span>
                    ) : metadata?.sharedByLabel ? (
                      <span className="text-[10px] font-medium text-muted-foreground/80 bg-secondary/50 border border-border/30 px-2 py-0.5 rounded-lg">
                        Shared by{" "}
                        <span className="text-foreground font-semibold">
                          {metadata.sharedByLabel}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {metadata.permissions?.allowDownload && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex h-9 px-4 items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm"
                    title="Download File"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                )}
              </div>
            </header>

            {/* Content Area */}
            <div className="p-4 sm:p-6 flex flex-col flex-1 min-h-[400px]">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  /* ── Text Editor Mode ── */
                  <motion.div
                    key="editor"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col flex-1"
                  >
                    <div className="flex items-center justify-between mb-3 bg-secondary/20 p-2.5 rounded-xl border border-border/40">
                      <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                        <Edit className="h-3.5 w-3.5 text-primary" /> Edit Mode
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditValue(textContent);
                            setIsEditing(false);
                          }}
                          className="h-8 px-3 rounded-lg text-xs font-semibold hover:bg-secondary border border-border/60 text-muted-foreground cursor-pointer transition-colors"
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveChanges}
                          disabled={saving}
                          className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                        >
                          {saving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                          Save Edits
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-1 overflow-auto rounded-xl border border-border bg-card/50 min-h-[300px]">
                      <div className="flex min-w-0 w-full font-mono text-[12px] leading-[1.7]">
                        {/* Line numbers */}
                        <div className="shrink-0 select-none border-r border-border bg-secondary/20 px-3 py-4 text-right text-muted-foreground/40">
                          {textLines.map((_, i) => (
                            <div key={i}>{i + 1}</div>
                          ))}
                        </div>
                        {/* Interactive Textarea */}
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleEditorKeyDown}
                          placeholder="Write text/code here..."
                          className="flex-1 resize-none p-4 bg-transparent outline-none text-foreground/90 whitespace-pre scrollbar-none min-h-[300px]"
                          spellCheck={false}
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* ── Normal View Mode ── */
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col flex-1"
                  >
                    {/* Floating Save success message */}
                    {saveSuccess && (
                      <div className="mb-4 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3.5 py-2.5">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>Changes saved successfully!</span>
                      </div>
                    )}

                    {previewType === "text" && metadata.permissions?.allowEdit && (
                      <div className="flex items-center justify-end mb-3">
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="inline-flex h-8 px-3 items-center justify-center gap-1 rounded-lg border border-border bg-secondary/40 hover:bg-secondary text-xs font-semibold text-foreground/80 cursor-pointer transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit Document
                        </button>
                      </div>
                    )}

                    {/* Previews mapping */}
                    <div className="flex flex-1 min-h-0">
                      {previewType === "image" && (
                        <ImagePreview url={filePreviewUrl} />
                      )}
                      {previewType === "video" && (
                        <VideoPreview url={filePreviewUrl} />
                      )}
                      {previewType === "audio" && (
                        <AudioPreview url={filePreviewUrl} kind={kind} />
                      )}
                      {previewType === "pdf" && (
                        <PdfPreview url={filePreviewUrl} />
                      )}
                      {previewType === "text" && (
                        <>
                          {textLoading ? (
                            <PreviewLoading />
                          ) : textError ? (
                            <PreviewError message={textError} />
                          ) : (
                            <div className="flex flex-1 overflow-auto rounded-xl border border-border bg-card/50 min-h-[300px]">
                              <div className="flex min-w-0 w-full">
                                <div className="sticky left-0 shrink-0 select-none border-r border-border bg-secondary/30 px-3 py-4 text-right font-mono text-[11px] leading-[1.7] text-muted-foreground/50">
                                  {textContent.split("\n").map((_, i) => (
                                    <div key={i}>{i + 1}</div>
                                  ))}
                                </div>
                                <pre className="flex-1 overflow-x-auto p-4 font-mono text-[12px] leading-[1.7] text-foreground/90 whitespace-pre">
                                  {textContent || "[Empty file]"}
                                </pre>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {previewType === "unsupported" && (
                        <UnsupportedPreview
                          kind={kind}
                          onDownload={metadata.permissions?.allowDownload ? handleDownload : null}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <footer className="border-t border-border px-5 py-3.5 sm:px-6 flex items-center justify-between text-xs text-muted-foreground/70 flex-wrap gap-2 shrink-0">
              <span className="font-medium">
                © {new Date().getFullYear()} Drivya Link Storage
              </span>
              <span className="flex items-center gap-1">
                Securely shared files · End-to-end cloud infrastructure
              </span>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
