import express from "express";
import {
  createShare,
  listUserShares,
  getUserShareStats,
  getShare,
  patchShare,
  deleteShare,
  addCollaborator,
  patchCollaborator,
  deleteCollaborator,
} from "../controllers/shareController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  handleValidationErrors,
  validateCreateShare,
  validateUpdateShare,
  validateInviteCollaborator,
  validateCollaboratorRole,
} from "../middlewares/validators.js";

const router = express.Router();

router.use(authenticate);

// ─── Share Management ─────────────────────────────────────────────
router.post("/", validateCreateShare, handleValidationErrors, createShare);
router.get("/stats", getUserShareStats);
router.get("/", listUserShares);
router.get("/:id", getShare);
router.patch("/:id", validateUpdateShare, handleValidationErrors, patchShare);
router.delete("/:id", deleteShare);

// ─── Collaborators ────────────────────────────────────────────────
router.post(
  "/:id/collaborators",
  validateInviteCollaborator,
  handleValidationErrors,
  addCollaborator,
);
router.patch(
  "/:id/collaborators/:collaboratorId",
  validateCollaboratorRole,
  handleValidationErrors,
  patchCollaborator,
);
router.delete("/:id/collaborators/:collaboratorId", deleteCollaborator);

export default router;
