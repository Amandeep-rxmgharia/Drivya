import "dotenv/config";
import assert from "node:assert";
import {
  generateSessionToken,
  verifySessionToken,
  setSessionCookie,
  clearTokenCookies,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setTokenCookies,
} from "../config/tokenUtils.js";

async function runTests() {
  console.log("Starting Session Token Verification Tests...\n");

  const userId = "64b0f1a2c3d4e5f6a7b8c9d0";
  const sessionId = "64b0f1a2c3d4e5f6a7b8c9d1";
  const role = "user";

  // Test 1: Generate and verify standard session token
  console.log("Test 1: Generate & verify standard session token...");
  const token = generateSessionToken(userId, sessionId, role, false);
  assert(token && typeof token === "string", "Token must be a non-empty string");
  
  const decoded = verifySessionToken(token);
  assert.strictEqual(decoded.id, userId);
  assert.strictEqual(decoded.sid, sessionId);
  assert.strictEqual(decoded.role, role);
  // Default is 7 days (604800s +- 10s)
  const ttl = decoded.exp - decoded.iat;
  assert(Math.abs(ttl - 7 * 24 * 3600) < 10, `Expected ~7 days TTL, got ${ttl}s`);
  console.log("✅ Standard session token generated and verified (7 days TTL).");

  // Test 2: Remember-me session token (30 days)
  console.log("\nTest 2: Generate & verify remember-me session token...");
  const rememberToken = generateSessionToken(userId, sessionId, role, true);
  const decodedRemember = verifySessionToken(rememberToken);
  const rememberTtl = decodedRemember.exp - decodedRemember.iat;
  assert(Math.abs(rememberTtl - 30 * 24 * 3600) < 10, `Expected ~30 days TTL, got ${rememberTtl}s`);
  console.log("✅ Remember-me session token generated and verified (30 days TTL).");

  // Test 3: Cookie setting & clearing
  console.log("\nTest 3: Cookie options for session token...");
  const mockCookies = {};
  const mockCleared = [];
  const mockRes = {
    cookie(name, val, options) {
      mockCookies[name] = { val, options };
    },
    clearCookie(name, options) {
      mockCleared.push({ name, options });
    }
  };

  setSessionCookie(mockRes, token, false);
  assert(mockCookies.sessionToken, "sessionToken cookie must be set");
  assert.strictEqual(mockCookies.sessionToken.val, token);
  assert.strictEqual(mockCookies.sessionToken.options.httpOnly, true);
  assert.strictEqual(mockCookies.sessionToken.options.maxAge, 7 * 24 * 3600 * 1000);
  assert(mockCleared.some(c => c.name === "accessToken"), "Old accessToken should be cleared");
  assert(mockCleared.some(c => c.name === "refreshToken"), "Old refreshToken should be cleared");
  console.log("✅ setSessionCookie correctly sets sessionToken and clears legacy cookies.");

  clearTokenCookies(mockRes);
  assert(mockCleared.some(c => c.name === "sessionToken"), "sessionToken must be cleared");
  console.log("✅ clearTokenCookies clears sessionToken and legacy cookies.");

  // Test 4: Backwards-compatible aliases
  console.log("\nTest 4: Backwards-compatible aliases...");
  const legacyAccess = generateAccessToken(userId, sessionId, role);
  const legacyDecoded = verifyAccessToken(legacyAccess);
  assert.strictEqual(legacyDecoded.id, userId);
  
  const legacyRefresh = generateRefreshToken(userId, sessionId, false);
  const refreshDecoded = verifyRefreshToken(legacyRefresh);
  assert.strictEqual(refreshDecoded.id, userId);

  // Test 5: Redis session operations
  console.log("\nTest 5: Redis session lifecycle & verification...");
  const {
    saveSessionToRedis,
    getSessionFromRedis,
    touchSessionInRedis,
    updateSessionTwoFAInRedis,
    deleteSessionFromRedis,
    deleteUserSessionsFromRedis,
  } = await import("../services/sessionRedisService.js");

  const testSid = "test_sid_" + Date.now();
  const testUid = "test_uid_" + Date.now();

  // Save session in Redis
  await saveSessionToRedis(testSid, { userId: testUid, role: "admin", twoFAVerifiedAt: null }, 60);
  let redisSession = await getSessionFromRedis(testSid);
  assert(redisSession, "Session must exist in Redis");
  assert.strictEqual(redisSession.userId, testUid);
  assert.strictEqual(redisSession.role, "admin");
  assert.strictEqual(redisSession.twoFAVerifiedAt, null);
  console.log("✅ Session stored and retrieved from Redis.");

  // Update 2FA in Redis
  const verifiedTime = new Date();
  await updateSessionTwoFAInRedis(testSid, verifiedTime);
  redisSession = await getSessionFromRedis(testSid);
  assert(redisSession.twoFAVerifiedAt, "twoFAVerifiedAt must be set in Redis");
  console.log("✅ 2FA verification updated in Redis session.");

  // Touch session
  await touchSessionInRedis(testSid);
  console.log("✅ Session activity touched in Redis.");

  // Delete single session from Redis
  await deleteSessionFromRedis(testSid, testUid);
  const deletedSession = await getSessionFromRedis(testSid);
  assert.strictEqual(deletedSession, null, "Session must be null after deletion");
  console.log("✅ Session revoked and evicted from Redis.");

  // Delete all user sessions from Redis
  const testSid1 = "test_sid_multi1_" + Date.now();
  const testSid2 = "test_sid_multi2_" + Date.now();
  await saveSessionToRedis(testSid1, { userId: testUid, role: "user" }, 60);
  await saveSessionToRedis(testSid2, { userId: testUid, role: "user" }, 60);
  await deleteUserSessionsFromRedis(testUid);
  assert.strictEqual(await getSessionFromRedis(testSid1), null);
  assert.strictEqual(await getSessionFromRedis(testSid2), null);
  console.log("✅ All user sessions evicted from Redis on bulk revocation.");

  console.log("\n🎉 ALL VERIFICATION TESTS PASSED!");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
