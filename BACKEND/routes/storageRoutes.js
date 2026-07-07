import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  getStorageOverview,
  getStoragePreferences,
  updateStoragePreferences,
} from "../controllers/storageController.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get("/overview", getStorageOverview);
router.get("/preferences", getStoragePreferences);
router.patch("/preferences", updateStoragePreferences);

export default router;
