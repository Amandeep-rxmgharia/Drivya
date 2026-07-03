/**
 * migrateActivityDate.js
 *
 * One-time migration that runs automatically on server startup.
 * 1. Backfills `activityDate` on any documents missing it (sets it to midnight UTC of `createdAt`).
 * 2. Drops the old unique index (userId + resourceType + resourceId + action) if it exists.
 * 3. The new unique index (userId + resourceType + resourceId + action + activityDate) is
 *    created automatically by Mongoose via the schema definition.
 *
 * Safe to re-run — all operations are idempotent.
 */
import Activity from "../models/activityModel.js";

const OLD_INDEX_NAME = "userId_1_resourceType_1_resourceId_1_action_1";

export async function migrateActivityDate() {
  try {
    // ── Step 1: Backfill activityDate on existing documents ──
    const backfillResult = await Activity.updateMany(
      { activityDate: { $exists: false } },
      [
        {
          $set: {
            activityDate: {
              $dateTrunc: { date: "$createdAt", unit: "day" },
            },
          },
        },
      ],
    );

    if (backfillResult.modifiedCount > 0) {
      console.log(
        `[Migration] Backfilled activityDate on ${backfillResult.modifiedCount} activity document(s).`,
      );
    }

    // ── Step 2: Drop the old unique index if it exists ──
    const indexes = await Activity.collection.indexes();
    const oldIndexExists = indexes.some((idx) => idx.name === OLD_INDEX_NAME);

    if (oldIndexExists) {
      await Activity.collection.dropIndex(OLD_INDEX_NAME);
      console.log(`[Migration] Dropped old index: ${OLD_INDEX_NAME}`);
    }

    // ── Step 3: Ensure new indexes are synced (Mongoose handles this) ──
    await Activity.syncIndexes();
    console.log("[Migration] Activity indexes synced successfully.");
  } catch (err) {
    // Don't crash the server if migration fails — log and continue
    console.error("[Migration] Activity date migration error:", err.message);
  }
}
