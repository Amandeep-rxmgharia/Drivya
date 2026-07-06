import mongoose, { Types } from "mongoose";
import Directory from "../models/directoryModel.js";
import User from "../models/userModel.js";
import Session from "../models/sessionModel.js";
import OTP from "../models/otpModel.js";
import { parseUserAgent, parseIpAndLocation } from "../utils/uaParser.js";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
  verifyRefreshToken,
  verifyAccessToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from "../config/tokenUtils.js";
import { createNotification } from "../services/notificationService.js";
import { sendOTPEmail } from "../utils/mailer.js";
import crypto from "node:crypto";
import { encryptStringAesGcm, decryptStringAesGcm } from "../utils/cryptoUtils.js";
import {
  generateTotpSecretBase32,
  buildOtpauthUrl,
  verifyTotpCode,
} from "../utils/totpUtils.js";

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
      const accessToken = generateAccessToken(user._id.toString(), sessionDoc._id.toString(), user.role);
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
  const { email, password, rememberMe } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password").lean(false);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const ua = parseUserAgent(req.headers["user-agent"]);
    const ipLoc = parseIpAndLocation(req);
console.log(user.twoFAEnabled);
    // Create active session. If 2FA is enabled, keep session unverified.
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

    const accessToken = generateAccessToken(user._id.toString(), sessionDoc._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString(), sessionDoc._id.toString(), !!rememberMe);
    setTokenCookies(res, accessToken, refreshToken, !!rememberMe);

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
      requiresTwoFA: !!user.twoFAEnabled,
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
    const user = await User.findById(decoded.id).select("role isActive").lean();
    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "Account suspended.", code: "ACCOUNT_SUSPENDED" });
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
    const newAccessToken = generateAccessToken(decoded.id, decoded.sid, user.role);
    const newRefreshToken = generateRefreshToken(decoded.id, decoded.sid, !!decoded.rememberMe);
    setTokenCookies(res, newAccessToken, newRefreshToken, !!decoded.rememberMe);

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
        } catch { }
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

// ─── 2FA Setup / Verify / Backup Codes / Disable ─────────────────────────────

function formatBackupCodeForUser(code) {
  // Create a human-friendly code like XXXX-XXXX-XXXX
  const hex = crypto.createHash("sha256").update(code).digest("hex");
  const raw = hex.slice(0, 12).toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export const setup2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.twoFAEnabled) {
      return res.status(400).json({ message: "2FA is already enabled." });
    }

    const secretBase32 = generateTotpSecretBase32(32);
    const otpauthUrl = buildOtpauthUrl({
      secretBase32,
      accountName: user.email,
      issuer: "Drivya",
    });

    const enc = encryptStringAesGcm(secretBase32);

    // Store pending secret by overwriting existing secret fields.
    // The secret becomes active only after verify.
    user.twoFASecretEnc = enc.ciphertextB64;
    user.twoFASecretIv = enc.ivB64;
    user.twoFASecretAuthTag = enc.authTagB64;


    // Do not enable until verification.
    await user.save();

    return res.json({
      message: "2FA setup initiated.",
      otpauthUrl,
      manualEntryKey: secretBase32,
    });
  } catch (err) {
    next(err);
  }
};

export const verify2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "2FA code is required." });

    const user = await User.findById(req.user.id).select(
      "twoFAEnabled twoFASecretEnc twoFASecretIv twoFASecretAuthTag twoFABackupCodes",
    );
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.twoFASecretEnc || !user.twoFASecretIv || !user.twoFASecretAuthTag) {
      return res.status(400).json({ message: "2FA setup not initialized." });
    }

    const secretBase32 = decryptStringAesGcm({
      ciphertextB64: user.twoFASecretEnc,
      ivB64: user.twoFASecretIv,
      authTagB64: user.twoFASecretAuthTag,
    });

    const ok = verifyTotpCode(secretBase32, code, { window: 1 });
    if (!ok) {
      return res.status(401).json({ message: "Invalid 2FA code." });
    }

    // Generate backup codes (plaintext returned once)
    const rawCodes = [];
    const plaintextCodes = [];
    for (let i = 0; i < 10; i++) {
      const token = crypto.randomBytes(16).toString("hex");
      plaintextCodes.push(formatBackupCodeForUser(token));
      rawCodes.push(token);
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

    // Store hashes of the plaintext codes
    const hashed = [];
    for (const c of plaintextCodes) {
      // Use bcrypt hash for single-use backup codes
      const bcryptHash = await bcrypt.hash(c, saltRounds);
      hashed.push({ hash: bcryptHash, used: false, usedAt: null });
    }

    user.twoFAEnabled = true;

    user.twoFABackupCodes = hashed;
    await user.save();

    // Mark current session verified
    if (req.user.sessionId) {
      await Session.findByIdAndUpdate(req.user.sessionId, { twoFAVerifiedAt: new Date() });
    }

    return res.json({
      message: "2FA enabled successfully.",
      backupCodes: plaintextCodes, // shown once
    });
  } catch (err) {
    next(err);
  }
};

