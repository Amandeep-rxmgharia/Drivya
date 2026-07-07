import { verifyAccessToken } from "../config/tokenUtils.js";
import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";

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
    }

    // Fetch user details for RBAC & suspension checks
    const user = await User.findById(decoded.id).select("role isActive isDeactivated").lean();
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "Your account has been suspended. Please contact support.", code: "ACCOUNT_SUSPENDED" });
    }
    if (user.isDeactivated) {
      return res.status(403).json({ message: "Account is deactivated.", code: "ACCOUNT_DEACTIVATED" });
    }

    req.user = {
      id: decoded.id,
      sessionId: decoded.sid || null,
      role: user.role,
    };

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
      let sessionExists = true;
      if (decoded.sid) {
        sessionExists = await Session.exists({ _id: decoded.sid, userId: decoded.id });
      }
      
      if (sessionExists) {
        const user = await User.findById(decoded.id).select("role isActive isDeactivated").lean();
        if (user) {
          if (!user.isActive) {
            return res.status(403).json({ message: "Your account has been suspended. Please contact support.", code: "ACCOUNT_SUSPENDED" });
          }
          if (user.isDeactivated) {
            return res.status(403).json({ message: "Account is deactivated.", code: "ACCOUNT_DEACTIVATED" });
          }
          req.user = {
            id: decoded.id,
            sessionId: decoded.sid || null,
            role: user.role,
          };
          return next();
        }
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
