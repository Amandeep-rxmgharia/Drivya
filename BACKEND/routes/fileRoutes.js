import express from "express";
import {
  presignUpload,
  confirmUpload,
  downloadFile,
  previewFile,
  renameFile,
  trashFile,
  restoreFile,
  listTrash,
  emptyTrash,
  permanentDeleteFile,
  restoreAllFiles,
  bulkTrash,
  createDownloadToken,
  downloadFileByToken,
} from "../controllers/fileController.js";
import { handleValidationErrors } from "../middlewares/validators.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ─── Public download (token-based, no cookies needed) ────────────
// Must be BEFORE router.use(authenticate) so the browser can
// navigate directly to this URL without auth cookies.
router.get("/download/:token", downloadFileByToken);

// All remaining routes require authentication
router.use(authenticate);

// ─── Upload Flow (presigned URL) ─────────────────────────────────
router.post("/presign-upload", presignUpload);
router.post("/confirm-upload", confirmUpload);

// ─── Download / Preview ──────────────────────────────────────────
router.get("/:id/download", downloadFile);
router.post("/:id/download-token", createDownloadToken);
router.get("/:id/preview", previewFile);

// ─── File Operations ─────────────────────────────────────────────
router.patch("/:id/rename", renameFile);

// ─── Trash Operations ────────────────────────────────────────────
router.get("/trash", listTrash);
router.delete("/trash/empty", emptyTrash);
router.patch("/trash/restore", restoreAllFiles);
router.patch("/trash/bulk", bulkTrash);
router.patch("/:id/trash", trashFile);
router.patch("/:id/restore", restoreFile);
router.delete("/:id", permanentDeleteFile);

export default router;
