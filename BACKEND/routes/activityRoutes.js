import express from "express";
import {
  listRecentActivities,
  getRecentStats,
} from "../controllers/activityController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ─── Activity Routes ─────────────────────────────────────────────
router.get("/", listRecentActivities);
router.get("/stats", getRecentStats);

export default router;
