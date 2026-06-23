import mongoose from "mongoose";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import User from "../models/userModel.js";
import Share from "../models/shareModel.js";
import {
  saveFile,
  getFileStream,
  deleteFile as deleteFromDisk,
  deleteFiles as deleteFilesFromDisk,
  updateFileContent as updateDiskContent,
} from "../services/storageService.js";
import { deleteSharesForResource } from "../services/shareService.js";
import { RESOURCE_TYPES } from "../constants/shareConstants.js";
import { generateStorageName } from "../middlewares/uploadMiddleware.js";
import { recordActivity, deleteActivitiesForResources } from "../services/activityService.js";
import { ACTIVITY_ACTIONS } from "../constants/activityConstants.js";
import { generateDownloadToken, verifyDownloadToken } from "../config/tokenUtils.js";

// ─── Upload Files ────────────────────────────────────────────────
export const uploadFiles = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user.id;
    let { directoryId } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files provided." });
    }

    // Default to root directory if not specified
    if (!directoryId) {
      const user = await User.findById(userId).select("rootDirId").lean();
      if (!user?.rootDirId) {
        return res.status(404).json({ message: "Root directory not found." });
      }
      directoryId = user.rootDirId.toString();
    }

    // Verify directory exists and belongs to user
    const dir = await Directory.findOne({ _id: directoryId, userId }).lean();
    if (!dir) {
      return res.status(404).json({ message: "Target directory not found." });
    }

    // Calculate total upload size
    const totalUploadSize = req.files.reduce((sum, f) => sum + f.size, 0);

    // Check quota
    const user = await User.findById(userId)
      .select("storageUsed storageLimit")
      .lean();

    if (user.storageUsed + totalUploadSize > user.storageLimit) {
      return res.status(413).json({
        message: "Storage quota exceeded. Please free up space or upgrade.",
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        uploadSize: totalUploadSize,
      });
    }

    const savedFiles = [];
    const savedStoragePaths = [];

    await session.withTransaction(async () => {
      for (const uploadedFile of req.files) {
        const storageName = generateStorageName(uploadedFile.originalname);
        const storagePath = await saveFile(
          userId,
          storageName,
          uploadedFile.buffer,
        );
        savedStoragePaths.push(storagePath);

        // Handle duplicate file names: append (n) suffix
        let finalName = uploadedFile.originalname;
        let attempt = 0;
        let created = false;

        while (!created) {
          try {
            const [fileDoc] = await File.create(
              [
                {
                  originalName: finalName,
                  storageName,
                  mimeType: uploadedFile.mimetype,
                  size: uploadedFile.size,
                  userId,
                  directoryId,
                  storagePath,
                },
              ],
              { session },
            );
            savedFiles.push(fileDoc);
            created = true;
          } catch (err) {
            if (err?.code === 11000) {
              attempt++;
              const ext = finalName.includes(".")
                ? `.${finalName.split(".").pop()}`
                : "";
              const baseName = finalName.includes(".")
                ? finalName.slice(0, finalName.lastIndexOf("."))
                : finalName;
              // Remove previous (n) suffix before adding new one
              const cleanBase = baseName.replace(/\s*\(\d+\)$/, "");
              finalName = `${cleanBase} (${attempt})${ext}`;
            } else {
              throw err;
            }
          }
        }
      }

      // Update user storage used
      await User.updateOne(
        { _id: userId },
        { $inc: { storageUsed: totalUploadSize } },
      ).session(session);
    });

    // Record upload activity for each file (fire-and-forget)
    for (const file of savedFiles) {
      recordActivity({
        userId,
        action: ACTIVITY_ACTIONS.UPLOADED,
        resourceType: RESOURCE_TYPES.FILE,
        resourceId: file._id,
        resourceSnapshot: {
          name: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
        },
        parentDirId: directoryId,
      }).catch((err) => console.error("Activity[upload]:", err.message));
    }

    return res.status(201).json({
      message: `${savedFiles.length} file(s) uploaded successfully.`,
      files: savedFiles,
    });
  } catch (err) {
    next(err);
  } finally {
    await session.endSession();
  }
};

// ─── Download File ───────────────────────────────────────────────
export const downloadFile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const file = await File.findOne({ _id: id, userId }).lean();
    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }

    const stream = getFileStream(file.storagePath);

    // Record download activity (fire-and-forget, deduplicated)
    recordActivity({
      userId,
      action: ACTIVITY_ACTIONS.DOWNLOADED,
      resourceType: RESOURCE_TYPES.FILE,
      resourceId: file._id,
      resourceSnapshot: {
        name: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
      },
      parentDirId: file.directoryId,
    }).catch((err) => console.error("Activity[download]:", err.message));

    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "Content-Length": file.size,
    });

    // Handle stream errors — if the file read fails mid-transfer, destroy the response
    stream.on("error", (err) => {
      console.error("Download stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error reading file from disk." });
      } else {
        res.destroy();
      }
    });

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

