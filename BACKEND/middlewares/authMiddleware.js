import { verifyAccessToken } from "../config/tokenUtils.js";
import Session from "../models/sessionModel.js";

/**
 * Protect routes — verifies JWT access token from httpOnly cookie
 * or Authorization header. Attaches `req.user` on success.
 */
export async function authenticate(req, res, next) {
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
    
    // Validate session if sessionId is in the token
    if (decoded.sid) {
      const sessionExists = await Session.exists({ _id: decoded.sid, userId: decoded.id });
      if (!sessionExists) {
        return res.status(401).json({ message: "Session expired or revoked.", code: "SESSION_REVOKED" });
      }
      req.user = { id: decoded.id, sessionId: decoded.sid };
    } else {
      req.user = { id: decoded.id };
    }
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

/**
 * Identify user if token is present, but do not fail if it isn't.
 */
export async function softAuthenticate(req, res, next) {
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      if (decoded.sid) {
        const sessionExists = await Session.exists({ _id: decoded.sid, userId: decoded.id });
        if (sessionExists) {
          req.user = { id: decoded.id, sessionId: decoded.sid };
          return next();
        }
      } else {
        req.user = { id: decoded.id };
        return next();
      }
    } catch (err) {
      if (err.name === "TokenExpiredError" && req.cookies?.refreshToken) {
        return res
          .status(401)
          .json({ message: "Token expired.", code: "TOKEN_EXPIRED" });
      }
      // Ignore other invalid tokens for soft auth
    }
  } else if (req.cookies?.refreshToken) {
    // If no access token but refresh token exists, prompt for refresh
    return res
      .status(401)
      .json({ message: "Token expired.", code: "TOKEN_EXPIRED" });
  }
  next();
}
