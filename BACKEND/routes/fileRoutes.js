import express from "express";
import {
  uploadFiles,
  downloadFile,
  trashFile,
  restoreFile,
  listTrash,
  emptyTrash,
  permanentDeleteFile,
} from "../controllers/fileController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { uploadFiles as uploadMiddleware } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ─── File Routes ─────────────────────────────────────────────────
router.post("/upload", uploadMiddleware, uploadFiles);
router.get("/:id/download", downloadFile);

// Trash operations
router.get("/trash", listTrash);
router.delete("/trash/empty", emptyTrash);
router.patch("/:id/trash", trashFile);
router.patch("/:id/restore", restoreFile);
router.delete("/:id", permanentDeleteFile);

export default router;
