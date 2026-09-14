import { verifySessionToken } from "../config/tokenUtils.js";
import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";
import {
  getSessionFromRedis,
  saveSessionToRedis,
  touchSessionInRedis,
} from "../services/sessionRedisService.js";

/**
 * Protect routes — verifies JWT session token from httpOnly cookie
 * or Authorization header. Attaches `req.user` on success.
 */
export async function authenticate(req, res, next) {
  // 1. Try httpOnly cookie first (sessionToken, fallback to legacy accessToken), then Authorization header
  const token =
    req.cookies?.sessionToken ||
    req.cookies?.accessToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const decoded = verifySessionToken(token);
    
    // Validate session if sessionId is in the token
    if (decoded.sid) {
      // Fast check in Redis first
      let session = await getSessionFromRedis(decoded.sid);

      if (session) {
        if (session.userId !== decoded.id) {
          return res.status(401).json({ message: "Session expired or revoked.", code: "SESSION_REVOKED" });
        }
        // Non-blocking update of Redis session activity
        touchSessionInRedis(decoded.sid);
      } else {
        // Cache miss: fall back to MongoDB check
        const dbSession = await Session.findOne({ _id: decoded.sid, userId: decoded.id }).lean();
        if (!dbSession) {
          return res.status(401).json({ message: "Session expired or revoked.", code: "SESSION_REVOKED" });
        }

        // Cache session back in Redis for subsequent requests
        saveSessionToRedis(decoded.sid, {
          userId: dbSession.userId,
          role: decoded.role || "user",
          twoFAVerifiedAt: dbSession.twoFAVerifiedAt,
        });
      }

      // Periodically update session lastActive in MongoDB (throttled to at most once every 5 minutes)
      Session.updateOne(
        { _id: decoded.sid, lastActive: { $lt: new Date(Date.now() - 5 * 60 * 1000) } },
        { lastActive: new Date() }
      ).exec().catch(() => {});
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
        .json({ message: "Session expired.", code: "SESSION_EXPIRED" });
    }
    return res.status(401).json({ message: "Invalid session token." });
  }
}

/**
 * Identify user if token is present, but do not fail if it isn't.
 */
export async function softAuthenticate(req, res, next) {
  const token =
    req.cookies?.sessionToken ||
    req.cookies?.accessToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (token) {
    try {
      const decoded = verifySessionToken(token);
      let sessionExists = true;
      if (decoded.sid) {
        const redisSession = await getSessionFromRedis(decoded.sid);
        if (redisSession) {
          sessionExists = redisSession.userId === decoded.id;
        } else {
          sessionExists = await Session.exists({ _id: decoded.sid, userId: decoded.id });
        }
      }
      
      if (sessionExists) {
        const user = await User.findById(decoded.id).select("role isActive isDeactivated email").lean();
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
            signedAccount: user.email
          };
          return next();
        }
      }
    } catch {
      // Ignore invalid or expired tokens for soft auth
    }
  }
  next();
}
