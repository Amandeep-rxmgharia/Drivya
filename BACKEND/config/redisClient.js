import { createClient } from "redis";

const {
  REDIS_URL,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_USERNAME,
} = process.env;

// Support both REDIS_URL (standard URI) and individual env vars (Redis Cloud)
const clientConfig = REDIS_URL
  ? { url: REDIS_URL }
  : {
      username: REDIS_USERNAME || "default",
      password: REDIS_PASSWORD,
      socket: {
        host: REDIS_HOST || "localhost",
        port: parseInt(REDIS_PORT, 10) || 6379,
      },
    };

const redis = createClient(clientConfig);

redis.on("error", (err) => console.error("❌ Redis error:", err.message));
redis.on("reconnecting", () => console.log("🔄 Redis reconnecting..."));

await redis.connect();
console.log("✅ Redis connected");

/**
 * Create a duplicate client for Pub/Sub.
 * node-redis requires a dedicated connection for subscribers.
 */
export async function createSubscriber() {
  const sub = redis.duplicate();
  await sub.connect();
  return sub;
}

/**
 * Gracefully disconnect Redis.
 */
export async function disconnectRedis() {
  await redis.quit();
}

export default redis;
