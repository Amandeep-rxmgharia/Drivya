import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { uploadSingleFile } from "../../api/drive.js";
import { importGoogleFiles, cancelGoogleImport } from "../../api/googleDrive.js";
import { importDropboxFiles, cancelDropboxImport } from "../../api/dropbox.js";

const UploadContext = createContext(null);

const MAX_CONCURRENT_UPLOADS = 2;

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

export function UploadProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Store active XHRs and processing references outside React state for instant mutation
  const activeXhrsRef = useRef(new Map());
  const activeWorkersRef = useRef(new Set());
  const activeCloudImportRef = useRef(null); // { controller, source, taskIds }
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const updateTask = useCallback((id, patch) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }, []);

  // Worker to process the next queued local upload task
  const processNextLocalTask = useCallback(async () => {
    if (activeWorkersRef.current.size >= MAX_CONCURRENT_UPLOADS) {
      return;
    }

    const currentTasks = tasksRef.current;
    const nextTask = currentTasks.find(
      (t) =>
        (t.source === "local" || !t.source) &&
        t.status === "queued" &&
        !activeWorkersRef.current.has(t.id)
    );

    if (!nextTask) return;

    const taskId = nextTask.id;
    activeWorkersRef.current.add(taskId);

    updateTask(taskId, {
      status: "presigning",
      stageText: "Requesting upload slot…",
      error: null,
    });

    try {
      await uploadSingleFile({
        file: nextTask.file,
        directoryId: nextTask.directoryId,
        onXhrCreated: (xhr) => {
          activeXhrsRef.current.set(taskId, xhr);
        },
        onStageChange: (stage) => {
          if (stage === "uploading") {
            updateTask(taskId, {
              status: "uploading",
              stageText: "Uploading to storage…",
            });
          } else if (stage === "confirming") {
            updateTask(taskId, {
              status: "confirming",
              stageText: "Saving to drive…",
              progress: 100,
            });
          }
        },
        onProgress: ({ loaded, total, percent }) => {
          updateTask(taskId, {
            loadedBytes: loaded,
            totalBytes: total || nextTask.size,
            progress: percent,
          });
        },
      });

      // Successful completion
      activeXhrsRef.current.delete(taskId);
      updateTask(taskId, {
        status: "completed",
        stageText: "Completed",
        progress: 100,
        loadedBytes: nextTask.size,
      });

      // Notify drive to refresh directory contents
      window.dispatchEvent(new CustomEvent("refresh-drive"));

      // Show in-app notification toast
      window.dispatchEvent(
        new CustomEvent("add-drivya-notification", {
          detail: {
            title: "File Uploaded Successfully",
            description: `Successfully uploaded "${nextTask.name}" (${formatBytes(nextTask.size)}) to your drive.`,
            type: "upload",
            actionLabel: "View in Drive",
            actionPath: "/dashboard/drive",
          },
        })
      );
    } catch (err) {
      activeXhrsRef.current.delete(taskId);
      const isAborted =
        err.message?.toLowerCase().includes("cancelled") ||
        err.message?.toLowerCase().includes("aborted");

      if (isAborted) {
        updateTask(taskId, {
          status: "aborted",
          stageText: "Cancelled",
          error: "Upload was cancelled",
        });
      } else {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Upload failed. Please check plan storage limit.";
        updateTask(taskId, {
          status: "error",
          stageText: "Failed",
          error: errorMsg,
        });
      }
    } finally {
      activeWorkersRef.current.delete(taskId);
      setTimeout(() => {
        processNextLocalTask();
      }, 50);
    }
  }, [updateTask]);

  // Worker to process queued cloud imports (Google Drive / Dropbox)
  const processNextCloudTask = useCallback(async () => {
    if (activeCloudImportRef.current) {
      return; // backend supports 1 cloud import lock at a time per user
    }

    const currentTasks = tasksRef.current;
    const queuedCloudTasks = currentTasks.filter(
      (t) =>
        ["google-drive", "dropbox"].includes(t.source) &&
        t.status === "queued"
    );

    if (queuedCloudTasks.length === 0) return;

    // Pick first provider and target directory to batch
    const firstTask = queuedCloudTasks[0];
    const source = firstTask.source;
    const targetDirId = firstTask.directoryId || "";

    // Batch all queued tasks of this same source and directory up to 20 files
    const batch = queuedCloudTasks
      .filter(
        (t) => t.source === source && (t.directoryId || "") === targetDirId
      )
      .slice(0, 20);

    const controller = new AbortController();
    activeCloudImportRef.current = {
      controller,
      source,
      taskIds: batch.map((t) => t.id),
    };

    batch.forEach((t) => {
      updateTask(t.id, {
        status: "presigning",
        stageText:
          source === "google-drive"
            ? "Connecting to Google Drive…"
            : "Connecting to Dropbox…",
        error: null,
      });
    });

    try {
      if (source === "google-drive") {
        const fileIds = batch.map((t) => t.sourceId);
        await importGoogleFiles(
          fileIds,
          targetDirId || null,
          {
            onStart: () => {
              batch.forEach((t) => {
                updateTask(t.id, {
                  status: "uploading",
                  stageText: "Transferring from Google Drive…",
                });
              });
            },
            onProgress: (data) => {
              const matchedTask = batch.find((t) => t.sourceId === data.fileId);
              if (!matchedTask) return;

              if (data.status === "downloading") {
                const estTotal = matchedTask.size || 1048576;
                const loaded = Math.round((estTotal * data.percent) / 100);
                updateTask(matchedTask.id, {
                  status: "uploading",
                  stageText: "Transferring from Google Drive…",
                  progress: data.percent,
                  loadedBytes: loaded,
                });
              } else if (data.status === "complete") {
                const finalSize = matchedTask.size || 1048576;
                updateTask(matchedTask.id, {
                  status: "completed",
                  stageText: "Completed",
                  progress: 100,
                  loadedBytes: finalSize,
                });
                window.dispatchEvent(new CustomEvent("refresh-drive"));
                window.dispatchEvent(
                  new CustomEvent("add-drivya-notification", {
                    detail: {
                      title: "Google Drive File Imported",
                      description: `Successfully imported "${matchedTask.name}" (${formatBytes(finalSize)}) to your drive.`,
                      type: "google-drive",
                      actionLabel: "View in Drive",
                      actionPath: "/dashboard/drive",
                    },
                  })
                );
              } else if (data.status === "failed") {
                updateTask(matchedTask.id, {
                  status: "error",
                  stageText: "Failed",
                  error: data.error || "Import failed from Google Drive",
                });
              }
            },
            onDone: () => {
              window.dispatchEvent(new CustomEvent("refresh-drive"));
            },
            onCancelled: () => {
              batch.forEach((t) => {
                const cur = tasksRef.current.find((x) => x.id === t.id);
                if (cur && !["completed", "error"].includes(cur.status)) {
                  updateTask(t.id, {
                    status: "aborted",
                    stageText: "Cancelled",
                    error: "Import was cancelled",
                  });
                }
              });
              window.dispatchEvent(new CustomEvent("refresh-drive"));
            },
            onError: (data) => {
              batch.forEach((t) => {
                const cur = tasksRef.current.find((x) => x.id === t.id);
                if (cur && !["completed", "error"].includes(cur.status)) {
                  updateTask(t.id, {
                    status: "error",
                    stageText: "Failed",
                    error: data.error || "Google Drive import failed",
                  });
                }
              });
            },
          },
          controller.signal
        );
      } else if (source === "dropbox") {
        const filePaths = batch.map((t) => t.sourceId);
        await importDropboxFiles(
          filePaths,
          targetDirId || null,
          {
            onStart: () => {
              batch.forEach((t) => {
                updateTask(t.id, {
                  status: "uploading",
                  stageText: "Transferring from Dropbox…",
                });
              });
            },
            onProgress: (data) => {
              const matchedTask = batch.find((t) => t.sourceId === data.fileId);
              if (!matchedTask) return;

              if (data.status === "downloading") {
                const estTotal = matchedTask.size || 1048576;
                const loaded = Math.round((estTotal * data.percent) / 100);
                updateTask(matchedTask.id, {
                  status: "uploading",
                  stageText: "Transferring from Dropbox…",
                  progress: data.percent,
                  loadedBytes: loaded,
                });
              } else if (data.status === "complete") {
                const finalSize = matchedTask.size || 1048576;
                updateTask(matchedTask.id, {
                  status: "completed",
                  stageText: "Completed",
                  progress: 100,
                  loadedBytes: finalSize,
                });
                window.dispatchEvent(new CustomEvent("refresh-drive"));
                window.dispatchEvent(
                  new CustomEvent("add-drivya-notification", {
                    detail: {
                      title: "Dropbox File Imported",
                      description: `Successfully imported "${matchedTask.name}" (${formatBytes(finalSize)}) to your drive.`,
                      type: "dropbox",
                      actionLabel: "View in Drive",
                      actionPath: "/dashboard/drive",
                    },
                  })
                );
              } else if (data.status === "failed") {
                updateTask(matchedTask.id, {
                  status: "error",
                  stageText: "Failed",
                  error: data.error || "Import failed from Dropbox",
                });
              }
            },
            onDone: () => {
              window.dispatchEvent(new CustomEvent("refresh-drive"));
            },
            onCancelled: () => {
              batch.forEach((t) => {
                const cur = tasksRef.current.find((x) => x.id === t.id);
                if (cur && !["completed", "error"].includes(cur.status)) {
                  updateTask(t.id, {
                    status: "aborted",
                    stageText: "Cancelled",
                    error: "Import was cancelled",
                  });
                }
              });
              window.dispatchEvent(new CustomEvent("refresh-drive"));
            },
            onError: (data) => {
              batch.forEach((t) => {
                const cur = tasksRef.current.find((x) => x.id === t.id);
                if (cur && !["completed", "error"].includes(cur.status)) {
                  updateTask(t.id, {
                    status: "error",
                    stageText: "Failed",
                    error: data.error || "Dropbox import failed",
                  });
                }
              });
            },
          },
          controller.signal
        );
      }
    } catch (err) {
      const isAborted =
        err.name === "AbortError" ||
        err.message?.toLowerCase().includes("cancelled") ||
        err.message?.toLowerCase().includes("aborted");

      batch.forEach((t) => {
        const cur = tasksRef.current.find((x) => x.id === t.id);
        if (cur && !["completed", "error"].includes(cur.status)) {
          updateTask(t.id, {
            status: isAborted ? "aborted" : "error",
            stageText: isAborted ? "Cancelled" : "Failed",
            error: isAborted ? "Import was cancelled" : err.message || "Cloud transfer failed",
          });
        }
      });
    } finally {
      activeCloudImportRef.current = null;
      setTimeout(() => {
        processNextCloudTask();
      }, 50);
    }
  }, [updateTask]);

  // Keep workers processing whenever tasks change and there are queued items
  useEffect(() => {
    const hasQueuedLocal = tasks.some(
      (t) => (t.source === "local" || !t.source) && t.status === "queued"
    );
    if (hasQueuedLocal && activeWorkersRef.current.size < MAX_CONCURRENT_UPLOADS) {
      processNextLocalTask();
    }

    const hasQueuedCloud = tasks.some(
      (t) =>
        ["google-drive", "dropbox"].includes(t.source) &&
        t.status === "queued"
    );
    if (hasQueuedCloud && !activeCloudImportRef.current) {
      processNextCloudTask();
    }
  }, [tasks, processNextLocalTask, processNextCloudTask]);

  // Enqueue new local uploads
  const enqueueUploads = useCallback(
    (files, directoryId = "") => {
      const fileList = Array.isArray(files) ? files : Array.from(files);
      if (fileList.length === 0) return;

      const newTasks = fileList.map((item) => {
        const fileObj = item.file || item;
        return {
          id: crypto.randomUUID(),
          source: "local",
          sourceId: null,
          file: fileObj,
          name: fileObj.name,
          size: fileObj.size,
          type: fileObj.type,
          directoryId: directoryId || "",
          status: "queued",
          stageText: "Queued",
          progress: 0,
          loadedBytes: 0,
          totalBytes: fileObj.size,
          error: null,
          createdAt: Date.now(),
        };
      });

      setTasks((prev) => [...prev, ...newTasks]);
      setIsOpen(true);
      setIsMinimized(false);
    },
    []
  );

  // Enqueue Google Drive file imports
  const enqueueGoogleImports = useCallback(
    (files, directoryId = "") => {
      const fileList = Array.isArray(files) ? files : Array.from(files);
      if (fileList.length === 0) return;

      const newTasks = fileList.map((item) => ({
        id: crypto.randomUUID(),
        source: "google-drive",
        sourceId: item.id,
        file: null,
        name: item.name,
        size: item.size || 1024 * 1024,
        type: item.mimeType || "application/octet-stream",
        directoryId: directoryId || "",
        status: "queued",
        stageText: "Queued for Google Drive import",
        progress: 0,
        loadedBytes: 0,
        totalBytes: item.size || 1024 * 1024,
        error: null,
        createdAt: Date.now(),
      }));

      setTasks((prev) => [...prev, ...newTasks]);
      setIsOpen(true);
      setIsMinimized(false);
    },
    []
  );

  // Enqueue Dropbox file imports
  const enqueueDropboxImports = useCallback(
    (files, directoryId = "") => {
      const fileList = Array.isArray(files) ? files : Array.from(files);
      if (fileList.length === 0) return;

      const newTasks = fileList.map((item) => ({
        id: crypto.randomUUID(),
        source: "dropbox",
        sourceId: item.pathLower || item.id,
        file: null,
        name: item.name,
        size: item.size || 1024 * 1024,
        type: item.mimeType || "application/octet-stream",
        directoryId: directoryId || "",
        status: "queued",
        stageText: "Queued for Dropbox import",
        progress: 0,
        loadedBytes: 0,
        totalBytes: item.size || 1024 * 1024,
        error: null,
        createdAt: Date.now(),
      }));

      setTasks((prev) => [...prev, ...newTasks]);
      setIsOpen(true);
      setIsMinimized(false);
    },
    []
  );

  // Cancel an active or queued upload/import
  const cancelTask = useCallback(
    (taskId) => {
      // Check local upload
      const xhr = activeXhrsRef.current.get(taskId);
      if (xhr) {
        xhr.abort();
        activeXhrsRef.current.delete(taskId);
      }
      activeWorkersRef.current.delete(taskId);

      // Check cloud import
      if (
        activeCloudImportRef.current &&
        activeCloudImportRef.current.taskIds.includes(taskId)
      ) {
        try {
          activeCloudImportRef.current.controller.abort();
          if (activeCloudImportRef.current.source === "google-drive") {
            cancelGoogleImport().catch(() => {});
          } else if (activeCloudImportRef.current.source === "dropbox") {
            cancelDropboxImport().catch(() => {});
          }
        } catch {
          // ignore
        }
        activeCloudImportRef.current = null;
      }

      updateTask(taskId, {
        status: "aborted",
        stageText: "Cancelled",
        error: "Upload was cancelled",
      });

      setTimeout(() => {
        processNextLocalTask();
        processNextCloudTask();
      }, 50);
    },
    [updateTask, processNextLocalTask, processNextCloudTask]
  );

  // Retry a failed or aborted upload/import
  const retryTask = useCallback(
    (taskId) => {
      updateTask(taskId, {
        status: "queued",
        stageText: "Queued",
        progress: 0,
        loadedBytes: 0,
        error: null,
      });
    },
    [updateTask]
  );

  // Cancel all active and queued uploads and imports
  const cancelAll = useCallback(() => {
    activeXhrsRef.current.forEach((xhr) => {
      try {
        xhr.abort();
      } catch {
        // ignore
      }
    });
    activeXhrsRef.current.clear();
    activeWorkersRef.current.clear();

    if (activeCloudImportRef.current) {
      try {
        activeCloudImportRef.current.controller.abort();
        if (activeCloudImportRef.current.source === "google-drive") {
          cancelGoogleImport().catch(() => {});
        } else if (activeCloudImportRef.current.source === "dropbox") {
          cancelDropboxImport().catch(() => {});
        }
      } catch {
        // ignore
      }
      activeCloudImportRef.current = null;
    }

    setTasks((prev) =>
      prev.map((t) =>
        ["queued", "presigning", "uploading", "confirming"].includes(t.status)
          ? {
              ...t,
              status: "aborted",
              stageText: "Cancelled",
              error: "Upload was cancelled",
            }
          : t
      )
    );
  }, []);

  // Clear completed uploads from manager view
  const clearCompleted = useCallback(() => {
    setTasks((prev) => {
      const remaining = prev.filter((t) => t.status !== "completed");
      if (remaining.length === 0) {
        setIsOpen(false);
      }
      return remaining;
    });
  }, []);

  // Remove a single task (if completed, aborted or error)
  const removeTask = useCallback((taskId) => {
    setTasks((prev) => {
      const remaining = prev.filter((t) => t.id !== taskId);
      if (remaining.length === 0) {
        setIsOpen(false);
      }
      return remaining;
    });
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const closeWidget = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openWidget = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Compute summary metrics
  const activeCount = tasks.filter((t) =>
    ["queued", "presigning", "uploading", "confirming"].includes(t.status)
  ).length;

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const failedCount = tasks.filter((t) =>
    ["error", "aborted"].includes(t.status)
  ).length;
  const totalCount = tasks.length;

  const totalBytes = tasks.reduce((sum, t) => sum + (t.totalBytes || 0), 0);
  const loadedBytes = tasks.reduce((sum, t) => sum + (t.loadedBytes || 0), 0);
  const overallProgress =
    totalBytes > 0
      ? Math.min(100, Math.round((loadedBytes * 100) / totalBytes))
      : completedCount === totalCount && totalCount > 0
      ? 100
      : 0;

  const isUploading = activeCount > 0;

  const isCloudImporting = tasks.some(
    (t) =>
      ["google-drive", "dropbox"].includes(t.source) &&
      ["queued", "presigning", "uploading", "confirming"].includes(t.status)
  );

  return (
    <UploadContext.Provider
      value={{
        tasks,
        isOpen,
        isMinimized,
        isUploading,
        isCloudImporting,
        activeCount,
        completedCount,
        failedCount,
        totalCount,
        overallProgress,
        totalBytes,
        loadedBytes,
        enqueueUploads,
        enqueueGoogleImports,
        enqueueDropboxImports,
        cancelTask,
        retryTask,
        cancelAll,
        clearCompleted,
        removeTask,
        toggleMinimize,
        closeWidget,
        openWidget,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return ctx;
}
