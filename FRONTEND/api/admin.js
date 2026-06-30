import api from "./auth.js";

/** List all users with query filters. */
export const listUsers = async (params) => {
  const response = await api.get("/api/admin/users", { params });
  return response.data;
};

/** Get a single user's detailed information. */
export const getUser = async (id) => {
  const response = await api.get(`/api/admin/users/${id}`);
  return response.data;
};

/**
 * Change a user's system role.
 * Includes optional 2FA code if 2FA step-up verification is active.
 */
export const changeUserRole = async (id, role, code) => {
  const response = await api.patch(`/api/admin/users/${id}/role`, { role, code });
  return response.data;
};

/** Toggle a user's active status (suspend/unsuspend). */
export const toggleSuspend = async (id, code) => {
  const response = await api.patch(`/api/admin/users/${id}/suspend`, { code });
  return response.data;
};

/** Permanently delete a user account and all resource records. */
export const deleteUser = async (id, code) => {
  const response = await api.delete(`/api/admin/users/${id}`, { data: { code } });
  return response.data;
};

/** Fetch platform health & database summary stats. */
export const getPlatformStats = async () => {
  const response = await api.get("/api/admin/stats");
  return response.data;
};

/** Fetch system audit log events. */
export const getAuditLog = async (params) => {
  const response = await api.get("/api/admin/audit-log", { params });
  return response.data;
};
