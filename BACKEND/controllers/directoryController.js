import mongoose from "mongoose";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import { deleteFiles } from "../services/storageService.js";
import { recordActivity, deleteActivitiesForResources } from "../services/activityService.js";
import { ACTIVITY_ACTIONS } from "../constants/activityConstants.js";
import { RESOURCE_TYPES } from "../constants/shareConstants.js";
import { createNotification } from "../services/notificationService.js";

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

    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ message: "Invalid directory ID." });
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid directory ID." });
    }

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

    createNotification(userId, {
      type: "system",
      title: `Created folder "${name}"`,
      description: parentDir.name ? `Inside "${parentDir.name}".` : "In root directory.",
    }).catch((err) => console.error("Notification[dir-create]:", err));

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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid directory ID." });
    }

    const dir = await Directory.findOne({
      _id: id,
      userId,
      parentDirId: { $ne: null },
    });

    if (!dir) {
      return res.status(404).json({
        message: "Directory not found or cannot be renamed.",
      });
    }

    const oldName = dir.name;
    dir.name = name;
    await dir.save();

    createNotification(userId, {
      type: "system",
      title: `Renamed folder to "${name}"`,
      description: `Folder renamed from "${oldName}".`,
    }).catch((err) => console.error("Notification[dir-rename]:", err));

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
    let dirName;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.endSession();
      return res.status(400).json({ message: "Invalid directory ID." });
    }

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

      dirName = dir.name;

      // Find all descendant directories using Array of Ancestors path match
      const descendantDirs = await Directory.find({
        userId,
        path: dir._id,
      })
        .select("_id")
        .session(session)
        .lean();

      const allDirIds = [dir._id, ...descendantDirs.map((d) => d._id)];

      // Find all files in these directories that are not already trashed
      const filesToTrash = await File.find({
        userId,
        directoryId: { $in: allDirIds },
        isTrashed: false,
      })
        .select("_id originalName mimeType size directoryId")
        .session(session)
        .lean();

      // Trash the files
      if (filesToTrash.length > 0) {
        const fileIdsToTrash = filesToTrash.map((f) => f._id);
        await File.updateMany(
          { _id: { $in: fileIdsToTrash } },
          { isTrashed: true, trashedAt: new Date() }
        ).session(session);

        // Record trash activity for each file (outside transaction as fire-and-forget)
        for (const file of filesToTrash) {
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
          }).catch((err) => console.error("Activity[dir-delete-trash-file]:", err.message));
        }
      }

      await Directory.deleteMany({
        _id: { $in: allDirIds },
      }).session(session);

      // Clean up activities only for the deleted directories
      await deleteActivitiesForResources(allDirIds, userId);
    });

    createNotification(userId, {
      type: "system",
      title: `Deleted folder "${dirName}"`,
      description: "The folder has been removed permanently and its files have been moved to trash.",
      actionLabel: "View trash",
      actionPath: "/dashboard/trash",
    }).catch((err) => console.error("Notification[dir-delete]:", err));

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

// ─── Get All User Directories (Flat List) ────────────────────────
export const getAllDirectories = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const directories = await Directory.find({ userId }).lean();
    return res.json({ directories });
  } catch (err) {
    next(err);
  }
};