// ─── Create Download Token ───────────────────────────────────────
// Issues a short-lived JWT so the browser can download via direct
// navigation (no XHR/fetch memory buffering, no cookies needed).
export const createDownloadToken = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify file exists and belongs to user
    const file = await File.findOne({ _id: id, userId }).lean();
    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }

    const token = generateDownloadToken(userId, id);
    return res.json({ token });
  } catch (err) {
    next(err);
  }
};

// ─── Download File By Token (no auth cookies needed) ─────────────
export const downloadFileByToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    let decoded;
    try {
      decoded = verifyDownloadToken(token);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired download link." });
    }

    const file = await File.findOne({
      _id: decoded.fileId,
      userId: decoded.userId,
    }).lean();

    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }

    const stream = getFileStream(file.storagePath);

    // Record download activity (fire-and-forget)
    recordActivity({
      userId: decoded.userId,
      action: ACTIVITY_ACTIONS.DOWNLOADED,
      resourceType: RESOURCE_TYPES.FILE,
      resourceId: file._id,
      resourceSnapshot: {
        name: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
      },
      parentDirId: file.directoryId,
    }).catch((err) => console.error("Activity[download-token]:", err.message));

    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "Content-Length": file.size,
    });

    stream.on("error", (err) => {
      console.error("Download stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error reading file from disk." });
      } else {
        res.destroy();
      }
    });

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

