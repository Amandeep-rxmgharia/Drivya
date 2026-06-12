import express from "express";
import {
  listDirectory,
  createDirectory,
  renameDirectory,
  deleteDirectory,
  getBreadcrumb,
} from "../controllers/directoryController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  validateCreateDirectory,
  validateRenameDirectory,
  handleValidationErrors,
} from "../middlewares/validators.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ─── Directory Routes ────────────────────────────────────────────
router.get("/", listDirectory);
router.get("/:parentId", listDirectory);
router.get("/:id/breadcrumb", getBreadcrumb);
router.post(
  "/",
  validateCreateDirectory,
  handleValidationErrors,
  createDirectory,
);
router.patch(
  "/:id",
  validateRenameDirectory,
  handleValidationErrors,
  renameDirectory,
);
router.delete("/:id", deleteDirectory);

export default router;
