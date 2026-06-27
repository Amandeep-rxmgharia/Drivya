import bcrypt from "bcrypt";
import mongoose from "mongoose";
import crypto from "node:crypto";
import Share from "../models/shareModel.js";
import ShareCollaborator from "../models/shareCollaboratorModel.js";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import {
  RESOURCE_TYPES,
  VISIBILITY,
  COLLABORATOR_ROLES,
  COLLABORATOR_STATUS,
  CACHE_KEYS,
  CACHE_TTL,
} from "../constants/shareConstants.js";
import {
  createUniqueShareToken,
  computeExpirationDate,
  parseExpirationPreset,
  buildShareUrl,
} from "./shareTokenService.js";
import {
  cacheAside,
  invalidateOwnerShareCache,
  invalidateShareTokenCache,
} from "./cacheService.js";
import { notFound, badRequest, conflict, gone } from "../utils/errors.js";
import { createNotification } from "./notificationService.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

// ─── Resource Validation ─────────────────────────────────────────

async function resolveFileResource(ownerId, resourceId) {
  const file = await File.findOne({
    _id: resourceId,
    userId: ownerId,
    isTrashed: false,
  }).lean();

  if (!file) {
    throw notFound("File not found or is in trash.");
  }

  return {
    resourceType: RESOURCE_TYPES.FILE,
    resourceId: file._id,
    snapshot: {
      name: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      kind: null,
    },
    storagePath: file.storagePath,
    file,
  };
}

async function resolveResource(ownerId, resourceType, resourceId) {
  if (resourceType === RESOURCE_TYPES.FILE) {
    return resolveFileResource(ownerId, resourceId);
  }

  throw badRequest(`Unsupported resource type: ${resourceType}`);
}

// ─── Share CRUD ──────────────────────────────────────────────────

/**
 * Create or return existing share for a file.
 */
export async function createOrGetShare(ownerId, { resourceType, resourceId }) {
  const existing = await Share.findOne({
    ownerId,
    resourceType,
    resourceId,
  }).lean();

  if (existing) {
    return { share: formatShareResponse(existing), created: false };
  }

  const resource = await resolveResource(ownerId, resourceType, resourceId);
  const token = await createUniqueShareToken();

  // Apply user's saved sharing defaults for newly created share links.
  const userDefaults = await User.findById(ownerId)
    .lean()
    .select(
      "defaultShareAccess defaultShareExpiryDays defaultSharePassword defaultShareDownloadPermission defaultShareNotify defaultSharePublicProfile",
    );

  // UI uses "view" / "view-download"
  const defaultAccess = userDefaults?.defaultShareAccess || "view";
  const defaultExpiryDays =
    userDefaults?.defaultShareExpiryDays === undefined
      ? null
      : userDefaults?.defaultShareExpiryDays;

  // "suggest" is a UI concept only. Backend should not store or behave differently for it.
  // Treat any unknown/default value except "always" as "never".
  const passwordDefaultRaw = userDefaults?.defaultSharePassword || "never";
  const passwordDefault =
    passwordDefaultRaw === "always" || passwordDefaultRaw === "never"
      ? passwordDefaultRaw
      : "never";

  const allowDownload = Boolean(
    userDefaults?.defaultShareDownloadPermission ?? false,
  );

  const expiresAt =
    defaultExpiryDays == null ? null : computeExpirationDate(defaultExpiryDays);

  const passwordShouldBeRequired = passwordDefault === "always";
  const visibility = passwordShouldBeRequired ? VISIBILITY.RESTRICTED : VISIBILITY.PUBLIC;

  const sharePayload = {
    ownerId,
    resourceType: resource.resourceType,
    resourceId: resource.resourceId,
    token,
    resourceSnapshot: resource.snapshot,
    isActive: true,
    visibility,
    expiresAt: expiresAt || null,
    permissions: {
      allowView: true,
      allowDownload: defaultAccess === "view-download" ? true : allowDownload,
      allowEdit: false,
    },
    isPasswordProtected: passwordShouldBeRequired,
    passwordHash: null,
  };

  if (sharePayload.visibility !== VISIBILITY.RESTRICTED) {
    sharePayload.isPasswordProtected = false;
    sharePayload.passwordHash = null;
  }

  let passwordPlaintext = null;
  if (passwordShouldBeRequired) {
    // Generate a one-time plaintext password to return to the frontend.
    const alphabet =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const bytes = crypto.randomBytes(18);
    passwordPlaintext = Array.from(bytes)
      .map((b) => alphabet[b % alphabet.length])
      .join("")
      .slice(0, 12);

    sharePayload.passwordHash = await bcrypt.hash(
      passwordPlaintext,
      SALT_ROUNDS,
    );
  }

  const share = await Share.create(sharePayload);

  await invalidateOwnerShareCache(ownerId.toString());

  if (share) {
    // Password-in-inbox behavior: include the plaintext in a dedicated notification
    // so frontend can copy/delete it. No backend should ever expose plaintext via "eye".
    if (passwordShouldBeRequired && passwordPlaintext) {
      createNotification(ownerId, {
        // Must use an enum-valid Notification.type.
        // Frontend uses metadata.notificationKind to decide how to render/copy.
        type: "sharing",
        title: "Share password created",
        // Frontend bell inbox renders `description`; keep plaintext here for copy.
        description: `Password: ${passwordPlaintext}`,
        actionLabel: "View inbox",
        actionPath: "/dashboard/notifications",
        // Frontend bell copy/delete checks this field.
        metadata: { notificationKind: "share_password" },
      }).catch((err) => console.error("Notification error:", err));
    } else {
      createNotification(ownerId, {
        type: "sharing",
        title: "Share link created",
        description: `Share link for "${resource.snapshot.name}" is ready.`,
        actionLabel: "View share",
        actionPath: "/dashboard/shared",
      }).catch((err) => console.error("Notification error:", err));
    }
  }

  return {
    share: formatShareResponse(share.toObject()),
    created: true,
    password: passwordPlaintext,
  };
}

