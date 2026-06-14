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

const router = express.Router();

router.use(publicShareRateLimit);

// ─── Public Share Access (no auth required) ───────────────────────
router.get("/:token", getShareMetadata);
router.get("/:token/check", resolvePublicShare, checkShareAccess);

router.post(
  "/:token/access",
  sharePasswordRateLimit,
  validateSharePassword,
  handleValidationErrors,
  accessShare,
);

router.get(
  "/:token/preview",
  resolvePublicShare,
  requireShareAccess,
  previewSharedFile,
);

router.get(
  "/:token/download",
  resolvePublicShare,
  requireShareAccess,
  downloadSharedFile,
);

router.put(
  "/:token/edit",
  resolvePublicShare,
  requireShareAccess,
  editSharedFile,
);

export default router;
