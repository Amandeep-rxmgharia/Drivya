import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import dropboxLogo from "../../../assets/images/Dropbox-Icon.svg";
import {
  X,
  Search,
  Folder,
  FolderOpen,
  File,
  ArrowLeft,
  Check,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  LayoutGrid,
  List,
  RefreshCw,
  Image,
  Video,
  Music,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Download,
  ChevronRight,
  Import,
  FolderTree,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDropboxStatus,
  disconnectDropbox,
  listDropboxFiles,
  importDropboxFiles,
  getDropboxAuthUrl,
  cancelDropboxImport,
} from "../../../api/dropbox";
import { listAllDirectories } from "../../../api/drive";
import api from "../../../api/auth";

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatSize(bytes) {
  if (bytes == null) return "Unknown size";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function getFileVisuals(file) {
  const nameLower = (file?.name || "").toLowerCase();
  const isFolder = file?.isFolder;

  if (isFolder) {
    return {
      Icon: Folder,
      color: "text-[#0061FF]",
      bg: "from-[#0061FF]/15 to-[#0061FF]/5",
      badge: "text-[#0061FF] bg-[#0061FF]/10",
      label: "Folder",
    };
  } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(nameLower)) {
    return {
      Icon: Image,
      color: "text-pink-400",
      bg: "from-pink-500/20 to-purple-600/10",
      badge: "text-pink-400 bg-pink-400/10",
      label: "Image",
    };
  } else if (/\.(mp4|mkv|mov|avi|wmv|flv)$/i.test(nameLower)) {
    return {
      Icon: Video,
      color: "text-purple-400",
      bg: "from-purple-500/20 to-indigo-600/10",
      badge: "text-purple-400 bg-purple-400/10",
      label: "Video",
    };
  } else if (/\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(nameLower)) {
    return {
      Icon: Music,
      color: "text-emerald-400",
      bg: "from-emerald-500/20 to-teal-600/10",
      badge: "text-emerald-400 bg-emerald-400/10",
      label: "Audio",
    };
  } else if (nameLower.endsWith(".pdf")) {
    return {
      Icon: FileText,
      color: "text-rose-400",
      bg: "from-red-500/20 to-rose-600/10",
      badge: "text-rose-400 bg-rose-400/10",
      label: "PDF",
    };
  } else if (/\.(xls|xlsx|csv)$/i.test(nameLower)) {
    return {
      Icon: FileSpreadsheet,
      color: "text-green-400",
      bg: "from-green-500/20 to-emerald-600/10",
      badge: "text-green-400 bg-green-400/10",
      label: "Sheet",
    };
  } else if (/\.(ppt|pptx)$/i.test(nameLower)) {
    return {
      Icon: Presentation,
      color: "text-orange-400",
      bg: "from-orange-500/20 to-amber-600/10",
      badge: "text-orange-400 bg-orange-400/10",
      label: "Slide",
    };
  } else if (
    /\.(js|jsx|ts|tsx|json|html|css|py|go|cpp|c|java|sh)$/i.test(nameLower)
  ) {
    return {
      Icon: FileCode,
      color: "text-cyan-400",
      bg: "from-cyan-500/20 to-blue-600/10",
      badge: "text-cyan-400 bg-cyan-400/10",
      label: "Code",
    };
  }
  return {
    Icon: File,
    color: "text-slate-400",
    bg: "from-slate-700/20 to-slate-900/10",
    badge: "text-slate-400 bg-slate-400/10",
    label: "File",
  };
}

// ─── Thumbnail Load Queue / Concurrency Control to prevent 429 errors ──────────
const thumbnailQueue = [];
let activeThumbnailRequests = 0;
const MAX_CONCURRENT_THUMBNAILS = 4;

const processThumbnailQueue = () => {
  if (
    activeThumbnailRequests >= MAX_CONCURRENT_THUMBNAILS ||
    thumbnailQueue.length === 0
  ) {
    return;
  }

  const { loadFn, resolve, reject } = thumbnailQueue.shift();
  activeThumbnailRequests++;

  loadFn()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      activeThumbnailRequests--;
      setTimeout(() => {
        processThumbnailQueue();
      }, 50);
    });
};

const queueThumbnailLoad = (loadFn) => {
  return new Promise((resolve, reject) => {
    thumbnailQueue.push({ loadFn, resolve, reject });
    processThumbnailQueue();
  });
};

// ─── Thumbnail Component ──────────────────────────────────────────────────────

