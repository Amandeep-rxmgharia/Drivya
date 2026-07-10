import express from "express";
import { IPRateLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../middlewares/throttle.js";
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
import {
  githubLoginUrl,
} from "../controllers/githubAuthController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  validateRegister,
  validateLogin,
  handleValidationErrors,
} from "../middlewares/validators.js";

const router = express.Router();

// ─── Login-specific rate limiter (stricter, Redis-backed) ────
const loginLimiter = IPRateLimiter(10, 15 * 60 * 1000); // 10 attempts per 15 min per IP

// ─── Public Routes ───────────────────────────────────────────
router.post("/register", throttle(1000), validateRegister, handleValidationErrors, register);
router.post("/login", throttle(1000), loginLimiter, validateLogin, handleValidationErrors, login);

router.post("/google", googleLogin);
router.get("/google/login-url", googleLoginUrl);
router.get("/github/login-url", githubLoginUrl);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", throttle(1000), forgotPassword);
router.post("/verify-reset-otp", throttle(1000), verifyResetOtp);
router.post("/verify-reset-2fa", throttle(1000), verifyReset2FA);
router.post("/reset-password", throttle(1000), resetPassword);

// ─── Deactivated Account Flows ────────────────────────────────
router.post("/deactivated/send-otp", throttle(1000), sendDeactivatedOtp);
router.post("/deactivated/verify-otp", throttle(1000), verifyDeactivatedOtp);
router.post("/deactivated/verify-2fa", throttle(1000), verifyDeactivated2FA);
router.post("/deactivated/delete", throttle(1000), deleteDeactivatedAccount);

/**
 * 2FA (protected)
 * All below routes require authentication.
 */
router.post("/2fa/setup", authenticate, setup2FA);
router.post("/2fa/verify", authenticate, throttle(1000), verify2FA);
router.post("/2fa/login-verify", authenticate, throttle(1000), loginVerify2FA);
router.post("/2fa/backup-codes/regenerate", authenticate, regenerateBackupCodes);
router.post("/2fa/disable", authenticate, throttle(1000), disable2FA);

// ─── Protected Routes ────────────────────────────────────────
router.get("/me", authenticate, getMe);

export default router;