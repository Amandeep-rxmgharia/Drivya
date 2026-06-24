import express from "express";
import {
  listStarred,
  toggleStar,
  unstarAll,
} from "../controllers/starController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All starred routes require authentication
router.use(authenticate);

// ─── Star Routes ──────────────────────────────────────────────────
router.get("/", listStarred);
router.patch("/clear", unstarAll);
router.patch("/:resourceType/:id", toggleStar);

export default router;
