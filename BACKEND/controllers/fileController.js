import mongoose from "mongoose";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import User from "../models/userModel.js";
import Share from "../models/shareModel.js";
import mime from "mime-types";
import {
  generateUploadUrl,
  generateDownloadUrl,
  headObject,
  deleteFile as deleteFromR2,
  deleteFiles as deleteFilesFromR2,
} from "../services/storageService.js";
import { deleteSharesForResource } from "../services/shareService.js";
import { RESOURCE_TYPES } from "../constants/shareConstants.js";
import { generateStorageName } from "../middlewares/uploadMiddleware.js";
import {
  recordActivity,
  deleteActivitiesForResources,
} from "../services/activityService.js";
import { ACTIVITY_ACTIONS } from "../constants/activityConstants.js";
import {
  generateDownloadToken,
  verifyDownloadToken,
} from "../config/tokenUtils.js";
import { createNotification } from "../services/notificationService.js";
import { PLANS, PLAN_KEYS } from "../constants/subscriptionConstants.js";
import {
  cacheDelByPrefix,
  invalidateShareTokenCache,
} from "../services/cacheService.js";

// ─── Bandwidth Check & Increment Helper ─────────────────────────
/**
 * Check bandwidth limit and increment bandwidthUsed.
 * @param {string} userId
 * @param {number} fileSize - Size of the file in bytes
 * @param {object} res - Express response object
 * @returns {Promise<boolean>} false if bandwidth exceeded (response already sent)
 */
async function checkAndIncrementBandwidth(userId, fileSize, res) {
  const user = await User.findById(userId).select("bandwidthUsed bandwidthLimit").lean();
  if (user.bandwidthUsed + fileSize > user.bandwidthLimit) {
    res.status(429).json({
      message: "Bandwidth limit exceeded. Please wait for your next billing cycle or upgrade your plan.",
      bandwidthUsed: user.bandwidthUsed,
      bandwidthLimit: user.bandwidthLimit,
    });
    return false;
  }

  await User.updateOne({ _id: userId }, { $inc: { bandwidthUsed: fileSize } });
  return true;
}

