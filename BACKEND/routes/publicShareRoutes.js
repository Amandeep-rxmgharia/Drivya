import express from "express";
import {
  getShareMetadata,
  accessShare,
  previewSharedFile,
  downloadSharedFile,
  checkShareAccess,
  editSharedFile,
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

// ─── Public Share Access (no auth required) ───────────────────────
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

router.put(
  "/:token/edit",
  softAuthenticate,
  resolvePublicShare,
  requireShareAccess,
  editSharedFile,
);

export default router;
