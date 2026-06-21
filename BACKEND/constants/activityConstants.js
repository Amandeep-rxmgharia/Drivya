/** User activity action types tracked by the platform. */
export const ACTIVITY_ACTIONS = Object.freeze({
  OPENED: "opened",
  UPLOADED: "uploaded",
  DOWNLOADED: "downloaded",
  RENAMED: "renamed",
  TRASHED: "trashed",
  RESTORED: "restored",
  SHARED: "shared",
  EDITED: "edited",
});

/** Allowed filter values for the listing API (subset exposed to clients). */
export const ACTIVITY_FILTERS = Object.freeze(
  new Set(["opened", "uploaded", "downloaded", "renamed", "trashed", "restored"]),
);

/** Activity retention — documents older than this are auto-purged by TTL index. */
export const ACTIVITY_TTL_DAYS =
  parseInt(process.env.ACTIVITY_TTL_DAYS, 10) || 90;

/** Cache key prefixes (Redis-ready naming). */
export const ACTIVITY_CACHE_KEYS = Object.freeze({
  STATS: "activity:stats:",
});

/** Cache TTLs in seconds. */
export const ACTIVITY_CACHE_TTL = Object.freeze({
  STATS: 60,
});
