import api from "./auth.js";

/**
 * Search user's files, folders, and collaborators.
 * @param {string} query
 * @returns {Promise<{ files: Array, directories: Array, collaborators: Array, users: Array }>}
 */
export const searchItems = async (query) => {
  const response = await api.get(`/api/search?q=${encodeURIComponent(query)}`);
  return response.data;
};
