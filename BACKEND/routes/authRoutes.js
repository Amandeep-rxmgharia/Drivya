import express from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  register,
  refresh,
  logout,
  getMe,
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

// ─── Protected Routes ────────────────────────────────────────
router.get("/me", authenticate, getMe);

export default router;