export const ROLES = {
  USER: "user",
  MODERATOR: "moderator",
  ADMIN: "admin",
};

export const ROLE_HIERARCHY = {
  [ROLES.USER]: 0,
  [ROLES.MODERATOR]: 1,
  [ROLES.ADMIN]: 2,
};

export const PERMISSIONS = {
  // Every authenticated user
  "files:read":       [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "files:write":      [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "files:delete":     [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "shares:manage":    [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],

  // Moderator-level
  "users:list":       [ROLES.MODERATOR, ROLES.ADMIN],
  "shares:moderate":  [ROLES.MODERATOR, ROLES.ADMIN],
  "activity:viewAll": [ROLES.MODERATOR, ROLES.ADMIN],

  // Admin-only
  "users:manage":     [ROLES.ADMIN],
  "users:changeRole": [ROLES.ADMIN],
  "users:delete":     [ROLES.ADMIN],
  "system:settings":  [ROLES.ADMIN],
  "audit:read":       [ROLES.ADMIN],
};

export function isRoleAtLeast(roleA, minimumRole) {
  return (ROLE_HIERARCHY[roleA] ?? -1) >= (ROLE_HIERARCHY[minimumRole] ?? Infinity);
}
