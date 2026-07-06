import mongoose from "mongoose";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Notification from "../models/notificationModel.js";
import Share from "../models/shareModel.js";
import { clearTokenCookies } from "../config/tokenUtils.js";
import { deleteFile } from "../services/storageService.js";
import { createNotification } from "../services/notificationService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = path.resolve(__dirname, "..", "storage", "avatars");

// ─── Get Profile ─────────────────────────────────────────────
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .lean()
      .select("-__v -password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        language: user.language || "en",
        timezone: user.timezone || "auto",
        avatarUrl: user.avatarUrl || "",
        storageUsed: user.storageUsed || 0,
        storageLimit: user.storageLimit || 1024 * 1024 * 1024,
        memberSince: user.createdAt,
        loginAlerts: user.loginAlerts !== false,
        twoFAEnabled: !!user.twoFAEnabled,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Update Profile ──────────────────────────────────────────
export const updateProfile = async (req, res, next) => {
  const allowedFields = ["name", "language", "timezone", "loginAlerts"];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid fields to update." });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true },
    )
      .lean()
      .select("-__v -password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      message: "Profile updated.",
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        language: user.language || "en",
        timezone: user.timezone || "auto",
        avatarUrl: user.avatarUrl || "",
        storageUsed: user.storageUsed || 0,
        storageLimit: user.storageLimit || 1024 * 1024 * 1024,
        memberSince: user.createdAt,
        loginAlerts: user.loginAlerts !== false,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Upload Avatar ───────────────────────────────────────────
const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided." });
    }

    // Validate mime type
    if (!ALLOWED_AVATAR_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Only JPG, PNG, and WebP are allowed.",
      });
    }

    // Validate size
    if (req.file.size > MAX_AVATAR_SIZE) {
      return res
        .status(400)
        .json({ message: "File too large. Max size is 5 MB." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Ensure avatars directory exists
    await fsp.mkdir(AVATAR_DIR, { recursive: true });

    // Generate unique filename
    const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
    const filename = `${user._id}_${Date.now()}${ext}`;
    const filePath = path.join(AVATAR_DIR, filename);

    // Delete old avatar file if it exists
    if (user.avatarUrl) {
      const oldFilename = user.avatarUrl.split("/").pop();
      const oldPath = path.join(AVATAR_DIR, oldFilename);
      try {
        await fsp.unlink(oldPath);
      } catch {
        // ignore if old file doesn't exist
      }
    }

    // Write new file
    await fsp.writeFile(filePath, req.file.buffer);

    // Update user record
    const avatarUrl = `/api/account/avatar/${filename}`;
    user.avatarUrl = avatarUrl;
    await user.save();

    return res.json({
      message: "Avatar updated.",
      avatarUrl,
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        language: user.language || "en",
        timezone: user.timezone || "auto",
        avatarUrl,
        storageUsed: user.storageUsed || 0,
        storageLimit: user.storageLimit || 1024 * 1024 * 1024,
        memberSince: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Serve Avatar ────────────────────────────────────────────
export const getAvatar = async (req, res, next) => {
  try {
    const { filename } = req.params;
    // Sanitize filename to prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(AVATAR_DIR, safeName);

    try {
      await fsp.access(filePath);
    } catch {
      return res.status(404).json({ message: "Avatar not found." });
    }

    // Determine content type from extension
    const ext = path.extname(safeName).toLowerCase();
    const contentTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };

    res.set("Content-Type", contentTypes[ext] || "image/jpeg");
    res.set("Cache-Control", "public, max-age=86400"); // Cache for 24h
    const data = await fsp.readFile(filePath);
    return res.send(data);
  } catch (err) {
    next(err);
  }
};

// ─── Delete Avatar ───────────────────────────────────────────
export const deleteAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.avatarUrl) {
      const oldFilename = user.avatarUrl.split("/").pop();
      const oldPath = path.join(AVATAR_DIR, oldFilename);
      try {
        await fsp.unlink(oldPath);
      } catch {
        // ignore
      }
    }

    user.avatarUrl = "";
    await user.save();

    return res.json({
      message: "Avatar removed.",
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        language: user.language || "en",
        timezone: user.timezone || "auto",
        avatarUrl: "",
        storageUsed: user.storageUsed || 0,
        storageLimit: user.storageLimit || 1024 * 1024 * 1024,
        memberSince: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Change Password ─────────────────────────────────────────
export const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    // Revoke all OTHER sessions of this user
    const Session = (await import("../models/sessionModel.js")).default;
    await Session.deleteMany({
      userId: user._id,
      _id: { $ne: req.user.sessionId },
    });

    // Create security notification in inbox
    await createNotification(user._id, {
      type: "security",
      title: "Password updated successfully",
      description: "Your account password was recently changed. If you did not make this change, please contact support immediately.",
      actionLabel: "Security Settings",
      actionPath: "/dashboard/settings/security",
    });

    return res.json({ message: "Password changed successfully." });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Account ──────────────────────────────────────────
export const getSharingDefaults = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .lean()
      .select(
        "defaultShareAccess defaultShareExpiryDays defaultSharePassword defaultShareDownloadPermission defaultShareNotify defaultSharePublicProfile",
      );

    if (!user) return res.status(404).json({ message: "User not found." });

    return res.json({
      defaults: {
        defaultAccess: user.defaultShareAccess,
        defaultExpiryDays: user.defaultShareExpiryDays,
        passwordDefault: user.defaultSharePassword,
        downloadPermission: user.defaultShareDownloadPermission,
        shareNotify: user.defaultShareNotify,
        publicProfile: user.defaultSharePublicProfile,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateSharingDefaults = async (req, res, next) => {
  try {
    const allowed = [
      "defaultAccess",
      "defaultExpiryDays",
      "passwordDefault",
      "downloadPermission",
      "shareNotify",
      "publicProfile",
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Map UI keys -> userSchema keys
    const mapped = {};
    if (updates.defaultAccess !== undefined) mapped.defaultShareAccess = updates.defaultAccess;
    if (updates.defaultExpiryDays !== undefined) mapped.defaultShareExpiryDays = updates.defaultExpiryDays;
    if (updates.passwordDefault !== undefined) mapped.defaultSharePassword = updates.passwordDefault;
    if (updates.downloadPermission !== undefined) mapped.defaultShareDownloadPermission = updates.downloadPermission;
    if (updates.shareNotify !== undefined) mapped.defaultShareNotify = updates.shareNotify;
    if (updates.publicProfile !== undefined) mapped.defaultSharePublicProfile = updates.publicProfile;

    if (Object.keys(mapped).length === 0) {
      return res.status(400).json({ message: "No valid fields to update." });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: mapped },
      { new: true, runValidators: true },
    )
      .lean()
      .select(
        "defaultShareAccess defaultShareExpiryDays defaultSharePassword defaultShareDownloadPermission defaultShareNotify defaultSharePublicProfile",
      );

    if (!user) return res.status(404).json({ message: "User not found." });

    return res.json({
      message: "Sharing defaults updated.",
      defaults: {
        defaultAccess: user.defaultShareAccess,
        defaultExpiryDays: user.defaultShareExpiryDays,
        passwordDefault: user.defaultSharePassword,
        downloadPermission: user.defaultShareDownloadPermission,
        shareNotify: user.defaultShareNotify,
        publicProfile: user.defaultSharePublicProfile,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req, res, next) => {
  const { password } = req.body;
  const session = await mongoose.startSession();

  try {
    // Verify password first
    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Password is incorrect." });
    }

    await session.withTransaction(async () => {
      // Delete all user files from storage
      const files = await File.find({ userId: user._id })
        .lean()
        .select("storagePath")
        .session(session);

      for (const file of files) {
        if (file.storagePath) {
          try {
            await deleteFile(file.storagePath);
          } catch (e) {
            console.error(
              `Failed to delete storage file ${file.storagePath}:`,
              e.message,
            );
          }
        }
      }

      // Delete all related data
      await File.deleteMany({ userId: user._id }).session(session);
      await Directory.deleteMany({ userId: user._id }).session(session);
      await Notification.deleteMany({ userId: user._id }).session(session);
      await Share.deleteMany({ ownerId: user._id }).session(session);
      await User.findByIdAndDelete(user._id).session(session);
    });

    clearTokenCookies(res);

    return res.json({ message: "Account deleted successfully." });
  } catch (err) {
    next(err);
  } finally {
    await session.endSession();
  }
};
