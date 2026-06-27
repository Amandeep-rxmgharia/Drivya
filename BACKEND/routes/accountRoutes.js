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
import { authenticate } from "../middlewares/authMiddleware.js";
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

// All remaining routes require authentication
router.use(authenticate);

/**
 * Sharing defaults (used when creating new share links)
 * NOTE: kept under authenticated routes.
 */
router.get("/sharing-defaults", getSharingDefaults);
router.patch("/sharing-defaults", updateSharingDefaults);

// ─── Profile ─────────────────────────────────────────────────
router.get("/profile", getProfile);
router.patch(
  "/profile",
  validateUpdateProfile,
  handleValidationErrors,
  updateProfile,
);

// ─── Avatar Upload / Delete ──────────────────────────────────
router.post("/avatar", avatarUpload, uploadAvatar);
router.delete("/avatar", deleteAvatar);

// ─── Password ────────────────────────────────────────────────
router.put(
  "/password",
  validateChangePassword,
  handleValidationErrors,
  changePassword,
);

// ─── Delete Account ──────────────────────────────────────────
router.delete("/", deleteAccount);

export default router;
