/** Share resource types supported by the platform. */
export const RESOURCE_TYPES = Object.freeze({
  FILE: "file",
  DIRECTORY: "directory",
});

/** Link visibility modes. */
export const VISIBILITY = Object.freeze({
  PUBLIC: "public",
  RESTRICTED: "restricted",
});

/** Collaborator roles (owner is implicit on the share record). */
export const COLLABORATOR_ROLES = Object.freeze({
  VIEWER: "viewer",
  EDITOR: "editor",
});

/** Collaborator invitation lifecycle. */
export const COLLABORATOR_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  REVOKED: "revoked",
});

/** Expiration presets mapped to days (null = never). */
export const EXPIRATION_PRESETS = Object.freeze({
  NEVER: null,
  ONE_DAY: 1,
  SEVEN_DAYS: 7,
  THIRTY_DAYS: 30,
});

/** Default share permissions. */
export const DEFAULT_PERMISSIONS = Object.freeze({
  allowView: true,
  allowDownload: true,
  allowEdit: false,
});

/** Cache key prefixes (Redis-ready naming). */
export const CACHE_KEYS = Object.freeze({
  SHARE_BY_TOKEN: "share:token:",
  SHARE_STATS: "share:stats:",
  SHARE_LIST: "share:list:",
});

/** Cache TTLs in seconds. */
export const CACHE_TTL = Object.freeze({
  SHARE_METADATA: 300,
  SHARE_STATS: 60,
  SHARE_LIST: 30,
});

/** Public share access token TTL. */
export const SHARE_ACCESS_TOKEN_EXPIRY = "1h";
