import mongoose, { Types } from "mongoose";
import { OAuth2Client } from "google-auth-library";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import User from "../models/userModel.js";
import Session from "../models/sessionModel.js";
import Directory from "../models/directoryModel.js";
import { parseUserAgent, parseIpAndLocation } from "../utils/uaParser.js";
import {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  generateDeactivatedToken,
} from "../config/tokenUtils.js";
import { createNotification } from "../services/notificationService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = path.resolve(__dirname, "..", "storage", "avatars");

/**
 * Download a Google profile picture and save it to disk.
 * Returns the local avatar URL path, or empty string on failure.
 */
async function downloadGoogleAvatar(pictureUrl, userId) {
  try {
    const response = await fetch(pictureUrl);
    if (!response.ok) return "";

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png")
      ? ".png"
      : contentType.includes("webp")
        ? ".webp"
        : ".jpg";

    await fsp.mkdir(AVATAR_DIR, { recursive: true });
    const filename = `${userId}_${Date.now()}${ext}`;
    await fsp.writeFile(path.join(AVATAR_DIR, filename), buffer);
    return `/api/account/avatar/${filename}`;
  } catch (err) {
    console.error("[downloadGoogleAvatar] Failed:", err.message);
    return "";
  }
}

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_LOGIN_REDIRECT_URI,
  CORS_ORIGIN = "http://localhost:5173",
} = process.env;

const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_LOGIN_REDIRECT_URI);

// ─── Shared: Find or create user from Google profile ─────────
async function findOrCreateGoogleUser({ googleId, email, name, picture }, req) {
  const mongoSession = await mongoose.startSession();
  let user;
  let isNewUser = false;
  let needsAvatarDownload = false;

  try {
    await mongoSession.withTransaction(async () => {
      // 1. Try to find by googleId first (returning user via Google)
      user = await User.findOne({ googleId }).session(mongoSession);
      if (user) return;

      // 2. Try to find by email (account linking)
      user = await User.findOne({ email }).session(mongoSession);
      if (user) {
        // Link Google account to existing local user
        user.googleId = googleId;
        if (!user.avatarUrl && picture) {
          // Mark for avatar download after transaction
          needsAvatarDownload = true;
        }
        await user.save({ session: mongoSession });
        return;
      }

      // 3. No user exists — create new Google user
      isNewUser = true;
      needsAvatarDownload = !!picture;
      const rootDirId = new Types.ObjectId();

      const [newUser] = await User.create(
        [
          {
            name,
            email,
            googleId,
            authProvider: "google",
            avatarUrl: "", // Will be set after avatar download
          },
        ],
        { session: mongoSession },
      );

      await Directory.create(
        [
          {
            _id: rootDirId,
            name: `root@${email}`,
            userId: newUser._id,
            path: [],
            depth: 0,
          },
        ],
        { session: mongoSession },
      );

      newUser.rootDirId = rootDirId;
      await newUser.save({ session: mongoSession });
      user = newUser;
    });
  } finally {
    await mongoSession.endSession();
  }

  // Download avatar outside the transaction to avoid holding the session
  // open during network I/O. Failure here won't affect login.
  if (needsAvatarDownload && picture && user) {
    const localAvatarUrl = await downloadGoogleAvatar(picture, user._id.toString());
    if (localAvatarUrl) {
      user.avatarUrl = localAvatarUrl;
      await user.save();
    }
  }

  return { user, isNewUser };
}

// ─── Shared: Create session and set cookies ──────────────────
async function createSessionAndSetCookies(user, req, res) {
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
    twoFAVerifiedAt: null,
  });

  const accessToken = generateAccessToken(
    user._id.toString(),
    sessionDoc._id.toString(),
    user.role,
  );
  const refreshToken = generateRefreshToken(
    user._id.toString(),
    sessionDoc._id.toString(),
  );
  setTokenCookies(res, accessToken, refreshToken);

  if (user.loginAlerts !== false) {
    createNotification(user._id, {
      type: "security",
      title: "New sign-in via Google",
      description: `Account accessed via Google Sign-In from ${ua.browser} on ${ua.os} (${ipLoc.ip}).`,
      actionLabel: "Review activity",
      actionPath: "/dashboard/settings/security",
    }).catch((err) => console.error("Notification[google-login]:", err));
  }

  return sessionDoc;
}

