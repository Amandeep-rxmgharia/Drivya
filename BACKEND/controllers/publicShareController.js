import {
  getPublicShareMetadata,
  verifySharePassword,
  resolveShareFileForPublicAccess,
  incrementShareView,
  incrementShareDownload,
  isUserAuthorizedForShare,
  isShareAccessible,
} from "../services/shareService.js";
import {
  generateDownloadUrl,
  updateFileContent as updateR2Content,
} from "../services/storageService.js";
import {
  generateShareAccessToken,
  setShareAccessCookie,
  verifyShareAccessToken,
  generateShareDownloadToken,
  verifyShareDownloadToken,
} from "../config/tokenUtils.js";
import { AppError } from "../utils/errors.js";
import { VISIBILITY } from "../constants/shareConstants.js";
import File from "../models/fileModel.js";
import Share from "../models/shareModel.js";
import {
  invalidateShareTokenCache,
  invalidateOwnerShareCache,
} from "../services/cacheService.js";
import User from "../models/userModel.js";

// ─── Bandwidth Check & Increment Helper ─────────────────────────
/**
 * Check bandwidth limit and increment for the file owner.
 * @returns {boolean} false if bandwidth exceeded (response already sent)
 */
async function checkAndIncrementOwnerBandwidth(ownerId, fileSize, res) {
  const user = await User.findById(ownerId).select("bandwidthUsed bandwidthLimit").lean();
  if (user.bandwidthUsed + fileSize > user.bandwidthLimit) {
    res.status(429).json({
      message: "The file owner's bandwidth limit has been exceeded. Please try again later.",
      code: "BANDWIDTH_EXCEEDED",
    });
    return false;
  }

  await User.updateOne({ _id: ownerId }, { $inc: { bandwidthUsed: fileSize } });
  return true;
}

function handlePublicShareError(err, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      message: err.message,
      code: err.code,
    });
  }
  next(err);
}

// ─── Public Metadata ──────────────────────────────────────────────
export async function getShareMetadata(req, res, next) {
  try {
    const { token } = req.params;
    const metadata = await getPublicShareMetadata(token, req.user?.id);

    // If password-protected, check if user already has a valid share access token
    if (metadata.requiresPassword) {
      const shareAccessToken = req.cookies?.[`shareAccessToken_${token}`];
      if (shareAccessToken) {
        try {
          const decoded = verifyShareAccessToken(shareAccessToken);
          const currentPsv = metadata._passwordHash ? metadata._passwordHash.slice(-10) : "open";
          if (decoded.shareToken === token && decoded.psv === currentPsv) {
            metadata.requiresPassword = false;
          }
        } catch (err) {
          // Token invalid or expired, proceed with requiresPassword: true
        }
      }
    }

    // Determine if user can view the share and trigger view counting
    const canView = !metadata.requiresPassword && (!metadata.requiresAuth || metadata.isAuthorized);
    const viewedCookieName = `viewed_${token}`;
    const hasViewed = req.cookies?.[viewedCookieName];

    if (canView && !hasViewed) {
      const newViewCount = await incrementShareView(token);
      metadata.viewCount = newViewCount;
      res.cookie(viewedCookieName, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      });
    }

    // Clean up internal fields before sending to client
    delete metadata._passwordHash;
    if(req.user?.signedAccount) metadata.signedAccount = req.user?.signedAccount
    return res.json({ share: metadata });
  } catch (err) {
    handlePublicShareError(err, res, next);
  }
}

// ─── Verify Password & Issue Access Token ─────────────────────────
export async function accessShare(req, res, next) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const share = await verifySharePassword(token, password);

    // If restricted, ensure user is authorized (owner or collaborator)
    if (share.visibility === VISIBILITY.RESTRICTED) {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required to access this restricted share.",
          code: "AUTH_REQUIRED",
        });
      }

      const authorized = await isUserAuthorizedForShare(share, req.user.id);
      if (!authorized) {
        const {email} = await User.findById(req.user.id).select('email').lean()
        return res.status(403).json({
          message: "You are not authorized to access this restricted share.",
          signedAccount: email
        });
      }
    }

    const accessToken = generateShareAccessToken(token, share.passwordHash);
    setShareAccessCookie(res, token, accessToken);

    // Session-based view tracking after successful password check
    const viewedCookieName = `viewed_${token}`;
    const hasViewed = req.cookies?.[viewedCookieName];
    if (!hasViewed) {
      await incrementShareView(token);
      res.cookie(viewedCookieName, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      });
    }

    return res.json({
      message: "Access granted.",
      accessToken,
      share: {
        token: share.token,
        name: share.resourceSnapshot.name,
        permissions: share.permissions,
      },
    });
  } catch (err) {
    handlePublicShareError(err, res, next);
  }
}

