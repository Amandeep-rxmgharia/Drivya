/**
 * Cloudflare Worker: Drivya Fast Edge CDN File Proxy
 * 
 * Features:
 * - High-speed Web Crypto HMAC-SHA256 JWT validation (<1ms)
 * - Zero-latency Cloudflare R2 bucket binding access
 * - Global edge caching via caches.default (RAM/SSD cache, sub-10ms TTFB)
 * - HTTP Range requests (206 Partial Content) for instant video/audio streaming
 * - Strict access control per file key
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
    // Strip dynamic ?token= so all authorized requests share the edge cache
    const cache = typeof caches !== "undefined" ? caches.default : null;
    const cacheUrl = new URL(request.url);
    cacheUrl.searchParams.delete("token");
    const cacheKey = new Request(cacheUrl.toString(), {
      method: "GET",
      headers: request.headers,
    });

    const isRangeRequest = request.headers.has("range");

    if (cache && !isRangeRequest && request.method === "GET") {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const responseHeaders = new Headers(cachedResponse.headers);
        responseHeaders.set("CF-Cache-Status", "HIT");
        if (!responseHeaders.has("cache-control")) {
          responseHeaders.set("cache-control", DEFAULT_CACHE_CONTROL);
        }
        for (const [k, v] of Object.entries(CORS_HEADERS)) {
          responseHeaders.set(k, v);
        }

        // Handle client conditional If-None-Match
        const clientEtag = request.headers.get("if-none-match");
        const cachedEtag = responseHeaders.get("etag");
        if (clientEtag && cachedEtag && (clientEtag === cachedEtag || clientEtag === "*")) {
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

    const getOptions = {};
    if (isRangeRequest) {
      getOptions.range = request.headers;
    }
    if (request.headers.has("if-match") || request.headers.has("if-none-match")) {
      getOptions.onlyIf = request.headers;
    }

    const object = await env.BUCKET.get(requestedKey, getOptions);

    if (!object) {
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

    // Handle client conditional If-None-Match (304 Not Modified)
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === "*")) {
      return new Response(null, {
        status: 304,
        headers,
      });
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
    let status = 200;
    if (object.range) {
      status = 206;
      headers.set("content-range", `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`);
      headers.set("content-length", object.range.length.toString());
    } else if (object.size !== undefined) {
      headers.set("content-length", object.size.toString());
    }

    const response = new Response(request.method === "HEAD" ? null : object.body, {
      headers,
      status,
    });

    // 8. Store in Cloudflare Edge Cache for subsequent requests
    if (cache && status === 200 && !isRangeRequest && request.method === "GET") {
      const responseToCache = response.clone();
      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(cache.put(cacheKey, responseToCache));
      } else {
        await cache.put(cacheKey, responseToCache);
      }
    }

    return response;
  },
};
