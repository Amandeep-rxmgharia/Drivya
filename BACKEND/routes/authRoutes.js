import express from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  register,
  refresh,
  logout,
  getMe,
  setup2FA,
  verify2FA,
  regenerateBackupCodes,
  disable2FA,
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  validateRegister,
  validateLogin,
  handleValidationErrors,
} from "../middlewares/validators.js";

const router = express.Router();

// ─── Login-specific rate limiter (stricter) ──────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 login attempts per window per IP
  message: {
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public Routes ───────────────────────────────────────────
router.post("/register", validateRegister, handleValidationErrors, register);
router.post("/login", loginLimiter, validateLogin, handleValidationErrors, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

/**
 * 2FA (protected)
 * All below routes require authentication.
 */
router.post("/2fa/setup", authenticate, setup2FA);
router.post("/2fa/verify", authenticate, verify2FA);
router.post("/2fa/backup-codes/regenerate", authenticate, regenerateBackupCodes);
router.post("/2fa/disable", authenticate, disable2FA);

// ─── Protected Routes ────────────────────────────────────────
router.get("/me", authenticate, getMe);

export default router;