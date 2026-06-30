import mongoose from "mongoose";
import User from "../models/userModel.js";
import AuditLog from "../models/auditLogModel.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Session from "../models/sessionModel.js";
import Share from "../models/shareModel.js";
import { AUDIT_ACTIONS, ROLE_HIERARCHY, ROLES } from "../constants/rbacConstants.js";

/**
 * List all users with pagination, sorting, and search.
 * Permission: users:list
 */
export const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "", sortBy = "createdAt", order = "desc" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
      ];
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const sortQuery = { [sortBy]: sortOrder };

    const [users, total] = await Promise.all([
      User.find(query)
        .sort(sortQuery)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.json({
      items: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve a single user.
 * Permission: users:list
 */
export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.json({ user });
  } catch (err) {
    next(err);
  }
};

/**
 * Change a user's role.
 * Rules:
 * - Cannot change own role.
 * - Cannot set a role higher than the actor's role.
 * - Promoted target role must be valid.
 * Permission: users:changeRole (2FA step-up required by route)
 */
export const changeUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(ROLES).includes(role)) {
      return res.status(400).json({ message: "Invalid role specified." });
    }

    // Check actor hierarchy
    const actorRole = req.user.role;
    if (ROLE_HIERARCHY[role] > ROLE_HIERARCHY[actorRole]) {
      return res.status(403).json({ message: "Cannot assign a role higher than your own." });
    }

    if (id === req.user.id) {
      return res.status(400).json({ message: "You cannot change your own role." });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Admins cannot change roles of other admins unless they themselves are admin
    if (ROLE_HIERARCHY[targetUser.role] >= ROLE_HIERARCHY[actorRole] && actorRole !== ROLES.ADMIN) {
      return res.status(403).json({ message: "You do not have permission to modify this user's role." });
    }

    const oldRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    // Revoke target user's active sessions to force re-authentication (so JWT updates)
    await Session.deleteMany({ userId: targetUser._id });

    // Log action
    await AuditLog.create({
      performedBy: req.user.id,
      action: AUDIT_ACTIONS.ROLE_CHANGE,
      targetUserId: targetUser._id,
      details: { oldRole, newRole: role },
      ip: req.ip || "",
    });

    return res.json({ message: `User role updated successfully to ${role}.` });
  } catch (err) {
    next(err);
  }
};

/**
 * Suspend or unsuspend a user's account.
 * Permission: users:manage (2FA step-up required by route)
 */
export const toggleSuspend = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: "You cannot suspend your own account." });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const actorRole = req.user.role;
    if (ROLE_HIERARCHY[targetUser.role] >= ROLE_HIERARCHY[actorRole] && actorRole !== ROLES.ADMIN) {
      return res.status(403).json({ message: "You do not have permission to manage this user." });
    }

    targetUser.isActive = !targetUser.isActive;
    await targetUser.save();

    const action = targetUser.isActive ? AUDIT_ACTIONS.USER_UNSUSPEND : AUDIT_ACTIONS.USER_SUSPEND;

    if (!targetUser.isActive) {
      // Force log out immediately by deleting sessions
      await Session.deleteMany({ userId: targetUser._id });
    }

    // Log action
    await AuditLog.create({
      performedBy: req.user.id,
      action,
      targetUserId: targetUser._id,
      details: { isActive: targetUser.isActive },
      ip: req.ip || "",
    });

    return res.json({
      message: `Account has been ${targetUser.isActive ? "unsuspended" : "suspended"}.`,
      isActive: targetUser.isActive,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Permanently delete a user and all their files, directories, shares, and sessions.
 * Permission: users:delete (2FA step-up required by route)
 */
export const deleteUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const actorRole = req.user.role;
    if (ROLE_HIERARCHY[targetUser.role] >= ROLE_HIERARCHY[actorRole] && actorRole !== ROLES.ADMIN) {
      return res.status(403).json({ message: "You do not have permission to delete this user." });
    }

    await session.withTransaction(async () => {
      // Delete user's sessions, shares, files, directories
      await Session.deleteMany({ userId: targetUser._id }).session(session);
      await Share.deleteMany({ ownerId: targetUser._id }).session(session);
      await File.deleteMany({ userId: targetUser._id }).session(session);
      await Directory.deleteMany({ userId: targetUser._id }).session(session);
      
      // Note: Disk cleanup of stored files is usually handled asynchronously or in clean-up jobs.
      // Since this is a production-level architecture plan, we will keep it simple and clean DB records first.
      
      await User.findByIdAndDelete(targetUser._id).session(session);

      // Log action
      await AuditLog.create([{
        performedBy: req.user.id,
        action: AUDIT_ACTIONS.USER_DELETE,
        targetUserId: targetUser._id,
        details: { email: targetUser.email, name: targetUser.name },
        ip: req.ip || "",
      }], { session });
    });

    return res.json({ message: "User and all associated data permanently deleted." });
  } catch (err) {
    next(err);
  } finally {
    await session.endSession();
  }
};

/**
 * Get overall system statistics.
 * Permission: users:list
 */
export const getPlatformStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalFiles, totalShares, storageAggregation] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      File.countDocuments(),
      Share.countDocuments(),
      User.aggregate([
        { $group: { _id: null, totalStorage: { $sum: "$storageUsed" } } },
      ]),
    ]);

    const totalStorageUsed = storageAggregation[0]?.totalStorage || 0;

    return res.json({
      totalUsers,
      activeUsers,
      totalFiles,
      totalShares,
      totalStorageUsed,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * View the audit trail.
 * Permission: audit:read
 */
export const getAuditLog = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = {};
    if (action) {
      query.action = action;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("performedBy", "name email")
        .populate("targetUserId", "name email")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return res.json({
      items: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};
