import redis from "../config/redisClient.js";

/**
 * IP-based sliding window rate limiter using Redis sorted sets.
 * @param {number} numOfReq  Maximum requests allowed in the window
 * @param {number} windowSize  Window size in milliseconds
 */
export const IPRateLimiter = (numOfReq, windowSize) => {
  return async (req, res, next) => {
    try {
      const now = Date.now();
      const ip = req.ip === "::1" ? "127.0.0.2" : req.ip;
      const key = `rate_limit:${req.path}:${ip}`;

      const results = await redis
        .multi()
        .zRemRangeByScore(key, 0, now - windowSize)
        .zCard(key)
        .exec();

      const count = results[1];

      if (count >= numOfReq) {
        return res
          .status(429)
          .json({ message: "Too many requests. Please try again later." });
      }

      // Add current request and set expiry in one pipeline
      await redis
        .multi()
        .zAdd(key, { score: now, value: now.toString() })
        .expire(key, Math.ceil(windowSize / 1000))
        .exec();

      next();
    } catch (err) {
      console.error("Rate limiter error:", err.message);
      next(); // fail-safe: allow request through if Redis is down
    }
  };
};

/**
 * Session-based sliding window rate limiter using Redis sorted sets.
 * Uses the session ID from signed cookies for per-session tracking.
 * @param {number} numOfReq  Maximum requests allowed in the window
 * @param {number} windowSize  Window size in milliseconds
 */
export const sessionRateLimiter = (numOfReq, windowSize) => {
  return async (req, res, next) => {
    try {
      const now = Date.now();
      const { sid } = req.signedCookies || {};
      if (!sid) {
        return res.status(401).json({ message: "Not logged in." });
      }

      const key = `rate_limit:${req.path}:${sid}`;

      const results = await redis
        .multi()
        .zRemRangeByScore(key, 0, now - windowSize)
        .zCard(key)
        .exec();

      const count = results[1];

      if (count >= numOfReq) {
        return res
          .status(429)
          .json({ message: "Too many requests. Please try again later." });
      }

      await redis
        .multi()
        .zAdd(key, { score: now, value: now.toString() })
        .expire(key, Math.ceil(windowSize / 1000))
        .exec();

      next();
    } catch (err) {
      console.error("Session rate limiter error:", err.message);
      next();
    }
  };
};
