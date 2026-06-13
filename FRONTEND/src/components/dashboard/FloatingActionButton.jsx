import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  X,
  FolderPlus,
  UploadCloud,
  FileUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { easeSmooth } from "@/lib/motion-presets";
import { createDirectory, uploadFiles } from "../../../api/drive.js";

/* ───────────────────────── Create Folder Modal ───────────────────────── */

function CreateFolderModal({ onClose }) {
  const [folderName, setFolderName] = useState("");
  const [status, setStatus] = useState("idle"); // idle | creating | success | error
  const inputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!folderName.trim()) return;
    setStatus("creating");
    try {
      const isDrivePage = location.pathname.startsWith("/dashboard/drive");
      const parentDirId = isDrivePage ? (searchParams.get("dir") || null) : null;

      await createDirectory({ name: folderName.trim(), parentDirId });
      setStatus("success");
      
      window.dispatchEvent(
        new CustomEvent("add-drivya-notification", {
          detail: {
            title: "Folder Created",
            description: `Folder "${folderName}" was successfully created in your drive.`,
            type: "system",
            actionLabel: "View Drive",
            actionPath: "/dashboard/drive",
          },
        })
      );

      if (isDrivePage) {
        window.dispatchEvent(new CustomEvent("refresh-drive"));
      } else {
        navigate("/dashboard/drive");
      }

      setTimeout(() => onClose(), 1200);
    } catch (err) {
      console.error("Failed to create folder:", err);
      setStatus("error");
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-md rounded-2xl glass shadow-elegant overflow-hidden"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "tween", duration: 0.35, ease: easeSmooth }}
      >
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-ambient-primary blur-3xl opacity-60 pointer-events-none" />

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <FolderPlus className="h-5 w-5 text-primary-foreground" />
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                New Folder
              </h3>
              <p className="text-sm text-muted-foreground">
                Create a new folder in your drive
              </p>
            </div>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <label
              htmlFor="folder-name-input"
              className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground"
            >
              Folder name
            </label>
            <input
              ref={inputRef}
              id="folder-name-input"
              type="text"
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Project Assets"
              className="h-11 w-full rounded-xl border border-border bg-secondary/30 px-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
              disabled={status !== "idle"}
            />
          </div>

          {/* Status message */}
          <AnimatePresence>
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-primary"
              >
                <CheckCircle2 className="h-4 w-4" />
                Folder "{folderName}" created successfully!
              </motion.div>
            )}
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-destructive"
              >
                <AlertCircle className="h-4 w-4" />
                Failed to create folder. A folder with this name may already exist.
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={status === "creating"}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 h-10 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary/70 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!folderName.trim() || status !== "idle"}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 h-10 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90 active:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "creating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <FolderPlus className="h-4 w-4" />
                  Create
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────── Upload Files Modal ───────────────────────── */

