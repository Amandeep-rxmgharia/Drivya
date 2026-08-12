import { z } from "zod";

/**
 * Zod-based MongoDB NoSQL injection sanitizer + XSS defense-in-depth.
 *
 * 1. Recursively strips any keys starting with "$" (MongoDB operators like
 *    $gt, $ne, $regex, $where, etc.) from objects. Also strips dots in keys
 *    which can be used for MongoDB dot-notation injection.
 *
 * 2. Strips HTML/script tags from string values to prevent stored XSS.
 *    Fields that legitimately contain code or special characters (password,
 *    content, query, conversation) are exempted.
 *
 * This replaces `express-mongo-sanitize` with zero third-party risk.
 */

// ─── NoSQL Injection Sanitization ────────────────────────────────

/**
 * Recursively sanitize a value, stripping any object keys that start with "$"
 * or contain "." (MongoDB dot notation).
 */
function sanitizeValue(val) {
  if (val === null || val === undefined) return val;

  // Arrays — sanitize each element
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }

  // Objects — strip dangerous keys, recurse into remaining values
  if (typeof val === "object") {
    const cleaned = {};
    for (const key of Object.keys(val)) {
      // Skip keys that are MongoDB operators or use dot notation
      if (key.startsWith("$") || key.includes(".")) continue;
      cleaned[key] = sanitizeValue(val[key]);
    }
    return cleaned;
  }

  // Primitives pass through unchanged
  return val;
}

/**
 * Sanitize an object in-place by removing keys that start with "$"
 * or contain "." (MongoDB dot notation). Recurses into nested objects.
 */
function sanitizeInPlace(obj) {
  if (typeof obj !== "object" || obj === null) return;

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeInPlace(obj[key]);
    }
  }
}

// ─── XSS Sanitization (HTML Tag Stripping) ───────────────────────

/**
 * Fields that may legitimately contain HTML, code, or special characters.
 * These are skipped during XSS stripping to avoid breaking functionality
 * (e.g. AI chat messages with code snippets, file content editing,
 * password fields with special characters).
 */
const XSS_EXEMPT_KEYS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "content",
  "query",
  "conversation",
  "credential",
]);

/**
 * Recursively strip HTML tags from string values in an object.
 * Skips keys listed in XSS_EXEMPT_KEYS.
 *
 * @param {*} val — The value to sanitize.
 * @param {string|null} currentKey — The object key this value belongs to (null for root).
 * @returns {*} — The sanitized value.
 */
function stripXss(val, currentKey = null) {
  if (val === null || val === undefined) return val;

  if (typeof val === "string") {
    // Skip exempt fields
    if (currentKey && XSS_EXEMPT_KEYS.has(currentKey)) return val;
    // Strip HTML/script tags
    return val.replace(/<[^>]*>/g, "");
  }

  if (Array.isArray(val)) {
    return val.map((item) => stripXss(item, currentKey));
  }

  if (typeof val === "object") {
    const cleaned = {};
    for (const key of Object.keys(val)) {
      cleaned[key] = stripXss(val[key], key);
    }
    return cleaned;
  }

  return val;
}

/**
 * Strip HTML tags from string values of an object in-place.
 * Skips keys listed in XSS_EXEMPT_KEYS.
 */
function stripXssInPlace(obj) {
  if (typeof obj !== "object" || obj === null) return;

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "string") {
      if (!XSS_EXEMPT_KEYS.has(key)) {
        obj[key] = obj[key].replace(/<[^>]*>/g, "");
      }
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      stripXssInPlace(obj[key]);
    }
  }
}

// ─── Zod Schema ──────────────────────────────────────────────────

/**
 * Zod schema that validates input is a plain object, then strips
 * any MongoDB operator keys via the sanitizeValue transform.
 */
const sanitizedObject = z.record(z.string(), z.any()).transform(sanitizeValue);

// ─── Express Middleware ──────────────────────────────────────────

/**
 * Express middleware that sanitizes req.body, req.query, and req.params
 * to strip MongoDB operator injection attempts and HTML/script tags (XSS).
 *
 * req.body is reassignable so we use the full Zod transform + stripXss.
 * req.query and req.params are read-only getters in Express 5,
 * so we sanitize them in-place.
 */
export function sanitizeInput(req, _res, next) {
  // 1. NoSQL injection sanitization
  if (req.body && typeof req.body === "object") {
    req.body = sanitizedObject.parse(req.body);
  }
  if (req.query && typeof req.query === "object") {
    sanitizeInPlace(req.query);
  }
  if (req.params && typeof req.params === "object") {
    sanitizeInPlace(req.params);
  }

  // 2. XSS sanitization — strip HTML tags from user input strings
  if (req.body && typeof req.body === "object") {
    req.body = stripXss(req.body);
  }
  if (req.query && typeof req.query === "object") {
    stripXssInPlace(req.query);
  }

  next();
}
