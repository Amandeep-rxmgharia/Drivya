import api from "./auth.js";

// ─── Storage API Functions ───────────────────────────────────

/**
 * Get storage overview: usage, limits, category breakdown, trash stats.
 */
export const getStorageOverview = async () => {
  const response = await api.get("/api/storage/overview");
  return response.data;
};

/**
 * Get user's storage preferences (trash auto-empty, alert thresholds).
 */
export const getStoragePreferences = async () => {
  const response = await api.get("/api/storage/preferences");
  return response.data;
};

/**
 * Update storage preferences (partial update).
 * @param {Object} data - e.g. { trashAutoEmptyDays: 30, alertAt80: true }
 */
export const updateStoragePreferences = async (data) => {
  const response = await api.patch("/api/storage/preferences", data);
  return response.data;
};