/**
 * List shares for owner with filters, search, sort, pagination.
 */
export async function listShares(ownerId, query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildShareListFilter(ownerId, query);
  const hasTextSearch = Boolean(query.q?.trim());
  const sort = buildShareListSort(query.sort, hasTextSearch);

  const cacheKey = `${CACHE_KEYS.SHARE_LIST}${ownerId}:${JSON.stringify({ filter, sort, page, limit, q: query.q })}`;

  return cacheAside(cacheKey, CACHE_TTL.SHARE_LIST, async () => {
    const findQuery = Share.find(filter);

    if (hasTextSearch) {
      findQuery.select({ score: { $meta: "textScore" } });
    }

    const [shares, total] = await Promise.all([
      findQuery.sort(sort).skip(skip).limit(limit).lean(),
      Share.countDocuments(filter),
    ]);

    const shareIds = shares.map((s) => s._id);
    const collaboratorCounts = await ShareCollaborator.aggregate([
      {
        $match: {
          shareId: { $in: shareIds },
        },
      },
      { $group: { _id: "$shareId", count: { $sum: 1 } } },
    ]);

    const countMap = Object.fromEntries(
      collaboratorCounts.map((c) => [c._id.toString(), c.count]),
    );

    const items = shares.map((share) =>
      formatShareResponse(share, {
        collaboratorCount: countMap[share._id.toString()] || 0,
      }),
    );

    return paginatedResponse(items, total, { page, limit });
  });
}

function buildShareListFilter(ownerId, query) {
  const filter = { ownerId };

  if (query.filter === "active") {
    filter.isActive = true;
    filter.$or = [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ];
  } else if (query.filter === "protected") {
    filter.isPasswordProtected = true;
  } else if (query.filter === "expired") {
    filter.$or = [
      { isActive: false },
      { expiresAt: { $lte: new Date() } },
    ];
  }

  if (query.q?.trim()) {
    const term = query.q.trim();
    filter.$text = { $search: term };
  }

  return filter;
}

function buildShareListSort(sortBy, hasTextSearch = false) {
  if (hasTextSearch) {
    return { score: { $meta: "textScore" } };
  }

  switch (sortBy) {
    case "views":
      return { viewCount: -1, createdAt: -1 };
    case "name":
      return { "resourceSnapshot.name": 1 };
    case "recent":
    default:
      return { createdAt: -1 };
  }
}

/**
 * Aggregate stats for the shared files dashboard hero.
 */
