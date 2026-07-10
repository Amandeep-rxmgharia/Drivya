import redis from "../config/redisClient.js";

/**
 * Progressive throttle middleware using Redis hashes.
 * Delays repeat requests from the same IP, with delay increasing
 * for rapid successive requests and decaying over time.
 * @param {number} waitTime  Base wait time in milliseconds (default 1000)
 */
export default function throttle(waitTime = 1000) {
  return async (req, res, next) => {
    try {
      const now = Date.now();
      const ip = req.ip === "::1" ? "127.0.0.2" : req.ip;
      const key = `throttle:${req.path}:${ip}`;

      const data = await redis.hGetAll(key);

      const previousDelay = Number(data.previousDelay) || 0;
      const lastRequestTime = Number(data.lastRequestTime) || now - waitTime;

      const timePassed = now - lastRequestTime;
      const delay = Math.max(0, waitTime + previousDelay - timePassed);

      // Update state and set TTL in one pipeline
      await redis
        .multi()
        .hSet(key, { previousDelay: delay.toString(), lastRequestTime: now.toString() })
        .expire(key, 60)
        .exec();

      setTimeout(next, delay);
    } catch (err) {
      console.error("Throttle error:", err.message);
      next(); // fail-safe
    }
  };
}