// ─── Preview File (inline streaming with Range support) ──────────
export const previewFile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const file = await File.findOne({ _id: id, userId }).lean();
    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }

    const fileSize = file.size;
    const range = req.headers.range;

    // Record preview/opened activity (fire-and-forget, deduplicated within 1h)
    recordActivity({
      userId,
      action: ACTIVITY_ACTIONS.OPENED,
      resourceType: RESOURCE_TYPES.FILE,
      resourceId: file._id,
      resourceSnapshot: {
        name: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
      },
      parentDirId: file.directoryId,
    }).catch((err) => console.error("Activity[preview]:", err.message));

    // Common headers
    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    });

    if (range) {
      // Parse Range header (e.g. "bytes=0-1023")
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).set("Content-Range", `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      const stream = getFileStream(file.storagePath, { start, end });

      res.status(206).set({
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": chunkSize,
      });

      stream.pipe(res);
    } else {
      res.set("Content-Length", fileSize);
      const stream = getFileStream(file.storagePath);
      stream.pipe(res);
    }
  } catch (err) {
    next(err);
  }
};

// ─── Rename File ─────────────────────────────────────────────────
export const renameFile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "File name is required." });
    }

    const trimmedName = name.trim();

    // Find the file first to get its directoryId
    const file = await File.findOne({ _id: id, userId, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }

    // Check for duplicate name in the same directory
    const duplicate = await File.findOne({
      userId,
      directoryId: file.directoryId,
      originalName: trimmedName,
      _id: { $ne: id },
    }).lean();

    if (duplicate) {
      return res.status(409).json({
        message: `A file named "${trimmedName}" already exists in this directory.`,
      });
    }

    const oldName = file.originalName;
    file.originalName = trimmedName;
    await file.save();

    // Record rename activity (fire-and-forget)
    recordActivity({
      userId,
      action: ACTIVITY_ACTIONS.RENAMED,
      resourceType: RESOURCE_TYPES.FILE,
      resourceId: file._id,
      resourceSnapshot: {
        name: trimmedName,
        mimeType: file.mimeType,
        size: file.size,
      },
      parentDirId: file.directoryId,
      metadata: { oldName, newName: trimmedName },
    }).catch((err) => console.error("Activity[rename]:", err.message));

    return res.json({ message: "File renamed successfully.", file });
  } catch (err) {
    next(err);
  }
};

// ─── Soft Delete (Move to Trash) ─────────────────────────────────
export const trashFile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const file = await File.findOneAndUpdate(
      { _id: id, userId, isTrashed: false },
      { isTrashed: true, trashedAt: new Date() },
      { new: true },
    );

    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }

    // Record trash activity (fire-and-forget)
    recordActivity({
      userId,
      action: ACTIVITY_ACTIONS.TRASHED,
      resourceType: RESOURCE_TYPES.FILE,
      resourceId: file._id,
      resourceSnapshot: {
        name: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
      },
      parentDirId: file.directoryId,
    }).catch((err) => console.error("Activity[trash]:", err.message));

    return res.json({ message: "File moved to trash.", file });
  } catch (err) {
    next(err);
  }
};

// ─── Restore from Trash ─────────────────────────────────────────
export const restoreFile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const file = await File.findOneAndUpdate(
      { _id: id, userId, isTrashed: true },
      { isTrashed: false, trashedAt: null },
      { new: true },
    );

    if (!file) {
      return res.status(404).json({ message: "Trashed file not found." });
    }

    // Record restore activity (fire-and-forget)
    recordActivity({
      userId,
      action: ACTIVITY_ACTIONS.RESTORED,
      resourceType: RESOURCE_TYPES.FILE,
      resourceId: file._id,
      resourceSnapshot: {
        name: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
      },
      parentDirId: file.directoryId,
    }).catch((err) => console.error("Activity[restore]:", err.message));

    return res.json({ message: "File restored.", file });
  } catch (err) {
    next(err);
  }
};

// ─── List Trashed Files ──────────────────────────────────────────
export const listTrash = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const files = await File.find({ userId, isTrashed: true })
      .sort({ trashedAt: -1 })
      .lean();

    return res.json({ files });
  } catch (err) {
    next(err);
  }
};

// ─── Empty Trash (Permanent Delete) ──────────────────────────────
export const emptyTrash = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user.id;

    await session.withTransaction(async () => {
      const trashedFiles = await File.find({ userId, isTrashed: true })
        .select("_id storagePath size")
        .session(session)
        .lean();

      if (trashedFiles.length === 0) {
        return;
      }

      const totalSize = trashedFiles.reduce((sum, f) => sum + f.size, 0);

      await File.deleteMany({ userId, isTrashed: true }).session(session);

      await User.updateOne(
        { _id: userId },
        { $inc: { storageUsed: -totalSize } },
      ).session(session);

      const fileIds = trashedFiles.map((f) => f._id);
      await deleteActivitiesForResources(fileIds, userId);
      await Promise.all(
        fileIds.map((fileId) =>
          deleteSharesForResource(userId, RESOURCE_TYPES.FILE, fileId.toString()),
        ),
      );

      // Disk cleanup — fire and forget
      const storagePaths = trashedFiles.map((f) => f.storagePath);
      deleteFilesFromDisk(storagePaths).catch((err) =>
        console.error("Trash disk cleanup error:", err.message),
      );
    });

    return res.json({ message: "Trash emptied." });
  } catch (err) {
    next(err);
  } finally {
    await session.endSession();
  }
};

// ─── Permanently Delete Single File ──────────────────────────────
export const permanentDeleteFile = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user.id;
    const { id } = req.params;

    await session.withTransaction(async () => {
      const file = await File.findOneAndDelete({
        _id: id,
        userId,
        isTrashed: true,
      }).session(session);

      if (!file) {
        const err = new Error("Trashed file not found.");
        err.status = 404;
        throw err;
      }

      await User.updateOne(
        { _id: userId },
        { $inc: { storageUsed: -file.size } },
      ).session(session);

      await deleteSharesForResource(
        userId,
        RESOURCE_TYPES.FILE,
        file._id.toString(),
      );

      await deleteActivitiesForResources([file._id], userId);

      // Disk cleanup
      deleteFromDisk(file.storagePath).catch((err) =>
        console.error("File delete disk error:", err.message),
      );
    });

    return res.json({ message: "File permanently deleted." });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: err.message });
    }
    next(err);
  } finally {
    await session.endSession();
  }
};

// ─── Restore All Trashed Files ───────────────────────────────────
export const restoreAllFiles = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find all trashed files first to record their restoration in activity log
    const trashedFiles = await File.find({ userId, isTrashed: true }).lean();

    const result = await File.updateMany(
      { userId, isTrashed: true },
      { isTrashed: false, trashedAt: null }
    );

    // Record restore activity for each restored file
    if (trashedFiles.length > 0) {
      for (const file of trashedFiles) {
        recordActivity({
          userId,
          action: ACTIVITY_ACTIONS.RESTORED,
          resourceType: RESOURCE_TYPES.FILE,
          resourceId: file._id,
          resourceSnapshot: {
            name: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
          },
          parentDirId: file.directoryId,
        }).catch((err) => console.error("Activity[restoreAll]:", err.message));
      }
    }

    return res.json({
      message: `${result.modifiedCount} file(s) restored successfully.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Edit File Content ───────────────────────────────────────────
export const editFileContent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ message: "Content is required." });
    }

    const file = await File.findOne({ _id: id, userId, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }

    await updateDiskContent(file.storagePath, content);

    const newSize = Buffer.byteLength(content);
    file.size = newSize;
    await file.save();

    // Sync any active share snapshots
    await Share.updateMany(
      { resourceId: file._id, resourceType: RESOURCE_TYPES.FILE },
      { "resourceSnapshot.size": newSize }
    );

    // Record edit activity (fire-and-forget)
    recordActivity({
      userId,
      action: ACTIVITY_ACTIONS.EDITED,
      resourceType: RESOURCE_TYPES.FILE,
      resourceId: file._id,
      resourceSnapshot: {
        name: file.originalName,
        mimeType: file.mimeType,
        size: newSize,
      },
      parentDirId: file.directoryId,
    }).catch((err) => console.error("Activity[edit]:", err.message));

    return res.json({ message: "File content updated successfully.", file });
  } catch (err) {
    next(err);
  }
};