// ─── Preview Shared File (returns presigned URL) ──────────────────
export async function previewSharedFile(req, res, next) {
  try {
    const { token } = req.params;
    const share = req.share;

    if (!share.permissions?.allowView) {
      return res.status(403).json({ message: "Viewing is not permitted." });
    }

    const { file } = await resolveShareFileForPublicAccess(token);

    // Generate presigned preview URL
    const { url, expiresAt } = await generateDownloadUrl(file.storagePath, {
      responseContentDisposition: `inline; filename="${encodeURIComponent(file.originalName)}"`,
      responseContentType: file.mimeType,
    });

    // Check owner bandwidth limit and increment
    const allowed = await checkAndIncrementOwnerBandwidth(file.userId, file.size, res);
    if (!allowed) return;

    return res.json({
      previewUrl: url,
      fileName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
    });
  } catch (err) {
    handlePublicShareError(err, res, next);
  }
}

// ─── Download Shared File (returns presigned URL) ─────────────────
export async function downloadSharedFile(req, res, next) {
  try {
    const { token } = req.params;
    const share = req.share;

    if (!share.permissions?.allowDownload) {
      return res.status(403).json({ message: "Downloading is not permitted." });
    }

    const { file } = await resolveShareFileForPublicAccess(token);

    // Generate presigned download URL
    const { url, expiresAt } = await generateDownloadUrl(file.storagePath, {
      responseContentDisposition: `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      responseContentType: file.mimeType,
    });

    // Check owner bandwidth limit and increment
    const allowed = await checkAndIncrementOwnerBandwidth(file.userId, file.size, res);
    if (!allowed) return;

    // Simplify to cookie-only session tracking
    const downloadCookieName = `downloaded_${token}`;
    const hasDownloaded = req.cookies?.[downloadCookieName];

    if (!hasDownloaded) {
      await incrementShareDownload(token);
      res.cookie(downloadCookieName, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      });
    }

    return res.json({
      downloadUrl: url,
      fileName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
    });
  } catch (err) {
    handlePublicShareError(err, res, next);
  }
}

// ─── Create Share Download Token ──────────────────────────────────
export async function createShareDownloadToken(req, res, next) {
  try {
    const { token } = req.params;
    const share = req.share;

    if (!share.permissions?.allowDownload) {
      return res.status(403).json({ message: "Downloading is not permitted." });
    }

    // Simplify to cookie-only session tracking
    const downloadCookieName = `downloaded_${token}`;
    const hasDownloaded = req.cookies?.[downloadCookieName];

    if (!hasDownloaded) {
      await incrementShareDownload(token);
      res.cookie(downloadCookieName, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      });
    }

    const downloadToken = generateShareDownloadToken(token);
    return res.json({ token: downloadToken });
  } catch (err) {
    handlePublicShareError(err, res, next);
  }
}

// ─── Download Shared File By Token (returns presigned URL) ────────
export async function downloadSharedFileByToken(req, res, next) {
  try {
    const { token } = req.params; // download token
    const decoded = verifyShareDownloadToken(token);

    const share = await Share.findOne({ token: decoded.shareToken }).select("+passwordHash").lean();
    if (!share) {
      return res.status(404).json({ message: "Share link not found." });
    }
    if (!isShareAccessible(share)) {
      return res.status(410).json({ message: "This share link is no longer available." });
    }

    if (!share.permissions?.allowDownload) {
      return res.status(403).json({ message: "Downloading is not permitted." });
    }

    const { file } = await resolveShareFileForPublicAccess(decoded.shareToken);

    // Generate presigned download URL
    const { url, expiresAt } = await generateDownloadUrl(file.storagePath, {
      responseContentDisposition: `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      responseContentType: file.mimeType,
    });

    // Check owner bandwidth limit and increment
    const allowed = await checkAndIncrementOwnerBandwidth(file.userId, file.size, res);
    if (!allowed) return;

    return res.json({
      downloadUrl: url,
      fileName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
    });
  } catch (err) {
    handlePublicShareError(err, res, next);
  }
}

// ─── Check if password required (lightweight HEAD-like endpoint) ──
export async function checkShareAccess(req, res) {
  const share = req.share;
  const needsPassword =
    share.visibility === VISIBILITY.RESTRICTED && share.passwordHash;

  return res.json({
    requiresPassword: Boolean(needsPassword),
    permissions: share.permissions,
  });
}

// ─── Edit Shared File Content ─────────────────────────────────────
export async function editSharedFile(req, res, next) {
  try {
    const { token } = req.params;
    const share = req.share;
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ message: "Content is required." });
    }

    if (!share.permissions?.allowEdit) {
      return res.status(403).json({ message: "Editing is not permitted." });
    }

    const { file } = await resolveShareFileForPublicAccess(token);
    await updateR2Content(file.storagePath, content);

    const newSize = Buffer.byteLength(content);

    // Update File size
    await File.updateOne({ _id: file._id }, { size: newSize });

    // Update Share snapshot size
    await Share.updateOne(
      { _id: share._id },
      { "resourceSnapshot.size": newSize }
    );

    // Invalidate caches
    await invalidateShareTokenCache(token);
    await invalidateOwnerShareCache(share.ownerId.toString());

    return res.json({
      message: "Shared file updated successfully.",
      size: newSize,
    });
  } catch (err) {
    handlePublicShareError(err, res, next);
  }
}