export const regenerateBackupCodes = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.twoFAEnabled) {
      return res.status(400).json({ message: "2FA is not enabled." });
    }

    const secretBase32 = decryptStringAesGcm({
      ciphertextB64: user.twoFASecretEnc,
      ivB64: user.twoFASecretIv,
      authTagB64: user.twoFASecretAuthTag,
    });

    // Require current TOTP code for backup regeneration (step-up)
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "2FA code is required." });

    const ok = verifyTotpCode(secretBase32, code, { window: 1 });
    if (!ok) return res.status(401).json({ message: "Invalid 2FA code." });

    const plaintextCodes = [];
    for (let i = 0; i < 10; i++) {
      const token = crypto.randomBytes(16).toString("hex");
      plaintextCodes.push(formatBackupCodeForUser(token));
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashed = [];
    for (const c of plaintextCodes) {
      hashed.push({ hash: await bcrypt.hash(c, saltRounds), used: false, usedAt: null });
    }

    user.twoFABackupCodes = hashed;
    await user.save();

    return res.json({ message: "Backup codes regenerated.", backupCodes: plaintextCodes });
  } catch (err) {
    next(err);
  }
};

export const disable2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "2FA code is required." });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.twoFAEnabled) {
      return res.status(400).json({ message: "2FA is not enabled." });
    }

    const secretBase32 = decryptStringAesGcm({
      ciphertextB64: user.twoFASecretEnc,
      ivB64: user.twoFASecretIv,
      authTagB64: user.twoFASecretAuthTag,
    });

    const ok = verifyTotpCode(secretBase32, code, { window: 1 });
    if (!ok) return res.status(401).json({ message: "Invalid 2FA code." });

    user.twoFAEnabled = false;
    user.twoFASecretEnc = "";
    user.twoFASecretIv = "";
    user.twoFASecretAuthTag = "";
    user.twoFABackupCodes = [];

    await user.save();

    if (req.user.sessionId) {
      await Session.findByIdAndUpdate(req.user.sessionId, { twoFAVerifiedAt: null });
    }

    return res.json({ message: "2FA disabled successfully." });
  } catch (err) {
    next(err);
  }
};

// ─── Login 2FA Verification (Step 2 of two-step login) ───────
export const loginVerify2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "2FA code is required." });

    const user = await User.findById(req.user.id).select(
      "name email rootDirId twoFAEnabled twoFASecretEnc twoFASecretIv twoFASecretAuthTag twoFABackupCodes",
    );
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.twoFAEnabled) {
      return res.status(400).json({ message: "2FA is not enabled for this account." });
    }

    if (!user.twoFASecretEnc || !user.twoFASecretIv || !user.twoFASecretAuthTag) {
      return res.status(400).json({ message: "2FA setup is incomplete." });
    }

    const secretBase32 = decryptStringAesGcm({
      ciphertextB64: user.twoFASecretEnc,
      ivB64: user.twoFASecretIv,
      authTagB64: user.twoFASecretAuthTag,
    });

    const normalizedCode = String(code).trim();
    let verified = false;

    // 1. Try TOTP verification first
    if (verifyTotpCode(secretBase32, normalizedCode, { window: 1 })) {
      verified = true;
    }

    // 2. Fall back to backup code verification
    if (!verified && user.twoFABackupCodes?.length > 0) {
      for (const entry of user.twoFABackupCodes) {
        if (entry.used) continue;
        const isMatch = await bcrypt.compare(normalizedCode, entry.hash);
        if (isMatch) {
          entry.used = true;
          entry.usedAt = new Date();
          await user.save();
          verified = true;
          break;
        }
      }
    }

    if (!verified) {
      return res.status(401).json({ message: "Invalid 2FA code." });
    }

    // Mark session as 2FA-verified
    if (req.user.sessionId) {
      await Session.findByIdAndUpdate(req.user.sessionId, { twoFAVerifiedAt: new Date() });
    }

    return res.json({
      message: "2FA verification successful.",
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

// ─── Forgot Password / OTP Flow ──────────────────────────────
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found with this email." });
    }

    // Generate a 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Upsert the OTP document in the database
    await OTP.findOneAndUpdate(
      { email: email.toLowerCase() },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // Send the email
    await sendOTPEmail(user.email, otp);

    return res.json({ message: "Verification OTP has been sent to your email." });
  } catch (err) {
    next(err);
  }
};

