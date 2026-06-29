import mongoose, { Types } from "mongoose";
import Directory from "../models/directoryModel.js";
import User from "../models/userModel.js";
import Session from "../models/sessionModel.js";
import { parseUserAgent, parseIpAndLocation } from "../utils/uaParser.js";
import {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
  verifyRefreshToken,
  verifyAccessToken,
} from "../config/tokenUtils.js";
import { createNotification } from "../services/notificationService.js";

// ─── Register ────────────────────────────────────────────────
export const register = async (req, res, next) => {
  const { name, email, contact, password } = req.body;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Create user (password is hashed automatically by pre-save hook)
      const [user] = await User.create(
        [
          {
            name,
            email,
            password,
            contact,
          },
        ],
        { session },
      );

      // Create root directory linked to user
      const rootDirId = new Types.ObjectId();
      await Directory.create(
        [
          {
            _id: rootDirId,
            name: `root@${email}`,
            userId: user._id,
            path: [],
            depth: 0,
          },
        ],
        { session },
      );

      // Update user with root directory reference
      user.rootDirId = rootDirId;
      await user.save({ session });

      // Create active session
      const ua = parseUserAgent(req.headers["user-agent"]);
      const ipLoc = parseIpAndLocation(req);
      const [sessionDoc] = await Session.create(
        [
          {
            userId: user._id,
            device: ua.device,
            browser: ua.browser,
            os: ua.os,
            ip: ipLoc.ip,
            location: ipLoc.location,
            lastActive: new Date(),
          },
        ],
        { session },
      );

      // Generate tokens
      const accessToken = generateAccessToken(user._id.toString(), sessionDoc._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString(), sessionDoc._id.toString());
      setTokenCookies(res, accessToken, refreshToken);

      return res.status(201).json({
        message: "Registration successful!",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          rootDirId: rootDirId,
        },
      });
    });
  } catch (err) {
    if (err?.code === 11000 || err?.errorResponse?.code === 11000) {
      const field = err.keyPattern
        ? Object.keys(err.keyPattern)[0]
        : "email";
      return res.status(409).json({
        message:
          field === "contact"
            ? "Phone number already registered."
            : "Email already registered.",
      });
    }
    next(err);
  } finally {
    await session.endSession();
  }
};

// ─── Login ───────────────────────────────────────────────────
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password").lean(false);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Create active session
    const ua = parseUserAgent(req.headers["user-agent"]);
    const ipLoc = parseIpAndLocation(req);
    const sessionDoc = await Session.create({
      userId: user._id,
      device: ua.device,
      browser: ua.browser,
      os: ua.os,
      ip: ipLoc.ip,
      location: ipLoc.location,
      lastActive: new Date(),
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString(), sessionDoc._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString(), sessionDoc._id.toString());
    setTokenCookies(res, accessToken, refreshToken);

    if (user.loginAlerts !== false) {
      createNotification(user._id, {
        type: "security",
        title: "New sign-in detected",
        description: `Account accessed from ${ua.browser} on ${ua.os} (${ipLoc.ip}).`,
        actionLabel: "Review activity",
        actionPath: "/dashboard/settings/security",
      }).catch((err) => console.error("Notification[login]:", err));
    }

    return res.json({
      message: "Login successful!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        rootDirId: user.rootDirId,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Refresh Token ───────────────────────────────────────────
export const refresh = async (req, res, next) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "Refresh token required." });
  }

  try {
    const decoded = verifyRefreshToken(token);
    // Verify user still exists
    const user = await User.findById(decoded.id).lean().select("_id");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    // Verify session still exists
    if (decoded.sid) {
      const sessionExists = await Session.exists({ _id: decoded.sid, userId: decoded.id });
      if (!sessionExists) {
        return res.status(401).json({ message: "Session expired or revoked.", code: "SESSION_REVOKED" });
      }
      // Update session last active time
      await Session.findByIdAndUpdate(decoded.sid, { lastActive: new Date() });
    }

    // Issue new access token (token rotation)
    const newAccessToken = generateAccessToken(decoded.id, decoded.sid);
    const newRefreshToken = generateRefreshToken(decoded.id, decoded.sid);
    setTokenCookies(res, newAccessToken, newRefreshToken);

    return res.json({ message: "Token refreshed." });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid refresh token." });
    }
    next(err);
  }
};

// ─── Logout ──────────────────────────────────────────────────
export const logout = async (req, res, next) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      if (decoded.sid) {
        await Session.findByIdAndDelete(decoded.sid);
      }
    } catch {
      // Fallback to refresh token if access token is expired
      const refreshTokenCookie = req.cookies?.refreshToken;
      if (refreshTokenCookie) {
        try {
          const decoded = verifyRefreshToken(refreshTokenCookie);
          if (decoded.sid) {
            await Session.findByIdAndDelete(decoded.sid);
          }
        } catch {}
      }
    }
  }
  clearTokenCookies(res);
  return res.json({ message: "Logged out successfully." });
};

// ─── Get Current User ────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean().select("-__v");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ user });
  } catch (err) {
    next(err);
  }
};
