import mongoose from "mongoose";
import Activity from "../models/activityModel.js";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_CACHE_KEYS,
  ACTIVITY_CACHE_TTL,
} from "../constants/activityConstants.js";
import { cacheAside, cacheDel } from "./cacheService.js";

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Derive a file "kind" string from mimeType + extension.
 * Matches the frontend's `detectFileKind` categories.
 */
export function deriveKind(name, mimeType) {
  if (!name) return null;

  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";

  // Folder-like (no extension, no mimeType) — caller passes kind explicitly
  if (!ext && !mimeType) return "folder";

  // By mime prefix
  if (mimeType) {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType === "application/pdf") return "pdf";
  }

  // By extension
  const extMap = {
    pdf: "pdf",
    doc: "document", docx: "document", odt: "document", rtf: "document",
    xls: "document", xlsx: "document", csv: "document", ods: "document",
    ppt: "document", pptx: "document", key: "document", odp: "document",
    txt: "document", md: "document",
    zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
    js: "code", ts: "code", jsx: "code", tsx: "code", py: "code",
    java: "code", c: "code", cpp: "code", go: "code", rs: "code",
    html: "code", css: "code", json: "code", xml: "code", yaml: "code", yml: "code",
    fig: "image", sketch: "image", psd: "image", ai: "image",
    mp3: "audio", wav: "audio", ogg: "audio", flac: "audio", aac: "audio",
    mp4: "video", mov: "video", avi: "video", mkv: "video", webm: "video",
  };

  return extMap[ext] || "document";
}

// ─── Record Activity ─────────────────────────────────────────────

/**
 * Record a user activity. Uses upsert so that each
 * (userId, resourceType, resourceId, action) combination produces
 * exactly ONE document. Repeating the same action on the same
 * resource simply bumps its timestamp to the current time.
 *
 * Call WITHOUT await from controllers (fire-and-forget):
 *   recordActivity({ ... }).catch(err => console.error("Activity:", err.message));
 *
 * @param {Object} opts
 * @param {string} opts.userId
 * @param {string} opts.action       - one of ACTIVITY_ACTIONS
 * @param {string} opts.resourceType - "file" | "directory"
 * @param {string} opts.resourceId
 * @param {Object} opts.resourceSnapshot - { name, mimeType?, size?, kind? }
 * @param {string} [opts.parentDirId]
 * @param {Object} [opts.metadata]   - extra data (e.g. { oldName, newName })
 */
export async function recordActivity({
  userId,
  action,
  resourceType,
  resourceId,
  resourceSnapshot,
  parentDirId = null,
  metadata = null,
}) {
  // Compute kind if not provided
  if (!resourceSnapshot.kind) {
    resourceSnapshot.kind = deriveKind(
      resourceSnapshot.name,
      resourceSnapshot.mimeType,
    );
  }

  // Compute today's date at midnight UTC for per-day deduplication
  const now = new Date();
  const activityDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  // Upsert: one document per (userId, resourceType, resourceId, action, activityDate).
  // Same file opened/downloaded on the same day → updates existing doc.
  // Same file opened/downloaded on a different day → creates a new doc.
  const doc = await Activity.findOneAndUpdate(
    { userId, action, resourceType, resourceId, activityDate },
    {
      $set: {
        resourceSnapshot,
        parentDirId,
        metadata,
      },
      $setOnInsert: { userId, action, resourceType, resourceId, activityDate },
    },
    { upsert: true, new: true },
  );

  // Invalidate stats cache
  await cacheDel(`${ACTIVITY_CACHE_KEYS.STATS}${userId}`);

  return doc;
}

// ─── List Activities ─────────────────────────────────────────────

