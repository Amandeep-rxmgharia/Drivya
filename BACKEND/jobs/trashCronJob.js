import cron from "node-cron";
import mongoose from "mongoose";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import { deleteFiles as deleteFilesFromDisk } from "../services/storageService.js";
import { deleteSharesForResource } from "../services/shareService.js";
import { deleteActivitiesForResources } from "../services/activityService.js";
import { RESOURCE_TYPES } from "../constants/shareConstants.js";

// ─── Configuration ───────────────────────────────────────────────
const CRON_SCHEDULE = process.env.TRASH_CRON_SCHEDULE || "0 2 * * *"; // Default: daily at 2:00 AM
const BATCH_SIZE = 50; // Process users in batches to avoid memory spikes

/**
 * Process a single user's expired trash.
 * Deletes files where trashedAt + trashAutoEmptyDays < now.
 *
 * @param {Object} user - { _id, storagePreferences: { trashAutoEmptyDays } }
 * @returns {Promise<number>} count of files deleted
 */
async function processUserTrash(user) {
  const days = user.storagePreferences?.trashAutoEmptyDays;
  if (!days || days <= 0) return 0;

  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const userId = user._id;

  const session = await mongoose.startSession();
  let deletedCount = 0;

  try {
    await session.withTransaction(async () => {
      // Find expired trashed files
      const expiredFiles = await File.find({
        userId,
        isTrashed: true,
        trashedAt: { $lte: cutoffDate },
      })
        .select("_id storagePath size")
        .session(session)
        .lean();

      if (expiredFiles.length === 0) return;

      deletedCount = expiredFiles.length;
      const totalSize = expiredFiles.reduce((sum, f) => sum + f.size, 0);
      const fileIds = expiredFiles.map((f) => f._id);

      // Delete file records from DB
      await File.deleteMany({
        _id: { $in: fileIds },
      }).session(session);

      // Decrement user's storageUsed
      await User.updateOne(
        { _id: userId },
        { $inc: { storageUsed: -totalSize } },
      ).session(session);

      // Clean up related activities and shares (outside transaction is fine)
      await deleteActivitiesForResources(fileIds, userId);
      await Promise.all(
        fileIds.map((fileId) =>
          deleteSharesForResource(userId, RESOURCE_TYPES.FILE, fileId.toString()),
        ),
      );

      // Disk cleanup — fire and forget
      const storagePaths = expiredFiles.map((f) => f.storagePath);
      deleteFilesFromDisk(storagePaths).catch((err) =>
        console.error(`[TrashCron] Disk cleanup error for user ${userId}:`, err.message),
      );
    });
  } catch (err) {
    console.error(`[TrashCron] Error processing user ${userId}:`, err.message);
  } finally {
    await session.endSession();
  }

  return deletedCount;
}

/**
 * Main cron handler: iterate all users with auto-empty enabled
 * and delete their expired trash in batches.
 */
async function runTrashCleanup() {
  const startTime = Date.now();
  console.log(`[TrashCron] Starting auto-empty trash cleanup at ${new Date().toISOString()}`);

  let totalUsersProcessed = 0;
  let totalFilesDeleted = 0;
  let lastId = null;

  try {
    // Cursor-based pagination through users with auto-empty enabled
    while (true) {
      const query = {
        "storagePreferences.trashAutoEmptyDays": { $ne: null, $gt: 0 },
      };

      // Cursor-based pagination (more efficient than skip/limit)
      if (lastId) {
        query._id = { $gt: lastId };
      }

      const users = await User.find(query)
        .select("_id storagePreferences.trashAutoEmptyDays")
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .lean();

      if (users.length === 0) break;

      // Process each user in the batch
      for (const user of users) {
        const count = await processUserTrash(user);
        if (count > 0) {
          console.log(`[TrashCron] Deleted ${count} expired file(s) for user ${user._id}`);
          totalFilesDeleted += count;
        }
        totalUsersProcessed++;
      }

      lastId = users[users.length - 1]._id;

      // If we got fewer than BATCH_SIZE, we've processed all users
      if (users.length < BATCH_SIZE) break;
    }
  } catch (err) {
    console.error("[TrashCron] Fatal error during cleanup:", err.message);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(
    `[TrashCron] Completed in ${elapsed}s — ${totalUsersProcessed} user(s) checked, ${totalFilesDeleted} file(s) deleted.`,
  );
}

/**
 * Start the trash auto-empty cron job.
 * Call this once after the DB connection is established.
 */
export function startTrashCronJob() {
  if (!cron.validate(CRON_SCHEDULE)) {
    console.error(`[TrashCron] Invalid cron expression: "${CRON_SCHEDULE}". Job not started.`);
    return;
  }

  cron.schedule(CRON_SCHEDULE, runTrashCleanup, {
    scheduled: true,
    timezone: "UTC",
  });

  console.log(`[TrashCron] Scheduled auto-empty trash job: "${CRON_SCHEDULE}" (UTC)`);
}

// Export for testing / manual trigger
export { runTrashCleanup };
