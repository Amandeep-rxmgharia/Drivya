import {
  createOrGetShare,
  listShares,
  getShareStats,
  getShareById,
  updateShare,
  deleteShare as deleteShareService,
  inviteCollaborator,
  updateCollaboratorRole,
  deleteCollaborator as deleteCollaboratorService,
} from "../services/shareService.js";
import { AppError } from "../utils/errors.js";

function handleShareError(err, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      message: err.message,
      code: err.code,
    });
  }
  next(err);
}

// ─── Create Share ─────────────────────────────────────────────────
export async function createShare(req, res, next) {
  try {
    const ownerId = req.user.id;
    const { resourceType = "file", resourceId } = req.body;

    if (!resourceId) {
      return res.status(400).json({ message: "resourceId is required." });
    }

    const result = await createOrGetShare(ownerId, { resourceType, resourceId });

    return res.status(result.created ? 201 : 200).json({
      message: result.created
        ? "Share link created."
        : "Share link already exists.",
      share: result.share,
      password: result.password ?? null,
    });
  } catch (err) {
    handleShareError(err, res, next);
  }
}

// ─── List Shares ──────────────────────────────────────────────────
export async function listUserShares(req, res, next) {
  try {
    const ownerId = req.user.id;
    const result = await listShares(ownerId, req.query);

    return res.json(result);
  } catch (err) {
    handleShareError(err, res, next);
  }
}

// ─── Share Stats ──────────────────────────────────────────────────
export async function getUserShareStats(req, res, next) {
  try {
    const ownerId = req.user.id;
    const stats = await getShareStats(ownerId);

    return res.json({ stats });
  } catch (err) {
    handleShareError(err, res, next);
  }
}

// ─── Get Share ────────────────────────────────────────────────────
export async function getShare(req, res, next) {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const result = await getShareById(ownerId, id);

    return res.json(result);
  } catch (err) {
    handleShareError(err, res, next);
  }
}

// ─── Update Share ─────────────────────────────────────────────────
export async function patchShare(req, res, next) {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;

    const share = await updateShare(ownerId, id, req.body);

    return res.json({ message: "Share updated.", share });
  } catch (err) {
    handleShareError(err, res, next);
  }
}

// ─── Revoke Share ─────────────────────────────────────────────────
export async function deleteShare(req, res, next) {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const result = await deleteShareService(ownerId, id);

    return res.json(result);
  } catch (err) {
    handleShareError(err, res, next);
  }
}

// ─── Collaborators ────────────────────────────────────────────────
export async function addCollaborator(req, res, next) {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const { email, role } = req.body;

    const collaborator = await inviteCollaborator(ownerId, id, { email, role });

    return res.status(201).json({
      message: "Collaborator invited.",
      collaborator,
    });
  } catch (err) {
    handleShareError(err, res, next);
  }
}

export async function patchCollaborator(req, res, next) {
  try {
    const ownerId = req.user.id;
    const { id, collaboratorId } = req.params;
    const { role } = req.body;

    const collaborator = await updateCollaboratorRole(
      ownerId,
      id,
      collaboratorId,
      role,
    );

    return res.json({ message: "Collaborator updated.", collaborator });
  } catch (err) {
    handleShareError(err, res, next);
  }
}

export async function deleteCollaborator(req, res, next) {
  try {
    const ownerId = req.user.id;
    const { id, collaboratorId } = req.params;
    const result = await deleteCollaboratorService(ownerId, id, collaboratorId);

    return res.json(result);
  } catch (err) {
    handleShareError(err, res, next);
  }
}
