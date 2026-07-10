import Notification from "../models/notificationModel.js";
import redis, { createSubscriber } from "../config/redisClient.js";

const SSE_CHANNEL = "sse:notifications";

// ─── Local SSE clients (process-local — HTTP response objects cannot be serialized) ───
const sseClients = new Map();

// ─── Redis Pub/Sub: subscribe for cross-instance SSE delivery ───
const subscriber = await createSubscriber();
await subscriber.subscribe(SSE_CHANNEL, (message) => {
  const { userId, data } = JSON.parse(message);
  pushToLocalClients(userId, data);
});

export function addSseClient(userId, res) {
  const userIdStr = userId.toString();
  if (!sseClients.has(userIdStr)) {
    sseClients.set(userIdStr, new Set());
  }
  sseClients.get(userIdStr).add(res);

  res.on("close", () => {
    const clients = sseClients.get(userIdStr);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(userIdStr);
    }
  });
}

/**
 * Push data to SSE clients on THIS server instance only.
 */
function pushToLocalClients(userId, data) {
  const userIdStr = userId.toString();
  const clients = sseClients.get(userIdStr);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

/**
 * Publish to all server instances via Redis Pub/Sub.
 * Each instance (including this one) will receive the message
 * and push to its local SSE clients.
 */
function pushToUser(userId, data) {
  redis.publish(SSE_CHANNEL, JSON.stringify({ userId: userId.toString(), data }));
}


export async function createNotification(userId, { type, title, description, actionLabel, actionPath, metadata, expiresAt } = {}) {
  const notification = await Notification.create({
    userId,
    type,
    title,
    description: description || "",
    actionLabel: actionLabel || null,
    actionPath: actionPath || null,
    metadata: metadata || null,
    expiresAt: expiresAt || null,
  });

  const data = notification.toObject();
  pushToUser(userId, { type: "notification", notification: data });
  pushToUser(userId, { type: "count" });

  return data;
}

export async function listNotifications(userId, { limit = 20, cursor, unreadOnly } = {}) {
  const filter = { userId };
  if (unreadOnly) filter.read = false;

  const clampedLimit = Math.min(Math.max(1, limit), 100);
  let query = Notification.find(filter).sort({ createdAt: -1 });

  if (cursor) {
    query = query.where("createdAt").lt(new Date(cursor));
  }

  const notifications = await query.limit(clampedLimit + 1).lean();
  const hasMore = notifications.length > clampedLimit;
  const items = hasMore ? notifications.slice(0, clampedLimit) : notifications;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return { items, nextCursor };
}

export async function getUnreadCount(userId) {
  return Notification.countDocuments({ userId, read: false });
}

export async function markAsRead(userId, notificationId) {
  const result = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true },
  ).lean();
  if (result) {
    pushToUser(userId, { type: "count" });
  }
  return result;
}

export async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true },
  );
  if (result.modifiedCount > 0) {
    pushToUser(userId, { type: "count" });
  }
  return { modifiedCount: result.modifiedCount };
}

export async function deleteNotification(userId, notificationId) {
  const result = await Notification.findOneAndDelete({
    _id: notificationId,
    userId,
  }).lean();
  if (result) {
    pushToUser(userId, { type: "count" });
  }
  return result;
}

export async function clearNotifications(userId) {
  const result = await Notification.deleteMany({ userId });
  pushToUser(userId, { type: "count" });
  return { deletedCount: result.deletedCount };
}

export async function getNotificationPreferences(userId) {
  return null;
}

export async function updateNotificationPreferences(userId, preferences) {
  return preferences;
}
