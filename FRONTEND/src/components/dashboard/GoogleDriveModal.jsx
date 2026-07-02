import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Search,
  Folder,
  File,
  ArrowLeft,
  Check,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getGoogleStatus, disconnectGoogle, listGoogleFiles, importGoogleFiles, getGoogleAuthUrl } from "../../../api/googleDrive";
import { listDirectory } from "../../../api/drive";
import { iconBtn, primaryBtn, ghostBtn } from "./dashboard-tokens.jsx";

function formatSize(bytes) {
  if (bytes == null) return "Unknown size";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
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

  // Selection states
  const [selectedFiles, setSelectedFiles] = useState({}); // fileId -> fileObj
  const [drivyaDirs, setDrivyaDirs] = useState([]); // Folders in current workspace to pick destination
  const [targetDir, setTargetDir] = useState(currentDirId || "root");

  // Import/SSE states
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [fileProgress, setFileProgress] = useState({}); // fileId -> { percent, status, error }
  const [error, setError] = useState(null);

  const currentFolderId = folderStack[folderStack.length - 1].id;

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

  // Fetch Drivya directories for target destination selection
  const fetchDrivyaDirectories = async () => {
    try {
      const data = await listDirectory(null); // Get root directories
      if (data && data.directories) {
        setDrivyaDirs(data.directories);
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
    }, 400);

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
      // Clear search when clicking into a folder
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
          // Trigger a refresh event for Drivya files layout
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-background/60 dark:bg-background/80 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="relative flex flex-col w-full max-w-4xl h-[85vh] bg-card text-card-foreground border border-border/80 rounded-3xl shadow-elegant overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 3.5h13.12l-3.43 6H6.28M15.66 15H2.55l3.43 6h13.11" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display tracking-tight leading-tight">
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
                className={cn(iconBtn, "text-destructive hover:bg-destructive/10")}
                title="Disconnect Google account"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className={iconBtn}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Inner Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {authLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Checking Google connection status...</p>
            </div>
          ) : !isConnected ? (
            /* Connect Prompt Screen */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
              <div className="relative mb-6">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary to-accent opacity-20 blur-md animate-pulse" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-secondary/60 border border-border shadow-md">
                  <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 3.5h13.12l-3.43 6H6.28M15.66 15H2.55l3.43 6h13.11" />
                  </svg>
                </div>
              </div>
              <h3 className="text-base font-semibold font-display mb-2">Connect Google Drive</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Connect your Google account safely. Drivya only requests read access to list and download files you select to import.
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
                className={cn(primaryBtn, "w-full justify-center")}
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
                      <h4 className="text-sm font-semibold">Streaming files to Drivya...</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Transferring directly from Google servers to secure storage.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-foreground animate-pulse">
                    Keep tab open
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-6 bg-secondary/20 border border-border/40 rounded-2xl">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h4 className="text-base font-semibold font-display">Import Completed Successfully</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Successfully imported {importSummary.imported} of {importSummary.imported + importSummary.failed} file(s).
                    Total size: {formatSize(importSummary.totalSize)}.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Progress rows */}
              <div className="space-y-3.5 max-w-2xl mx-auto">
                {Object.keys(fileProgress).map((id) => {
                  const item = fileProgress[id];
                  const isDone = item.status === "complete";
                  const isFailed = item.status === "failed";
                  const isDownloading = item.status === "downloading";

                  return (
                    <div
                      key={id}
                      className="p-3 border border-border/50 bg-secondary/10 rounded-2xl flex flex-col gap-2 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground truncate max-w-[70%]">
                          {item.name}
                        </span>
                        <span
                          className={cn(
                            "font-semibold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-full",
                            isDone && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            isFailed && "bg-destructive/10 text-destructive",
                            isDownloading && "bg-primary/10 text-primary animate-pulse",
                            item.status === "waiting" && "bg-muted text-muted-foreground"
                          )}
                        >
                          {item.status}
                        </span>
                      </div>

                      {/* Progress Bar container */}
                      <div className="w-full h-1.5 bg-secondary/80 rounded-full overflow-hidden relative">
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

                      {/* Detailed info or error */}
                      {isFailed && item.error && (
                        <p className="text-[10px] text-destructive italic mt-0.5">
                          Error: {item.error}
                        </p>
                      )}
                      {isDownloading && (
                        <p className="text-[10px] text-muted-foreground text-right tabular-nums">
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
              {/* Search & Breadcrumbs bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 bg-secondary/20 border-b border-border/60">
                {/* Breadcrumbs stack */}
                <div className="flex items-center gap-1.5 text-xs overflow-x-auto py-1">
                  {folderStack.map((folder, index) => {
                    const isLast = index === folderStack.length - 1;
                    return (
                      <div key={folder.id} className="flex items-center shrink-0">
                        {index > 0 && <span className="text-muted-foreground mx-1">/</span>}
                        {index === 0 && folderStack.length > 1 ? (
                          <button
                            type="button"
                            onClick={handleGoBack}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back
                          </button>
                        ) : (
                          <span
                            className={cn(
                              "font-medium",
                              isLast ? "text-foreground font-semibold" : "text-muted-foreground"
                            )}
                          >
                            {folder.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Search Box */}
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Google Drive..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-background border border-border/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 transition-all text-foreground"
                  />
                </div>
              </div>

              {/* List container */}
              <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl mb-3">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {loadingFiles ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    <p className="text-xs text-muted-foreground">Listing Drive files...</p>
                  </div>
                ) : files.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <Folder className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-xs">No files or folders found</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground">
                        <th className="w-10 py-2.5">
                          <button
                            type="button"
                            onClick={handleSelectAllToggle}
                            className="flex h-5 w-5 items-center justify-center rounded-md border border-border hover:bg-secondary/40 transition-colors cursor-pointer animate-fade-in"
                          >
                            {isAllSelected && <Check className="h-3 w-3 text-primary stroke-[3]" />}
                          </button>
                        </th>
                        <th className="py-2.5 font-medium">Name</th>
                        <th className="py-2.5 font-medium w-36">Modified</th>
                        <th className="py-2.5 font-medium w-28 text-right">Size</th>
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

                        return (
                          <tr
                            key={file.id}
                            className={cn(
                              "border-b border-border/20 group hover:bg-secondary/20 transition-colors",
                              isSelected && "bg-primary/5 hover:bg-primary/10"
                            )}
                          >
                            <td className="py-2.5">
                              {!isFolder && file.canDownload ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleFile(file)}
                                  className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded-md border transition-colors cursor-pointer",
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border hover:border-foreground"
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </button>
                              ) : (
                                <div className="h-5 w-5" />
                              )}
                            </td>
                            <td className="py-2.5">
                              {isFolder ? (
                                <button
                                  type="button"
                                  onClick={() => handleFolderClick(file)}
                                  className="flex items-center gap-2.5 font-medium text-foreground hover:text-primary transition-colors cursor-pointer text-left w-full truncate"
                                >
                                  <Folder className="h-4.5 w-4.5 text-amber-500 fill-amber-500/25 shrink-0" />
                                  <span className="truncate">{file.name}</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-2.5 text-foreground truncate pr-2">
                                  <File className="h-4.5 w-4.5 text-blue-500 fill-blue-500/10 shrink-0" />
                                  <span className="truncate">{file.name}</span>
                                  {file.isGoogleDoc && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 font-medium scale-90">
                                      Google Doc
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 text-muted-foreground font-medium font-sans">
                              {dateString}
                            </td>
                            <td className="py-2.5 text-muted-foreground font-medium text-right pr-1 font-sans">
                              {isFolder
                                ? "Folder"
                                : file.size
                                ? formatSize(file.size)
                                : file.isGoogleDoc
                                ? "Auto Export"
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Load More Button */}
                {nextPageToken && (
                  <div className="flex justify-center mt-4">
                    <button
                      type="button"
                      disabled={loadMoreLoading}
                      onClick={() => fetchFiles(currentFolderId, nextPageToken, true, searchQuery)}
                      className={cn(ghostBtn, "h-8 text-xs font-medium cursor-pointer")}
                    >
                      {loadMoreLoading && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                      Load More Files
                    </button>
                  </div>
                )}
              </div>

              {/* Action Bar / Status bar (only shows if something is selected) */}
              <div className="px-6 py-4 bg-secondary/30 border-t border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Space Quota & Selected size */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="font-semibold text-foreground">
                      Selected: {selectedCount} {selectedCount === 1 ? "file" : "files"}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-semibold text-foreground">
                      Size: {formatSize(selectedTotalSize)}
                    </span>
                  </div>
                  {userProfile && (
                    <div className="flex items-center gap-1.5 text-[11px] font-sans">
                      <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={cn(isOverQuota ? "text-destructive font-bold animate-pulse" : "text-muted-foreground")}>
                        Available Drivya Storage: {formatSize(Math.max(0, userProfile.storageLimit - userProfile.storageUsed))}
                      </span>
                    </div>
                  )}
                </div>

                {/* Import Destination Picker + Action Button */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground font-medium">Import into:</span>
                    <select
                      value={targetDir}
                      onChange={(e) => setTargetDir(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-background border border-border/80 rounded-xl focus:outline-none focus:ring-1 text-foreground"
                    >
                      <option value="root">My Drive (Root)</option>
                      {drivyaDirs.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={selectedCount === 0 || isOverQuota}
                    className={cn(
                      primaryBtn,
                      "h-9 px-4.5 justify-center cursor-pointer",
                      (selectedCount === 0 || isOverQuota) && "opacity-40 cursor-not-allowed active:translate-y-0"
                    )}
                  >
                    Import Selected Files
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Done / Action bar if finished */}
        {importSummary && (
          <div className="px-6 py-4 bg-secondary/30 border-t border-border/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className={cn(primaryBtn, "px-6 cursor-pointer")}
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
