import rateLimit from "express-rate-limit";
import {
  generateShareAccessToken,
  verifyShareAccessToken,
} from "../config/tokenUtils.js";
import Share from "../models/shareModel.js";
import { VISIBILITY } from "../constants/shareConstants.js";
import {
  isShareAccessible,
  isUserAuthorizedForShare,
} from "../services/shareService.js";
import User from "../models/userModel.js";

/**
 * Stricter rate limit for public share endpoints (brute-force protection).
 */
export const publicShareRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

/**
 * Password attempt rate limit — 10 tries per 15 min per IP.
 */
export const sharePasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password attempts. Please try again later." },
});

/**
 * Resolve share from URL token and attach to request.
 * Does NOT enforce password — use requireShareAccess for that.
 */
export async function resolvePublicShare(req, res, next) {
  try {
    const { token } = req.params;

    const share = await Share.findOne({ token }).select("+passwordHash").lean();

    if (!share) {
      return res.status(404).json({ message: "Share link not found." });
    }

    if (!isShareAccessible(share)) {
      return res
        .status(410)
        .json({ message: "This share link is no longer available." });
    }

    req.share = share;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Ensure caller has access to a password-protected share or authorized restricted share.
 * Accepts shareAccessToken cookie, Authorization header, or ?accessToken query for password-protected shares.
 * For user-restricted shares, it relies on req.user identification.
 */
export async function requireShareAccess(req, res, next) {
  const share = req.share;

  // 1. Restricted User-based Check
  if (share.visibility === VISIBILITY.RESTRICTED) {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required to access this restricted share.",
        code: "AUTH_REQUIRED",
      });
    }

    const authorized = await isUserAuthorizedForShare(share, req.user.id);
    const { email } = await User.findById(req.user.id).select("email").lean();
    if (!authorized) {
      return res.status(403).json({
        message: "You are not authorized to access this restricted share.",
        signedAccount: email,
      });
    }
  }

  // 2. Password Protection Check
  const needsPassword =
    share.visibility === VISIBILITY.RESTRICTED && share.passwordHash;

  if (needsPassword) {
    const accessToken =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.query.accessToken ||
      req.cookies?.[`shareAccessToken_${share.token}`] ||
      req.cookies?.shareAccessToken;

    if (!accessToken) {
      return res.status(401).json({
        message: "Password required to access this share.",
        code: "SHARE_PASSWORD_REQUIRED",
      });
    }

    try {
      const decoded = verifyShareAccessToken(accessToken);
      if (decoded.shareToken !== share.token) {
        return res.status(401).json({ message: "Invalid share access token." });
      }

      // 3. Password Signature Verification (Optimized Invalidation)
      const currentPsv = share.passwordHash
        ? share.passwordHash.slice(-10)
        : "open";
      if (decoded.psv !== currentPsv) {
        return res.status(401).json({
          message:
            "The owner has updated the share password. Please re-enter the password.",
          code: "SHARE_PASSWORD_CHANGED",
        });
      }
    } catch {
      return res.status(401).json({
        message: "Share access token expired or invalid.",
        code: "SHARE_ACCESS_EXPIRED",
      });
    }
  }

  next();
}

export { generateShareAccessToken };
