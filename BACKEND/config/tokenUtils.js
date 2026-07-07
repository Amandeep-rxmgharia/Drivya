import jwt from "jsonwebtoken";

const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_SHARE_SECRET,
  ACCESS_TOKEN_EXPIRY = "15m",
  REFRESH_TOKEN_EXPIRY = "7d",
  SHARE_ACCESS_TOKEN_EXPIRY = "1h",
  NODE_ENV,
} = process.env;

const SHARE_SECRET = JWT_SHARE_SECRET || JWT_ACCESS_SECRET;

/**
 * Generate a short-lived access token.
 * @param {string} userId
 * @returns {string}
 */
export function generateAccessToken(userId, sessionId, role = "user") {
  return jwt.sign({ id: userId, sid: sessionId, role }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate a long-lived refresh token.
 * @param {string} userId
 * @param {string} sessionId
 * @param {boolean} rememberMe
 * @returns {string}
 */
export function generateRefreshToken(userId, sessionId, rememberMe = false) {
  return jwt.sign({ id: userId, sid: sessionId, rememberMe }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify an access token.
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

/**
 * Set access + refresh tokens as httpOnly cookies.
 */
export function setTokenCookies(res, accessToken, refreshToken, rememberMe = false) {
  const isProduction = NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: "/",
  });

  const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
  };

  if (rememberMe) {
    refreshCookieOptions.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
}

export function clearTokenCookies(res) {
  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });
}

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
