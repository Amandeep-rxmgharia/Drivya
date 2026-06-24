import api from "./auth.js";

/**
 * List all starred files and directories.
 * Returns { starred: Array, stats: Object }
 */
export const listStarred = async () => {
  const response = await api.get("/api/starred");
  return response.data;
};

/**
 * Toggle the starred status of a file or directory.
 * @param {string} resourceType - "file" or "directory"
 * @param {string} id - Resource ID
 */
export const toggleStar = async (resourceType, id) => {
  const response = await api.patch(`/api/starred/${resourceType}/${id}`);
  return response.data;
};

/**
 * Unstar all files and directories.
 */
export const unstarAll = async () => {
  const response = await api.patch("/api/starred/clear");
  return response.data;
};
