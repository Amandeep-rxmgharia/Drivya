import User from "../models/userModel.js";
import { PERMISSIONS, ROLES, isRoleAtLeast } from "../constants/rbacConstants.js";

/**
 * Role-based route guard.
 * Verifies that the user has one of the allowed roles.
 * Usage: router.get("/admin/users", authenticate, authorize(ROLES.ADMIN, ROLES.MODERATOR), handler)
 */
export function authorize(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required." });
      }

      const user = await User.findById(userId).select("role isActive").lean();
      if (!user) {
        return res.status(401).json({ message: "User not found." });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Account suspended.", code: "ACCOUNT_SUSPENDED" });
      }

      // Sync role on the request object
      req.user.role = user.role;

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions.", code: "FORBIDDEN" });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Permission-based route guard.
 * Verifies that the user's role is granted the specified permission.
 * Usage: router.delete("/users/:id", authenticate, checkPermission("users:delete"), handler)
 */
export function checkPermission(permission) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required." });
      }

      const user = await User.findById(userId).select("role isActive").lean();
      if (!user) {
        return res.status(401).json({ message: "User not found." });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Account suspended.", code: "ACCOUNT_SUSPENDED" });
      }

      // Sync role on the request object
      req.user.role = user.role;

      const allowedRoles = PERMISSIONS[permission];
      if (!allowedRoles || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions.", code: "FORBIDDEN" });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
