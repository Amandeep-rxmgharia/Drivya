/**
 * One-time migration: deduplicate existing activity documents.
 *
 * For every (userId, resourceType, resourceId, action) group that has
 * more than one document, this script keeps the MOST RECENT one
 * (by createdAt) and deletes the rest.
 *
 * Run BEFORE restarting the server so the new unique index can be
 * created without conflicts.
 *
 * Usage:
 *   node scripts/dedup-activities.js
 */

import "dotenv/config";
import mongoose from "mongoose";

const { MONGO_URI, DB_NAME = "Drivya" } = process.env;

async function main() {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log("Connected to", DB_NAME);

  const db = mongoose.connection.db;
  const col = db.collection("activities");

  // ── Step 1: Find duplicate groups ──────────────────────────
  const duplicates = await col
    .aggregate([
      {
        $group: {
          _id: {
            userId: "$userId",
            resourceType: "$resourceType",
            resourceId: "$resourceId",
            action: "$action",
          },
          count: { $sum: 1 },
          // Keep the newest document's _id
          newestId: { $first: "$_id" },
          // Collect all _ids so we can delete the extras
          allIds: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  if (duplicates.length === 0) {
    console.log("No duplicate activity documents found. Nothing to do.");
  } else {
    console.log(`Found ${duplicates.length} duplicate group(s). Cleaning up…`);

    // Sort each group's docs by createdAt desc so we can keep the newest
    let totalDeleted = 0;
    for (const dup of duplicates) {
      // Find all docs in this group, sorted newest first
      const docs = await col
        .find({
          userId: dup._id.userId,
          resourceType: dup._id.resourceType,
          resourceId: dup._id.resourceId,
          action: dup._id.action,
        })
        .sort({ createdAt: -1 })
        .toArray();

      // Keep the first (newest), delete the rest
      const idsToDelete = docs.slice(1).map((d) => d._id);
      if (idsToDelete.length > 0) {
        const result = await col.deleteMany({ _id: { $in: idsToDelete } });
        totalDeleted += result.deletedCount;
      }
    }

    console.log(`Deleted ${totalDeleted} duplicate document(s).`);
  }

  // ── Step 2: Drop the old non-unique dedup index if it exists ──
  try {
    // The old index was: { userId: 1, resourceType: 1, resourceId: 1, action: 1, createdAt: -1 }
    await col.dropIndex("userId_1_resourceType_1_resourceId_1_action_1_createdAt_-1");
    console.log("Dropped old dedup index.");
  } catch (err) {
    if (err.codeName === "IndexNotFound") {
      console.log("Old dedup index not found (already dropped). Skipping.");
    } else {
      console.warn("Could not drop old index:", err.message);
    }
  }

  console.log("Migration complete. You can now restart the server.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
