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
export function generateAccessToken(userId) {
  return jwt.sign({ id: userId }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate a long-lived refresh token.
 * @param {string} userId
 * @returns {string}
 */
export function generateRefreshToken(userId) {
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, {
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
export function setTokenCookies(res, accessToken, refreshToken) {
  const isProduction = NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // path: "/auth/refresh", // only sent on refresh endpoint
  });
}

export function clearTokenCookies(res) {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
}

/**
 * Short-lived token granting access to a password-protected public share.
 * @param {string} shareToken - public share slug
 */
export function generateShareAccessToken(shareToken) {
  return jwt.sign({ shareToken, type: "share_access" }, SHARE_SECRET, {
    expiresIn: SHARE_ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Verify a share access token.
 * @param {string} token
 * @returns {{ shareToken: string, type: string }}
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
export function setShareAccessCookie(res, token) {
  const isProduction = NODE_ENV === "production";

  res.cookie("shareAccessToken", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 60 * 60 * 1000, // 1 hour
  });
}
