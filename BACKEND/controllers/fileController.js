import mongoose from "mongoose";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import User from "../models/userModel.js";
import {
  saveFile,
  getFileStream,
  deleteFile as deleteFromDisk,
  deleteFiles as deleteFilesFromDisk,
} from "../services/storageService.js";
import { generateStorageName } from "../middlewares/uploadMiddleware.js";

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

    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "Content-Length": file.size,
    });

    stream.pipe(res);
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
        .select("storagePath size")
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
