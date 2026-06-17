import {
  getPublicShareMetadata,
  verifySharePassword,
  resolveShareFileForPublicAccess,
  incrementShareView,
  incrementShareDownload,
  isUserAuthorizedForShare,
} from "../services/shareService.js";
import { getFileStream, updateFileContent as updateDiskContent } from "../services/storageService.js";
import {
  generateShareAccessToken,
  setShareAccessCookie,
  verifyShareAccessToken,
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

// ─── Preview Shared File ──────────────────────────────────────────
export async function previewSharedFile(req, res, next) {
  try {
    const { token } = req.params;
    const share = req.share;

    if (!share.permissions?.allowView) {
      return res.status(403).json({ message: "Viewing is not permitted." });
    }

    const { file } = await resolveShareFileForPublicAccess(token);

    // NOTE: View count is tracked in getShareMetadata (the metadata
    // endpoint), NOT here. This endpoint streams the binary file and
    // may be called many times per page load (Range requests for
    // video/audio seeking, browser retries, etc.).

    const fileSize = file.size;
    const range = req.headers.range;

    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).set("Content-Range", `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      const stream = getFileStream(file.storagePath, { start, end });

      res.status(206).set({
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": chunkSize,
      });

      stream.pipe(res);
    } else {
      res.set("Content-Length", fileSize);
      getFileStream(file.storagePath).pipe(res);
    }
  } catch (err) {
    handlePublicShareError(err, res, next);
  }
}

// ─── Download Shared File ─────────────────────────────────────────
export async function downloadSharedFile(req, res, next) {
  try {
    const { token } = req.params;
    const share = req.share;

    if (!share.permissions?.allowDownload) {
      return res.status(403).json({ message: "Downloading is not permitted." });
    }

    const { file } = await resolveShareFileForPublicAccess(token);

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

    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "Content-Length": file.size,
    });

    getFileStream(file.storagePath).pipe(res);
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
    await updateDiskContent(file.storagePath, content);

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
