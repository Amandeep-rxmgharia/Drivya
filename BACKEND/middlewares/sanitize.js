import { z } from "zod";

/**
 * Zod-based MongoDB NoSQL injection sanitizer.
 *
 * Recursively strips any keys starting with "$" (MongoDB operators like
 * $gt, $ne, $regex, $where, etc.) from objects. Also strips dots in keys
 * which can be used for MongoDB dot-notation injection.
 *
 * This replaces `express-mongo-sanitize` with zero third-party risk.
 */

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

/**
 * Zod schema that validates input is a plain object, then strips
 * any MongoDB operator keys via the sanitizeValue transform.
 */
const sanitizedObject = z.record(z.string(), z.any()).transform(sanitizeValue);

/**
 * Express middleware that sanitizes req.body, req.query, and req.params
 * to strip MongoDB operator injection attempts.
 *
 * req.body is reassignable so we use the full Zod transform.
 * req.query and req.params are read-only getters in Express 5,
 * so we sanitize them in-place.
 */
export function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizedObject.parse(req.body);
  }
  if (req.query && typeof req.query === "object") {
    sanitizeInPlace(req.query);
  }
  if (req.params && typeof req.params === "object") {
    sanitizeInPlace(req.params);
  }
  next();
}
