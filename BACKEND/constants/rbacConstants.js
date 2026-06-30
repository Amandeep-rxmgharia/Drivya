/** ─── Role-Based Access Control Constants ─────────────────────────
 *
 * Central authority for roles, hierarchy, and permission mappings.
 * Imported by middleware, controllers, and migration scripts.
 */

/** Available roles ordered by privilege level (ascending). */
export const ROLES = Object.freeze({
  USER: "user",
  MODERATOR: "moderator",
  ADMIN: "admin",
});

/** Numeric privilege level for each role (higher = more privilege). */
export const ROLE_HIERARCHY = Object.freeze({
  [ROLES.USER]: 0,
  [ROLES.MODERATOR]: 1,
  [ROLES.ADMIN]: 2,
});

/**
 * Granular permissions mapped to the roles that hold them.
 * Used by `checkPermission()` middleware for fine-grained route guarding.
 */
export const PERMISSIONS = Object.freeze({
  // ─── Every authenticated user ────────────────────────────────
  "files:read":       [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "files:write":      [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "files:delete":     [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "shares:manage":    [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],

  // ─── Moderator-level ─────────────────────────────────────────
  "users:list":       [ROLES.MODERATOR, ROLES.ADMIN],
  "shares:moderate":  [ROLES.MODERATOR, ROLES.ADMIN],
  "activity:viewAll": [ROLES.MODERATOR, ROLES.ADMIN],

  // ─── Admin-only ──────────────────────────────────────────────
  "users:manage":     [ROLES.ADMIN],
  "users:changeRole": [ROLES.ADMIN],
  "users:delete":     [ROLES.ADMIN],
  "system:settings":  [ROLES.ADMIN],
  "audit:read":       [ROLES.ADMIN],
});

/** Audit log action types — used by adminController for consistency. */
export const AUDIT_ACTIONS = Object.freeze({
  ROLE_CHANGE: "ROLE_CHANGE",
  USER_SUSPEND: "USER_SUSPEND",
  USER_UNSUSPEND: "USER_UNSUSPEND",
  USER_DELETE: "USER_DELETE",
});

/**
 * Check if `roleA` meets or exceeds the `minimumRole` in the hierarchy.
 * @param {string} roleA    – The user's current role.
 * @param {string} minimumRole – The minimum role required.
 * @returns {boolean}
 */
export function isRoleAtLeast(roleA, minimumRole) {
  return (ROLE_HIERARCHY[roleA] ?? -1) >= (ROLE_HIERARCHY[minimumRole] ?? Infinity);
}
