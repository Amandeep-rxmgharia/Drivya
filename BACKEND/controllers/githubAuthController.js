import mongoose, { Types } from "mongoose";
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
 * Download a GitHub profile picture and save it to disk.
 * Returns the local avatar URL path, or empty string on failure.
 */
async function downloadGithubAvatar(pictureUrl, userId) {
  try {
    const response = await fetch(pictureUrl, {
      headers: {
        "User-Agent": "DRIVYA-Server",
      },
    });
    if (!response.ok) return "";

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png")
      ? ".png"
      : contentType.includes("webp")
        ? ".webp"
        : ".jpg";

    await fsp.mkdir(AVATAR_DIR, { recursive: true });
    const filename = `${userId}_github_${Date.now()}${ext}`;
    await fsp.writeFile(path.join(AVATAR_DIR, filename), buffer);
    return `/api/account/avatar/${filename}`;
  } catch (err) {
    console.error("[downloadGithubAvatar] Failed:", err.message);
    return "";
  }
}

const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_REDIRECT_URI,
  CORS_ORIGIN = "http://localhost:5173",
} = process.env;

// ─── Shared: Find or create user from GitHub profile ─────────
async function findOrCreateGithubUser({ githubId, email, name, picture }, req) {
  const mongoSession = await mongoose.startSession();
  let user;
  let isNewUser = false;
  let needsAvatarDownload = false;

  try {
    await mongoSession.withTransaction(async () => {
      // 1. Try to find by githubId first
      user = await User.findOne({ githubId }).session(mongoSession);
      if (user) return;

      // 2. Try to find by email (account linking)
      user = await User.findOne({ email }).session(mongoSession);
      if (user) {
        // Link GitHub account to existing local user
        user.githubId = githubId;
        if (!user.avatarUrl && picture) {
          needsAvatarDownload = true;
        }
        await user.save({ session: mongoSession });
        return;
      }

      // 3. No user exists — create new GitHub user
      isNewUser = true;
      needsAvatarDownload = !!picture;
      const rootDirId = new Types.ObjectId();

      const [newUser] = await User.create(
        [
          {
            name,
            email,
            githubId,
            authProvider: "github",
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

  // Download avatar outside the transaction
  if (needsAvatarDownload && picture && user) {
    const localAvatarUrl = await downloadGithubAvatar(picture, user._id.toString());
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
      title: "New sign-in via GitHub",
      description: `Account accessed via GitHub Sign-In from ${ua.browser} on ${ua.os} (${ipLoc.ip}).`,
      actionLabel: "Review activity",
      actionPath: "/dashboard/settings/security",
    }).catch((err) => console.error("Notification[github-login]:", err));
  }

  return sessionDoc;
}

// ─── GET /auth/github/login-url ──────────────────────────────
export const githubLoginUrl = async (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).json({ message: "GitHub client configuration is missing." });
  }

  const scopes = ["read:user", "user:email"];
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    GITHUB_REDIRECT_URI
  )}&scope=${encodeURIComponent(scopes.join(" "))}&state=github_login`;

  return res.json({ url });
};

// ─── GET /auth/github/callback ───────────────────────────────
export const githubLoginCallback = async (req, res, next) => {
  const { code, error, error_description } = req.query;
  const frontendBase = CORS_ORIGIN;

  if (error) {
    return res.redirect(
      `${frontendBase}/auth?github=error&message=${encodeURIComponent(
        error_description || error
      )}`
    );
  }

  if (!code) {
    return res.redirect(
      `${frontendBase}/auth?github=error&message=${encodeURIComponent(
        "Missing authorization code."
      )}`
    );
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "DRIVYA-Server",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for GitHub access token.");
    }

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error("GitHub access token was not returned.");
    }

    // 2. Fetch User Profile
    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DRIVYA-Server",
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error("[GitHub Profile Fetch Failed]", profileResponse.status, errorText);
      throw new Error("Failed to retrieve user profile from GitHub.");
    }

    const profileData = await profileResponse.json();
    console.log("[GitHub OAuth Debug] Profile Data:", profileData);
    const githubId = String(profileData.id);
    const name = profileData.name || profileData.login; // Fallback to login username
    const picture = profileData.avatar_url;

    // 3. Fetch User Emails (especially if primary email is private)
    console.log("[GitHub OAuth Debug] Fetching emails...");
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DRIVYA-Server",
      },
    });

    let email = profileData.email;
    console.log("[GitHub OAuth Debug] Profile Email:", email);
    console.log("[GitHub OAuth Debug] Emails Response Status:", emailsResponse.status, "OK:", emailsResponse.ok);

    if (emailsResponse.ok) {
      const emailsData = await emailsResponse.json();
      console.log("[GitHub OAuth Debug] Emails Data:", emailsData);
      if (Array.isArray(emailsData) && emailsData.length > 0) {
        // Look for the primary verified email, or first verified email, or first email
        const primaryEmailObj = emailsData.find((e) => e.primary && e.verified);
        const verifiedEmailObj = emailsData.find((e) => e.verified);
        const fallbackEmailObj = emailsData[0];

        console.log("[GitHub OAuth Debug] Found email candidate objects:", {
          primaryEmailObj,
          verifiedEmailObj,
          fallbackEmailObj,
        });

        email =
          primaryEmailObj?.email ||
          verifiedEmailObj?.email ||
          fallbackEmailObj?.email ||
          email;
      }
    } else {
      const errorText = await emailsResponse.text();
      console.error("[GitHub Emails Fetch Failed]", emailsResponse.status, errorText);
    }

    console.log("[GitHub OAuth Debug] Final Email resolved:", email);

    if (!email) {
      throw new Error("A verified email address is required to register via GitHub.");
    }

    // 4. Find or Create User
    const { user, isNewUser } = await findOrCreateGithubUser(
      { githubId, email, name, picture },
      req
    );

    if (!user.isActive) {
      return res.redirect(`${frontendBase}/auth?github=suspended`);
    }

    if (user.isDeactivated) {
      const deactivatedToken = generateDeactivatedToken(user._id.toString(), false, false);
      return res.redirect(
        `${frontendBase}/auth?github=deactivated&email=${encodeURIComponent(
          user.email
        )}&deactivatedToken=${encodeURIComponent(deactivatedToken)}`
      );
    }

    await createSessionAndSetCookies(user, req, res);

    // If 2FA is enabled, redirect with flag
    if (user.twoFAEnabled) {
      return res.redirect(`${frontendBase}/auth?github=2fa`);
    }

    return res.redirect(`${frontendBase}/auth?github=success`);
  } catch (err) {
    console.error("[GitHub Login Callback] Error:", err.message);
    return res.redirect(
      `${frontendBase}/auth?github=error&message=${encodeURIComponent(
        err.message || "GitHub authentication failed."
      )}`
    );
  }
};

// Export for use in app.js as a standalone handler
export const githubLoginCallbackHandler = githubLoginCallback;
