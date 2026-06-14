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
} from "../controllers/fileController.js";
import { handleValidationErrors } from "../middlewares/validators.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { uploadFiles as uploadMiddleware } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ─── File Routes ─────────────────────────────────────────────────
router.post("/upload", uploadMiddleware, uploadFiles);
router.get("/:id/download", downloadFile);
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
