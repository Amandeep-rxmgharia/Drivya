/**
 * Cache abstraction — Redis-backed for production.
 *
 * All values are stored as JSON strings in Redis.
 * Callers use the same async API as before — zero changes needed in consumers.
 */

import redis from "../config/redisClient.js";

// ─── Core cache operations (Redis-backed) ─────────────────────

export async function cacheGet(key) {
  const raw = await redis.get(key);
  return raw !== null ? JSON.parse(raw) : null;
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  const serialized = JSON.stringify(value);
  if (ttlSeconds > 0) {
    await redis.set(key, serialized, { EX: ttlSeconds });
  } else {
    await redis.set(key, serialized);
  }
}

export async function cacheDel(key) {
  await redis.del(key);
}

export async function cacheDelByPrefix(prefix) {
  // Use SCAN iterator to safely find and delete keys (non-blocking unlike KEYS)
  const keysToDelete = [];
  for await (const key of redis.scanIterator({
    MATCH: `${prefix}*`,
    COUNT: 100,
  })) {
    keysToDelete.push(key);
  }

  if (keysToDelete.length > 0) {
    await redis.del(keysToDelete);
  }
}

/**
 * Cache-aside helper: return cached value or compute and store.
 * @template T
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {() => Promise<T>} factory
 */
export async function cacheAside(key, ttlSeconds, factory) {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;

  const value = await factory();
  if (value !== null && value !== undefined) {
    await cacheSet(key, value, ttlSeconds);
  }

  return value;
}

/**
 * Invalidate all cache entries for an owner's share data.
 * @param {string} ownerId
 */
export async function invalidateOwnerShareCache(ownerId) {
  await cacheDelByPrefix(`share:stats:${ownerId}`);
  await cacheDelByPrefix(`share:list:${ownerId}`);
}

/**
 * Invalidate public share metadata cache.
 * @param {string} token
 */
export async function invalidateShareTokenCache(token) {
  await cacheDel(`share:token:${token}`);
}

/**
 * Invalidate activity stats cache for a user.
 * @param {string} userId
 */
export async function invalidateActivityStatsCache(userId) {
  await cacheDel(`activity:stats:${userId}`);
}
