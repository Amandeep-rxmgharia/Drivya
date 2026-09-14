import redis from "../config/redisClient.js";

const DEFAULT_SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const REMEMBER_ME_SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Save session to Redis.
 * @param {string} sessionId
 * @param {object} sessionData - { userId, role, twoFAVerifiedAt }
 * @param {number|boolean} [ttlOrRememberMe=DEFAULT_SESSION_TTL]
 */
export async function saveSessionToRedis(sessionId, sessionData, ttlOrRememberMe = DEFAULT_SESSION_TTL) {
  try {
    const ttl = typeof ttlOrRememberMe === "boolean"
      ? (ttlOrRememberMe ? REMEMBER_ME_SESSION_TTL : DEFAULT_SESSION_TTL)
      : (typeof ttlOrRememberMe === "number" ? ttlOrRememberMe : DEFAULT_SESSION_TTL);

    const payload = {
      userId: sessionData.userId?.toString(),
      role: sessionData.role || "user",
      twoFAVerifiedAt: sessionData.twoFAVerifiedAt ? new Date(sessionData.twoFAVerifiedAt).toISOString() : null,
      lastActive: Date.now(),
    };

    // Store session under session:<sessionId>
    await redis.set(`session:${sessionId}`, JSON.stringify(payload), { EX: ttl });

    // Track session ID in user's active session set: user_sessions:<userId>
    if (sessionData.userId) {
      const userKey = `user_sessions:${sessionData.userId.toString()}`;
      await redis.sAdd(userKey, sessionId.toString());
      await redis.expire(userKey, REMEMBER_ME_SESSION_TTL);
    }
  } catch (err) {
    console.error(`[RedisSession] Failed to save session ${sessionId}:`, err.message);
  }
}

/**
 * Retrieve session from Redis.
 * @param {string} sessionId
 * @returns {Promise<object|null>}
 */
export async function getSessionFromRedis(sessionId) {
  try {
    const raw = await redis.get(`session:${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(`[RedisSession] Failed to get session ${sessionId}:`, err.message);
    return null;
  }
}

/**
 * Delete a specific session from Redis.
 * @param {string} sessionId
 * @param {string} [userId]
 */
export async function deleteSessionFromRedis(sessionId, userId = null) {
  try {
    await redis.del(`session:${sessionId}`);
    if (userId) {
      await redis.sRem(`user_sessions:${userId.toString()}`, sessionId.toString());
    }
  } catch (err) {
    console.error(`[RedisSession] Failed to delete session ${sessionId}:`, err.message);
  }
}

/**
 * Delete all sessions for a user (optionally keeping one active session).
 * @param {string} userId
 * @param {string|null} [keepSessionId]
 */
export async function deleteUserSessionsFromRedis(userId, keepSessionId = null) {
  try {
    const userKey = `user_sessions:${userId.toString()}`;
    const sessionIds = await redis.sMembers(userKey);

    const toDelete = [];
    for (const sid of sessionIds) {
      if (!keepSessionId || sid !== keepSessionId.toString()) {
        toDelete.push(`session:${sid}`);
        await redis.sRem(userKey, sid);
      }
    }

    if (toDelete.length > 0) {
      await redis.del(toDelete);
    }

    if (!keepSessionId) {
      await redis.del(userKey);
    }
  } catch (err) {
    console.error(`[RedisSession] Failed to delete sessions for user ${userId}:`, err.message);
  }
}

/**
 * Update 2FA verified status in Redis session.
 * @param {string} sessionId
 * @param {Date|null} twoFAVerifiedAt
 */
export async function updateSessionTwoFAInRedis(sessionId, twoFAVerifiedAt) {
  try {
    const session = await getSessionFromRedis(sessionId);
    if (session) {
      session.twoFAVerifiedAt = twoFAVerifiedAt ? new Date(twoFAVerifiedAt).toISOString() : null;
      const ttl = await redis.ttl(`session:${sessionId}`);
      const validTtl = ttl > 0 ? ttl : DEFAULT_SESSION_TTL;
      await redis.set(`session:${sessionId}`, JSON.stringify(session), { EX: validTtl });
    }
  } catch (err) {
    console.error(`[RedisSession] Failed to update 2FA for session ${sessionId}:`, err.message);
  }
}

/**
 * Update lastActive in Redis session.
 * @param {string} sessionId
 */
export async function touchSessionInRedis(sessionId) {
  try {
    const session = await getSessionFromRedis(sessionId);
    if (session) {
      session.lastActive = Date.now();
      const ttl = await redis.ttl(`session:${sessionId}`);
      const validTtl = ttl > 0 ? ttl : DEFAULT_SESSION_TTL;
      await redis.set(`session:${sessionId}`, JSON.stringify(session), { EX: validTtl });
    }
  } catch (err) {
    // Non-critical, ignore
  }
}
