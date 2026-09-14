import jwt from "jsonwebtoken";

const {
  JWT_SESSION_SECRET,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_SHARE_SECRET,
  FILE_WORKER_JWT_SECRET,
  SESSION_TOKEN_EXPIRY = "7d",
  ACCESS_TOKEN_EXPIRY = "15m",
  REFRESH_TOKEN_EXPIRY = "7d",
  SHARE_ACCESS_TOKEN_EXPIRY = "1h",
  NODE_ENV,
} = process.env;

const SESSION_SECRET = JWT_SESSION_SECRET || JWT_ACCESS_SECRET;
const SHARE_SECRET = JWT_SHARE_SECRET || JWT_ACCESS_SECRET;
const FILE_WORKER_SECRET = FILE_WORKER_JWT_SECRET || JWT_ACCESS_SECRET;

/**
 * Generate a single session token.
 * @param {string} userId
 * @param {string} sessionId
 * @param {string} role
 * @param {boolean} rememberMe
 * @returns {string}
 */
export function generateSessionToken(userId, sessionId, role = "user", rememberMe = false) {
  const expiresIn = rememberMe ? "30d" : (SESSION_TOKEN_EXPIRY || "7d");
  return jwt.sign({ id: userId, sid: sessionId, role }, SESSION_SECRET, {
    expiresIn,
  });
}

/**
 * Verify a session token.
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifySessionToken(token) {
  return jwt.verify(token, SESSION_SECRET);
}

/**
 * Set session token as httpOnly cookie and clear old token cookies.
 * @param {object} res - Express response
 * @param {string} sessionToken
 * @param {boolean} rememberMe
 */
export function setSessionCookie(res, sessionToken, rememberMe = false) {
  const isProduction = NODE_ENV === "production";
  const maxAge = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000; // 30 days or 7 days

  res.cookie("sessionToken", sessionToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge,
    path: "/",
  });

  // Clear legacy access and refresh cookies
  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });
}

/**
 * Clear all auth cookies (sessionToken and legacy cookies).
 * @param {object} res - Express response
 */
export function clearTokenCookies(res) {
  res.clearCookie("sessionToken", { path: "/" });
  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });
}

// ─── Backward-compatible Aliases ──────────────────────────────
export const generateAccessToken = (userId, sessionId, role = "user") =>
  generateSessionToken(userId, sessionId, role, false);

export const generateRefreshToken = (userId, sessionId, rememberMe = false) =>
  generateSessionToken(userId, sessionId, "user", rememberMe);

export const verifyAccessToken = verifySessionToken;
export const verifyRefreshToken = verifySessionToken;

export const setTokenCookies = (res, accessToken, _refreshToken, rememberMe = false) => {
  setSessionCookie(res, accessToken, rememberMe);
};

/**
 * Short-lived token granting access to a password-protected public share.
 * @param {string} shareToken - public share slug
 * @param {string} passwordHash - current password hash to bind the token
 */
