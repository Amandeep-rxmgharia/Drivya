import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  getDropboxAuthUrl,
  dropboxCallback,
  getDropboxStatus,
  disconnectDropbox,
  listDropboxFiles,
  importDropboxFiles,
  cancelDropboxImport,
} from "../controllers/dropboxController.js";

const router = Router();

// ─── Authenticated routes ────────────────────────────────────
router.get("/auth-url", authenticate, getDropboxAuthUrl);
router.get("/status", authenticate, getDropboxStatus);
router.post("/disconnect", authenticate, disconnectDropbox);
router.get("/files", authenticate, listDropboxFiles);
router.post("/import", authenticate, importDropboxFiles);
router.post("/import/cancel", authenticate, cancelDropboxImport);

export default router;

// ─── OAuth callback (separate, no cookie auth — uses state param) ───
export const dropboxCallbackHandler = dropboxCallback;
