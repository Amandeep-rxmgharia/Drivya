/**
 * Cache abstraction — in-memory LRU for development.
 * Swap the driver to Redis at 10k+ concurrent users without changing callers.
 *
 * Scaling path:
 *   10k users  → in-memory (single instance)
 *   50k users  → Redis single node
 *   500k+ users → Redis Cluster + CDN edge cache for public metadata
 */

const DEFAULT_MAX_ENTRIES = 5000;

class MemoryCacheDriver {
  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.store = new Map();
    this.maxEntries = maxEntries;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    // LRU: refresh insertion order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlSeconds = 60) {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  del(key) {
    this.store.delete(key);
  }

  delByPrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

const driver = new MemoryCacheDriver();

export async function cacheGet(key) {
  return driver.get(key);
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  driver.set(key, value, ttlSeconds);
}

export async function cacheDel(key) {
  driver.del(key);
}

export async function cacheDelByPrefix(prefix) {
  driver.delByPrefix(prefix);
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