export function generateShareAccessToken(shareToken, passwordHash = "") {
  // Use a derivative of the password hash to avoid exposing the actual hash in JWT
  const psv = passwordHash ? passwordHash.slice(-10) : "open";
  return jwt.sign({ shareToken, psv, type: "share_access" }, SHARE_SECRET, {
    expiresIn: SHARE_ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Verify a share access token.
 * @param {string} token
 * @returns {{ shareToken: string, psv: string, type: string }}
 */
export function verifyShareAccessToken(token) {
  const decoded = jwt.verify(token, SHARE_SECRET);
  if (decoded.type !== "share_access") {
    throw new Error("Invalid share access token.");
  }
  return decoded;
}

/**
 * Set share access cookie for public downloads/previews.
 */
export function setShareAccessCookie(res, shareToken, token) {
  const isProduction = NODE_ENV === "production";

  res.cookie(`shareAccessToken_${shareToken}`, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 60 * 60 * 1000, // 1 hour
  });
}

// ─── Short-lived download tokens ────────────────────────────────
// Used to allow direct browser-native file downloads without cookies.
// The frontend obtains a token via an authenticated API call, then
// navigates the browser to /api/files/download/<token> which streams
// the file without requiring auth cookies (the token IS the auth).

/**
 * Generate a short-lived download token (60s) for a specific file.
 * @param {string} userId
 * @param {string} fileId
 * @returns {string}
 */
export function generateDownloadToken(userId, fileId) {
  return jwt.sign(
    { userId, fileId, type: "file_download" },
    JWT_ACCESS_SECRET,
    { expiresIn: "60s" },
  );
}

/**
 * Verify a download token.
 * @param {string} token
 * @returns {{ userId: string, fileId: string, type: string }}
 */
export function verifyDownloadToken(token) {
  const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
  if (decoded.type !== "file_download") {
    throw new Error("Invalid download token.");
  }
  return decoded;
}

/**
 * Generate a short-lived download token (60s) for a public share.
 * @param {string} shareToken
 * @returns {string}
 */
export function generateShareDownloadToken(shareToken) {
  return jwt.sign(
    { shareToken, type: "share_download" },
    JWT_ACCESS_SECRET,
    { expiresIn: "60s" }
  );
}

/**
 * Verify a public share download token.
 * @param {string} token
 * @returns {{ shareToken: string, type: string }}
 */
export function verifyShareDownloadToken(token) {
  const decoded = verifyAccessToken(token);
  if (decoded.type !== "share_download") {
    throw new Error("Invalid share download token.");
  }
  return decoded;
}

/**
 * Generate a short-lived token specifically for password reset/verification steps.
 */
export function generatePasswordResetToken(userId, emailVerified = false, twoFAVerified = false) {
  return jwt.sign(
    { id: userId, emailVerified, twoFAVerified, type: "password_reset" },
    JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
}

/**
 * Verify password reset token.
 */
export function verifyPasswordResetToken(token) {
  const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
  if (decoded.type !== "password_reset") {
    throw new Error("Invalid password reset token.");
  }
  return decoded;
}

/**
 * Generate a short-lived token specifically for deactivated account actions.
 */
export function generateDeactivatedToken(userId, emailVerified = false, twoFAVerified = false) {
  return jwt.sign(
    { id: userId, emailVerified, twoFAVerified, type: "deactivated_action" },
    JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
}

/**
 * Verify deactivated action token.
 */
export function verifyDeactivatedToken(token) {
  const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
  if (decoded.type !== "deactivated_action") {
    throw new Error("Invalid deactivated action token.");
  }
  return decoded;
}

/**
 * Generate a short-lived token for Cloudflare Worker R2 file access.
 * @param {string} key - R2 storage key (e.g. "{userId}/{storageName}")
 * @param {object} [options]
 * @param {number} [options.expiresIn] - Expiry in seconds (default: 3600 = 1 hour)
 * @param {string} [options.disposition] - Content-Disposition (e.g. 'inline; filename="..."')
 * @param {string} [options.contentType] - MIME type override
 * @returns {string} Signed JWT
 */
export function generateFileWorkerToken(key, options = {}) {
  const {
    expiresIn = 3600,
    disposition,
    contentType,
  } = options;

  const payload = {
    key,
    type: "file_worker",
  };

  if (disposition) payload.disposition = disposition;
  if (contentType) payload.contentType = contentType;

  return jwt.sign(payload, FILE_WORKER_SECRET, {
    expiresIn,
  });
}

/**
 * Verify a file worker token.
 * @param {string} token
 * @returns {{ key: string, type: string, disposition?: string, contentType?: string }}
 */
export function verifyFileWorkerToken(token) {
  const decoded = jwt.verify(token, FILE_WORKER_SECRET);
  if (decoded.type !== "file_worker") {
    throw new Error("Invalid file worker token.");
  }
  return decoded;
}
