import express from "express";
import {
  getShareMetadata,
  accessShare,
  previewSharedFile,
  downloadSharedFile,
  checkShareAccess,
  editSharedFile,
  createShareDownloadToken,
  downloadSharedFileByToken,
} from "../controllers/publicShareController.js";
import {
  publicShareRateLimit,
  sharePasswordRateLimit,
  resolvePublicShare,
  requireShareAccess,
} from "../middlewares/shareMiddleware.js";
import {
  handleValidationErrors,
  validateSharePassword,
} from "../middlewares/validators.js";
import { softAuthenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(publicShareRateLimit);

// ─── Prevent Browser Caching for Metadata & Status ────────────────
// This ensures that toggling a share link (enable/disable) is reflected
// immediately without needing a hard refresh or incognito mode.
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

// ─── Public Share Access (no auth required) ───────────────────────
router.get("/download/:token", downloadSharedFileByToken);
router.get("/:token", softAuthenticate, getShareMetadata);
router.get("/:token/check", resolvePublicShare, checkShareAccess);

router.post(
  "/:token/access",
  softAuthenticate,
  sharePasswordRateLimit,
  validateSharePassword,
  handleValidationErrors,
  accessShare,
);

router.get(
  "/:token/preview",
  softAuthenticate,
  resolvePublicShare,
  requireShareAccess,
  previewSharedFile,
);

router.get(
  "/:token/download",
  softAuthenticate,
  resolvePublicShare,
  requireShareAccess,
  downloadSharedFile,
);

router.post(
  "/:token/download-token",
  softAuthenticate,
  resolvePublicShare,
  requireShareAccess,
  createShareDownloadToken,
);

router.put(
  "/:token/edit",
  softAuthenticate,
  resolvePublicShare,
  requireShareAccess,
  editSharedFile,
);

export default router;
