import api from "./auth.js";

// ─── Helpers ─────────────────────────────────────────────────────

function formatSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatShareDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Map API share payload to UI shape used by SharedFiles / ShareModal.
 */
export function normalizeShare(share) {
  if (!share) return null;

  const linkUrl = share.linkUrl || "";
  const displayUrl = linkUrl.replace(/^https?:\/\//, "");

  return {
    id: share.id,
    shareId: share.id,
    resourceId: share.resourceId,
    token: share.token,
    name: share.name,
    size: typeof share.size === "number" ? formatSize(share.size) : share.size,
    rawSize: share.size,
    sharedAt: formatShareDate(share.sharedAt),
    expiresAt: share.expiresAt ? formatShareDate(share.expiresAt) : null,
    views: share.viewCount ?? 0,
    downloads: share.downloadCount ?? 0,
    linkActive: Boolean(share.isActive && !share.isExpired),
    password: Boolean(share.hasPassword),
    starred: Boolean(share.isStarred),
    linkUrl: displayUrl,
    fullLinkUrl: linkUrl,
    visibility:
      share.visibility === "restricted" ? "Restricted" : "Public",
    isExpired: Boolean(share.isExpired),
    collaboratorCount: share.collaboratorCount ?? 0,
    permissions: share.permissions,
    _raw: share,
  };
}

function toApiRole(role) {
  return role?.toLowerCase() === "editor" ? "editor" : "viewer";
}

function toUiRole(role) {
  if (!role) return "Viewer";
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export function normalizeCollaborators(owner, collaborators = []) {
  const users = [];

  if (owner) {
    users.push({
      id: "owner",
      email: owner.email,
      role: "Owner",
      name: owner.name,
    });
  }

  for (const c of collaborators) {
    users.push({
      id: c.id,
      email: c.email,
      role: toUiRole(c.role),
      name: c.name || c.email.split("@")[0],
      status: c.status,
    });
  }

  return users;
}

// ─── Share API ───────────────────────────────────────────────────

/**
 * Create or return existing share for a file.
 * @param {{ resourceId: string, resourceType?: string }} data
 */
export const createShare = async ({ resourceId, resourceType = "file" }) => {
  const response = await api.post("/api/shares", { resourceId, resourceType });
  return {
    ...response.data,
    share: normalizeShare(response.data.share),
  };
};

/**
 * List shares with optional filters.
 * @param {{ q?: string, filter?: string, sort?: string, page?: number, limit?: number }} params
 */
export const listShares = async (params = {}) => {
  const response = await api.get("/api/shares", { params });
  return {
    ...response.data,
    items: (response.data.items || []).map(normalizeShare),
  };
};

/**
 * Get aggregate share stats for dashboard hero.
 */
export const getShareStats = async () => {
  const response = await api.get("/api/shares/stats");
  return response.data.stats;
};

/**
 * Get share detail with collaborators.
 * @param {string} shareId
 */
export const getShare = async (shareId) => {
  const response = await api.get(`/api/shares/${shareId}`);
  return {
    share: normalizeShare(response.data.share),
    owner: response.data.owner,
    collaborators: response.data.collaborators || [],
    sharedUsers: normalizeCollaborators(
      response.data.owner,
      response.data.collaborators,
    ),
  };
};

/**
 * Update share settings.
 * @param {string} shareId
 * @param {object} updates
 */
export const updateShare = async (shareId, updates) => {
  const response = await api.patch(`/api/shares/${shareId}`, updates);
  return {
    ...response.data,
    share: normalizeShare(response.data.share),
  };
};

/**
 * Revoke (delete) a share link.
 * @param {string} shareId
 */
export const revokeShare = async (shareId) => {
  const response = await api.delete(`/api/shares/${shareId}`);
  return response.data;
};

/**
 * Invite a collaborator by email.
 */
export const inviteCollaborator = async (shareId, { email, role }) => {
  const response = await api.post(`/api/shares/${shareId}/collaborators`, {
    email,
    role: toApiRole(role),
  });
  return response.data;
};

/**
 * Update collaborator role.
 */
export const updateCollaboratorRole = async (
  shareId,
  collaboratorId,
  role,
) => {
  const response = await api.patch(
    `/api/shares/${shareId}/collaborators/${collaboratorId}`,
    { role: toApiRole(role) },
  );
  return response.data;
};

/**
 * Revoke collaborator access.
 */
export const revokeCollaborator = async (shareId, collaboratorId) => {
  const response = await api.delete(
    `/api/shares/${shareId}/collaborators/${collaboratorId}`,
  );
  return response.data;
};

/**
 * Build a map of resourceId → share for drive file badges.
 */
export const fetchShareMap = async () => {
  const { items } = await listShares({ limit: 100 });
  return Object.fromEntries(
    items.map((share) => [share.resourceId, share]),
  );
};

export { formatSize as formatShareSize };