// ─── POST /auth/google — One Tap / GIS credential login ──────
export const googleLogin = async (req, res, next) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "Google credential is required." });
  }

  try {
    // Verify the id_token from Google Identity Services
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ message: "Invalid Google credential." });
    }

    const { sub: googleId, email, name, picture } = payload;

    const { user, isNewUser } = await findOrCreateGoogleUser(
      { googleId, email, name, picture },
      req,
    );

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account has been suspended. Please contact support.",
        code: "ACCOUNT_SUSPENDED"
      });
    }

    if (user.isDeactivated) {
      const deactivatedToken = generateDeactivatedToken(user._id.toString(), false, false);
      return res.status(403).json({
        message: "Account is deactivated.",
        code: "ACCOUNT_DEACTIVATED",
        email: user.email,
        deactivatedToken,
      });
    }

    await createSessionAndSetCookies(user, req, res);

    // If user has 2FA enabled, require verification
    if (user.twoFAEnabled) {
      return res.json({
        message: isNewUser ? "Registration successful!" : "Login successful!",
        requiresTwoFA: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          rootDirId: user.rootDirId,
        },
      });
    }

    return res.json({
      message: isNewUser ? "Registration successful!" : "Login successful!",
      requiresTwoFA: false,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        rootDirId: user.rootDirId,
      },
    });
  } catch (err) {
    if (err.message?.includes("Token used too late") || err.message?.includes("Invalid token")) {
      return res.status(401).json({ message: "Google credential expired or invalid. Please try again." });
    }
    next(err);
  }
};

// ─── GET /auth/google/login-url — OAuth redirect flow ────────
export const googleLoginUrl = async (req, res) => {
  const scopes = ["openid", "email", "profile"];

  // Preserve the redirect path through the OAuth flow via the state parameter
  const redirectPath = req.query.redirect || "";
  const statePayload = JSON.stringify({ provider: "google_login", redirect: redirectPath });
  const stateEncoded = Buffer.from(statePayload).toString("base64url");
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state: stateEncoded,
  });

  return res.json({ url });
};

// ─── GET /auth/google/login/callback — OAuth redirect callback
export const googleLoginCallback = async (req, res, next) => {
  const { code, error, state } = req.query;
console.log(state);
  const frontendBase = CORS_ORIGIN;

  // Decode the redirect path from the OAuth state parameter
  let redirectPath = "";
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
      redirectPath = decoded.redirect || "";
    } catch (_) { /* ignore malformed state */ }
  }
  const redirectSuffix = redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : "";

  if (error) {
    return res.redirect(`${frontendBase}/auth?google=error&message=${encodeURIComponent(error)}${redirectSuffix}`);
  }

  if (!code) {
    return res.redirect(`${frontendBase}/auth?google=error&message=${encodeURIComponent("Missing authorization code.")}${redirectSuffix}`);
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oAuth2Client.getToken(code);

    // Decode id_token to get user info
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.redirect(`${frontendBase}/auth?google=error&message=${encodeURIComponent("Failed to retrieve Google profile.")}${redirectSuffix}`);
    }

    const { sub: googleId, email, name, picture } = payload;

    const { user, isNewUser } = await findOrCreateGoogleUser(
      { googleId, email, name, picture },
      req,
    );

    if (!user.isActive) {
      return res.redirect(
        `${frontendBase}/auth?google=suspended${redirectSuffix}`
      );
    }

    if (user.isDeactivated) {
      const deactivatedToken = generateDeactivatedToken(user._id.toString(), false, false);
      return res.redirect(
        `${frontendBase}/auth?google=deactivated&email=${encodeURIComponent(user.email)}&deactivatedToken=${encodeURIComponent(deactivatedToken)}${redirectSuffix}`
      );
    }

    await createSessionAndSetCookies(user, req, res);

    // If 2FA is enabled, redirect with flag
    if (user.twoFAEnabled) {
      return res.redirect(`${frontendBase}/auth?google=2fa${redirectSuffix}`);
    }

    return res.redirect(`${frontendBase}/auth?google=success${redirectSuffix}`);
  } catch (err) {
    console.error("[Google Login Callback] Error:", err.message);
    return res.redirect(`${frontendBase}/auth?google=error&message=${encodeURIComponent("Google authentication failed.")}${redirectSuffix}`);
  }
};

// Export for use in app.js as a standalone handler
export const googleLoginCallbackHandler = googleLoginCallback;
