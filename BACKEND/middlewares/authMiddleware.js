import { verifyAccessToken } from "../config/tokenUtils.js";

/**
 * Protect routes — verifies JWT access token from httpOnly cookie
 * or Authorization header. Attaches `req.user` on success.
 */
export function authenticate(req, res, next) {
  // 1. Try httpOnly cookie first, fallback to Authorization header
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    if (req.cookies?.refreshToken) {
      return res
        .status(401)
        .json({ message: "Token expired.", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token expired.", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ message: "Invalid token." });
  }
}
