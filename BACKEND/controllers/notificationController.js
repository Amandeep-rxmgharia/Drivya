import * as notificationService from "../services/notificationService.js";

export async function streamNotifications(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  const interval = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000);

  notificationService.addSseClient(req.user.id, res);

  req.on("close", () => {
    clearInterval(interval);
  });
}

export async function listNotifications(req, res) {
  const { limit, cursor, unreadOnly } = req.query;
  const result = await notificationService.listNotifications(req.user.id, {
    limit: limit ? parseInt(limit, 10) : undefined,
    cursor,
    unreadOnly: unreadOnly === "true",
  });
  res.json(result);
}

export async function getUnreadCount(req, res) {
  const count = await notificationService.getUnreadCount(req.user.id);
  res.json({ count });
}

export async function markAsRead(req, res) {
  const notification = await notificationService.markAsRead(req.user.id, req.params.id);
  if (!notification) {
    return res.status(404).json({ message: "Notification not found." });
  }
  res.json(notification);
}

export async function markAllAsRead(req, res) {
  const result = await notificationService.markAllAsRead(req.user.id);
  res.json(result);
}

export async function deleteNotification(req, res) {
  const notification = await notificationService.deleteNotification(req.user.id, req.params.id);
  if (!notification) {
    return res.status(404).json({ message: "Notification not found." });
  }
  res.json({ message: "Notification deleted." });
}

export async function clearNotifications(req, res) {
  const result = await notificationService.clearNotifications(req.user.id);
  res.json(result);
}

export async function getPreferences(req, res) {
  const prefs = await notificationService.getNotificationPreferences(req.user.id);
  res.json({ preferences: prefs });
}

export async function updatePreferences(req, res) {
  const prefs = await notificationService.updateNotificationPreferences(req.user.id, req.body);
  res.json({ preferences: prefs });
}
