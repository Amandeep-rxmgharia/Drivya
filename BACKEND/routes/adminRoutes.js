import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize, checkPermission } from "../middlewares/rbacMiddleware.js";
import { requireTwoFA } from "../middlewares/twoFAMiddleware.js";
import { ROLES } from "../constants/rbacConstants.js";
import * as adminController from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require authentication + moderator role minimum
router.use(authenticate);
router.use(authorize(ROLES.MODERATOR, ROLES.ADMIN));

// User management
router.get("/users", checkPermission("users:list"), adminController.listUsers);
router.get("/users/:id", checkPermission("users:list"), adminController.getUser);
router.patch("/users/:id/role", requireTwoFA, checkPermission("users:changeRole"), adminController.changeUserRole);
router.patch("/users/:id/suspend", requireTwoFA, checkPermission("users:manage"), adminController.toggleSuspend);
router.delete("/users/:id", requireTwoFA, checkPermission("users:delete"), adminController.deleteUser);

// Platform stats
router.get("/stats", checkPermission("users:list"), adminController.getPlatformStats);

// Audit log
router.get("/audit-log", checkPermission("audit:read"), adminController.getAuditLog);

export default router;