function UploadFilesModal({ onClose, initialFiles = [] }) {
  const [files, setFiles] = useState(() => {
    return Array.from(initialFiles).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
    }));
  });
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const handleFiles = useCallback((fileList) => {
    const newFiles = Array.from(fileList).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setErrorMessage("");

    try {
      const isDrivePage = location.pathname.startsWith("/dashboard/drive");
      const parentDirId = isDrivePage ? (searchParams.get("dir") || "") : "";
      const fileObjects = files.map((f) => f.file);

      // Single call to uploadFiles API with progress reporting
      await uploadFiles(parentDirId, fileObjects, (progress) => {
        const updatedProgress = {};
        files.forEach((f) => {
          updatedProgress[f.id] = progress;
        });
        setUploadProgress(updatedProgress);
      });

      setUploading(false);

      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      const formattedSize = formatSize(totalSize);

      window.dispatchEvent(
        new CustomEvent("add-drivya-notification", {
          detail: {
            title: files.length > 1 ? "Files Uploaded Successfully" : "File Uploaded Successfully",
            description: files.length > 1
              ? `Successfully uploaded ${files.length} files (${formattedSize}) to your drive.`
              : `Successfully uploaded "${files[0].name}" (${formattedSize}) to your drive.`,
            type: "upload",
            actionLabel: "View files",
            actionPath: "/dashboard/drive",
          },
        })
      );

      window.dispatchEvent(new CustomEvent("refresh-drive"));
      if (!isDrivePage) {
        navigate("/dashboard/drive");
      }

      setTimeout(() => onClose(), 800);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploading(false);
      setUploadProgress({});
      setErrorMessage(
        err.response?.data?.message || "Upload failed. Please ensure file sizes are within 50MB and quota is not exceeded."
      );
    }
  };

  const allDone =
    uploading &&
    files.length > 0 &&
    files.every((f) => (uploadProgress[f.id] || 0) >= 100);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={!uploading ? onClose : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-lg rounded-2xl glass shadow-elegant overflow-hidden"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "tween", duration: 0.35, ease: easeSmooth }}
      >
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-ambient-primary blur-3xl opacity-60 pointer-events-none" />

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <UploadCloud className="h-5 w-5 text-primary-foreground" />
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Upload Files
              </h3>
              <p className="text-sm text-muted-foreground">
                Drag & drop or browse to upload
              </p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={[
              "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all cursor-pointer",
              dragOver
                ? "border-primary/60 bg-primary/10 scale-[1.01]"
                : "border-border bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30",
              uploading ? "pointer-events-none opacity-60" : "",
            ].join(" ")}
          >
            <motion.div
              animate={dragOver ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <UploadCloud
                className={[
                  "h-10 w-10 mx-auto",
                  dragOver ? "text-primary" : "text-muted-foreground/60",
                ].join(" ")}
              />
            </motion.div>
            <p className="mt-3 text-sm font-medium text-foreground">
              Drop files here or{" "}
              <span className="text-primary font-semibold">browse</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Any file type · Encrypted in transit
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files.length > 0) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* File list */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 max-h-48 overflow-y-auto space-y-2 scrollbar-thin"
              >
                {files.map((f) => {
                  const progress = uploadProgress[f.id] || 0;
                  const done = progress >= 100;
                  return (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, height: 0 }}
                      transition={{
                        type: "tween",
                        duration: 0.25,
                        ease: easeSmooth,
                      }}
                      className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/50 text-primary">
                        <FileUp className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground truncate pr-2">
                            {f.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {formatSize(f.size)}
                          </span>
                        </div>
                        {uploading && (
                          <div className="mt-1.5 h-1 w-full rounded-full bg-secondary/60 overflow-hidden">
                            <motion.div
                              className={[
                                "h-full rounded-full transition-colors",
                                done ? "bg-primary" : "bg-gradient-primary",
                              ].join(" ")}
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{
                                type: "tween",
                                duration: 0.3,
                                ease: easeSmooth,
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {!uploading && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(f.id);
                          }}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {uploading && done && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <AnimatePresence>
            {allDone && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-primary"
              >
                <CheckCircle2 className="h-4 w-4" />
                All files uploaded successfully!
              </motion.div>
            )}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-start gap-2 text-sm font-medium text-destructive"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {files.length > 0
                ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
                : "No files selected"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 h-10 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary/70 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 h-10 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90 active:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}


/* ───────────────────────── FAB Component ───────────────────────── */

const fabActions = [
  {
    id: "new-folder",
    icon: FolderPlus,
    label: "New Folder",
    modal: "folder",
  },
  {
    id: "upload-files",
    icon: UploadCloud,
    label: "Upload Files",
    modal: "upload",
  },
];

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'folder' | 'upload' | null
  const [uploadInitialFiles, setUploadInitialFiles] = useState([]);

  useEffect(() => {
    const handleOpenUpload = (e) => {
      setUploadInitialFiles(e.detail?.files || []);
      setActiveModal("upload");
    };
    const handleOpenFolder = () => {
      setActiveModal("folder");
    };

    window.addEventListener("open-upload-modal", handleOpenUpload);
    window.addEventListener("open-folder-modal", handleOpenFolder);
    return () => {
      window.removeEventListener("open-upload-modal", handleOpenUpload);
      window.removeEventListener("open-folder-modal", handleOpenFolder);
    };
  }, []);

  const handleAction = (modal) => {
    setIsOpen(false);
    setUploadInitialFiles([]);
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
    setUploadInitialFiles([]);
  };

  return (
    <>
      {/* FAB Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Action items */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="flex flex-col items-end gap-2.5 mb-2"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.06, delayChildren: 0.05 },
                },
              }}
            >
              {fabActions.map((action) => (
                <motion.div
                  key={action.id}
                  className="flex items-center gap-3"
                  variants={{
                    hidden: { opacity: 0, y: 12, scale: 0.9 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: {
                        type: "tween",
                        duration: 0.3,
                        ease: easeSmooth,
                      },
                    },
                  }}
                >
                  {/* Label */}
                  <motion.span
                    className="rounded-lg border border-border bg-popover px-3 py-1.5 text-sm font-medium text-foreground shadow-elegant whitespace-nowrap"
                    whileHover={{ scale: 1.03 }}
                  >
                    {action.label}
                  </motion.span>

                  {/* Icon button */}
                  <motion.button
                    type="button"
                    onClick={() => handleAction(action.modal)}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary/80 backdrop-blur-md text-foreground shadow-elegant hover:bg-secondary transition-colors"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <action.icon className="h-5 w-5" />
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          aria-label={isOpen ? "Close menu" : "Open actions menu"}
          id="fab-main-button"
        >
          {/* Animated glow ring */}
          <motion.span
            className="absolute inset-0 rounded-full bg-gradient-primary"
            animate={
              isOpen
                ? { scale: 1, opacity: 0 }
                : {
                    scale: [1, 1.35, 1],
                    opacity: [0.5, 0, 0.5],
                  }
            }
            transition={
              isOpen
                ? { duration: 0.2 }
                : { duration: 3, repeat: Infinity, ease: "easeInOut" }
            }
          />

          {/* Icon */}
          <motion.span
            className="relative z-10"
            animate={{ rotate: isOpen ? 135 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </motion.span>
        </motion.button>
      </div>

      {/* Backdrop when menu is open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === "folder" && <CreateFolderModal onClose={closeModal} />}
        {activeModal === "upload" && (
          <UploadFilesModal onClose={closeModal} initialFiles={uploadInitialFiles} />
        )}
      </AnimatePresence>
    </>
  );
}
