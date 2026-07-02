import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
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
  ExternalLink,
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
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getGoogleStatus, disconnectGoogle, listGoogleFiles, importGoogleFiles, getGoogleAuthUrl } from "../../../api/googleDrive";
import { listAllDirectories } from "../../../api/drive";
import api from "../../../api/auth";

function formatSize(bytes) {
  if (bytes == null) return "Unknown size";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function GoogleDriveThumbnail({ fileId, alt, fallbackIcon: FallbackIcon, className, iconClass, labelColor, labelText, isFolder }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    const loadThumbnail = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await api.get(`/api/google/thumbnail/${fileId}`, {
          responseType: "blob",
        });

        if (active) {
          objectUrl = URL.createObjectURL(response.data);
          setSrc(objectUrl);
        }
      } catch (err) {
        if (active) {
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
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800/10">
        <Loader2 className="h-4 w-4 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className="fallback-icon flex flex-col items-center justify-center gap-1.5 w-full h-full">
        <FallbackIcon className={cn("h-8 w-8 transition-transform duration-300 group-hover:scale-110",
          isFolder ? "text-amber-500 fill-amber-500/20" : iconClass
        )} />
        <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider", labelColor)}>
          {labelText}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
    />
  );
}

export function GoogleDriveModal({ isOpen, onClose, currentDirId, userProfile, onRefresh }) {
  // Connection states
  const [isConnected, setIsConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // File explorer states
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [folderStack, setFolderStack] = useState([{ id: "root", name: "Google Drive" }]);
  const [searchQuery, setSearchQuery] = useState("");
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

  // Selection states
  const [selectedFiles, setSelectedFiles] = useState({}); // fileId -> fileObj
  const [drivyaDirs, setDrivyaDirs] = useState([]); // Folders in current workspace to pick destination
  const [targetDir, setTargetDir] = useState(currentDirId || "root");

  // Drivya hierarchical folder picker states
  const [rawDrivyaDirs, setRawDrivyaDirs] = useState([]);
  const [pickerFolderStack, setPickerFolderStack] = useState([{ id: "root", name: "My Drive" }]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  // Import/SSE states
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [fileProgress, setFileProgress] = useState({}); // fileId -> { percent, status, error, name }
  const [error, setError] = useState(null);

  const currentFolderId = folderStack[folderStack.length - 1].id;

  // Resolve Drivya folder path name and hierarchy
  const selectedTargetDirName = useMemo(() => {
    if (targetDir === "root") return "My Drive (Root)";
    const dir = rawDrivyaDirs.find(d => d._id?.toString() === targetDir);
    return dir ? dir.name : "My Drive (Root)";
  }, [targetDir, rawDrivyaDirs]);

  const selectedTargetDirPath = useMemo(() => {
    if (targetDir === "root") return "My Drive (Root)";
    const dir = rawDrivyaDirs.find(d => d._id?.toString() === targetDir);
    if (!dir) return "My Drive (Root)";

    const dirMap = {};
    rawDrivyaDirs.forEach(d => {
      dirMap[d._id.toString()] = d.name;
    });

    const pathNames = dir.path
      .map(parentId => dirMap[parentId.toString()])
      .filter(Boolean);

    return [...pathNames, dir.name].join(" / ");
  }, [targetDir, rawDrivyaDirs]);

  // Click outside handler for Drivya folder picker popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsPickerOpen(false);
      }
    };
    if (isPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPickerOpen]);

  // Initialize folder picker stack when opening modal with a pre-selected directory
  useEffect(() => {
    if (!isOpen || !currentDirId || rawDrivyaDirs.length === 0) return;

    const currentFolder = rawDrivyaDirs.find(d => d._id?.toString() === currentDirId);
    if (!currentFolder) return;

    const dirMap = {};
    rawDrivyaDirs.forEach(d => {
      dirMap[d._id.toString()] = d;
    });

    const stack = [{ id: "root", name: "My Drive" }];
    
    currentFolder.path.forEach(parentId => {
      const parentDir = dirMap[parentId.toString()];
      if (parentDir && parentDir.parentDirId !== null) {
        stack.push({ id: parentDir._id.toString(), name: parentDir.name });
      }
    });

    stack.push({ id: currentFolder._id.toString(), name: currentFolder.name });
    
    setPickerFolderStack(stack);
    setTargetDir(currentDirId);
  }, [isOpen, currentDirId, rawDrivyaDirs]);

  // Helper to resolve Drivya subfolders in current picker level
  const getPickerChildren = useCallback((parentId) => {
    const rootDir = rawDrivyaDirs.find(d => d.parentDirId === null || d.depth === 0);
    const rootId = rootDir?._id?.toString();

    return rawDrivyaDirs.filter(d => {
      if (parentId === "root") {
        return d.parentDirId?.toString() === rootId;
      }
      return d.parentDirId?.toString() === parentId;
    });
  }, [rawDrivyaDirs]);

  // Fetch connection status on mount
  useEffect(() => {
    if (!isOpen) return;
    checkStatus();
  }, [isOpen]);

  const checkStatus = async () => {
    setAuthLoading(true);
    setError(null);
    try {
      const status = await getGoogleStatus();
      setIsConnected(status.connected);
      setGoogleEmail(status.email);
      if (status.connected) {
        fetchFiles("root");
        fetchDrivyaDirectories();
      }
    } catch (err) {
      console.error("Failed to check Google status:", err);
      setError("Unable to connect to service. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Fetch Drivya directories for target destination selection recursively
  const fetchDrivyaDirectories = async () => {
    try {
      const data = await listAllDirectories();
      if (data && data.directories) {
        setRawDrivyaDirs(data.directories);
        // Build a map of directory ID to directory Name
        const dirMap = {};
        data.directories.forEach((d) => {
          dirMap[d._id.toString()] = d.name;
        });

        // Filter out the root directory (which has parentDirId = null or depth = 0)
        // because we already have a hardcoded "My Drive (Root)" option
        const subDirs = data.directories.filter((d) => d.parentDirId !== null);

        // Format hierarchical paths
        const formattedDirs = subDirs.map((d) => {
          const pathNames = d.path
            .map((parentId) => dirMap[parentId.toString()])
            .filter(Boolean); // Keep only resolved names

          const fullPath = [...pathNames, d.name].join(" / ");
          return {
            _id: d._id,
            name: fullPath,
          };
        });

        // Sort folders alphabetically
        formattedDirs.sort((a, b) => a.name.localeCompare(b.name));

        setDrivyaDirs(formattedDirs);
      }
    } catch (err) {
      console.warn("Failed to load destination directories:", err);
    }
  };

  // Fetch Google Drive files
  const fetchFiles = async (folderId, pageToken = null, append = false, query = "") => {
    if (append) {
      setLoadMoreLoading(true);
    } else {
      setLoadingFiles(true);
      setError(null);
    }

    try {
      const data = await listGoogleFiles({
        folderId: query ? null : (folderId === "root" ? "root" : folderId),
        pageToken,
        query: query || null,
      });

      if (append) {
        setFiles((prev) => [...prev, ...data.files]);
      } else {
        setFiles(data.files || []);
      }
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error("Failed to list Google Drive files:", err);
      if (err.response?.status === 401 || err.code === "GOOGLE_TOKEN_EXPIRED") {
        setIsConnected(false);
        setGoogleEmail("");
      } else {
        setError("Failed to load files from Google Drive.");
      }
    } finally {
      setLoadingFiles(false);
      setLoadMoreLoading(false);
    }
  };

  // Handle Search
  useEffect(() => {
    if (!isConnected || !isOpen) return;
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchFiles(null, null, false, searchQuery);
      } else {
        fetchFiles(currentFolderId);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentFolderId, isConnected]);

  // Connect Google account
  const handleConnect = async () => {
    try {
      setAuthLoading(true);
      const { url } = await getGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error("Failed to fetch auth url:", err);
      setError("Could not launch Google authentication.");
      setAuthLoading(false);
    }
  };

  // Disconnect Google account
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Google Drive?")) return;
    try {
      await disconnectGoogle();
      setIsConnected(false);
      setGoogleEmail("");
      setFiles([]);
      setSelectedFiles({});
    } catch (err) {
      console.error("Failed to disconnect:", err);
      setError("Failed to revoke Google access.");
    }
  };

  // Navigate into folder
  const handleFolderClick = (folder) => {
    if (searchQuery) {
      setSearchQuery("");
    }
    const newStack = [...folderStack, { id: folder.id, name: folder.name }];
    setFolderStack(newStack);
    fetchFiles(folder.id);
  };

  // Navigate back
  const handleGoBack = () => {
    if (folderStack.length <= 1) return;
    const newStack = [...folderStack];
    newStack.pop();
    setFolderStack(newStack);
    const parentFolder = newStack[newStack.length - 1];
    fetchFiles(parentFolder.id);
  };

  // Toggle file selection
  const handleToggleFile = (file) => {
    setSelectedFiles((prev) => {
      const next = { ...prev };
      if (next[file.id]) {
        delete next[file.id];
      } else {
        next[file.id] = file;
      }
      return next;
    });
  };

  // Select/Deselect all files in current view
  const importableFiles = useMemo(() => {
    return files.filter(f => !f.isFolder && f.canDownload);
  }, [files]);

  const isAllSelected = useMemo(() => {
    if (importableFiles.length === 0) return false;
    return importableFiles.every(f => selectedFiles[f.id]);
  }, [importableFiles, selectedFiles]);

  const handleSelectAllToggle = () => {
    setSelectedFiles((prev) => {
      const next = { ...prev };
      if (isAllSelected) {
        importableFiles.forEach(f => {
          delete next[f.id];
        });
      } else {
        importableFiles.forEach(f => {
          next[f.id] = f;
        });
      }
      return next;
    });
  };

  // Calculate total selected size and count
  const selectedCount = Object.keys(selectedFiles).length;
  const selectedTotalSize = useMemo(() => {
    return Object.values(selectedFiles).reduce((sum, f) => sum + (f.size || 1024 * 1024), 0);
  }, [selectedFiles]);

  const storageRemaining = useMemo(() => {
    if (!userProfile) return 0;
    return Math.max(0, userProfile.storageLimit - userProfile.storageUsed);
  }, [userProfile]);

  const isOverQuota = selectedTotalSize > storageRemaining;

  // Handle Import submission
  const handleImport = async () => {
    if (selectedCount === 0) return;
    if (isOverQuota) {
      alert("Selected files exceed your available storage quota.");
      return;
    }

    const fileIds = Object.keys(selectedFiles);
    setIsImporting(true);
    setImportSummary(null);
    setFileProgress({});
    setError(null);

    // Populate initial progress list
    const initialProgress = {};
    fileIds.forEach((id) => {
      initialProgress[id] = {
        percent: 0,
        status: "waiting",
        name: selectedFiles[id].name,
      };
    });
    setFileProgress(initialProgress);

    try {
      await importGoogleFiles(fileIds, targetDir === "root" ? null : targetDir, {
        onStart: (data) => {
          console.log("[Import Started]", data);
        },
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
          window.dispatchEvent(new CustomEvent("refresh-drive"));
          if (onRefresh) onRefresh();
        },
        onError: (data) => {
          setError(data.error || "An error occurred during import.");
        },
      });
    } catch (err) {
      console.error("[Import stream error]", err);
      setError(err.message || "Failed to import files.");
    }
  };

  // Handle Retry of specific failed files
  const handleRetry = async (retryFileIds) => {
    if (!retryFileIds || retryFileIds.length === 0) return;

    setIsImporting(true);
    setImportSummary(null);
    setError(null);

    // Reset only the selected retrying files in progress state
    setFileProgress((prev) => {
      const next = { ...prev };
      retryFileIds.forEach((id) => {
        next[id] = {
          ...next[id],
          percent: 0,
          status: "waiting",
          error: null,
        };
      });
      return next;
    });

    try {
      await importGoogleFiles(retryFileIds, targetDir === "root" ? null : targetDir, {
        onStart: (data) => {
          console.log("[Import Retry Started]", data);
        },
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
          // Re-calculate global import summary based on all file progress states
          setFileProgress((currentProgress) => {
            const progressEntries = Object.entries(currentProgress);
            const importedCount = progressEntries.filter(([_, p]) => p.status === "complete").length;
            const failedCount = progressEntries.filter(([_, p]) => p.status === "failed").length;

            const totalSize = Object.values(selectedFiles).reduce((sum, f) => {
              if (currentProgress[f.id]?.status === "complete") {
                return sum + (f.size || 1024 * 1024);
              }
              return sum;
            }, 0);

            setImportSummary({
              imported: importedCount,
              failed: failedCount,
              totalSize,
              files: progressEntries.filter(([_, p]) => p.status === "complete").map(([id, p]) => ({ fileId: id, fileName: p.name })),
              errors: progressEntries.filter(([_, p]) => p.status === "failed").map(([id, p]) => ({ fileId: id, fileName: p.name, error: p.error })),
            });

            return currentProgress;
          });

          window.dispatchEvent(new CustomEvent("refresh-drive"));
          if (onRefresh) onRefresh();
        },
        onError: (data) => {
          setError(data.error || "An error occurred during retry.");
        },
      });
    } catch (err) {
      console.error("[Retry stream error]", err);
      setError(err.message || "Failed to retry import.");
    }
  };

  // Find all currently failed imports
  const failedFileIds = useMemo(() => {
    return Object.keys(fileProgress).filter(id => fileProgress[id].status === "failed");
  }, [fileProgress]);

  // Clean up and close
  const handleClose = () => {
    if (isImporting && !importSummary) {
      if (!confirm("An import is in progress. Closing this modal will run it in the background. Proceed?")) {
        return;
      }
    }
    // Reset states
    setSelectedFiles({});
    setFolderStack([{ id: "root", name: "Google Drive" }]);
    setSearchQuery("");
    setIsImporting(false);
    setImportSummary(null);
    setFileProgress({});
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  // Grid/List file skeleton loading
  const renderSkeletons = () => {
    if (viewMode === "grid") {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col h-[180px] bg-[#12162E]/40 border border-[#22284D]/40 rounded-2xl overflow-hidden animate-pulse">
              <div className="w-full h-[110px] bg-slate-800/40" />
              <div className="flex-1 p-3 flex flex-col justify-between">
                <div className="h-3.5 bg-slate-800/40 rounded-md w-3/4" />
                <div className="flex items-center justify-between">
                  <div className="h-2.5 bg-slate-800/30 rounded-md w-1/3" />
                  <div className="h-2.5 bg-slate-800/30 rounded-md w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3.5 px-4 border-b border-[#22284D]/25 animate-pulse">
            <div className="flex items-center gap-3 w-1/2">
              <div className="h-5 w-5 bg-slate-800/40 rounded-md shrink-0" />
              <div className="h-3.5 bg-slate-800/40 rounded-md w-2/3" />
            </div>
            <div className="h-3 bg-slate-800/30 rounded-md w-1/4" />
            <div className="h-3 bg-slate-800/30 rounded-md w-12" />
          </div>
        ))}
      </div>
    );
  };

  // Render file in Grid View
  const renderGridItem = (file) => {
    const isFolder = file.isFolder;
    const isSelected = !!selectedFiles[file.id];
    const dateString = file.modifiedTime
      ? new Date(file.modifiedTime).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

    let fallbackColor = "from-slate-700 to-slate-900";
    let IconComponent = File;
    let labelColor = "text-slate-400 bg-slate-400/10";
    let labelText = "File";

    const mime = file.mimeType || "";
    const nameLower = file.name.toLowerCase();

    if (isFolder) {
      fallbackColor = "from-amber-500/10 to-amber-600/5";
      IconComponent = Folder;
      labelColor = "text-amber-500 bg-amber-500/10";
      labelText = "Folder";
    } else if (mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(nameLower)) {
      fallbackColor = "from-pink-500/20 to-purple-600/10";
      IconComponent = Image;
      labelColor = "text-pink-400 bg-pink-400/10";
      labelText = "Image";
    } else if (mime.startsWith("video/") || /\.(mp4|mkv|mov|avi|wmv|flv)$/i.test(nameLower)) {
      fallbackColor = "from-purple-500/20 to-indigo-600/10";
      IconComponent = Video;
      labelColor = "text-purple-400 bg-purple-400/10";
      labelText = "Video";
    } else if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(nameLower)) {
      fallbackColor = "from-emerald-500/20 to-teal-600/10";
      IconComponent = Music;
      labelColor = "text-emerald-400 bg-emerald-400/10";
      labelText = "Audio";
    } else if (mime === "application/pdf" || nameLower.endsWith(".pdf")) {
      fallbackColor = "from-red-500/20 to-rose-600/10";
      IconComponent = FileText;
      labelColor = "text-rose-400 bg-rose-400/10";
      labelText = "PDF";
    } else if (mime.includes("spreadsheet") || mime.includes("excel") || /\.(xls|xlsx|csv)$/i.test(nameLower)) {
      fallbackColor = "from-green-500/20 to-emerald-600/10";
      IconComponent = FileSpreadsheet;
      labelColor = "text-green-400 bg-green-400/10";
      labelText = "Sheet";
    } else if (mime.includes("presentation") || mime.includes("powerpoint") || /\.(ppt|pptx)$/i.test(nameLower)) {
      fallbackColor = "from-orange-500/20 to-amber-600/10";
      IconComponent = Presentation;
      labelColor = "text-orange-400 bg-orange-400/10";
      labelText = "Slide";
    } else if (mime.includes("json") || mime.includes("javascript") || mime.includes("html") || mime.includes("css") || /\.(js|jsx|ts|tsx|json|html|css|py|go|cpp|c|h|java|sh)$/i.test(nameLower)) {
      fallbackColor = "from-cyan-500/20 to-blue-600/10";
      IconComponent = FileCode;
      labelColor = "text-cyan-400 bg-cyan-400/10";
      labelText = "Code";
    } else if (file.isGoogleDoc) {
      fallbackColor = "from-blue-500/20 to-indigo-600/10";
      IconComponent = FileText;
      labelColor = "text-blue-400 bg-blue-400/10";
      labelText = "Doc";
    }

    return (
      <div
        key={file.id}
        onClick={() => {
          if (isFolder) {
            handleFolderClick(file);
          } else {
            handleToggleFile(file);
          }
        }}
        className={cn(
          "group relative flex flex-col h-[180px] bg-secondary/20 dark:bg-secondary/10 border border-border/85 rounded-2xl overflow-hidden transition-all duration-300 select-none cursor-pointer hover:border-primary/50 hover:shadow-glow hover:-translate-y-0.5",
          isSelected && "border-primary bg-primary/5 shadow-glow ring-1 ring-primary/30"
        )}
      >
        {/* Card Preview / Thumbnail Header */}
        <div className={cn("relative w-full h-[110px] flex items-center justify-center bg-gradient-to-br overflow-hidden rounded-t-2xl", fallbackColor)}>
          {file.thumbnailLink ? (
            <GoogleDriveThumbnail
              fileId={file.id}
              alt={file.name}
              fallbackIcon={IconComponent}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              iconClass={labelColor.split(" ")[0]}
              labelColor={labelColor}
              labelText={labelText}
              isFolder={isFolder}
            />
          ) : (
            /* Fallback Icon */
            <div className="fallback-icon flex flex-col items-center justify-center gap-1.5 w-full h-full">
              <IconComponent className={cn("h-8 w-8 transition-transform duration-300 group-hover:scale-110",
                isFolder ? "text-amber-500 fill-amber-500/20" : labelColor.split(" ")[0]
              )} />
              <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider", labelColor)}>
                {labelText}
              </span>
            </div>
          )}

          {/* Selection indicator */}
          {!isFolder && file.canDownload && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFile(file);
              }}
              className={cn(
                "absolute top-2.5 right-2.5 h-5.5 w-5.5 flex items-center justify-center rounded-lg border backdrop-blur-md transition-all duration-200 cursor-pointer shadow-sm z-10",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary/80 text-transparent hover:border-muted-foreground hover:text-muted-foreground group-hover:opacity-100 opacity-0"
              )}
            >
              <Check className="h-3.5 w-3.5 stroke-[3.5]" />
            </div>
          )}
        </div>

        {/* Card Details Footer */}
        <div className="flex-1 p-3 flex flex-col justify-between bg-secondary/5">
          <div className="text-xs font-semibold text-foreground line-clamp-1 truncate group-hover:text-primary transition-colors" title={file.name}>
            {file.name}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{dateString}</span>
            <span className="font-sans">
              {isFolder
                ? "Folder"
                : file.size
                ? formatSize(file.size)
                : file.isGoogleDoc
                ? "Google Doc"
                : "—"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-background/60 dark:bg-black/60 backdrop-blur-md"
      />

      {/* Main modal container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="relative flex flex-col w-full max-w-4xl h-[85vh] bg-background/95 dark:bg-card/90 text-foreground border border-border/80 rounded-3xl shadow-elegant backdrop-blur-lg noise overflow-hidden z-10"
      >
        {/* Decorative background glows */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-accent/8 rounded-full blur-[100px] pointer-events-none" />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b border-border bg-secondary/10 backdrop-blur-md z-10">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-md">
              <svg className="h-5.5 w-5.5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 3.5h13.12l-3.43 6H6.28M15.66 15H2.55l3.43 6h13.11" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground font-display">
                Import from Google Drive
              </h2>
              {isConnected && googleEmail && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connected as: <span className="text-foreground font-medium">{googleEmail}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected && !isImporting && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer border border-transparent hover:border-destructive/20"
                title="Disconnect Google account"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent hover:border-border transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Inner Body */}
        <div className="flex-1 overflow-hidden flex flex-col relative z-10">
          {authLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground font-sans">Checking Google connection status...</p>
            </div>
          ) : !isConnected ? (
            /* Connect Prompt Screen */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto relative z-10">
              <div className="relative mb-6">
                <div className="absolute -inset-1 rounded-full bg-gradient-primary opacity-30 blur-lg animate-pulse" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/30 border border-border shadow-xl">
                  <svg className="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 3.5h13.12l-3.43 6H6.28M15.66 15H2.55l3.43 6h13.11" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Connect Google Drive</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-sans">
                Connect your Google account safely. Drivya only requests read access to list and download files you select to import.
              </p>
              {error && (
                <div className="w-full flex items-center gap-2.5 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl mb-4 text-left">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleConnect}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 h-11 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 active:translate-y-px transition-all cursor-pointer"
              >
                Connect Google Account
              </button>
            </div>
          ) : isImporting ? (
            /* Import Streaming Progress Screen */
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {!importSummary ? (
                <div className="flex items-center justify-between pb-4 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Streaming files to Drivya...</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Transferring directly from Google servers to secure storage.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/35 border border-border/60 text-primary animate-pulse">
                    Keep tab open
                  </span>
                </div>
              ) : (
                <div className={cn(
                  "flex flex-col items-center text-center p-6 border rounded-2xl mb-6 max-w-2xl mx-auto backdrop-blur-md",
                  failedFileIds.length === 0
                    ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400"
                    : importSummary.imported > 0
                    ? "bg-amber-500/5 border-amber-500/25 text-amber-400"
                    : "bg-destructive/5 border-destructive/25 text-destructive"
                )}>
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center mb-3.5 shadow-glow",
                    failedFileIds.length === 0
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                      : importSummary.imported > 0
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-550"
                      : "bg-destructive/10 border border-destructive/20 text-destructive"
                  )}>
                    {failedFileIds.length === 0 ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : importSummary.imported > 0 ? (
                      <AlertTriangle className="h-6 w-6" />
                    ) : (
                      <X className="h-6 w-6" />
                    )}
                  </div>
                  <h4 className="text-base font-semibold font-display text-foreground">
                    {failedFileIds.length === 0
                      ? "Import Completed Successfully"
                      : importSummary.imported > 0
                      ? "Import Completed with Errors"
                      : "Import Failed"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1.5 max-w-md leading-relaxed font-sans">
                    Successfully imported {importSummary.imported} of {importSummary.imported + importSummary.failed} file(s).
                    Total size: {formatSize(importSummary.totalSize)}.
                  </p>

                  {failedFileIds.length > 0 && (
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleRetry(failedFileIds)}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 px-4 h-9 text-xs font-semibold text-primary transition-all cursor-pointer shadow-glow"
                      >
                        <RefreshCw className="h-3.5 w-3.5 animate-pulse" />
                        Retry Failed Imports ({failedFileIds.length})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Progress list container */}
              <div className="space-y-3.5 max-w-2xl mx-auto">
                {Object.keys(fileProgress).map((id) => {
                  const item = fileProgress[id];
                  const isDone = item.status === "complete";
                  const isFailed = item.status === "failed";
                  const isDownloading = item.status === "downloading";

                  return (
                    <div
                      key={id}
                      className={cn(
                        "p-4 border border-border/50 bg-secondary/15 rounded-2xl flex flex-col gap-3 transition-all duration-300",
                        isFailed && "border-destructive/20 bg-destructive/5",
                        isDone && "border-emerald-500/20 bg-emerald-500/5"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground truncate max-w-[65%]" title={item.name}>
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className={cn(
                              "font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-full font-sans",
                              isDone && "bg-emerald-500/10 text-emerald-400",
                              isFailed && "bg-destructive/10 text-destructive",
                              isDownloading && "bg-primary/10 text-primary animate-pulse",
                              item.status === "waiting" && "bg-muted text-muted-foreground"
                            )}
                          >
                            {item.status}
                          </span>
                          {isFailed && (
                            <button
                              type="button"
                              onClick={() => handleRetry([id])}
                              className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-primary transition-all cursor-pointer shadow-sm"
                              title="Retry this file import"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar container */}
                      <div className="w-full h-1.5 bg-secondary/30 rounded-full overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percent}%` }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            "h-full rounded-full",
                            isFailed ? "bg-destructive" : isDone ? "bg-emerald-500" : "bg-primary"
                          )}
                        />
                      </div>

                      {/* Status subtext */}
                      {isFailed && item.error && (
                        <p className="text-[10px] text-destructive italic">
                          Error: {item.error}
                        </p>
                      )}
                      {isDownloading && (
                        <p className="text-[10px] text-primary text-right tabular-nums">
                          {item.percent}% downloaded
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* File Explorer Main Screen */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search, view switcher and Breadcrumbs bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 bg-secondary/10 border-b border-border backdrop-blur-md">
                {/* Breadcrumbs stack */}
                <div className="flex items-center gap-1.5 text-xs overflow-x-auto py-1.5 shrink-0 max-w-full">
                  {folderStack.map((folder, index) => {
                    const isLast = index === folderStack.length - 1;
                    return (
                      <div key={folder.id} className="flex items-center shrink-0">
                        {index > 0 && <span className="text-muted-foreground/60 mx-1">/</span>}
                        {index === 0 && folderStack.length > 1 ? (
                          <button
                            type="button"
                            onClick={handleGoBack}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back
                          </button>
                        ) : (
                          <span
                            className={cn(
                              "font-semibold",
                              isLast ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {folder.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right controls: View toggle and Search */}
                <div className="flex items-center gap-3 shrink-0 ml-auto max-w-full">
                  {/* Grid / List View Toggle */}
                  <div className="flex items-center gap-1 bg-secondary/35 border border-border p-1 rounded-xl shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-1.5 rounded-lg transition-all cursor-pointer",
                        viewMode === "grid"
                          ? "bg-secondary/80 text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Grid View (thumbnails)"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-1.5 rounded-lg transition-all cursor-pointer",
                        viewMode === "list"
                          ? "bg-secondary/80 text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="List View (details)"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Search box */}
                  <div className="relative max-w-xs w-48 sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search files..."
                      className="w-full pl-9 pr-4 py-1.5 text-xs bg-secondary/15 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>
              </div>

              {/* Main files browser container */}
              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl mb-4">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {loadingFiles ? (
                  renderSkeletons()
                ) : files.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground min-h-[300px]">
                    <Folder className="h-12 w-12 text-muted-foreground/60 mb-3" />
                    <p className="text-sm font-semibold">No files or folders found</p>
                    <p className="text-xs text-muted-foreground/50 mt-1 max-w-[200px]">This directory is empty or no search matches found.</p>
                  </div>
                ) : (
                  <>
                    {viewMode === "grid" ? (
                      /* Grid layout rendering */
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {files.map((file) => renderGridItem(file))}
                      </div>
                    ) : (
                      /* List layout rendering */
                      <div className="overflow-x-auto min-w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-border/40 text-muted-foreground">
                              <th className="w-10 py-3 pl-1">
                                <button
                                  type="button"
                                  onClick={handleSelectAllToggle}
                                  className="flex h-5 w-5 items-center justify-center rounded-md border border-border bg-secondary/35 hover:border-primary transition-colors cursor-pointer"
                                >
                                  {isAllSelected && <Check className="h-3 w-3 text-primary stroke-[3.5]" />}
                                </button>
                              </th>
                              <th className="py-3 font-semibold">Name</th>
                              <th className="py-3 font-semibold w-36">Modified</th>
                              <th className="py-3 font-semibold w-28 text-right pr-2">Size</th>
                            </tr>
                          </thead>
                          <tbody>
                            {files.map((file) => {
                              const isFolder = file.isFolder;
                              const isSelected = !!selectedFiles[file.id];
                              const dateString = file.modifiedTime
                                ? new Date(file.modifiedTime).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "—";

                              let IconComponent = File;
                              let iconColor = "text-primary";
                              if (isFolder) {
                                IconComponent = Folder;
                                iconColor = "text-amber-500 fill-amber-500/20";
                              } else {
                                const nameLower = file.name.toLowerCase();
                                const mime = file.mimeType || "";
                                if (mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(nameLower)) {
                                  IconComponent = Image;
                                  iconColor = "text-pink-400";
                                } else if (mime.startsWith("video/") || /\.(mp4|mkv|mov|avi|wmv|flv)$/i.test(nameLower)) {
                                  IconComponent = Video;
                                  iconColor = "text-purple-400";
                                } else if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(nameLower)) {
                                  IconComponent = Music;
                                  iconColor = "text-emerald-400";
                                } else if (mime === "application/pdf" || nameLower.endsWith(".pdf")) {
                                  IconComponent = FileText;
                                  iconColor = "text-rose-400";
                                } else if (mime.includes("spreadsheet") || mime.includes("excel") || /\.(xls|xlsx|csv)$/i.test(nameLower)) {
                                  IconComponent = FileSpreadsheet;
                                  iconColor = "text-green-400";
                                } else if (file.isGoogleDoc) {
                                  IconComponent = FileText;
                                  iconColor = "text-blue-400";
                                }
                              }

                              return (
                                <tr
                                  key={file.id}
                                  onClick={() => {
                                    if (isFolder) {
                                      handleFolderClick(file);
                                    } else {
                                      handleToggleFile(file);
                                    }
                                  }}
                                  className={cn(
                                    "border-b border-border/20 group hover:bg-secondary/15 transition-colors cursor-pointer",
                                    isSelected && "bg-primary/5 hover:bg-primary/10"
                                  )}
                                >
                                  <td className="py-3 pl-1" onClick={(e) => e.stopPropagation()}>
                                    {!isFolder && file.canDownload ? (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleFile(file)}
                                        className={cn(
                                          "flex h-5 w-5 items-center justify-center rounded-md border transition-colors cursor-pointer",
                                          isSelected
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-secondary/35 hover:border-muted-foreground"
                                        )}
                                      >
                                        {isSelected && <Check className="h-3 w-3 stroke-[3.5]" />}
                                      </button>
                                    ) : (
                                      <div className="h-5 w-5" />
                                    )}
                                  </td>
                                  <td className="py-3">
                                    <div className="flex items-center gap-2.5 text-foreground truncate pr-2 group-hover:text-primary transition-colors">
                                      <IconComponent className={cn("h-4.5 w-4.5 shrink-0", iconColor)} />
                                      <span className="truncate font-semibold">{file.name}</span>
                                      {file.isGoogleDoc && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-450 font-semibold uppercase tracking-wider scale-90 shrink-0">
                                          Google Doc
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 text-muted-foreground font-sans">
                                    {dateString}
                                  </td>
                                  <td className="py-3 text-muted-foreground text-right pr-2 font-sans">
                                    {isFolder
                                      ? "Folder"
                                      : file.size
                                      ? formatSize(file.size)
                                      : file.isGoogleDoc
                                      ? "Google Doc"
                                      : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Load More Button */}
                    {nextPageToken && (
                      <div className="flex justify-center mt-6">
                        <button
                          type="button"
                          disabled={loadMoreLoading}
                          onClick={() => fetchFiles(currentFolderId, nextPageToken, true, searchQuery)}
                          className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 px-6 py-2.5 text-xs font-semibold text-foreground transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        >
                          {loadMoreLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          {loadMoreLoading ? "Loading..." : "Load More Files"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Action Bar / Selection summary at the bottom */}
              <div className="px-6 py-4 bg-secondary/10 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md relative z-10">
                {/* Size stats */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="font-semibold text-foreground">
                      Selected: {selectedCount} {selectedCount === 1 ? "file" : "files"}
                    </span>
                    <span className="text-muted-foreground/60 font-sans">•</span>
                    <span className="font-semibold text-primary">
                      Total Size: {formatSize(selectedTotalSize)}
                    </span>
                  </div>
                  {userProfile && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-sans">
                      <HardDrive className="h-3.5 w-3.5 shrink-0" />
                      <span className={cn(isOverQuota ? "text-destructive font-bold animate-pulse" : "text-muted-foreground")}>
                        Available Drivya Storage: {formatSize(Math.max(0, userProfile.storageLimit - userProfile.storageUsed))}
                      </span>
                    </div>
                  )}
                </div>

                {/* Directory Selector and Import Submission Button */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Drivya Folder Selector */}
                  <div ref={pickerRef} className="flex items-center gap-2 text-xs relative select-none">
                    <span className="text-muted-foreground font-semibold font-sans">Import into:</span>
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(!isPickerOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary/20 hover:bg-secondary/40 border border-border rounded-xl text-foreground cursor-pointer transition-all font-semibold max-w-[200px] truncate"
                      title={selectedTargetDirPath}
                    >
                      <Folder className="h-3.5 w-3.5 text-amber-500 fill-amber-500/10 shrink-0" />
                      <span className="truncate">{selectedTargetDirName}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 shrink-0" style={{ transform: isPickerOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                    </button>

                    <AnimatePresence>
                      {isPickerOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full mb-2 right-0 w-72 bg-card/95 border border-border rounded-2xl shadow-elegant backdrop-blur-md z-50 flex flex-col overflow-hidden text-left"
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/80 bg-secondary/15">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              {pickerFolderStack.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPickerFolderStack(prev => prev.slice(0, -1));
                                  }}
                                  className="p-1 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                                >
                                  <ArrowLeft className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <span className="font-semibold text-foreground truncate max-w-[150px]">
                                {pickerFolderStack[pickerFolderStack.length - 1].name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetDir(pickerFolderStack[pickerFolderStack.length - 1].id);
                                setIsPickerOpen(false);
                              }}
                              className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-primary hover:opacity-90 text-primary-foreground transition-all cursor-pointer shadow-glow shrink-0"
                            >
                              Select
                            </button>
                          </div>

                          {/* Folders List */}
                          <div className="flex-1 overflow-y-auto max-h-[180px] p-1.5 space-y-0.5 font-sans">
                            {getPickerChildren(pickerFolderStack[pickerFolderStack.length - 1].id).length === 0 ? (
                              <div className="px-3.5 py-6 text-center text-muted-foreground/60 text-[11px] font-sans">
                                No subfolders inside this folder.
                              </div>
                            ) : (
                              getPickerChildren(pickerFolderStack[pickerFolderStack.length - 1].id).map((dir) => (
                                <div
                                  key={dir._id}
                                  onClick={() => {
                                    setPickerFolderStack(prev => [...prev, { id: dir._id.toString(), name: dir.name }]);
                                  }}
                                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-secondary/40 text-foreground cursor-pointer transition-colors group/item"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <Folder className="h-4 w-4 text-amber-500 fill-amber-500/10 shrink-0" />
                                    <span className="truncate text-xs font-semibold">{dir.name}</span>
                                  </div>
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover/item:text-foreground transition-colors shrink-0" />
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={selectedCount === 0 || isOverQuota}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 h-10 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 active:translate-y-px transition-all cursor-pointer",
                      (selectedCount === 0 || isOverQuota) && "opacity-40 cursor-not-allowed active:translate-y-0 shadow-none hover:opacity-100"
                    )}
                  >
                    Import Selected Files
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Closing actions bottom bar when done/completed */}
        {importSummary && (
          <div className="px-6 py-4 bg-secondary/10 border-t border-border flex items-center justify-end gap-3 backdrop-blur-md relative z-20">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 px-6 h-10 text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