/**
 * Retrieve paginated activities for a user, **merged by resource**.
 *
 * Each resource appears only once. The response includes:
 *   - `actions`: all unique action strings for that resource (e.g. ["uploaded","opened"])
 *   - `lastOpened`: the most recent activity timestamp (updates on reopen)
 *
 * Cursor-based pagination uses the ISO string of `latestCreatedAt`.
 *
 * @param {Object} opts
 * @param {string} opts.userId
 * @param {string} [opts.action]  - filter: only show resources with this action
 * @param {number} [opts.limit=20]
 * @param {string} [opts.cursor]  - ISO date string from previous page
 * @param {number} [opts.page=1]  - offset-based fallback
 * @returns {{ items: Object[], nextCursor: string|null, pagination: Object }}
 */
export async function listActivities({
  userId,
  action,
  limit = 20,
  cursor,
  page = 1,
}) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const clampedLimit = Math.min(Math.max(1, limit), 100);

  // ── Build aggregation pipeline ──
  const matchStage = {
    userId: userOid,
    resourceType: "file"
  };
  if (action) {
    matchStage.action = action;
  }

  const pipeline = [
    // Stage 1: match user's activities (and action if provided for O(1) index scan, excluding root dir opens)
    { $match: matchStage },

    // Stage 2: sort newest first by updatedAt (bumped on every upsert)
    { $sort: { updatedAt: -1 } },

    // Stage 3: cap scan to most recent 1000 activities for perf
    { $limit: 1000 },

    // Stage 4: group by resource — merge all actions, keep latest data
    {
      $group: {
        _id: { resourceType: "$resourceType", resourceId: "$resourceId" },
        latestUpdatedAt: { $first: "$updatedAt" },
        latestActivityId: { $first: "$_id" },
        action: { $first: "$action" },           // most recent action
        actions: { $addToSet: "$action" },         // ALL unique actions
        resourceType: { $first: "$resourceType" },
        resourceId: { $first: "$resourceId" },
        resourceSnapshot: { $first: "$resourceSnapshot" },
        parentDirId: { $first: "$parentDirId" },
        metadata: { $first: "$metadata" },
        history: { $push: { action: "$action", updatedAt: "$updatedAt" } },
      },
    },

    // Stage 5: sort groups by latest activity
    { $sort: { latestUpdatedAt: -1 } },
  ];

  // Stage 6: cursor-based pagination (ISO date string)
  if (cursor) {
    pipeline.push({
      $match: { latestUpdatedAt: { $lt: new Date(cursor) } },
    });
  } else if (page > 1) {
    pipeline.push({ $skip: (page - 1) * clampedLimit });
  }

  // Stage 7: fetch one extra to detect next page
  pipeline.push({ $limit: clampedLimit + 1 });

  const results = await Activity.aggregate(pipeline);

  const hasNextPage = results.length > clampedLimit;
  const items = hasNextPage ? results.slice(0, clampedLimit) : results;
  const nextCursor = hasNextPage
    ? items[items.length - 1].latestUpdatedAt.toISOString()
    : null;

  // Transform to frontend shape
  const transformed = items.map((item) => {
    const actionMap = {};
    if (item.history) {
      for (const h of item.history) {
        const type = mapActionToType(h.action);
        if (!actionMap[type] || new Date(h.updatedAt) > new Date(actionMap[type])) {
          actionMap[type] = h.updatedAt;
        }
      }
    }

    const actionHistory = Object.entries(actionMap)
      .map(([type, timestamp]) => ({
        type,
        timestamp,
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const actionsMapped = Array.from(new Set(item.actions.map(mapActionToType)));

    return {
      id: item.latestActivityId.toString(),
      name: item.resourceSnapshot.name,
      size: item.resourceSnapshot.size,
      lastOpened: item.latestUpdatedAt,
      type: mapActionToType(item.action),
      actions: actionsMapped,
      actionHistory,
      kind: item.resourceSnapshot.kind,
      mimeType: item.resourceSnapshot.mimeType,
      // Backend metadata
      activityId: item.latestActivityId.toString(),
      action: item.action,
      resourceType: item.resourceType,
      resourceId: item.resourceId.toString(),
      parentDirId: item.parentDirId?.toString() || null,
      metadata: item.metadata,
    };
  });

  return {
    items: transformed,
    nextCursor,
    pagination: {
      limit: clampedLimit,
      hasNextPage,
      ...(cursor ? {} : { page }),
    },
  };
}

/**
 * Map internal action types to the frontend's "opened" / "uploaded" display type.
 */
function mapActionToType(action) {
  switch (action) {
    case ACTIVITY_ACTIONS.OPENED:
    case ACTIVITY_ACTIONS.EDITED:
      return "opened";
    case ACTIVITY_ACTIONS.DOWNLOADED:
      return "downloaded";
    case ACTIVITY_ACTIONS.UPLOADED:
      return "uploaded";
    case ACTIVITY_ACTIONS.RENAMED:
      return "renamed";
    case ACTIVITY_ACTIONS.TRASHED:
      return "trashed";
    case ACTIVITY_ACTIONS.RESTORED:
      return "restored";
    default:
      return "opened";
  }
}

/**
 * Permanently delete all activity records for specific resource IDs and invalidate stats cache.
 *
 * @param {string[]|ObjectId[]} resourceIds
 * @param {string} userId
 */
export async function deleteActivitiesForResources(resourceIds, userId) {
  if (!resourceIds || resourceIds.length === 0) return;
  await Activity.deleteMany({ resourceId: { $in: resourceIds } });
  if (userId) {
    await cacheDel(`${ACTIVITY_CACHE_KEYS.STATS}${userId}`);
  }
}

// ─── Activity Stats ──────────────────────────────────────────────

/**
 * Get activity statistics for a user. Cached for ACTIVITY_CACHE_TTL.STATS seconds.
 *
 * Returns:
 *   { openedToday, uploadedToday, thisWeek, avgPerDay }
 */
export async function getActivityStats(userId) {
  const cacheKey = `${ACTIVITY_CACHE_KEYS.STATS}${userId}`;

  return cacheAside(cacheKey, ACTIVITY_CACHE_TTL.STATS, async () => {
    const now = new Date();

    // Start of today (midnight local → UTC approximation)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Start of 14 days ago for percentage comparisons
    const fortnightStart = new Date(now);
    fortnightStart.setDate(fortnightStart.getDate() - 14);
    fortnightStart.setHours(0, 0, 0, 0);

    const userOid = new mongoose.Types.ObjectId(userId);

    const [stats] = await Activity.aggregate([
      { $match: { userId: userOid, resourceType: "file", activityDate: { $gte: fortnightStart } } },
      {
        $facet: {
          openedToday: [
            {
              $match: {
                action: { $in: [ACTIVITY_ACTIONS.OPENED, ACTIVITY_ACTIONS.EDITED] },
                activityDate: { $gte: todayStart },
              },
            },
            { $count: "count" },
          ],
          uploadedToday: [
            {
              $match: {
                action: ACTIVITY_ACTIONS.UPLOADED,
                activityDate: { $gte: todayStart },
              },
            },
            { $count: "count" },
          ],
          downloadedToday: [
            {
              $match: {
                action: ACTIVITY_ACTIONS.DOWNLOADED,
                activityDate: { $gte: todayStart },
              },
            },
            { $count: "count" },
          ],
          thisWeek: [
            {
              $match: {
                activityDate: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
              }
            },
            { $count: "count" }
          ],
          dailyBreakdown: [
            {
              $group: {
                _id: {
                  date: { $dateToString: { format: "%Y-%m-%d", date: "$activityDate" } },
                  action: "$action"
                },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const openedToday = stats?.openedToday[0]?.count || 0;
    const uploadedToday = stats?.uploadedToday[0]?.count || 0;
    const downloadedToday = stats?.downloadedToday[0]?.count || 0;
    const thisWeek = stats?.thisWeek[0]?.count || 0;

    // Generate date strings for last 7 days and prev 7 days in YYYY-MM-DD
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      last7Days.push(`${yyyy}-${mm}-${dd}`);
    }

    const prev7Days = [];
    for (let i = 13; i >= 7; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      prev7Days.push(`${yyyy}-${mm}-${dd}`);
    }

    const dailyBreakdown = stats?.dailyBreakdown || [];

    const getCountForDateAndAction = (dateStr, action) => {
      if (action === ACTIVITY_ACTIONS.OPENED) {
        // sum both opened and edited
        const openedMatch = dailyBreakdown.find(
          (b) => b._id.date === dateStr && b._id.action === ACTIVITY_ACTIONS.OPENED
        );
        const editedMatch = dailyBreakdown.find(
          (b) => b._id.date === dateStr && b._id.action === ACTIVITY_ACTIONS.EDITED
        );
        return (openedMatch?.count || 0) + (editedMatch?.count || 0);
      }
      const match = dailyBreakdown.find(
        (b) => b._id.date === dateStr && b._id.action === action
      );
      return match?.count || 0;
    };

    const getValuesForRange = (range, action) => {
      return range.map((dateStr) => getCountForDateAndAction(dateStr, action));
    };

    const uploadsValues = getValuesForRange(last7Days, ACTIVITY_ACTIONS.UPLOADED);
    const openedValues = getValuesForRange(last7Days, ACTIVITY_ACTIONS.OPENED);
    const downloadsValues = getValuesForRange(last7Days, ACTIVITY_ACTIONS.DOWNLOADED);

    const sum = (arr) => arr.reduce((a, b) => a + b, 0);
    const currentUploads = sum(uploadsValues);
    const currentOpened = sum(openedValues);
    const currentDownloads = sum(downloadsValues);

    const prevUploadsValues = getValuesForRange(prev7Days, ACTIVITY_ACTIONS.UPLOADED);
    const prevOpenedValues = getValuesForRange(prev7Days, ACTIVITY_ACTIONS.OPENED);
    const prevDownloadsValues = getValuesForRange(prev7Days, ACTIVITY_ACTIONS.DOWNLOADED);

    const prevUploads = sum(prevUploadsValues);
    const prevOpened = sum(prevOpenedValues);
    const prevDownloads = sum(prevDownloadsValues);

    const getChangePercent = (current, prev) => {
      if (prev === 0) {
        return current > 0 ? "↑ 100%" : "0%";
      }
      const pct = ((current - prev) / prev) * 100;
      const sign = pct >= 0 ? "↑" : "↓";
      return `${sign} ${Math.round(Math.abs(pct))}%`;
    };

    // Calculate avg per day over the last 7 days (counting only days with activity in last 7 days)
    const activeDaysSet = new Set();
    dailyBreakdown.forEach((b) => {
      if (last7Days.includes(b._id.date)) {
        activeDaysSet.add(b._id.date);
      }
    });
    const activeDays = activeDaysSet.size || 1;
    const avgPerDay = +(thisWeek / Math.max(activeDays, 1)).toFixed(1);

    return {
      openedToday,
      uploadedToday,
      downloadedToday,
      thisWeek,
      avgPerDay,
      weeklyData: {
        uploads: {
          label: "Uploads",
          title: "Weekly Uploads",
          change: getChangePercent(currentUploads, prevUploads),
          rawValues: uploadsValues,
          suffix: "uploads",
        },
        opened: {
          label: "Opened",
          title: "Weekly Opens",
          change: getChangePercent(currentOpened, prevOpened),
          rawValues: openedValues,
          suffix: "files",
        },
        downloads: {
          label: "Downloads",
          title: "Weekly Downloads",
          change: getChangePercent(currentDownloads, prevDownloads),
          rawValues: downloadsValues,
          suffix: "files",
        },
      },
    };
  });
}
