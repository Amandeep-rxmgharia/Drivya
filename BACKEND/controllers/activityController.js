import { listActivities, getActivityStats } from "../services/activityService.js";
import { ACTIVITY_FILTERS } from "../constants/activityConstants.js";

// ─── List Recent Activities ──────────────────────────────────────

export const listRecentActivities = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { action, limit, cursor, page } = req.query;

    // Validate action filter if provided
    if (action && !ACTIVITY_FILTERS.has(action)) {
      return res.status(400).json({
        message: `Invalid action filter. Allowed: ${[...ACTIVITY_FILTERS].join(", ")}`,
      });
    }

    const result = await listActivities({
      userId,
      action: action || null,
      limit: parseInt(limit, 10) || 20,
      cursor: cursor || null,
      page: parseInt(page, 10) || 1,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Activity Stats ──────────────────────────────────────────────

export const getRecentStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stats = await getActivityStats(userId);
    return res.json({ stats });
  } catch (err) {
    next(err);
  }
};
