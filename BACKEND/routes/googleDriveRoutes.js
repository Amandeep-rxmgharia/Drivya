import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  getGoogleAuthUrl,
  googleCallback,
  getGoogleStatus,
  disconnectGoogle,
  listGoogleFiles,
  importGoogleFiles,
  getGoogleThumbnail,
} from "../controllers/googleDriveController.js";

const router = Router();

// ─── Authenticated routes ────────────────────────────────────
router.get("/auth-url", authenticate, getGoogleAuthUrl);
router.get("/status", authenticate, getGoogleStatus);
router.post("/disconnect", authenticate, disconnectGoogle);
router.get("/files", authenticate, listGoogleFiles);
router.post("/import", authenticate, importGoogleFiles);
router.get("/thumbnail/:fileId", authenticate, getGoogleThumbnail);

export default router;

// ─── OAuth callback (separate, no cookie auth — uses state param) ───
export const googleCallbackHandler = googleCallback;
