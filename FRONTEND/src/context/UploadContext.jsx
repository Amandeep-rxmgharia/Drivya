import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { uploadSingleFile } from "../../api/drive.js";

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
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const updateTask = useCallback((id, patch) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }, []);

  // Worker to process the next queued task
  const processNextTask = useCallback(async () => {
    if (activeWorkersRef.current.size >= MAX_CONCURRENT_UPLOADS) {
      return;
    }

    // Find next queued task not already being processed
    const currentTasks = tasksRef.current;
    const nextTask = currentTasks.find(
      (t) => t.status === "queued" && !activeWorkersRef.current.has(t.id)
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
      // Trigger next task in queue
      setTimeout(() => {
        processNextTask();
      }, 50);
    }
  }, [updateTask]);

  // Keep worker processing whenever tasks change and there are queued items
  useEffect(() => {
    const hasQueued = tasks.some((t) => t.status === "queued");
    if (hasQueued && activeWorkersRef.current.size < MAX_CONCURRENT_UPLOADS) {
      processNextTask();
    }
  }, [tasks, processNextTask]);

  // Enqueue new uploads
  const enqueueUploads = useCallback(
    (files, directoryId = "") => {
      const fileList = Array.isArray(files) ? files : Array.from(files);
      if (fileList.length === 0) return;

      const newTasks = fileList.map((item) => {
        const fileObj = item.file || item;
        return {
          id: crypto.randomUUID(),
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

  // Cancel an active or queued upload
  const cancelTask = useCallback(
    (taskId) => {
      const xhr = activeXhrsRef.current.get(taskId);
      if (xhr) {
        xhr.abort();
        activeXhrsRef.current.delete(taskId);
      }
      activeWorkersRef.current.delete(taskId);
      updateTask(taskId, {
        status: "aborted",
        stageText: "Cancelled",
        error: "Upload was cancelled",
      });
      setTimeout(() => processNextTask(), 50);
    },
    [updateTask, processNextTask]
  );

  // Retry a failed or aborted upload
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

  // Cancel all active and queued uploads
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

  return (
    <UploadContext.Provider
      value={{
        tasks,
        isOpen,
        isMinimized,
        isUploading,
        activeCount,
        completedCount,
        failedCount,
        totalCount,
        overallProgress,
        totalBytes,
        loadedBytes,
        enqueueUploads,
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
