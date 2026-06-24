import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import Share from "../models/shareModel.js";
import { RESOURCE_TYPES } from "../constants/shareConstants.js";

// ─── List Starred Items ─────────────────────────────────────────
// GET /api/starred
// Returns all starred files + directories for the authenticated user,
// merged and sorted by starredAt desc.  Also resolves a `shared`
// boolean per item via a single batch Share lookup.
// Total DB calls: 3 (2 parallel model queries + 1 batch share lookup)
export const listStarred = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Fetch starred files and directories in parallel
    const [starredFiles, starredDirs] = await Promise.all([
      File.find({ userId, isStarred: true, isTrashed: false })
        .sort({ starredAt: -1 })
        .lean(),
      Directory.find({ userId, isStarred: true })
        .sort({ starredAt: -1 })
        .lean(),
    ]);

    // 2. Batch-resolve share status — single query instead of N
    const fileIds = starredFiles.map((f) => f._id);
    const dirIds = starredDirs.map((d) => d._id);
    const allResourceIds = [...fileIds, ...dirIds];

    let sharedSet = new Set();
    if (allResourceIds.length > 0) {
      const activeShares = await Share.find({
        ownerId: userId,
        resourceId: { $in: allResourceIds },
        isActive: true,
      })
        .select("resourceId")
        .lean();

      sharedSet = new Set(activeShares.map((s) => s.resourceId.toString()));
    }

    // 3. Normalize into a unified shape and merge
    const normalizedFiles = starredFiles.map((f) => ({
      id: f._id,
      name: f.originalName,
      size: f.size,
      mimeType: f.mimeType,
      kind: null, // let frontend detect from name + mimeType
      resourceType: RESOURCE_TYPES.FILE,
      starred: true,
      starredAt: f.starredAt,
      shared: sharedSet.has(f._id.toString()),
      updatedAt: f.updatedAt,
      directoryId: f.directoryId,
    }));

    const normalizedDirs = starredDirs.map((d) => ({
      id: d._id,
      name: d.name,
      size: null,
      mimeType: null,
      kind: "folder",
      resourceType: RESOURCE_TYPES.DIRECTORY,
      starred: true,
      starredAt: d.starredAt,
      shared: sharedSet.has(d._id.toString()),
      updatedAt: d.updatedAt,
      parentDirId: d.parentDirId,
    }));

    // Merge and sort by starredAt descending
    const starred = [...normalizedFiles, ...normalizedDirs].sort(
      (a, b) => new Date(b.starredAt) - new Date(a.starredAt),
    );

    // 4. Compute stats
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const stats = {
      total: starred.length,
      shared: starred.filter((s) => s.shared).length,
      recentCount: starred.filter(
        (s) => new Date(s.starredAt).getTime() > weekAgo,
      ).length,
    };

    return res.json({ starred, stats });
  } catch (err) {
    next(err);
  }
};

// ─── Toggle Star ────────────────────────────────────────────────
// PATCH /api/starred/:resourceType/:id
// Atomically toggles isStarred on a file or directory.
// Total DB calls: 1 (single findOneAndUpdate)
export const toggleStar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { resourceType, id } = req.params;

    if (
      resourceType !== RESOURCE_TYPES.FILE &&
      resourceType !== RESOURCE_TYPES.DIRECTORY
    ) {
      return res.status(400).json({
        message: `Invalid resource type "${resourceType}". Must be "file" or "directory".`,
      });
    }

    const Model =
      resourceType === RESOURCE_TYPES.FILE ? File : Directory;

    // First fetch current star status
    const filter = { _id: id, userId };

    // For files, don't allow starring trashed files
    if (resourceType === RESOURCE_TYPES.FILE) {
      filter.isTrashed = false;
    }

    const doc = await Model.findOne(filter).select("isStarred").lean();
    if (!doc) {
      return res.status(404).json({ message: "Resource not found." });
    }

    const newStarred = !doc.isStarred;

    const updated = await Model.findOneAndUpdate(
      filter,
      {
        isStarred: newStarred,
        starredAt: newStarred ? new Date() : null,
      },
      { new: true },
    );

    return res.json({
      message: newStarred ? "Starred." : "Unstarred.",
      isStarred: updated.isStarred,
      starredAt: updated.starredAt,
      resourceType,
      resourceId: id,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Unstar All ─────────────────────────────────────────────────
// PATCH /api/starred/clear
// Bulk-unstar all files and directories for the authenticated user.
// Total DB calls: 2 (parallel updateMany on both models)
export const unstarAll = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [fileResult, dirResult] = await Promise.all([
      File.updateMany(
        { userId, isStarred: true },
        { isStarred: false, starredAt: null },
      ),
      Directory.updateMany(
        { userId, isStarred: true },
        { isStarred: false, starredAt: null },
      ),
    ]);

    const total = fileResult.modifiedCount + dirResult.modifiedCount;

    return res.json({
      message: `${total} item(s) unstarred.`,
      modifiedCount: total,
    });
  } catch (err) {
    next(err);
  }
};