function DropboxThumbnail({
  filePath,
  alt,
  fallbackIcon: FallbackIcon,
  className,
  iconClass,
  labelColor,
  labelText,
  isFolder,
}) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isInView) return;

    let active = true;
    let objectUrl = null;

    const loadThumbnail = async () => {
      try {
        setLoading(true);
        setError(false);

        const response = await queueThumbnailLoad(async () => {
          if (!active) throw new Error("Component unmounted");
          return await api.get(`/api/dropbox/thumbnail`, {
            params: { path: filePath },
            responseType: "blob",
          });
        });

        if (active) {
          objectUrl = URL.createObjectURL(response.data);
          setSrc(objectUrl);
        }
      } catch (err) {
        if (active && err.message !== "Component unmounted") {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadThumbnail();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filePath, isInView]);

  if (!isInView || loading) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center bg-slate-800/10"
      >
        {isInView && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full">
        <FallbackIcon
          className={cn(
            "h-8 w-8 transition-transform duration-300 group-hover:scale-110",
            isFolder ? "text-[#0061FF]" : iconClass,
          )}
        />
        <span
          className={cn(
            "text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider",
            labelColor,
          )}
        >
          {labelText}
        </span>
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function DropboxModal({
  isOpen,
  onClose,
  currentDirId,
  userProfile,
  onRefresh,
}) {
  // ── Auth state ───────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(false);
  const [dropboxEmail, setDropboxEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // ── Dropbox browser state ────────────────────────────────────
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [folderStack, setFolderStack] = useState([{ id: "", name: "Dropbox" }]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  // ── Selection state ──────────────────────────────────────────
  const [selectedFiles, setSelectedFiles] = useState({});

  // ── Drivya destination folder state ─────────────────────────
  const [rawDrivyaDirs, setRawDrivyaDirs] = useState([]);
  const [drivyaFolderStack, setDrivyaFolderStack] = useState([
    { id: "root", name: "My Drive" },
  ]);
  const [targetDirId, setTargetDirId] = useState(currentDirId || "root");
  const [targetDirName, setTargetDirName] = useState("My Drive (Root)");

  // ── Mobile tab state ─────────────────────────────────────────
  const [mobileTab, setMobileTab] = useState("browse"); // 'browse' | 'queue'

  // ── Import / SSE state ───────────────────────────────────────
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [fileProgress, setFileProgress] = useState({});
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  const currentFolderId = folderStack[folderStack.length - 1].id;

  // ── Derived ──────────────────────────────────────────────────
  const importableFiles = useMemo(
    () => files.filter((f) => !f.isFolder && f.canDownload),
    [files],
  );
  const selectedCount = Object.keys(selectedFiles).length;
  const selectedList = useMemo(
    () => Object.values(selectedFiles),
    [selectedFiles],
  );
  const isAllSelected = useMemo(
    () =>
      importableFiles.length > 0 &&
      importableFiles.every((f) => selectedFiles[f.id]),
    [importableFiles, selectedFiles],
  );

  const selectedTotalSize = useMemo(
    () => selectedList.reduce((s, f) => s + (f.size || 1024 * 1024), 0),
    [selectedList],
  );
  const storageRemaining = useMemo(() => {
    if (!userProfile) return 0;
    return Math.max(0, userProfile.storageLimit - userProfile.storageUsed);
  }, [userProfile]);
  const isOverQuota = selectedTotalSize > storageRemaining;

  const getDrivyaChildren = useCallback(
    (parentId) => {
      const rootDir = rawDrivyaDirs.find(
        (d) => d.parentDirId === null || d.depth === 0,
      );
      const rootId = rootDir?._id?.toString();

      return rawDrivyaDirs.filter((d) => {
        if (parentId === "root") {
          return d.parentDirId?.toString() === rootId;
        }
        return d.parentDirId?.toString() === parentId;
      });
    },
    [rawDrivyaDirs],
  );

  const failedFileIds = useMemo(
    () =>
      Object.keys(fileProgress).filter(
        (id) => fileProgress[id].status === "failed",
      ),
    [fileProgress],
  );

  // ── On open ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    checkStatus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || rawDrivyaDirs.length === 0) return;

    if (!currentDirId || currentDirId === "root") {
      setDrivyaFolderStack([{ id: "root", name: "My Drive" }]);
      setTargetDirId("root");
      setTargetDirName("My Drive (Root)");
      return;
    }

    const currentFolder = rawDrivyaDirs.find(
      (d) => d._id?.toString() === currentDirId,
    );
    if (!currentFolder) return;

    const dirMap = {};
    rawDrivyaDirs.forEach((d) => {
      dirMap[d._id.toString()] = d;
    });

    const stack = [{ id: "root", name: "My Drive" }];

    currentFolder.path.forEach((parentId) => {
      const parentDir = dirMap[parentId.toString()];
      if (parentDir && parentDir.parentDirId !== null) {
        stack.push({ id: parentDir._id.toString(), name: parentDir.name });
      }
    });

    stack.push({ id: currentFolder._id.toString(), name: currentFolder.name });

    setDrivyaFolderStack(stack);
    setTargetDirId(currentDirId);
    setTargetDirName(currentFolder.name);
  }, [isOpen, currentDirId, rawDrivyaDirs]);

  // ── Status check ─────────────────────────────────────────────
  const checkStatus = async () => {
    setAuthLoading(true);
    setError(null);
    try {
      const status = await getDropboxStatus();
      setIsConnected(status.connected);
      setDropboxEmail(status.email);
      if (status.connected) {
        fetchFiles("");
        fetchDrivyaDirectories();
      }
    } catch {
      setError("Unable to connect to service. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Drivya dirs ───────────────────────────────────────────────
  const fetchDrivyaDirectories = async () => {
    try {
      const data = await listAllDirectories();
      if (data?.directories) setRawDrivyaDirs(data.directories);
    } catch (err) {
      console.warn("Failed to load destination directories:", err);
    }
  };

  // ── Dropbox file listing ─────────────────────────────────────
  const fetchFiles = async (
    folderPath,
    paginationCursor = null,
    append = false,
    query = "",
  ) => {
    if (append) setLoadMoreLoading(true);
    else {
      setLoadingFiles(true);
      setError(null);
    }
    try {
      const data = await listDropboxFiles({
        path: query ? null : folderPath,
        cursor: paginationCursor,
        query: query || null,
      });
      if (append) {
        setFiles((prev) => [...prev, ...data.files]);
      } else {
        setFiles(data.files || []);
      }
      setCursor(data.cursor || null);
      setHasMore(data.hasMore || false);
    } catch (err) {
      if (
        err.response?.status === 401 ||
        err.code === "DROPBOX_TOKEN_EXPIRED"
      ) {
        setIsConnected(false);
        setDropboxEmail("");
      } else {
        setError("Failed to load files from Dropbox.");
      }
    } finally {
      setLoadingFiles(false);
      setLoadMoreLoading(false);
    }
  };

  // ── Debounced search ──────────────────────────────────────────
  useEffect(() => {
    if (!isConnected || !isOpen) return;
    const t = setTimeout(() => {
      if (searchQuery.trim()) fetchFiles(null, null, false, searchQuery);
      else fetchFiles(currentFolderId);
    }, 450);
    return () => clearTimeout(t);
  }, [searchQuery, currentFolderId, isConnected]);

  // ── Auth handlers ─────────────────────────────────────────────
  const handleConnect = async () => {
    try {
      setAuthLoading(true);
      const { url } = await getDropboxAuthUrl();
      window.location.href = url;
    } catch {
      setError("Could not launch Dropbox authentication.");
      setAuthLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Dropbox?")) return;
    try {
      await disconnectDropbox();
      setIsConnected(false);
      setDropboxEmail("");
      setFiles([]);
      setSelectedFiles({});
    } catch {
      setError("Failed to disconnect Dropbox.");
    }
  };

  // ── Navigation ────────────────────────────────────────────────
  const handleFolderClick = (folder) => {
    if (searchQuery) setSearchQuery("");
    setFolderStack((prev) => [
      ...prev,
      { id: folder.pathLower, name: folder.name },
    ]);
    fetchFiles(folder.pathLower);
  };

  const handleBreadcrumbNav = (index) => {
    if (index === folderStack.length - 1) return;
    const newStack = folderStack.slice(0, index + 1);
    setFolderStack(newStack);
    fetchFiles(newStack[newStack.length - 1].id);
  };

  const handleGoBack = () => {
    if (folderStack.length <= 1) return;
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    fetchFiles(newStack[newStack.length - 1].id);
  };

  // ── Selection ─────────────────────────────────────────────────
  const handleToggleFile = (file) => {
    setSelectedFiles((prev) => {
      const next = { ...prev };
      if (next[file.id]) delete next[file.id];
      else next[file.id] = file;
      return next;
    });
  };

  const handleRemoveFromQueue = (fileId) => {
    setSelectedFiles((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  };

  const handleSelectAllToggle = () => {
    setSelectedFiles((prev) => {
      const next = { ...prev };
      if (isAllSelected) importableFiles.forEach((f) => delete next[f.id]);
      else importableFiles.forEach((f) => (next[f.id] = f));
      return next;
    });
  };

  // ── Import / Cancel ────────────────────────────────────────────
  const handleCancel = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    try {
      await cancelDropboxImport();
    } catch (err) {
      console.warn("Failed to request explicit cancel on backend:", err);
    }
  };

  const handleImport = async () => {
    if (selectedCount === 0) return;
    if (isOverQuota) {
      alert("Selected files exceed your available storage quota.");
      return;
    }

    const filePaths = Object.values(selectedFiles).map((f) => f.pathLower);
    setIsImporting(true);
    setImportSummary(null);
    setFileProgress({});
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const initialProgress = {};
    Object.values(selectedFiles).forEach((f) => {
      initialProgress[f.pathLower] = {
        percent: 0,
        status: "waiting",
        name: f.name,
      };
    });
    setFileProgress(initialProgress);

    try {
      await importDropboxFiles(
        filePaths,
        targetDirId === "root" ? null : targetDirId,
        {
          onProgress: (data) => {
            setFileProgress((prev) => ({
              ...prev,
              [data.fileId]: {
                percent: data.percent,
                status: data.status,
                name: data.fileName,
                error: data.error || null,
              },
            }));
          },
          onDone: (data) => {
            setImportSummary(data);
            abortControllerRef.current = null;
            window.dispatchEvent(new CustomEvent("refresh-drive"));
            if (onRefresh) onRefresh();
          },
          onCancelled: (data) => {
            setImportSummary({
              imported: data.imported || 0,
              failed: data.failed || 0,
              totalSize: data.totalSize || 0,
              files: data.files || [],
              errors: data.errors || [],
              cancelled: true,
            });
            abortControllerRef.current = null;
            window.dispatchEvent(new CustomEvent("refresh-drive"));
            if (onRefresh) onRefresh();
          },
          onError: (data) => {
            setError(data.error || "An error occurred during import.");
            abortControllerRef.current = null;
          },
        },
        controller.signal,
      );
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to import files.");
      }
      abortControllerRef.current = null;
    }
  };

  const handleRetry = async (retryFileIds) => {
    if (!retryFileIds?.length) return;
    setIsImporting(true);
    setImportSummary(null);
    setError(null);
    setFileProgress((prev) => {
      const next = { ...prev };
      retryFileIds.forEach((id) => {
        next[id] = { ...next[id], percent: 0, status: "waiting", error: null };
      });
      return next;
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await importDropboxFiles(
        retryFileIds,
        targetDirId === "root" ? null : targetDirId,
        {
          onProgress: (data) => {
            setFileProgress((prev) => ({
              ...prev,
              [data.fileId]: {
                percent: data.percent,
                status: data.status,
                name: data.fileName,
                error: data.error || null,
              },
            }));
          },
          onDone: () => {
            setFileProgress((currentProgress) => {
              const entries = Object.entries(currentProgress);
              const importedCount = entries.filter(
                ([, p]) => p.status === "complete",
              ).length;
              const failedCount = entries.filter(
                ([, p]) => p.status === "failed",
              ).length;
              const totalSize = Object.values(selectedFiles).reduce(
                (s, f) =>
                  currentProgress[f.pathLower]?.status === "complete"
                    ? s + (f.size || 1024 * 1024)
                    : s,
                0,
              );

              setImportSummary({
                imported: importedCount,
                failed: failedCount,
                totalSize,
                files: entries
                  .filter(([, p]) => p.status === "complete")
                  .map(([id, p]) => ({ fileId: id, fileName: p.name })),
                errors: entries
                  .filter(([, p]) => p.status === "failed")
                  .map(([id, p]) => ({
                    fileId: id,
                    fileName: p.name,
                    error: p.error,
                  })),
              });
              return currentProgress;
            });
            abortControllerRef.current = null;
            window.dispatchEvent(new CustomEvent("refresh-drive"));
            if (onRefresh) onRefresh();
          },
          onCancelled: (data) => {
            setImportSummary({
              imported: data.imported || 0,
              failed: data.failed || 0,
              totalSize: data.totalSize || 0,
              files: data.files || [],
              errors: data.errors || [],
              cancelled: true,
            });
            abortControllerRef.current = null;
            window.dispatchEvent(new CustomEvent("refresh-drive"));
            if (onRefresh) onRefresh();
          },
          onError: (data) => {
            setError(data.error || "An error occurred during retry.");
            abortControllerRef.current = null;
          },
        },
        controller.signal,
      );
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to retry import.");
      }
      abortControllerRef.current = null;
    }
  };

  // ── Close ─────────────────────────────────────────────────────
  const handleClose = () => {
    if (isImporting && !importSummary) {
      if (
        !confirm(
          "An import is in progress. Closing will run it in the background. Proceed?",
        )
      )
        return;
    }
    setSelectedFiles({});
    setFolderStack([{ id: "", name: "Dropbox" }]);
    setSearchQuery("");
    setIsImporting(false);
    setImportSummary(null);
    setFileProgress({});
    setError(null);
    setMobileTab("browse");
    onClose();
  };

  if (!isOpen) return null;

  // ─── Skeletons ─────────────────────────────────────────────────
  const renderSkeletons = () =>
    viewMode === "grid" ? (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col h-[160px] bg-secondary/20 border border-border/40 rounded-xl overflow-hidden animate-pulse"
          >
            <div className="w-full h-[95px] bg-slate-800/30" />
            <div className="flex-1 p-2.5 flex flex-col justify-between">
              <div className="h-3 bg-slate-800/30 rounded w-3/4" />
              <div className="h-2.5 bg-slate-800/20 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="space-y-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-2.5 px-2 border-b border-border/20 animate-pulse"
          >
            <div className="h-4 w-4 bg-slate-800/30 rounded shrink-0" />
            <div className="h-4 w-4 bg-slate-800/30 rounded shrink-0" />
            <div className="h-3 bg-slate-800/30 rounded w-1/2" />
            <div className="h-2.5 bg-slate-800/20 rounded w-16 ml-auto" />
          </div>
        ))}
      </div>
    );

  // ─── Grid item ─────────────────────────────────────────────────
  const renderGridItem = (file) => {
    const { Icon, color, bg, badge, label } = getFileVisuals(file);
    const isFolder = file.isFolder;
    const isSelected = !!selectedFiles[file.id];
    const dateStr = file.modifiedTime
      ? new Date(file.modifiedTime).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "—";

    return (
      <motion.div
        key={file.id}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        onClick={() =>
          isFolder ? handleFolderClick(file) : handleToggleFile(file)
        }
        className={cn(
          "group relative flex flex-col h-[160px] bg-secondary/20 border border-border/70 rounded-xl overflow-hidden transition-all duration-200 select-none cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-glow",
          isSelected &&
            "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-glow",
        )}
      >
        <div
          className={cn(
            "relative w-full h-[95px] flex items-center justify-center bg-gradient-to-br overflow-hidden rounded-t-xl",
            bg,
          )}
        >
          {file.hasThumbnail ? (
            <DropboxThumbnail
              filePath={file.pathLower}
              alt={file.name}
              fallbackIcon={Icon}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              iconClass={color}
              labelColor={badge}
              labelText={label}
              isFolder={isFolder}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full">
              <Icon
                className={cn(
                  "h-7 w-7 transition-transform duration-300 group-hover:scale-110",
                  isFolder ? "text-[#0061FF]" : color,
                )}
              />
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider",
                  badge,
                )}
              >
                {label}
              </span>
            </div>
          )}
          {!isFolder && file.canDownload && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFile(file);
              }}
              className={cn(
                "absolute top-2 right-2 h-5 w-5 flex items-center justify-center rounded-md border backdrop-blur-sm transition-all duration-200 cursor-pointer shadow-sm z-10",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/30 bg-black/20 text-transparent hover:border-white/60 hover:bg-black/40",
              )}
            >
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
          )}
        </div>
        <div className="flex-1 px-2.5 py-2 flex flex-col justify-between bg-secondary/5">
          <p
            className="text-[11px] font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors"
            title={file.name}
          >
            {file.name}
          </p>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{dateStr}</span>
            <span>
              {isFolder ? "Folder" : file.size ? formatSize(file.size) : "—"}
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  // ─── List row ──────────────────────────────────────────────────
  const renderListRow = (file) => {
    const { Icon, color, isFolder } = getFileVisuals(file);
    const isSelected = !!selectedFiles[file.id];
    const dateStr = file.modifiedTime
      ? new Date(file.modifiedTime).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

    return (
      <tr
        key={file.id}
        onClick={() =>
          isFolder ? handleFolderClick(file) : handleToggleFile(file)
        }
        className={cn(
          "border-b border-border/20 group hover:bg-secondary/15 transition-colors cursor-pointer",
          isSelected && "bg-primary/5 hover:bg-primary/10",
        )}
      >
        <td
          className="py-2.5 pl-2 pr-1 w-8"
          onClick={(e) => e.stopPropagation()}
        >
          {!isFolder && file.canDownload ? (
            <button
              type="button"
              onClick={() => handleToggleFile(file)}
              className={cn(
                "flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors cursor-pointer",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary/35 hover:border-primary/60",
              )}
            >
              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3.5]" />}
            </button>
          ) : (
            <div className="h-4.5 w-4.5" />
          )}
        </td>
        <td className="py-2.5 pr-2">
          <div className="flex items-center gap-2 text-foreground group-hover:text-primary transition-colors">
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                isFolder ? "text-[#0061FF]" : color,
              )}
            />
            <span className="text-xs font-semibold truncate max-w-[180px]">
              {file.name}
            </span>
          </div>
        </td>
        <td className="py-2.5 text-[11px] text-muted-foreground w-24">
          {dateStr}
        </td>
        <td className="py-2.5 text-[11px] text-muted-foreground text-right pr-2 w-20">
          {isFolder ? "Folder" : file.size ? formatSize(file.size) : "—"}
        </td>
      </tr>
    );
  };

  // ─── LEFT PANEL: Dropbox Browser ──────────────────────────────────
  const DrivePanel = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-secondary/10 shrink-0 flex-wrap gap-y-2">
        <div className="flex items-center gap-1 text-xs overflow-x-auto flex-1 min-w-0">
          {folderStack.length > 1 && (
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold transition-colors cursor-pointer shrink-0 mr-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {folderStack.map((folder, idx) => {
            const isLast = idx === folderStack.length - 1;
            return (
              <div key={folder.id} className="flex items-center shrink-0">
                {idx > 0 && (
                  <span className="text-muted-foreground/40 mx-1">/</span>
                )}
                <button
                  type="button"
                  onClick={() => handleBreadcrumbNav(idx)}
                  className={cn(
                    "font-semibold transition-colors cursor-pointer",
                    isLast
                      ? "text-primary cursor-default"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  disabled={isLast}
                >
                  {folder.name}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-secondary/30 border border-border rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-md transition-all cursor-pointer",
                viewMode === "grid"
                  ? "bg-secondary/80 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-secondary/80 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Dropbox..."
              className="pl-8 pr-3 py-1.5 text-xs bg-secondary/15 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all w-44 text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      </div>

      {!loadingFiles && importableFiles.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-secondary/5 shrink-0">
          <button
            type="button"
            onClick={handleSelectAllToggle}
            className={cn(
              "flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors cursor-pointer shrink-0",
              isAllSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary/35 hover:border-primary/60",
            )}
          >
            {isAllSelected && <Check className="h-2.5 w-2.5 stroke-[3.5]" />}
          </button>
          <span className="text-xs text-muted-foreground">
            {isAllSelected
              ? "Deselect all"
              : `Select all ${importableFiles.length} files`}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl mb-3">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {loadingFiles ? (
          renderSkeletons()
        ) : files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground min-h-[200px]">
            <Folder className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold">No files found</p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              Folder is empty or search returned no results.
            </p>
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map((file) => renderGridItem(file))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground">
                      <th className="w-8 py-2 pl-2">
                        <button
                          type="button"
                          onClick={handleSelectAllToggle}
                          className={cn(
                            "flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors cursor-pointer",
                            isAllSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-secondary/35 hover:border-primary/60",
                          )}
                        >
                          {isAllSelected && (
                            <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                          )}
                        </button>
                      </th>
                      <th className="py-2 font-semibold">Name</th>
                      <th className="py-2 font-semibold w-24">Modified</th>
                      <th className="py-2 font-semibold w-20 text-right pr-2">
                        Size
                      </th>
                    </tr>
                  </thead>
                  <tbody>{files.map((file) => renderListRow(file))}</tbody>
                </table>
              </div>
            )}
            {hasMore && cursor && (
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  disabled={loadMoreLoading}
                  onClick={() =>
                    fetchFiles(currentFolderId, cursor, true, searchQuery)
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 px-5 py-2 text-xs font-semibold text-foreground transition-all cursor-pointer disabled:opacity-40 shadow-sm"
                >
                  {loadMoreLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {loadMoreLoading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ─── RIGHT PANEL: Queue + Folder Tree ──────────────────────────────
  const QueuePanel = (
    <div className="flex flex-col h-full overflow-hidden bg-secondary/5 border-l border-border/60">
      {userProfile && (
        <div className="px-4 pt-3.5 pb-2 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <HardDrive className="h-3 w-3" />
              Drivya Storage
            </span>
            <span
              className={cn(
                "font-bold",
                isOverQuota
                  ? "text-destructive animate-pulse"
                  : "text-foreground",
              )}
            >
              {formatSize(Math.max(0, storageRemaining))} free
            </span>
          </div>
          <div className="h-1 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isOverQuota ? "bg-destructive" : "bg-primary",
              )}
              style={{
                width: `${Math.min(100, (userProfile.storageUsed / userProfile.storageLimit) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
              selectedCount > 0
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground",
            )}
          >
            {selectedCount}
          </div>
          <span className="text-xs font-semibold text-foreground">
            {selectedCount === 0
              ? "No files selected"
              : selectedCount === 1
                ? "1 file queued"
                : `${selectedCount} files queued`}
          </span>
        </div>
        {selectedCount > 0 && (
          <span
            className={cn(
              "text-[11px] font-semibold",
              isOverQuota ? "text-destructive" : "text-primary",
            )}
          >
            {formatSize(selectedTotalSize)}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {selectedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center text-muted-foreground">
            <Inbox className="h-9 w-9 text-muted-foreground/30 mb-2.5" />
            <p className="text-xs font-semibold">Import queue is empty</p>
            <p className="text-[11px] text-muted-foreground/50 mt-1">
              Select files to import
            </p>
          </div>
        ) : (
          <div className="px-3 py-2 space-y-1">
            <AnimatePresence>
              {selectedList.map((file) => {
                const { Icon, color } = getFileVisuals(file);
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-secondary/20 border border-border/40 group/queue"
                  >
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {file.size ? formatSize(file.size) : "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromQueue(file.id)}
                      className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer opacity-0 group-hover/queue:opacity-100 shrink-0"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="border-t border-border/60 shrink-0 flex flex-col min-h-[180px]">
        <div className="px-4 py-2 flex items-center justify-between bg-secondary/10 shrink-0">
          <div className="flex items-center gap-2">
            <FolderTree className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground">
              Import Destination
            </span>
          </div>
          {drivyaFolderStack.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const nextStack = drivyaFolderStack.slice(0, -1);
                setDrivyaFolderStack(nextStack);
                const parent = nextStack[nextStack.length - 1];
                setTargetDirId(parent.id);
                setTargetDirName(
                  parent.name === "My Drive" ? "My Drive (Root)" : parent.name,
                );
              }}
              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-2.5 w-2.5" /> Back
            </button>
          )}
        </div>

        <div className="px-4 py-1.5 border-b border-border/20 bg-secondary/5 flex items-center gap-1 overflow-x-auto scrollbar-hide shrink-0 text-[10.5px]">
          {drivyaFolderStack.map((f, idx) => {
            const isLast = idx === drivyaFolderStack.length - 1;
            return (
              <div key={f.id} className="flex items-center shrink-0">
                {idx > 0 && (
                  <span className="text-muted-foreground/30 mx-1">/</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (isLast) return;
                    const nextStack = drivyaFolderStack.slice(0, idx + 1);
                    setDrivyaFolderStack(nextStack);
                    setTargetDirId(f.id);
                    setTargetDirName(
                      f.name === "My Drive" ? "My Drive (Root)" : f.name,
                    );
                  }}
                  className={cn(
                    "font-medium transition-colors hover:text-primary cursor-pointer max-w-[80px] truncate",
                    isLast
                      ? "text-foreground font-semibold pointer-events-none"
                      : "text-muted-foreground",
                  )}
                >
                  {f.name}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto max-h-[140px] min-h-[90px] px-2 py-1 space-y-0.5 bg-secondary/5">
          {getDrivyaChildren(drivyaFolderStack[drivyaFolderStack.length - 1].id)
            .length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground/45">
              <FolderOpen className="h-5 w-5 stroke-[1.5] mb-1 text-muted-foreground/30" />
              <p className="text-[10px] font-medium">No nested folders here</p>
            </div>
          ) : (
            getDrivyaChildren(
              drivyaFolderStack[drivyaFolderStack.length - 1].id,
            ).map((dir) => (
              <div
                key={dir._id}
                onClick={() => {
                  const newFolder = { id: dir._id.toString(), name: dir.name };
                  const nextStack = [...drivyaFolderStack, newFolder];
                  setDrivyaFolderStack(nextStack);
                  setTargetDirId(dir._id.toString());
                  setTargetDirName(dir.name);
                }}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-secondary/60 text-foreground cursor-pointer transition-colors group/item"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Folder className="h-3.5 w-3.5 text-amber-500 fill-amber-500/10 shrink-0" />
                  <span className="truncate text-[11px] font-medium">
                    {dir.name}
                  </span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover/item:text-foreground transition-colors shrink-0" />
              </div>
            ))
          )}
        </div>

        <div className="px-4 pt-2 pb-4 border-t border-border/40 bg-secondary/10 space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Folder className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="truncate font-medium">{targetDirName}</span>
          </div>

          {isOverQuota && (
            <div className="flex items-center gap-1.5 text-[11px] text-destructive font-semibold">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              Exceeds available storage
            </div>
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={selectedCount === 0 || isOverQuota}
            id="dropbox-import-btn"
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary h-10 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 active:translate-y-px transition-all cursor-pointer",
              (selectedCount === 0 || isOverQuota) &&
                "opacity-40 cursor-not-allowed active:translate-y-0 shadow-none hover:opacity-40",
            )}
          >
            <Import className="h-4 w-4" />
            {selectedCount === 0
              ? "Select files to import"
              : `Import ${selectedCount} file${selectedCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Import Progress View ───────────────────────────────────────
  const ProgressView = (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {!importSummary ? (
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Streaming files to Drivya...
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Transferring directly from Dropbox servers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-destructive/30 hover:bg-destructive/10 text-destructive transition-colors cursor-pointer"
            >
              Cancel Import
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/35 border border-border/60 text-primary animate-pulse">
              Keep tab open
            </span>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col items-center text-center p-5 border rounded-2xl backdrop-blur-md",
            importSummary.cancelled
              ? "bg-amber-500/5 border-amber-500/25"
              : failedFileIds.length === 0
                ? "bg-emerald-500/5 border-emerald-500/25"
                : importSummary.imported > 0
                  ? "bg-amber-500/5 border-amber-500/25"
                  : "bg-destructive/5 border-destructive/25",
          )}
        >
          <div
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center mb-3 shadow-glow",
              importSummary.cancelled
                ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
                : failedFileIds.length === 0
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                  : importSummary.imported > 0
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
                    : "bg-destructive/10 border border-destructive/20 text-destructive",
            )}
          >
            {importSummary.cancelled ? (
              <AlertTriangle className="h-6 w-6" />
            ) : failedFileIds.length === 0 ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>
          <h4 className="text-sm font-semibold font-display text-foreground">
            {importSummary.cancelled
              ? "Import Cancelled"
              : failedFileIds.length === 0
                ? "Import Completed!"
                : importSummary.imported > 0
                  ? "Completed with Errors"
                  : "Import Failed"}
          </h4>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {importSummary.cancelled
              ? `Import was cancelled by the user. ${importSummary.imported} of ${importSummary.imported + importSummary.failed} file(s) were imported. Total: ${formatSize(importSummary.totalSize)}`
              : `${importSummary.imported} of ${importSummary.imported + importSummary.failed} file(s) imported successfully. Total: ${formatSize(importSummary.totalSize)}`}
          </p>
          {failedFileIds.length > 0 && !importSummary.cancelled && (
            <button
              type="button"
              onClick={() => handleRetry(failedFileIds)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 px-4 h-9 text-xs font-semibold text-primary transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry {failedFileIds.length}{" "}
              Failed
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {Object.keys(fileProgress).map((id) => {
          const item = fileProgress[id];
          const isDone = item.status === "complete";
          const isFailed = item.status === "failed";
          const isDownloading = item.status === "downloading";
          return (
            <div
              key={id}
              className={cn(
                "p-3.5 border border-border/50 bg-secondary/15 rounded-xl flex flex-col gap-2.5 transition-all",
                isFailed && "border-destructive/20 bg-destructive/5",
                isDone && "border-emerald-500/20 bg-emerald-500/5",
              )}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground truncate max-w-[65%]">
                  {item.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-full",
                      isDone && "bg-emerald-500/10 text-emerald-400",
                      isFailed && "bg-destructive/10 text-destructive",
                      isDownloading &&
                        "bg-primary/10 text-primary animate-pulse",
                      item.status === "waiting" &&
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.status}
                  </span>
                  {isFailed && (
                    <button
                      type="button"
                      onClick={() => handleRetry([id])}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-primary transition-all cursor-pointer"
                      title="Retry"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percent}%` }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "h-full rounded-full",
                    isFailed
                      ? "bg-destructive"
                      : isDone
                        ? "bg-emerald-500"
                        : "bg-primary",
                  )}
                />
              </div>
              {isFailed && item.error && (
                <p className="text-[10px] text-destructive italic">
                  Error: {item.error}
                </p>
              )}
              {isDownloading && (
                <p className="text-[10px] text-primary text-right tabular-nums">
                  {item.percent}%
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-background/60 dark:bg-black/65 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        className="relative flex flex-col w-full max-w-5xl h-[90vh] bg-background/97 dark:bg-card/95 text-foreground border border-border/80 rounded-2xl shadow-elegant backdrop-blur-lg noise overflow-hidden z-10"
      >
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/6 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative flex items-end lg:items-center justify-between px-5 py-4 border-b border-border/70 bg-secondary/10 z-10 shrink-0">
          <div className="flex-col md:flex-row flex md:items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center">
              <img src={dropboxLogo} alt="" className="h-6 w-6" />
            </div>
            <div>
              <h2 className="hidden lg:block text-sm font-bold tracking-tight text-foreground font-display">
                Import from Dropbox
              </h2>
              {isConnected && dropboxEmail && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Connected as{" "}
                  <span className="text-foreground font-semibold">
                    {dropboxEmail}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected && !isImporting && (
              <div className="flex md:hidden items-center bg-secondary/30 border border-border rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setMobileTab("browse")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    mobileTab === "browse"
                      ? "bg-secondary/80 text-primary shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  Browse
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("queue")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer relative",
                    mobileTab === "queue"
                      ? "bg-secondary/80 text-primary shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  Queue
                  {selectedCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground rounded-full text-[9px] flex items-center justify-center font-bold">
                      {selectedCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {isConnected && !isImporting && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer border border-transparent hover:border-destructive/20"
                title="Disconnect Dropbox"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent hover:border-border transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col relative z-10">
          {authLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">
                Checking Dropbox status...
              </p>
            </div>
          ) : !isConnected ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
              <div className="relative mb-6">
                <div className="absolute -inset-2 rounded-full bg-gradient-primary opacity-25 blur-xl animate-pulse" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/30 border border-border shadow-xl">
                  <img src={dropboxLogo} alt="" className="h-10 w-10" />
                </div>
              </div>
              <h3 className="text-lg font-bold font-display text-foreground mb-2">
                Connect Dropbox
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Connect your Dropbox account to browse and import your files
                directly into Drivya.
              </p>
              {error && (
                <div className="w-full flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl mb-4 text-left">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleConnect}
                id="dropbox-connect-btn"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 h-11 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 active:translate-y-px transition-all cursor-pointer"
              >
                Connect Dropbox Account
              </button>
            </div>
          ) : isImporting ? (
            ProgressView
          ) : (
            <div className="flex-1 overflow-hidden flex">
              <div
                className={cn(
                  "flex-[3] min-w-0 overflow-hidden flex flex-col",
                  "hidden md:flex",
                  mobileTab === "browse" && "flex! md:flex!",
                )}
              >
                {DrivePanel}
              </div>
              <div
                className={cn(
                  "w-[280px] shrink-0 overflow-hidden flex-col",
                  "hidden md:flex",
                  mobileTab === "queue" && "flex! md:flex! w-full!",
                )}
              >
                {QueuePanel}
              </div>
            </div>
          )}
        </div>

        {importSummary && (
          <div className="px-5 py-3.5 bg-secondary/10 border-t border-border/60 flex items-center justify-end gap-3 backdrop-blur-md relative z-20 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 px-6 h-9 text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}