export const verifyResetOtp = async (req, res, next) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP code are required." });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const otpRecord = await OTP.findOne({ email: normalizedEmail, otp: String(otp).trim() });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP code." });
    }

    // OTP is valid. Delete it
    await OTP.deleteOne({ _id: otpRecord._id });

    // Fetch the user to determine if 2FA is enabled
    const user = await User.findOne({ email: normalizedEmail }).select("twoFAEnabled").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate a temporary reset token indicating that email OTP has been verified
    const resetToken = generatePasswordResetToken(user._id.toString(), true, false);

    return res.json({
      message: "OTP verified successfully.",
      requiresTwoFA: !!user.twoFAEnabled,
      resetToken,
    });
  } catch (err) {
    next(err);
  }
};

export const verifyReset2FA = async (req, res, next) => {
  const { resetToken, code } = req.body;
  if (!resetToken) return res.status(400).json({ message: "Reset token is required." });
  if (!code) return res.status(400).json({ message: "2FA code is required." });

  try {
    const decoded = verifyPasswordResetToken(resetToken);
    if (!decoded.emailVerified) {
      return res.status(403).json({ message: "Email verification is required first." });
    }

    const user = await User.findById(decoded.id).select(
      "name email twoFAEnabled twoFASecretEnc twoFASecretIv twoFASecretAuthTag twoFABackupCodes"
    );
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.twoFAEnabled) {
      return res.status(400).json({ message: "2FA is not enabled for this account." });
    }

    const secretBase32 = decryptStringAesGcm({
      ciphertextB64: user.twoFASecretEnc,
      ivB64: user.twoFASecretIv,
      authTagB64: user.twoFASecretAuthTag,
    });

    const normalizedCode = String(code).trim();
    let verified = false;

    // 1. Try TOTP verification
    if (verifyTotpCode(secretBase32, normalizedCode, { window: 1 })) {
      verified = true;
    }

    // 2. Try backup codes verification
    if (!verified && user.twoFABackupCodes?.length > 0) {
      for (const entry of user.twoFABackupCodes) {
        if (entry.used) continue;
        const isMatch = await bcrypt.compare(normalizedCode, entry.hash);
        if (isMatch) {
          entry.used = true;
          entry.usedAt = new Date();
          await user.save();
          verified = true;
          break;
        }
      }
    }

    if (!verified) {
      return res.status(401).json({ message: "Invalid 2FA code." });
    }

    // Generate token with 2FA verified
    const newResetToken = generatePasswordResetToken(user._id.toString(), true, true);
    return res.json({
      message: "2FA verification successful.",
      resetToken: newResetToken,
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired reset token." });
    }
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken) return res.status(400).json({ message: "Reset token is required." });

  try {
    const decoded = verifyPasswordResetToken(resetToken);
    if (!decoded.emailVerified) {
      return res.status(403).json({ message: "Email verification is required first." });
    }

    const user = await User.findById(decoded.id).select(
      "+password name email rootDirId role twoFAEnabled loginAlerts"
    );
    if (!user) return res.status(404).json({ message: "User not found." });

    // Check if 2FA was required and verified
    if (user.twoFAEnabled && !decoded.twoFAVerified) {
      return res.status(403).json({ message: "2FA verification is required." });
    }

    // If newPassword is provided, update password.
    // If not provided (skipped), do nothing.
    if (newPassword) {
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long." });
      }
      user.password = newPassword;
      await user.save();
    }

    // Create session and log the user in
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
      twoFAVerifiedAt: user.twoFAEnabled ? new Date() : null,
    });

    const accessToken = generateAccessToken(user._id.toString(), sessionDoc._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString(), sessionDoc._id.toString());
    setTokenCookies(res, accessToken, refreshToken);

    if (user.loginAlerts !== false) {
      createNotification(user._id, {
        type: "security",
        title: newPassword ? "Password reset successful" : "New sign-in detected",
        description: newPassword
          ? `Your password was successfully reset and a new session started from ${ua.browser} on ${ua.os} (${ipLoc.ip}).`
          : `Account accessed from ${ua.browser} on ${ua.os} (${ipLoc.ip}) following identity verification.`,
        actionLabel: "Review activity",
        actionPath: "/dashboard/settings/security",
      }).catch((err) => console.error("Notification[reset-login]:", err));
    }

    return res.json({
      message: newPassword ? "Password reset and logged in successfully!" : "Logged in successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        rootDirId: user.rootDirId,
      },
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired reset token." });
    }
    next(err);
  }
};

