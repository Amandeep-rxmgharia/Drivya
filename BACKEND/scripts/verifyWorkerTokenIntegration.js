import "dotenv/config";
import assert from "assert";
import { generateFileWorkerToken, verifyFileWorkerToken } from "../config/tokenUtils.js";
import { generateDownloadUrl } from "../services/storageService.js";
import worker from "../../WORKER/src/index.js";

async function runVerification() {
  console.log("🚀 Starting verification of Cloudflare Worker & Backend URL generation...\n");

  const testKey = "user_12345/test-image.png";
  const testSecret = process.env.FILE_WORKER_JWT_SECRET || process.env.JWT_ACCESS_SECRET || "default_test_secret_for_verification";

  // Test 1: Backend generates file worker token
  console.log("Test 1: Backend generates file worker token...");
  const token = generateFileWorkerToken(testKey, {
    expiresIn: 300,
    disposition: 'inline; filename="test-image.png"',
    contentType: "image/png",
  });
  assert(token, "Token should be generated");
  console.log("✅ Token generated successfully.");

  // Test 2: Backend verifies file worker token
  console.log("\nTest 2: Backend verifies token...");
  const decoded = verifyFileWorkerToken(token);
  assert.strictEqual(decoded.key, testKey);
  assert.strictEqual(decoded.disposition, 'inline; filename="test-image.png"');
  assert.strictEqual(decoded.contentType, "image/png");
  console.log("✅ Backend token verification passed:", decoded);

  // Test 3: Storage service generates files.drivya.cloud/:key?token={jwt} URL
  console.log("\nTest 3: generateDownloadUrl generates Worker URL...");
  const { url, expiresAt } = await generateDownloadUrl(testKey, {
    responseContentDisposition: 'attachment; filename="test-image.png"',
    responseContentType: "image/png",
  });
  console.log("Generated URL:", url);
  assert(url.startsWith("https://files.drivya.cloud/"), "URL must start with https://files.drivya.cloud/");
  assert(url.includes("user_12345/test-image.png?token="), "URL must contain key and ?token=");
  assert(expiresAt instanceof Date, "expiresAt must be a valid Date");
  console.log("✅ URL format verification passed.");

  // Test 4: Worker OPTIONS preflight request
  console.log("\nTest 4: Worker OPTIONS preflight request...");
  const optionsReq = new Request(`https://files.drivya.cloud/${testKey}`, {
    method: "OPTIONS",
  });
  const optionsRes = await worker.fetch(optionsReq, { JWT_SECRET: testSecret }, {});
  assert.strictEqual(optionsRes.status, 204);
  assert.strictEqual(optionsRes.headers.get("Access-Control-Allow-Origin"), "*");
  console.log("✅ Preflight OPTIONS returned 204 with CORS headers.");

  // Test 5: Worker rejects request without token
  console.log("\nTest 5: Worker rejects request without token...");
  const noTokenReq = new Request(`https://files.drivya.cloud/${testKey}`);
  const noTokenRes = await worker.fetch(noTokenReq, { JWT_SECRET: testSecret }, {});
  assert.strictEqual(noTokenRes.status, 401);
  const noTokenJson = await noTokenRes.json();
  console.log("✅ Missing token rejected with 401:", noTokenJson);

  // Test 6: Worker rejects token used for wrong file key
  console.log("\nTest 6: Worker rejects token used for wrong file key...");
  const wrongKeyReq = new Request(`https://files.drivya.cloud/user_12345/other-secret-file.pdf?token=${token}`);
  const wrongKeyRes = await worker.fetch(wrongKeyReq, { JWT_SECRET: testSecret }, {});
  assert.strictEqual(wrongKeyRes.status, 403);
  const wrongKeyJson = await wrongKeyRes.json();
  console.log("✅ Mismatched key rejected with 403:", wrongKeyJson);

  // Setup Mock R2 Bucket & Mock Cache for Worker Execution
  const fileContent = "Fake image content binary 1234567890";
  const mockR2Object = {
    key: testKey,
    size: fileContent.length,
    httpEtag: '"abc123etag"',
    body: fileContent,
    httpMetadata: {
      contentType: "image/png",
      contentDisposition: 'inline; filename="test-image.png"',
    },
    writeHttpMetadata: (headers) => {
      headers.set("content-type", "image/png");
    },
  };

  const mockBucket = {
    async get(key, options) {
      if (key !== testKey) return null;
      if (options?.range) {
        return {
          ...mockR2Object,
          range: { offset: 0, length: 10 },
          body: fileContent.slice(0, 10),
        };
      }
      return mockR2Object;
    },
  };

  // Mock global caches for Node.js environment
  const cacheStore = new Map();
  globalThis.caches = {
    default: {
      async match(req) {
        const key = typeof req === "string" ? req : req.url;
        return cacheStore.get(key) || null;
      },
      async put(req, res) {
        const key = typeof req === "string" ? req : req.url;
        cacheStore.set(key, res.clone());
      },
    },
  };

  // Test 7: Worker serves file from R2 binding with correct headers
  console.log("\nTest 7: Worker serves file from R2 binding with correct headers...");
  const validReq = new Request(`https://files.drivya.cloud/${testKey}?token=${token}`);
  const env = { JWT_SECRET: testSecret, BUCKET: mockBucket };
  const validRes = await worker.fetch(validReq, env, { waitUntil: (p) => p });

  assert.strictEqual(validRes.status, 200);
  assert.strictEqual(validRes.headers.get("Cache-Control"), "public, max-age=31536000, s-maxage=31536000, immutable, stale-while-revalidate=86400");
  assert.strictEqual(validRes.headers.get("CF-Cache-Status"), "MISS");
  assert.strictEqual(validRes.headers.get("ETag"), '"abc123etag"');
  assert.strictEqual(validRes.headers.get("Content-Disposition"), 'inline; filename="test-image.png"');
  const bodyText = await validRes.text();
  assert.strictEqual(bodyText, fileContent);
  console.log("✅ Worker correctly verified JWT, fetched from R2, and returned proper Cache-Control and CORS headers.");

  // Test 8: Worker serves subsequent request from Edge Cache with proper Cache-Control
  console.log("\nTest 8: Worker serves subsequent request from Edge Cache...");
  // Use fresh token for the same key
  const freshToken = generateFileWorkerToken(testKey, { expiresIn: 60 });
  const cachedReq = new Request(`https://files.drivya.cloud/${testKey}?token=${freshToken}`);
  const cachedRes = await worker.fetch(cachedReq, env, { waitUntil: (p) => p });
  assert.strictEqual(cachedRes.status, 200);
  assert.strictEqual(cachedRes.headers.get("CF-Cache-Status"), "HIT");
  assert.strictEqual(cachedRes.headers.get("Cache-Control"), "public, max-age=31536000, s-maxage=31536000, immutable, stale-while-revalidate=86400");
  const cachedText = await cachedRes.text();
  assert.strictEqual(cachedText, fileContent);
  console.log("✅ Subsequent request with a fresh token served directly from Edge Cache (CF-Cache-Status: HIT) with proper Cache-Control.");

  // Test 9: Worker supports HTTP Range requests (206 Partial Content)
  console.log("\nTest 9: Worker handles HTTP Range requests...");
  const rangeReq = new Request(`https://files.drivya.cloud/${testKey}?token=${freshToken}`, {
    headers: { Range: "bytes=0-9" },
  });
  const rangeRes = await worker.fetch(rangeReq, env, { waitUntil: (p) => p });
  assert.strictEqual(rangeRes.status, 206);
  assert.strictEqual(rangeRes.headers.get("Accept-Ranges"), "bytes");
  assert.strictEqual(rangeRes.headers.get("Content-Range"), `bytes 0-9/${fileContent.length}`);
  const rangeText = await rangeRes.text();
  assert.strictEqual(rangeText, fileContent.slice(0, 10));
  console.log("✅ Range request returned 206 with correct Content-Range and partial body.");

  // Test 10: Conditional If-None-Match returns 304 Not Modified
  console.log("\nTest 10: Conditional If-None-Match returns 304 Not Modified...");
  const ifNoneMatchReq = new Request(`https://files.drivya.cloud/${testKey}?token=${freshToken}`, {
    headers: { "If-None-Match": '"abc123etag"' },
  });
  const ifNoneMatchRes = await worker.fetch(ifNoneMatchReq, env, { waitUntil: (p) => p });
  assert.strictEqual(ifNoneMatchRes.status, 304);
  assert.strictEqual(ifNoneMatchRes.headers.get("ETag"), '"abc123etag"');
  console.log("✅ Conditional request returned 304 Not Modified.");

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

runVerification().catch((err) => {
  console.error("\n❌ Verification failed:", err);
  process.exit(1);
});
