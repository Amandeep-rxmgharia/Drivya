import api from "./auth.js";

// ─── Activity API ────────────────────────────────────────────────

/**
 * List recent activities (paginated).
 * @param {{ action?: "opened"|"uploaded", limit?: number, cursor?: string, page?: number }} [params]
 */
export const listActivities = async (params = {}) => {
  const response = await api.get("/api/activities", { params });
  return response.data;
};

/**
 * Get activity stats (opened today, uploaded today, this week, avg/day).
 */
export const getActivityStats = async () => {
  const response = await api.get("/api/activities/stats");
  return response.data;
};
