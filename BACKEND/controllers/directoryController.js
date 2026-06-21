import mongoose from "mongoose";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import { deleteFiles } from "../services/storageService.js";
import { recordActivity, deleteActivitiesForResources } from "../services/activityService.js";
import { ACTIVITY_ACTIONS } from "../constants/activityConstants.js";
import { RESOURCE_TYPES } from "../constants/shareConstants.js";

// ─── List Directory Contents ─────────────────────────────────────
export const listDirectory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let { parentId } = req.params;

    // If no parentId, resolve user's root directory
    if (!parentId || parentId === "root") {
      const user = await User.findById(userId).select("rootDirId").lean();
      if (!user?.rootDirId) {
        return res.status(404).json({ message: "Root directory not found." });
      }
      parentId = user.rootDirId.toString();
    }

    // Verify the parent directory exists and belongs to the user
    const parentDir = await Directory.findOne({
      _id: parentId,
      userId,
    }).lean();

    if (!parentDir) {
      return res.status(404).json({ message: "Directory not found." });
    }

    // Fetch children directories and files in parallel
    const [directories, files] = await Promise.all([
      Directory.find({ userId, parentDirId: parentId })
        .sort({ name: 1 })
        .lean(),
      File.find({ userId, directoryId: parentId, isTrashed: false })
        .sort({ originalName: 1 })
        .lean(),
    ]);

    // Record directory opened activity if it's not the root directory (fire-and-forget, deduplicated within 1h)
    if (parentDir.parentDirId !== null) {
      recordActivity({
        userId,
        action: ACTIVITY_ACTIONS.OPENED,
        resourceType: RESOURCE_TYPES.DIRECTORY,
        resourceId: parentDir._id,
        resourceSnapshot: {
          name: parentDir.name,
          kind: "folder",
        },
        parentDirId: parentDir.parentDirId,
      }).catch((err) => console.error("Activity[dir-open]:", err.message));
    }

    return res.json({
      currentDir: parentDir,
      directories,
      files,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Breadcrumb Trail ────────────────────────────────────────
export const getBreadcrumb = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const dir = await Directory.findOne({ _id: id, userId }).lean();
    if (!dir) {
      return res.status(404).json({ message: "Directory not found." });
    }

    const pathIds = dir.path;

    if (pathIds.length === 0) {
      return res.json({ breadcrumb: [dir] });
    }

    // Fetch all ancestors in one query, then sort by depth
    const ancestors = await Directory.find({
      _id: { $in: pathIds },
      userId,
    })
      .sort({ depth: 1 })
      .lean();

    return res.json({ breadcrumb: [...ancestors, dir] });
  } catch (err) {
    next(err);
  }
};

// ─── Create Directory ────────────────────────────────────────────
export const createDirectory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    let { parentDirId } = req.body;

    // Default to root if no parent specified
    if (!parentDirId) {
      const user = await User.findById(userId).select("rootDirId").lean();
      if (!user?.rootDirId) {
        return res.status(404).json({ message: "Root directory not found." });
      }
      parentDirId = user.rootDirId.toString();
    }

    // Verify parent exists and belongs to user
    const parentDir = await Directory.findOne({
      _id: parentDirId,
      userId,
    }).lean();

    if (!parentDir) {
      return res.status(404).json({ message: "Parent directory not found." });
    }

    // Create the directory with computed path array
    const newDir = await Directory.create({
      name,
      userId,
      parentDirId,
      path: [...parentDir.path, parentDir._id],
      depth: parentDir.depth + 1,
    });

    // Record directory created activity (fire-and-forget)
    recordActivity({
      userId,
      action: ACTIVITY_ACTIONS.UPLOADED,
      resourceType: RESOURCE_TYPES.DIRECTORY,
      resourceId: newDir._id,
      resourceSnapshot: {
        name: newDir.name,
        kind: "folder",
      },
      parentDirId,
    }).catch((err) => console.error("Activity[dir-create]:", err.message));

    return res.status(201).json({
      message: "Directory created.",
      directory: newDir,
    });
  } catch (err) {
    // Handle duplicate name
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "A folder with this name already exists in this directory.",
      });
    }
    next(err);
  }
};

// ─── Rename Directory ────────────────────────────────────────────
export const renameDirectory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name } = req.body;

    const dir = await Directory.findOneAndUpdate(
      { _id: id, userId, parentDirId: { $ne: null } }, // cannot rename root
      { name },
      { new: true, runValidators: true },
    );

    if (!dir) {
      return res.status(404).json({
        message: "Directory not found or cannot be renamed.",
      });
    }

    // Record rename activity (fire-and-forget)
    recordActivity({
      userId,
      action: ACTIVITY_ACTIONS.RENAMED,
      resourceType: RESOURCE_TYPES.DIRECTORY,
      resourceId: dir._id,
      resourceSnapshot: {
        name: dir.name,
        kind: "folder",
      },
      parentDirId: dir.parentDirId,
      metadata: { oldName: name !== dir.name ? dir.name : null, newName: name },
    }).catch((err) => console.error("Activity[dir-rename]:", err.message));

    return res.json({ message: "Directory renamed.", directory: dir });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "A folder with this name already exists in this directory.",
      });
    }
    next(err);
  }
};

// ─── Delete Directory (Recursive) ────────────────────────────────
export const deleteDirectory = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user.id;
    const { id } = req.params;

    await session.withTransaction(async () => {
      // Find the directory to delete
      const dir = await Directory.findOne({
        _id: id,
        userId,
        parentDirId: { $ne: null }, // cannot delete root
      })
        .session(session)
        .lean();

      if (!dir) {
        const err = new Error("Directory not found or cannot be deleted.");
        err.status = 404;
        throw err;
      }

      // Find all descendant directories using Array of Ancestors path match
      const descendantDirs = await Directory.find({
        userId,
        path: dir._id,
      })
        .select("_id")
        .session(session)
        .lean();

      const allDirIds = [dir._id, ...descendantDirs.map((d) => d._id)];

      // Find all files in these directories
      const filesToDelete = await File.find({
        userId,
        directoryId: { $in: allDirIds },
      })
        .select("storagePath size")
        .session(session)
        .lean();

      // Calculate total size to free
      const totalSize = filesToDelete.reduce((sum, f) => sum + f.size, 0);

      // Delete all files and directories from DB
      await File.deleteMany({
        userId,
        directoryId: { $in: allDirIds },
      }).session(session);

      await Directory.deleteMany({
        _id: { $in: allDirIds },
      }).session(session);

      // Sync activities cleanup
      const deletedResourceIds = [...allDirIds, ...filesToDelete.map((f) => f._id)];
      await deleteActivitiesForResources(deletedResourceIds, userId);

      // Update user storage
      if (totalSize > 0) {
        await User.updateOne(
          { _id: userId },
          { $inc: { storageUsed: -totalSize } },
        ).session(session);
      }

      // Delete files from disk (outside transaction — best-effort)
      const storagePaths = filesToDelete.map((f) => f.storagePath);
      if (storagePaths.length > 0) {
        // Fire and forget — disk cleanup is non-critical
        deleteFiles(storagePaths).catch((err) =>
          console.error("Disk cleanup error:", err.message),
        );
      }
    });

    return res.json({ message: "Directory deleted." });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: err.message });
    }
    next(err);
  } finally {
    await session.endSession();
  }
};
