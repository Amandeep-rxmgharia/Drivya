import api from "./auth.js";

export const listNotifications = async ({ limit, cursor, unreadOnly } = {}) => {
  const params = {};
  if (limit) params.limit = limit;
  if (cursor) params.cursor = cursor;
  if (unreadOnly) params.unreadOnly = "true";
  const response = await api.get("/api/notifications", { params });
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await api.get("/api/notifications/unread-count");
  return response.data.count;
};

export const markAsRead = async (id) => {
  const response = await api.patch(`/api/notifications/${id}/read`);
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await api.patch("/api/notifications/read-all");
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/api/notifications/${id}`);
  return response.data;
};

export const clearNotifications = async () => {
  const response = await api.delete("/api/notifications/clear");
  return response.data;
};

export const getNotificationPreferences = async () => {
  const response = await api.get("/api/notifications/preferences");
  return response.data.preferences;
};

export const updateNotificationPreferences = async (preferences) => {
  const response = await api.patch("/api/notifications/preferences", preferences);
  return response.data.preferences;
};

export const NOTIFICATION_STREAM_BASE = `${api.defaults.baseURL}/api/notifications/stream`;
export const NOTIFICATION_STREAM_BASE_WITH_CREDENTIALS = NOTIFICATION_STREAM_BASE;
