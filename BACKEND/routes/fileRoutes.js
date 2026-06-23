import express from "express";
import {
  uploadFiles,
  downloadFile,
  previewFile,
  renameFile,
  trashFile,
  restoreFile,
  listTrash,
  emptyTrash,
  permanentDeleteFile,
  restoreAllFiles,
  editFileContent,
  createDownloadToken,
  downloadFileByToken,
} from "../controllers/fileController.js";
import { handleValidationErrors } from "../middlewares/validators.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { uploadFiles as uploadMiddleware } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// ─── Public download (token-based, no cookies needed) ────────────
// Must be BEFORE router.use(authenticate) so the browser can
// navigate directly to this URL without auth cookies.
router.get("/download/:token", downloadFileByToken);

// All remaining routes require authentication
router.use(authenticate);

// ─── File Routes ─────────────────────────────────────────────────
router.post("/upload", uploadMiddleware, uploadFiles);
router.get("/:id/download", downloadFile);
router.post("/:id/download-token", createDownloadToken);
router.get("/:id/preview", previewFile);
router.patch("/:id/rename", renameFile);
router.put("/:id/content", editFileContent);

// Trash operations
router.get("/trash", listTrash);
router.delete("/trash/empty", emptyTrash);
router.patch("/trash/restore", restoreAllFiles);
router.patch("/:id/trash", trashFile);
router.patch("/:id/restore", restoreFile);
router.delete("/:id", permanentDeleteFile);

export default router;

