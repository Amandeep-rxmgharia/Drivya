import jwt from "jsonwebtoken";

const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRY = "15m",
  REFRESH_TOKEN_EXPIRY = "7d",
  NODE_ENV,
} = process.env;

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
