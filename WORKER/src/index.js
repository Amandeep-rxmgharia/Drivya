/**
 * Cloudflare Worker: Drivya Fast Edge CDN File Proxy
 *
 * Features:
 * - High-speed Web Crypto HMAC-SHA256 JWT validation (<1ms)
 * - Zero-latency Cloudflare R2 bucket binding access
 * - Global edge caching via caches.default (RAM/SSD cache, sub-10ms TTFB)
 * - HTTP Range requests (206 Partial Content) for instant video/audio streaming
 * - Strict access control per file key
 *
 * NOTE: Debug logging is included (lines tagged "[cache]"). Remove once
 * caching behavior is confirmed working in production.
 */

// ─── Web Crypto JWT Verification ─────────────────────────────────

function base64UrlToUint8Array(base64Url) {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyJwt(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToUint8Array(signatureB64);

    const isValid = await crypto.subtle.verify("HMAC", key, signature, data);
    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(payloadB64));
    return JSON.parse(payloadJson);
  } catch (err) {
    return null;
  }
}

// ─── Standard CORS & Caching Headers ───────────────────────────────
const DEFAULT_CACHE_CONTROL = "public, max-age=31536000, s-maxage=31536000, immutable, stale-while-revalidate=86400";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Authorization, Content-Type, If-None-Match, If-Modified-Since",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Disposition, ETag, Cache-Control, CF-Cache-Status, Last-Modified",
  "Access-Control-Max-Age": "86400",
};

const MAX_CACHE_BODY_SIZE = 256 * 1024 * 1024; // 256 MB

