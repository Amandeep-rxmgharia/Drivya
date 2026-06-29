import express from "express";
import multer from "multer";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  getAvatar,
  deleteAvatar,
  changePassword,
  deleteAccount,
  getSharingDefaults,
  updateSharingDefaults,
} from "../controllers/accountController.js";
import {
  listSessions,
  revokeSession,
  revokeOtherSessions,
} from "../controllers/sessionController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { requireTwoFA } from "../middlewares/twoFAMiddleware.js";
import {
  validateUpdateProfile,
  validateChangePassword,
  handleValidationErrors,
} from "../middlewares/validators.js";

const router = express.Router();

// ─── Avatar serving (public — no auth needed for img src) ────
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single("avatar");

router.get("/avatar/:filename", getAvatar);

/**
 * All remaining routes require authentication.
 * Some sensitive endpoints additionally require step-up (2FA) via requireTwoFA.
 */
router.use(authenticate);

/**
 * Sharing defaults (used when creating new share links)
 * NOTE: kept under authenticated routes.
 */
router.get("/sharing-defaults", getSharingDefaults);
router.patch("/sharing-defaults", updateSharingDefaults);

// ─── Profile ─────────────────────────────────────────────────
// Sensitive settings: require 2FA
router.get("/profile", requireTwoFA, getProfile);
router.patch(
  "/profile",
  requireTwoFA,
  validateUpdateProfile,
  handleValidationErrors,
  updateProfile,
);

// ─── Avatar Upload / Delete ──────────────────────────────────
// Not strictly required, but still sensitive: require 2FA
router.post("/avatar", requireTwoFA, avatarUpload, uploadAvatar);
router.delete("/avatar", requireTwoFA, deleteAvatar);

// ─── Password ────────────────────────────────────────────────
// Sensitive: require 2FA
router.put(
  "/password",
  requireTwoFA,
  validateChangePassword,
  handleValidationErrors,
  changePassword,
);

// ─── Sessions ────────────────────────────────────────────────
router.get("/sessions", listSessions);
router.delete("/sessions/others", revokeOtherSessions);
router.delete("/sessions/:id", revokeSession);

// ─── Delete Account ──────────────────────────────────────────
// Sensitive: require 2FA
router.delete("/", requireTwoFA, deleteAccount);

export default router;
