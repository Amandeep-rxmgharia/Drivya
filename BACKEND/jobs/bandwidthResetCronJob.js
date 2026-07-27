import cron from "node-cron";
import User from "../models/userModel.js";

// ─── Configuration ───────────────────────────────────────────────
// Runs on the 1st of each month at 3:00 AM UTC.
// Resets bandwidth for free-plan users who don't have billing cycle events.
const CRON_SCHEDULE = process.env.BANDWIDTH_RESET_CRON_SCHEDULE || "0 3 1 * *";
const BATCH_SIZE = 100;

/**
 * Reset bandwidth for all free-plan users.
 * Paid users get their bandwidth reset via the subscription.charged webhook
 * (per-billing-cycle reset). Free users have no billing events, so we reset
 * them on a monthly calendar basis.
 */
async function runBandwidthReset() {
  const startTime = Date.now();
  console.log(`[BandwidthCron] Starting monthly bandwidth reset for free-plan users at ${new Date().toISOString()}`);

  let totalUsersReset = 0;
  let lastId = null;

  try {
    while (true) {
      const query = {
        "subscription.plan": { $in: ["free", null] },
        bandwidthUsed: { $gt: 0 },
      };

      if (lastId) {
        query._id = { $gt: lastId };
      }

      const users = await User.find(query)
        .select("_id")
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .lean();

      if (users.length === 0) break;

      const userIds = users.map((u) => u._id);

      await User.updateMany(
        { _id: { $in: userIds } },
        { $set: { bandwidthUsed: 0 } },
      );

      totalUsersReset += users.length;
      lastId = users[users.length - 1]._id;

      if (users.length < BATCH_SIZE) break;
    }
  } catch (err) {
    console.error("[BandwidthCron] Fatal error during reset:", err.message);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(
    `[BandwidthCron] Completed in ${elapsed}s — ${totalUsersReset} free-plan user(s) reset.`,
  );
}

/**
 * Start the bandwidth reset cron job.
 * Call this once after the DB connection is established.
 */
export function startBandwidthResetCronJob() {
  if (!cron.validate(CRON_SCHEDULE)) {
    console.error(`[BandwidthCron] Invalid cron expression: "${CRON_SCHEDULE}". Job not started.`);
    return;
  }

  cron.schedule(CRON_SCHEDULE, runBandwidthReset, {
    scheduled: true,
    timezone: "UTC",
  });

  console.log(`[BandwidthCron] Scheduled monthly bandwidth reset for free-plan users: "${CRON_SCHEDULE}" (UTC)`);
}

// Export for testing / manual trigger
export { runBandwidthReset };