// ─── Worker Fetch Handler ────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD, OPTIONS", ...CORS_HEADERS },
      });
    }

    // 2. Health check route
    if (url.pathname === "/health" || url.pathname === "/favicon.ico") {
      return new Response(JSON.stringify({ status: "healthy", service: "drivya-files-worker" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // 3. Extract R2 object key from URL pathname
    // Supports both /userId/file.png and /file/userId/file.png
    const rawPath = url.pathname.replace(/^\/+/, "");
    const requestedKey = decodeURIComponent(rawPath.replace(/^file\//, ""));

    if (!requestedKey) {
      return new Response(JSON.stringify({ error: "File key is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // 4. Validate JWT access token
    const token = url.searchParams.get("token");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing file access token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const secret = env.JWT_SECRET || env.FILE_WORKER_JWT_SECRET;
    if (!secret) {
      return new Response(JSON.stringify({ error: "Server misconfiguration: missing JWT secret" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const payload = await verifyJwt(token, secret);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token or signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // Check expiration
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) {
      return new Response(JSON.stringify({ error: "Unauthorized: Token expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // Check that the token grants access to this specific file key
    if (payload.key !== requestedKey) {
      return new Response(JSON.stringify({ error: "Forbidden: Token is not valid for the requested file" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // 5. Cloudflare Edge Cache Lookup (caches.default)
    // Use a plain URL string as cache key — simpler and avoids Request
    // header matching issues. Strip ?token= so all authorized requests
    // for the same file share one cache entry.
    const cache = typeof caches !== "undefined" ? caches.default : null;
    const cacheUrl = new URL(request.url);
    cacheUrl.searchParams.delete("token");
    const cacheKeyUrl = cacheUrl.toString();

    const isRangeRequest = request.headers.has("range");
    const clientIfNoneMatch = request.headers.get("if-none-match");

    console.log(
      "[cache] incoming:",
      cacheKeyUrl,
      "| cf-ray:",
      request.headers.get("cf-ray"),
      "| range:",
      isRangeRequest,
      "| if-none-match:",
      clientIfNoneMatch,
    );

    if (cache && !isRangeRequest && request.method === "GET") {
      const cachedResponse = await cache.match(cacheKeyUrl);
      console.log("[cache] match result:", cachedResponse ? "FOUND" : "NOT FOUND");

      if (cachedResponse) {
        const responseHeaders = new Headers(cachedResponse.headers);
        responseHeaders.set("CF-Cache-Status", "HIT");
        if (!responseHeaders.has("cache-control")) {
          responseHeaders.set("cache-control", DEFAULT_CACHE_CONTROL);
        }
        for (const [k, v] of Object.entries(CORS_HEADERS)) {
          responseHeaders.set(k, v);
        }

        // Client already has the current version cached locally — 304
        const cachedEtag = responseHeaders.get("etag");
        if (clientIfNoneMatch && cachedEtag && (clientIfNoneMatch === cachedEtag || clientIfNoneMatch === "*")) {
          return new Response(null, {
            status: 304,
            headers: responseHeaders,
          });
        }

        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: responseHeaders,
        });
      }
    }

    // 6. Fetch from Cloudflare R2 bucket via native binding
    if (!env.BUCKET) {
      return new Response(JSON.stringify({ error: "R2 bucket binding (BUCKET) not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // IMPORTANT: We deliberately do NOT pass `onlyIf` based on the client's
    // If-None-Match header here. If we did, R2 would return a bodyless
    // object whenever the client's ETag matched, which meant we could
    // never buffer + cache.put() the object on repeat visits — this was
    // the root cause of "always MISS". We always fetch the full object
    // from R2 (letting the edge cache above handle repeat-hit short
    // circuiting), and only decide on 304 ourselves once we know the etag.
    const getOptions = {};
    if (isRangeRequest) {
      getOptions.range = request.headers;
    }
    if (request.headers.has("if-match")) {
      getOptions.onlyIf = { etagMatches: request.headers.get("if-match") };
    }

    const object = await env.BUCKET.get(requestedKey, getOptions);

    console.log("[cache] R2 object:", object ? "FOUND" : "NULL", "| key:", requestedKey, "| size:", object?.size);

    if (!object) {
      console.warn("[cache] R2 returned null — returning 404 for key:", requestedKey);
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // 7. Prepare response headers
    const headers = new Headers();
    if (typeof object.writeHttpMetadata === "function") {
      object.writeHttpMetadata(headers);
    }

    // Remove any Vary header injected by R2 writeHttpMetadata — it causes
    // cache variant fragmentation with our headerless cache key
    headers.delete("Vary");

    const etag = object.httpEtag || `"${object.etag || requestedKey}"`;
    headers.set("etag", etag);
    headers.set("accept-ranges", "bytes");

    // Proper Cache-Control: Allow token/object override or apply aggressive immutable CDN policy
    const effectiveCacheControl = payload.cacheControl || object.httpMetadata?.cacheControl || DEFAULT_CACHE_CONTROL;
    headers.set("cache-control", effectiveCacheControl);
    headers.set("CF-Cache-Status", "MISS");

    if (object.uploaded instanceof Date) {
      headers.set("last-modified", object.uploaded.toUTCString());
    }

    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      headers.set(k, v);
    }

    // Content-Type override (from token or object metadata)
    if (payload.contentType) {
      headers.set("content-type", payload.contentType);
    } else if (!headers.has("content-type")) {
      headers.set("content-type", object.httpMetadata?.contentType || "application/octet-stream");
    }

    // Content-Disposition override (attachment or inline with filename)
    if (payload.disposition) {
      headers.set("content-disposition", payload.disposition);
    } else if (payload.filename) {
      headers.set("content-disposition", `attachment; filename="${encodeURIComponent(payload.filename)}"`);
    } else if (!headers.has("content-disposition")) {
      headers.set("content-disposition", object.httpMetadata?.contentDisposition || "inline");
    }

    // Determine status & content-range for HTTP Range streaming
    // IMPORTANT: Do not rely on `object.range` truthiness alone — some R2
    // binding versions attach a full-file range object even when no Range
    // header was requested, which was incorrectly forcing every response
    // to 206 and breaking edge caching (cache only stores true 200s).
    let status = 200;
    if (isRangeRequest && object.range) {
      status = 206;
      headers.set("content-range", `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`);
      headers.set("content-length", object.range.length.toString());
    } else if (object.size !== undefined) {
      headers.set("content-length", object.size.toString());
    }

    // 8. Store in Cloudflare Edge Cache for subsequent requests
    // IMPORTANT: R2 ReadableStream bodies silently fail when cloned/tee'd
    // for cache.put(). Buffer as ArrayBuffer so cache.put reliably stores
    // the full response. Skip caching for files > 256 MB to avoid memory pressure.
    // This now runs BEFORE any 304 decision, so caching happens on every
    // fresh visit regardless of what the client's own conditional headers say.
    const shouldCache = cache
      && status === 200
      && !isRangeRequest
      && request.method === "GET"
      && (object.size === undefined || object.size <= MAX_CACHE_BODY_SIZE);

    console.log(
      "[cache] shouldCache decision:",
      shouldCache,
      "| cache exists:",
      !!cache,
      "| status:",
      status,
      "| isRangeRequest:",
      isRangeRequest,
      "| method:",
      request.method,
      "| object.size:",
      object.size,
    );

    let body = null;

    if (shouldCache) {
      // Buffer the R2 body — ArrayBuffer works reliably with cache.put
      body = await object.arrayBuffer();
      headers.set("content-length", body.byteLength.toString());

      const responseToCache = new Response(body, {
        status: 200,
        headers: new Headers(headers),
      });

      console.log("[cache] attempting PUT key:", cacheKeyUrl, "| size:", body.byteLength);

      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(
          cache
            .put(cacheKeyUrl, responseToCache)
            .then(() => console.log("[cache] PUT success:", cacheKeyUrl))
            .catch((err) => {
              // cache.put can fail on eviction pressure — not fatal
              console.error("[cache] PUT failed:", err && err.message, "| key:", cacheKeyUrl);
            }),
        );
      } else {
        console.warn("[cache] no ctx.waitUntil available — skipping cache.put");
      }
    }

    // 9. Now it's safe to honor the client's own conditional request
    if (clientIfNoneMatch && (clientIfNoneMatch === etag || clientIfNoneMatch === "*")) {
      return new Response(null, {
        status: 304,
        headers,
      });
    }

    if (shouldCache) {
      // Return a separate Response to the client from the same buffer
      return new Response(body, { headers, status });
    }

    // Non-cacheable path (range requests, HEAD, oversized files)
    return new Response(request.method === "HEAD" ? null : object.body, {
      headers,
      status,
    });
  },
};