// ─── Presign Upload ──────────────────────────────────────────────
export const presignUpload = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let { files, directoryId } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "files array is required." });
    }

    const MAX_FILES = parseInt(process.env.MAX_FILES_PER_REQUEST) || 10;
    if (files.length > MAX_FILES) {
      return res.status(400).json({ message: `Maximum ${MAX_FILES} files per request.` });
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
    const totalUploadSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

    // Check quota and plan upload limits
    const user = await User.findById(userId)
      .select("storageUsed storageLimit subscription")
      .lean();

    const planKey = user?.subscription?.plan || PLAN_KEYS.FREE;
    const plan = PLANS[planKey] || PLANS[PLAN_KEYS.FREE];
    const maxUpload = plan.maxUpload;

    if (maxUpload !== null && maxUpload !== undefined) {
      for (const f of files) {
        if (f.size > maxUpload) {
          const formattedMax = maxUpload >= 1024 * 1024 * 1024
            ? `${(maxUpload / (1024 * 1024 * 1024)).toFixed(1)} GB`
            : `${(maxUpload / (1024 * 1024)).toFixed(0)} MB`;
          const formattedSize = f.size >= 1024 * 1024 * 1024
            ? `${(f.size / (1024 * 1024 * 1024)).toFixed(1)} GB`
            : `${(f.size / (1024 * 1024)).toFixed(1)} MB`;

          return res.status(413).json({
            message: `File "${f.name}" (${formattedSize}) exceeds the maximum upload limit of ${formattedMax} for your ${plan.name} plan. Upgrade your plan for larger uploads.`,
            maxUpload,
            fileSize: f.size,
            fileName: f.name,
            planName: plan.name,
          });
        }
      }
    }

    if (user.storageUsed + totalUploadSize > user.storageLimit) {
      return res.status(413).json({
        message: "Storage quota exceeded. Please free up space or upgrade.",
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        uploadSize: totalUploadSize,
      });
    }

    // Generate presigned URLs for each file
    const uploads = [];
    for (const f of files) {
      const storageName = generateStorageName(f.name);
      const key = `${userId}/${storageName}`;
      const { url, expiresAt } = await generateUploadUrl(key, f.mimeType || "application/octet-stream");

      uploads.push({
        presignedUrl: url,
        storageName,
        key,
        originalName: f.name,
        size: f.size,
        mimeType: f.mimeType || "application/octet-stream",
        expiresAt,
      });
    }

    return res.json({
      message: `${uploads.length} presigned upload URL(s) generated.`,
      uploads,
      directoryId,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Unique File Name Helper ────────────────────────────────────
/**
 * Resolves a non-colliding file name in the specified directory for a user.
 * Avoids E11000 duplicate key write errors that cause MongoDB to immediately
 * abort multi-document transactions.
 *
 * @param {string} userId
 * @param {string} directoryId
 * @param {string} originalName
 * @param {Set<string>} takenNamesInBatch - Lowercased file names already allocated in this batch
 * @param {mongoose.ClientSession} session - Mongoose session for transaction read isolation
 * @returns {Promise<string>} Non-colliding file name
 */
async function getUniqueFileName(
  userId,
  directoryId,
  originalName,
  takenNamesInBatch,
  session,
) {
  const ext = originalName.includes(".")
    ? `.${originalName.split(".").pop()}`
    : "";
  const baseName = originalName.includes(".")
    ? originalName.slice(0, originalName.lastIndexOf("."))
    : originalName;

  const match = baseName.match(/\((\d+)\)$/);
  const cleanBase = baseName.replace(/\s*\(\d+\)$/, "");
  let attempt = match ? parseInt(match[1], 10) : 0;
  let candidateName = originalName;

  while (true) {
    const lowerCandidate = candidateName.toLowerCase();
    if (!takenNamesInBatch.has(lowerCandidate)) {
      const existing = await File.findOne({
        userId,
        directoryId,
        originalName: candidateName,
      })
        .select("_id")
        .session(session)
        .lean();

      if (!existing) {
        takenNamesInBatch.add(lowerCandidate);
        return candidateName;
      }
    }

    attempt++;
    candidateName = `${cleanBase} (${attempt})${ext}`;
  }
}

// ─── Confirm Upload ──────────────────────────────────────────────
export const confirmUpload = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user.id;
    let { files, directoryId } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "files array is required." });
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
    
    // Validate each file exists in R2 before creating DB records
    const verifiedFiles = [];
    for (const f of files) {
      const key = `${userId}/${f.storageName}`;
      const head = await headObject(key);

      if (!head.exists) {
        return res.status(400).json({
          message: `File "${f.originalName}" was not uploaded to storage. Please retry the upload.`,
          storageName: f.storageName,
        });
      }

      verifiedFiles.push({
        ...f,
        key,
        actualSize: head.size,
        actualContentType: head.contentType,
      });
    }

    const totalUploadSize = verifiedFiles.reduce((sum, f) => sum + (f.actualSize || f.size), 0);

    // Re-check quota with actual sizes
    const user = await User.findById(userId)
      .select("storageUsed storageLimit storagePreferences")
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

    await session.withTransaction(async () => {
      savedFiles.length = 0;
      const takenNamesInBatch = new Set();

      for (const vf of verifiedFiles) {
        const storagePath = vf.key;
        const fileSize = vf.actualSize || vf.size;

        const finalName = await getUniqueFileName(
          userId,
          directoryId,
          vf.originalName,
          takenNamesInBatch,
          session,
        );

        const [fileDoc] = await File.create(
          [
            {
              originalName: finalName,
              storageName: vf.storageName,
              mimeType: vf.actualContentType || vf.mimeType,
              size: fileSize,
              userId,
              directoryId,
              storagePath,
            },
          ],
          { session },
        );
        savedFiles.push(fileDoc);
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

    if (savedFiles.length > 0) {
      const names = savedFiles.map((f) => f.originalName);
      const title =
        names.length === 1
          ? `Uploaded "${names[0]}"`
          : `${names.length} files uploaded`;
      createNotification(userId, {
        type: "upload",
        title,
        description: `Successfully uploaded to "${dir.name}".`,
        actionPath: "/dashboard/drive",
      }).catch((err) => console.error("Notification[upload]:", err));
    }

    const newStorageUsed = user.storageUsed + totalUploadSize;
    const usagePct = (newStorageUsed / user.storageLimit) * 100;
    if (
      usagePct >= 80 &&
      usagePct < 95 &&
      user.storagePreferences?.alertAt80 !== false
    ) {
      createNotification(userId, {
        type: "storage",
        title: "Storage running low",
        description: `You've used ${Math.round(usagePct)}% of your storage. Consider freeing up space.`,
        actionLabel: "Manage storage",
        actionPath: "/dashboard/settings/storage",
      }).catch((err) => console.error("Notification[storage-warn]:", err));
    }
    if (usagePct >= 95 && user.storagePreferences?.alertAt95 !== false) {
      createNotification(userId, {
        type: "storage",
        title: "Storage critically low",
        description: `You've used ${Math.round(usagePct)}% of your storage. Free up space or upgrade immediately.`,
        actionLabel: "Manage storage",
        actionPath: "/dashboard/settings/storage",
      }).catch((err) => console.error("Notification[storage-critical]:", err));
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

// ─── Download File (returns presigned URL) ───────────────────────
export const downloadFile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const file = await File.findOne({ _id: id, userId }).lean();
    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }

    // Generate presigned download URL
    const { url, expiresAt } = await generateDownloadUrl(file.storagePath, {
      responseContentDisposition: `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      responseContentType: file.mimeType,
    });

    // Check bandwidth limit and increment
    const allowed = await checkAndIncrementBandwidth(userId, file.size, res);
    if (!allowed) return; // bandwidth exceeded, response already sent

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

    return res.json({
      downloadUrl: url,
      fileName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
    });
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
      return res
        .status(401)
        .json({ message: "Invalid or expired download link." });
    }

    const file = await File.findOne({
      _id: decoded.fileId,
      userId: decoded.userId,
    }).lean();

    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }

    // Generate presigned download URL
    const { url, expiresAt } = await generateDownloadUrl(file.storagePath, {
      responseContentDisposition: `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      responseContentType: file.mimeType,
    });

    // Check bandwidth limit and increment
    const allowed = await checkAndIncrementBandwidth(decoded.userId, file.size, res);
    if (!allowed) return;

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

    return res.json({
      downloadUrl: url,
      fileName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Preview File (returns presigned URL) ────────────────────────
export const previewFile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const file = await File.findOne({ _id: id, userId }).lean();
    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }

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

    // Generate presigned preview URL
    const { url, expiresAt } = await generateDownloadUrl(file.storagePath, {
      responseContentDisposition: `inline; filename="${encodeURIComponent(file.originalName)}"`,
      responseContentType: file.mimeType,
    });

    // Check bandwidth limit and increment
    const allowed = await checkAndIncrementBandwidth(userId, file.size, res);
    if (!allowed) return;

    res.set("Cache-Control", "private, max-age=300");

    return res.json({
      previewUrl: url,
      fileName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
    });
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

    const sharedFile = await Share.findOne({ resourceId: file._id });
    const mimeType = mime.lookup(trimmedName);
    const oldName = file.originalName;
    file.mimeType = mimeType;
    file.originalName = trimmedName;
    if (sharedFile) {
      sharedFile.resourceSnapshot.name = trimmedName;
      sharedFile.resourceSnapshot.mimeType = mimeType;
      await sharedFile.save();
      await invalidateShareTokenCache(sharedFile.token);
      await cacheDelByPrefix(`share:list:${sharedFile.ownerId.toString()}`);
    }
    await file.save();

    await // Record rename activity (fire-and-forget)
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

    createNotification(userId, {
      type: "system",
      title: `Renamed "${oldName}"`,
      description: `File renamed to "${trimmedName}".`,
    }).catch((err) => console.error("Notification[rename]:", err));

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

    createNotification(userId, {
      type: "system",
      title: `Moved "${file.originalName}" to trash`,
      description: "The file can be restored from trash.",
      actionLabel: "View trash",
      actionPath: "/dashboard/trash",
    }).catch((err) => console.error("Notification[trash]:", err));

    return res.json({ message: "File moved to trash.", file });
  } catch (err) {
    next(err);
  }
};

// ─── Bulk Move to Trash ──────────────────────────────────────────
export const bulkTrash = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileIds = [], directoryIds = [] } = req.body;

    if (
      (!Array.isArray(fileIds) || fileIds.length === 0) &&
      (!Array.isArray(directoryIds) || directoryIds.length === 0)
    ) {
      return res.status(400).json({ message: "No files or directories provided." });
    }

    const validFileIds = Array.isArray(fileIds)
      ? fileIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];
    const validDirIds = Array.isArray(directoryIds)
      ? directoryIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];

    let trashedFilesCount = 0;
    let deletedDirsCount = 0;

    // 1. Process files
    if (validFileIds.length > 0) {
      const filesToTrash = await File.find({
        _id: { $in: validFileIds },
        userId,
        isTrashed: false,
      })
        .select("_id originalName mimeType size directoryId")
        .lean();

      if (filesToTrash.length > 0) {
        const ids = filesToTrash.map((f) => f._id);
        await File.updateMany(
          { _id: { $in: ids } },
          { isTrashed: true, trashedAt: new Date() },
        );

        trashedFilesCount = filesToTrash.length;

        // Record activity for each trashed file
        for (const f of filesToTrash) {
          recordActivity({
            userId,
            action: ACTIVITY_ACTIONS.TRASHED,
            resourceType: RESOURCE_TYPES.FILE,
            resourceId: f._id,
            resourceSnapshot: {
              name: f.originalName,
              mimeType: f.mimeType,
              size: f.size,
            },
            parentDirId: f.directoryId,
          }).catch((err) =>
            console.error("Activity[bulk-trash-file]:", err.message),
          );
        }
      }
    }

    // 2. Process directories (recursive delete & trash files inside)
    if (validDirIds.length > 0) {
      // Find directories that belong to user and are not root
      const dirs = await Directory.find({
        _id: { $in: validDirIds },
        userId,
        parentDirId: { $ne: null },
      })
        .select("_id name")
        .lean();

      if (dirs.length > 0) {
        const rootTargetDirIds = dirs.map((d) => d._id);

        // Find all descendants
        const descendantDirs = await Directory.find({
          userId,
          path: { $in: rootTargetDirIds },
        })
          .select("_id")
          .lean();

        const allDirIds = [
          ...rootTargetDirIds,
          ...descendantDirs.map((d) => d._id),
        ];

        // Find all non-trashed files in these directories
        const dirFilesToTrash = await File.find({
          userId,
          directoryId: { $in: allDirIds },
          isTrashed: false,
        })
          .select("_id originalName mimeType size directoryId")
          .lean();

        if (dirFilesToTrash.length > 0) {
          const dirFileIds = dirFilesToTrash.map((f) => f._id);
          await File.updateMany(
            { _id: { $in: dirFileIds } },
            { isTrashed: true, trashedAt: new Date() },
          );

          trashedFilesCount += dirFilesToTrash.length;

          for (const f of dirFilesToTrash) {
            recordActivity({
              userId,
              action: ACTIVITY_ACTIONS.TRASHED,
              resourceType: RESOURCE_TYPES.FILE,
              resourceId: f._id,
              resourceSnapshot: {
                name: f.originalName,
                mimeType: f.mimeType,
                size: f.size,
              },
              parentDirId: f.directoryId,
            }).catch((err) =>
              console.error("Activity[bulk-trash-dir-file]:", err.message),
            );
          }
        }

        await Directory.deleteMany({ _id: { $in: allDirIds } });
        await deleteActivitiesForResources(allDirIds, userId);
        deletedDirsCount = dirs.length;
      }
    }

    const totalCount = trashedFilesCount + deletedDirsCount;
    if (totalCount > 0) {
      createNotification(userId, {
        type: "system",
        title: `Moved ${totalCount} item${totalCount !== 1 ? "s" : ""} to trash`,
        description: "Files can be restored from trash.",
        actionLabel: "View trash",
        actionPath: "/dashboard/trash",
      }).catch((err) => console.error("Notification[bulk-trash]:", err));
    }

    return res.json({
      message: `Successfully moved ${totalCount} item${totalCount !== 1 ? "s" : ""} to trash.`,
      trashedFilesCount,
      deletedDirsCount,
      totalCount,
    });
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

    // Check if the original parent directory still exists, otherwise move to user root directory
    const dirExists = await Directory.findOne({
      _id: file.directoryId,
      userId,
    }).lean();
    let targetDirId = file.directoryId;
    if (!dirExists) {
      const user = await User.findById(userId).select("rootDirId").lean();
      if (user?.rootDirId) {
        targetDirId = user.rootDirId.toString();
        file.directoryId = targetDirId;
        await file.save();
      }
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
      parentDirId: targetDirId,
    }).catch((err) => console.error("Activity[restore]:", err.message));

    createNotification(userId, {
      type: "system",
      title: `Restored "${file.originalName}"`,
      description: "The file has been restored from trash.",
    }).catch((err) => console.error("Notification[restore]:", err));

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

    if (files.length === 0) {
      return res.json({ files: [] });
    }

    // Resolve user's root directory to match for breadcrumbs
    const user = await User.findById(userId).select("rootDirId").lean();
    const rootDirIdStr = user?.rootDirId ? user.rootDirId.toString() : null;

    // Collect all unique directoryIds
    const parentDirIds = new Set();
    for (const file of files) {
      if (file.directoryId) {
        parentDirIds.add(file.directoryId.toString());
      }
    }

    // Batch fetch immediate parent directories
    const parents = await Directory.find({
      userId,
      _id: { $in: Array.from(parentDirIds) },
    }).lean();

    // Gather all unique ancestor directory IDs from parents' paths
    const ancestorIds = new Set();
    const dirMap = new Map();

    for (const dir of parents) {
      dirMap.set(dir._id.toString(), dir);
      if (dir.path) {
        for (const ancestorId of dir.path) {
          ancestorIds.add(ancestorId.toString());
        }
      }
    }

    // Remove any parent IDs from the ancestors set to avoid duplicate queries
    for (const parentId of parentDirIds) {
      ancestorIds.delete(parentId);
    }

    // Batch fetch remaining ancestor directories
    if (ancestorIds.size > 0) {
      const ancestors = await Directory.find({
        userId,
        _id: { $in: Array.from(ancestorIds) },
      }).lean();
      for (const dir of ancestors) {
        dirMap.set(dir._id.toString(), dir);
      }
    }

    // Helper to get breadcrumb string
    const getPathString = (dirId) => {
      if (!dirId) return "My Drive";
      const dirIdStr = dirId.toString();
      if (dirIdStr === rootDirIdStr) return "My Drive";

      const dir = dirMap.get(dirIdStr);
      if (!dir) return "My Drive";

      const parts = [];
      if (dir.path) {
        for (const ancestorId of dir.path) {
          const ancestorIdStr = ancestorId.toString();
          if (ancestorIdStr === rootDirIdStr) {
            parts.push("My Drive");
          } else {
            const ancestor = dirMap.get(ancestorIdStr);
            if (ancestor) {
              parts.push(ancestor.name);
            }
          }
        }
      }
      parts.push(dir.name);
      return parts.join(" / ");
    };

    const filesWithPaths = files.map((file) => ({
      ...file,
      originalPath: getPathString(file.directoryId),
    }));

    return res.json({ files: filesWithPaths });
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
          deleteSharesForResource(
            userId,
            RESOURCE_TYPES.FILE,
            fileId.toString(),
          ),
        ),
      );

      // R2 cleanup — fire and forget
      const storagePaths = trashedFiles.map((f) => f.storagePath);
      deleteFilesFromR2(storagePaths).catch((err) =>
        console.error("Trash R2 cleanup error:", err.message),
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

      // R2 cleanup
      deleteFromR2(file.storagePath).catch((err) =>
        console.error("File delete R2 error:", err.message),
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
      { isTrashed: false, trashedAt: null },
    );

    // Record restore activity for each restored file
    if (trashedFiles.length > 0) {
      const user = await User.findById(userId).select("rootDirId").lean();

      for (const file of trashedFiles) {
        let targetDirId = file.directoryId;
        const dirExists = await Directory.findOne({
          _id: file.directoryId,
          userId,
        }).lean();
        if (!dirExists && user?.rootDirId) {
          targetDirId = user.rootDirId.toString();
          await File.updateOne({ _id: file._id }, { directoryId: targetDirId });
        }

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
          parentDirId: targetDirId,
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

