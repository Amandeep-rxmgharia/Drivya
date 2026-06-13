import rateLimit from "express-rate-limit";
import {
  generateShareAccessToken,
  verifyShareAccessToken,
} from "../config/tokenUtils.js";
import Share from "../models/shareModel.js";
import { VISIBILITY } from "../constants/shareConstants.js";
import { isShareAccessible } from "../services/shareService.js";

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

    const share = await Share.findOne({ token, revokedAt: null })
      .select("+passwordHash")
      .lean();

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
 * Ensure caller has access to a password-protected share.
 * Accepts shareAccessToken cookie, Authorization header, or ?accessToken query.
 */
export function requireShareAccess(req, res, next) {
  const share = req.share;

  const needsPassword =
    share.visibility === VISIBILITY.RESTRICTED && share.passwordHash;

  if (!needsPassword) {
    return next();
  }

  const accessToken =
    req.cookies?.shareAccessToken ||
    req.headers.authorization?.replace("Bearer ", "") ||
    req.query.accessToken;

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
    next();
  } catch {
    return res.status(401).json({
      message: "Share access token expired or invalid.",
      code: "SHARE_ACCESS_EXPIRED",
    });
  }
}

export { generateShareAccessToken };