export async function getShareStats(ownerId) {
  const now = new Date();

  const [result] = await Share.aggregate([
    { $match: { ownerId: new mongoose.Types.ObjectId(ownerId) } },
    {
      $group: {
        _id: null,
        totalShares: { $sum: 1 },
        activeLinks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$isActive", true] },
                  {
                    $or: [
                      { $eq: ["$expiresAt", null] },
                      { $gt: ["$expiresAt", now] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalViews: { $sum: "$viewCount" },
        totalDownloads: { $sum: "$downloadCount" },
        protectedCount: {
          $sum: {
            $cond: [{ $eq: ["$isPasswordProtected", true] }, 1, 0],
          },
        },
      },
    },
  ]);

  return (
    result || {
      totalShares: 0,
      activeLinks: 0,
      totalViews: 0,
      totalDownloads: 0,
      protectedCount: 0,
    }
  );
}

/**
 * Get single share with collaborators.
 */
export async function getShareById(ownerId, shareId) {
  const share = await Share.findOne({
    _id: shareId,
    ownerId,
  }).lean();

  if (!share) throw notFound("Share not found.");

  const collaborators = await ShareCollaborator.find({
    shareId,
  })
    .sort({ createdAt: 1 })
    .lean();

  const owner = await User.findById(ownerId).select("name email").lean();

  return {
    share: formatShareResponse(share),
    owner: owner
      ? { name: owner.name, email: owner.email, role: "owner" }
      : null,
    collaborators: collaborators.map(formatCollaboratorResponse),
  };
}

/**
 * Update share settings.
 */
export async function updateShare(ownerId, shareId, updates) {
  const share = await Share.findOne({
    _id: shareId,
    ownerId,
  }).select("+passwordHash");

  if (!share) throw notFound("Share not found.");

  if (updates.isActive !== undefined) {
    share.isActive = Boolean(updates.isActive);
  }

  if (updates.visibility !== undefined) {
    share.visibility = updates.visibility;
    if (updates.visibility === VISIBILITY.PUBLIC) {
      share.passwordHash = null;
      share.isPasswordProtected = false;
    }
  }

  if (updates.password !== undefined) {
    if (updates.password === null || updates.password === "") {
      share.passwordHash = null;
      share.isPasswordProtected = false;
    } else {
      share.passwordHash = await bcrypt.hash(updates.password, SALT_ROUNDS);
      share.visibility = VISIBILITY.RESTRICTED;
      share.isPasswordProtected = true;
    }
  }

  if (updates.passwordEnabled === false) {
    share.passwordHash = null;
    share.isPasswordProtected = false;
  }

  if (updates.expirationPreset !== undefined || updates.expiresAt !== undefined) {
    if (updates.expiresAt === null) {
      share.expiresAt = null;
    } else if (updates.expiresAt) {
      share.expiresAt = new Date(updates.expiresAt);
    } else {
      const days = parseExpirationPreset(updates.expirationPreset);
      share.expiresAt = computeExpirationDate(days);
    }
  }

  if (updates.permissions) {
    const current =
      typeof share.permissions?.toObject === "function"
        ? share.permissions.toObject()
        : share.permissions || {};
    share.permissions = { ...current, ...updates.permissions };
    share.markModified("permissions");
  }

  await share.save();
  await invalidateOwnerShareCache(ownerId.toString());
  await invalidateShareTokenCache(share.token);

  const shareObj = share.toObject();
  delete shareObj.passwordHash;

  return formatShareResponse(shareObj);
}

/**
 * Permanently delete a share.
 */
export async function deleteShare(ownerId, shareId) {
  const share = await Share.findOneAndDelete({ _id: shareId, ownerId }).lean();

  if (!share) throw notFound("Share not found.");

  await ShareCollaborator.deleteMany({ shareId });

  await invalidateOwnerShareCache(ownerId.toString());
  await invalidateShareTokenCache(share.token);

  return { message: "Share link deleted." };
}

// ─── Collaborators ───────────────────────────────────────────────

export async function inviteCollaborator(ownerId, shareId, { email, role }) {
  const share = await Share.findOne({
    _id: shareId,
    ownerId,
  }).lean();

  if (!share) throw notFound("Share not found.");

  const normalizedEmail = email.trim().toLowerCase();
  const owner = await User.findById(ownerId).select("name email").lean();

  if (owner?.email === normalizedEmail) {
    throw badRequest("You cannot invite yourself.");
  }

  const existingUser = await User.findOne({ email: normalizedEmail })
    .select("_id name")
    .lean();

  const existingInvite = await ShareCollaborator.findOne({
    shareId,
    email: normalizedEmail,
  });

  if (existingInvite) {
    throw conflict("This email already has access to this share.");
  }

  const collaborator = await ShareCollaborator.create({
    shareId,
    ownerId,
    email: normalizedEmail,
    userId: existingUser?._id || null,
    displayName: existingUser?.name || normalizedEmail.split("@")[0],
    role: role || COLLABORATOR_ROLES.VIEWER,
    status: existingUser
      ? COLLABORATOR_STATUS.ACCEPTED
      : COLLABORATOR_STATUS.PENDING,
    acceptedAt: existingUser ? new Date() : null,
  });

  // Auto-enable link when inviting collaborators
  if (!share.isActive) {
    await Share.updateOne({ _id: shareId }, { isActive: true });
    await invalidateShareTokenCache(share.token);
  }

  await invalidateOwnerShareCache(ownerId.toString());

  if (existingUser) {
    createNotification(existingUser._id, {
      type: "sharing",
      title: `${share.resourceSnapshot?.name || "A file"} was shared with you`,
      description: `${owner?.name || "Someone"} shared a file with you.`,
      actionLabel: "View shared file",
      actionPath: "/dashboard/shared",
    }).catch((err) => console.error("Notification error:", err));
  }

  return formatCollaboratorResponse(collaborator.toObject());
}

export async function updateCollaboratorRole(
  ownerId,
  shareId,
  collaboratorId,
  role,
) {
  const share = await Share.findOne({ _id: shareId, ownerId });
  if (!share) throw notFound("Share not found.");

  const collaborator = await ShareCollaborator.findOneAndUpdate(
    {
      _id: collaboratorId,
      shareId,
    },
    { role },
    { new: true },
  ).lean();

  if (!collaborator) throw notFound("Collaborator not found.");

  return formatCollaboratorResponse(collaborator);
}

export async function deleteCollaborator(ownerId, shareId, collaboratorId) {
  const share = await Share.findOne({ _id: shareId, ownerId });
  if (!share) throw notFound("Share not found.");

  const collaborator = await ShareCollaborator.findOneAndDelete({
    _id: collaboratorId,
    shareId,
  }).lean();

  if (!collaborator) throw notFound("Collaborator not found.");

  return { message: "Collaborator access removed." };
}

// ─── Public Access ───────────────────────────────────────────────

export async function isUserAuthorizedForShare(share, userId) {
  if (!userId) return false;
  if (share.ownerId.toString() === userId.toString()) return true;

  const collaborator = await ShareCollaborator.findOne({
    shareId: share._id,
    userId: userId,
    status: COLLABORATOR_STATUS.ACCEPTED,
  }).lean();

  return !!collaborator;
}

export async function getPublicShareMetadata(token, userId = null) {
  const cacheKey = `${CACHE_KEYS.SHARE_BY_TOKEN}${token}`;

  const share = await cacheAside(cacheKey, CACHE_TTL.SHARE_METADATA, async () => {
    return Share.findOne({ token })
      .select("+passwordHash")
      .lean();
  });

  if (!share) throw notFound("Share link not found.");
  if (!isShareAccessible(share)) throw gone("This share link is no longer available.");

  const owner = await User.findById(share.ownerId)
    .select("name defaultSharePublicProfile")
    .lean();

  const isAuthorized = await isUserAuthorizedForShare(share, userId);
  const requiresAuth = share.visibility === VISIBILITY.RESTRICTED;

  // Fetch view and download counts directly from DB outside cache-aside to keep them fresh
  const freshCounts = await Share.findOne({ token })
    .select("viewCount downloadCount")
    .lean();

  const publicProfile = owner?.defaultSharePublicProfile || "name";

  const sharedByBase = {
    label:
      publicProfile === "anonymous"
        ? "A Drivya user"
        : owner?.name || "Unknown",
    name: owner?.name || null,
    email: null,
    avatarUrl: null,
  };

  // If "full", include email + avatar for richer UI
  if (publicProfile === "full") {
    const ownerFull = await User.findById(share.ownerId)
      .select("name email avatarUrl defaultSharePublicProfile")
      .lean();

    sharedByBase.email = ownerFull?.email || null;
    sharedByBase.avatarUrl = ownerFull?.avatarUrl || null;
    sharedByBase.name = ownerFull?.name || null;
    sharedByBase.label = ownerFull?.name || "Unknown";
  }

  return {
    token: share.token,
    name: share.resourceSnapshot.name,
    mimeType: share.resourceSnapshot.mimeType,
    size: share.resourceSnapshot.size,
    visibility: share.visibility,
    requiresPassword: share.isPasswordProtected,
    requiresAuth,
    isAuthenticated: !!userId,
    isAuthorized,
    permissions: share.permissions,
    expiresAt: share.expiresAt,
    isActive: share.isActive,

    // Backward-compatible label for existing UI
    sharedByLabel: sharedByBase.label,

    // New richer object for "full" profile
    sharedBy: sharedByBase,

    _passwordHash: share.passwordHash, // Included for token signature verification
    viewCount: freshCounts?.viewCount || 0,
    downloadCount: freshCounts?.downloadCount || 0,
  };
}

export async function verifySharePassword(token, password) {
  const share = await Share.findOne({ token }).select(
    "+passwordHash",
  );

  if (!share) throw notFound("Share link not found.");
  if (!isShareAccessible(share)) throw gone("This share link is no longer available.");

  if (share.visibility === VISIBILITY.RESTRICTED && share.passwordHash) {
    const valid = await bcrypt.compare(password || "", share.passwordHash);
    if (!valid) {
      throw badRequest("Incorrect password.");
    }
  }

  return share;
}

export async function resolveShareFileForPublicAccess(token) {
  const share = await Share.findOne({ token })
    .select("+passwordHash")
    .lean();

  if (!share) throw notFound("Share link not found.");
  if (!isShareAccessible(share)) throw gone("This share link is no longer available.");

  if (share.resourceType !== RESOURCE_TYPES.FILE) {
    throw badRequest("Only file shares are supported for public access.");
  }

  const file = await File.findOne({
    _id: share.resourceId,
    userId: share.ownerId,
    isTrashed: false,
  }).lean();

  if (!file) throw gone("The shared file is no longer available.");

  return { share, file };
}

export async function incrementShareView(token) {
  const share = await Share.findOneAndUpdate(
    { token },
    { $inc: { viewCount: 1 }, lastAccessedAt: new Date() },
    { new: true, projection: { ownerId: 1, viewCount: 1 } },
  );
  await invalidateShareTokenCache(token);
  if (share?.ownerId) {
    await invalidateOwnerShareCache(share.ownerId.toString());
  }
  return share?.viewCount || 0;
}

export async function incrementShareDownload(token) {
  const share = await Share.findOneAndUpdate(
    { token },
    { $inc: { downloadCount: 1 }, lastAccessedAt: new Date() },
    { new: true, projection: { ownerId: 1, downloadCount: 1 } },
  );
  await invalidateShareTokenCache(token);
  if (share?.ownerId) {
    await invalidateOwnerShareCache(share.ownerId.toString());
  }
  return share?.downloadCount || 0;
}

/**
 * Delete all shares when a file is permanently deleted.
 * Called from file lifecycle hooks.
 */
export async function deleteSharesForResource(ownerId, resourceType, resourceId) {
  const shares = await Share.find({
    ownerId,
    resourceType,
    resourceId,
  }).lean();

  if (shares.length === 0) return;

  await Share.deleteMany({ ownerId, resourceType, resourceId });

  const shareIds = shares.map((s) => s._id);
  await ShareCollaborator.deleteMany({ shareId: { $in: shareIds } });

  await Promise.all(
    shares.map((s) => invalidateShareTokenCache(s.token)),
  );
  await invalidateOwnerShareCache(ownerId.toString());
}

// ─── Helpers ─────────────────────────────────────────────────────

function isShareAccessible(share) {
  if (!share.isActive) return false;
  if (share.expiresAt && new Date(share.expiresAt) <= new Date()) return false;
  return true;
}

function formatShareResponse(share, extras = {}) {
  const expired =
    share.expiresAt && new Date(share.expiresAt) <= new Date();

  return {
    id: share._id,
    token: share.token,
    linkUrl: buildShareUrl(share.token),
    resourceType: share.resourceType,
    resourceId: share.resourceId,
    name: share.resourceSnapshot?.name,
    mimeType: share.resourceSnapshot?.mimeType,
    size: share.resourceSnapshot?.size,
    kind: share.resourceSnapshot?.kind,
    isActive: share.isActive && !expired,
    visibility: share.visibility,
    hasPassword: Boolean(share.isPasswordProtected),
    expiresAt: share.expiresAt,
    isExpired: Boolean(expired),
    viewCount: share.viewCount,
    downloadCount: share.downloadCount,
    permissions: share.permissions,
    sharedAt: share.createdAt,
    lastAccessedAt: share.lastAccessedAt,
    ...extras,
  };
}

function formatCollaboratorResponse(collaborator) {
  return {
    id: collaborator._id,
    email: collaborator.email,
    name: collaborator.displayName || collaborator.email.split("@")[0],
    role: collaborator.role,
    status: collaborator.status,
    invitedAt: collaborator.invitedAt,
    acceptedAt: collaborator.acceptedAt,
  };
}

export { formatShareResponse, isShareAccessible };
