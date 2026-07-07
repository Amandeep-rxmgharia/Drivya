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
  loginVerify2FA,
  forgotPassword,
  verifyResetOtp,
  verifyReset2FA,
  resetPassword,
  sendDeactivatedOtp,
  verifyDeactivatedOtp,
  verifyDeactivated2FA,
  deleteDeactivatedAccount,
} from "../controllers/authController.js";
import {
  googleLogin,
  googleLoginUrl,
} from "../controllers/googleAuthController.js";
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
router.post("/google", googleLogin);
router.get("/google/login-url", googleLoginUrl);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/verify-reset-2fa", verifyReset2FA);
router.post("/reset-password", resetPassword);

// ─── Deactivated Account Flows ────────────────────────────────
router.post("/deactivated/send-otp", sendDeactivatedOtp);
router.post("/deactivated/verify-otp", verifyDeactivatedOtp);
router.post("/deactivated/verify-2fa", verifyDeactivated2FA);
router.post("/deactivated/delete", deleteDeactivatedAccount);

/**
 * 2FA (protected)
 * All below routes require authentication.
 */
router.post("/2fa/setup", authenticate, setup2FA);
router.post("/2fa/verify", authenticate, verify2FA);
router.post("/2fa/login-verify", authenticate, loginVerify2FA);
router.post("/2fa/backup-codes/regenerate", authenticate, regenerateBackupCodes);
router.post("/2fa/disable", authenticate, disable2FA);

// ─── Protected Routes ────────────────────────────────────────
router.get("/me", authenticate, getMe);

export default router;