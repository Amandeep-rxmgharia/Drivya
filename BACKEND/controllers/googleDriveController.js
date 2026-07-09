import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fsp from "node:fs/promises";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import {
  getAuthUrl,
  getTokensFromCode,
  createDriveClient,
  revokeToken,
} from "../config/googleOAuthConfig.js";
import {
  encryptTokens,
  decryptTokens,
} from "../services/google/googleTokenCrypto.js";
import {
  listFiles,
  getFileMetadata,
  streamImportFile,
} from "../services/google/googleDriveService.js";
import { generateStorageName } from "../middlewares/uploadMiddleware.js";
import { recordActivity } from "../services/activityService.js";
import { ACTIVITY_ACTIONS } from "../constants/activityConstants.js";
import { RESOURCE_TYPES } from "../constants/shareConstants.js";
import { createNotification } from "../services/notificationService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.resolve(__dirname, "..", "storage");

// ─── Simple in-memory state store for CSRF (production: use Redis) ───
const pendingStates = new Map();
const STATE_TTL = 10 * 60 * 1000; // 10 minutes

// ─── Track active imports to prevent double-imports ───
const activeImports = new Map(); // userId → AbortController

// ─── Get Google OAuth URL ────────────────────────────────────
export const getGoogleAuthUrl = async (req, res, next) => {
  try {
    // Generate CSRF state token bound to this user
    const state = randomBytes(32).toString("hex");
    pendingStates.set(state, {
      userId: req.user.id,
      createdAt: Date.now(),
    });

    // Clean up expired states
    for (const [key, val] of pendingStates) {
      if (Date.now() - val.createdAt > STATE_TTL) {
        pendingStates.delete(key);
      }
    }

    const url = getAuthUrl(state);
    return res.json({ url });
  } catch (err) {
    next(err);
  }
};

// ─── Google OAuth Callback ───────────────────────────────────
export const googleCallback = async (req, res, next) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(
        `${process.env.CORS_ORIGIN}/dashboard/home?google=error&reason=${oauthError}`,
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${process.env.CORS_ORIGIN}/dashboard/home?google=error&reason=missing_params`,
      );
    }

    // Validate CSRF state
    const stateData = pendingStates.get(state);
    if (!stateData) {
      return res.redirect(
        `${process.env.CORS_ORIGIN}/dashboard/home?google=error&reason=invalid_state`,
      );
    }
    pendingStates.delete(state);

    if (Date.now() - stateData.createdAt > STATE_TTL) {
      return res.redirect(
        `${process.env.CORS_ORIGIN}/dashboard/home?google=error&reason=expired_state`,
      );
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Get the user's Google email
    const { oauth2Client } = createDriveClient(tokens);
    const { google } = await import("googleapis");
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const googleEmail = userInfo.data.email || "";

    // Encrypt and store tokens
    const encrypted = encryptTokens(tokens);

    await User.updateOne(
      { _id: stateData.userId },
      {
        googleDriveConnected: true,
        googleDriveEmail: googleEmail,
        googleTokensEnc: encrypted.enc,
        googleTokensIv: encrypted.iv,
        googleTokensAuthTag: encrypted.authTag,
      },
    );

    return res.redirect(
      `${process.env.CORS_ORIGIN}/dashboard/home?google=connected`,
    );
  } catch (err) {
    console.error("[Google OAuth Callback] Error:", err.message);
    return res.redirect(
      `${process.env.CORS_ORIGIN}/dashboard/home?google=error&reason=token_exchange_failed`,
    );
  }
};

// ─── Get Google Connection Status ────────────────────────────
export const getGoogleStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("googleDriveConnected googleDriveEmail")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      connected: user.googleDriveConnected || false,
      email: user.googleDriveEmail || "",
    });
  } catch (err) {
    next(err);
  }
};

// ─── Disconnect Google Drive ─────────────────────────────────
export const disconnectGoogle = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select(
        "googleDriveConnected googleTokensEnc googleTokensIv googleTokensAuthTag",
      )
      .lean();

    if (!user || !user.googleDriveConnected) {
      return res.status(400).json({ message: "Google Drive not connected." });
    }

    // Try to revoke the token (best-effort)
    try {
      const tokens = decryptTokens({
        enc: user.googleTokensEnc,
        iv: user.googleTokensIv,
        authTag: user.googleTokensAuthTag,
      });
      if (tokens.access_token) {
        await revokeToken(tokens.access_token);
      }
    } catch (revokeErr) {
      console.warn("[Google Disconnect] Token revoke failed:", revokeErr.message);
    }

    // Clear stored tokens
    await User.updateOne(
      { _id: req.user.id },
      {
        googleDriveConnected: false,
        googleDriveEmail: "",
        googleTokensEnc: "",
        googleTokensIv: "",
        googleTokensAuthTag: "",
      },
    );

    return res.json({ message: "Google Drive disconnected." });
  } catch (err) {
    next(err);
  }
};

// ─── Helper: Get decrypted tokens for current user ───────────
async function getUserTokens(userId) {
  const user = await User.findById(userId)
    .select(
      "googleDriveConnected googleTokensEnc googleTokensIv googleTokensAuthTag",
    )
    .lean();

  if (!user || !user.googleDriveConnected) {
    return null;
  }

  return decryptTokens({
    enc: user.googleTokensEnc,
    iv: user.googleTokensIv,
    authTag: user.googleTokensAuthTag,
  });
}

// ─── List Google Drive Files ─────────────────────────────────
export const listGoogleFiles = async (req, res, next) => {
  try {
    const tokens = await getUserTokens(req.user.id);
    if (!tokens) {
      return res
        .status(400)
        .json({ message: "Google Drive not connected." });
    }

    const { pageToken, query, folderId } = req.query;
    const result = await listFiles(tokens, { pageToken, query, folderId }, req.user.id);

    return res.json(result);
  } catch (err) {
    // Handle token expiry / revocation
    if (err.code === 401 || err.response?.status === 401) {
      // Token expired/revoked — mark as disconnected
      await User.updateOne(
        { _id: req.user.id },
        {
          googleDriveConnected: false,
          googleDriveEmail: "",
          googleTokensEnc: "",
          googleTokensIv: "",
          googleTokensAuthTag: "",
        },
      );
      return res.status(401).json({
        message: "Google authorization expired. Please reconnect.",
        code: "GOOGLE_TOKEN_EXPIRED",
      });
    }
    next(err);
  }
};

// ─── Cancel active Google import ─────────────────────────────
export const cancelGoogleImport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const controller = activeImports.get(userId);
    if (!controller) {
      return res.status(404).json({ message: "No active import to cancel." });
    }
    controller.abort();
    return res.json({ message: "Import cancellation requested." });
  } catch (err) {
    next(err);
  }
};

// ─── Import Files from Google Drive (SSE streaming) ──────────
export const importGoogleFiles = async (req, res, next) => {
  const userId = req.user.id;

  // Prevent concurrent imports for same user
  if (activeImports.has(userId)) {
    return res.status(429).json({
      message: "An import is already in progress. Please wait.",
    });
  }

  const abortController = new AbortController();
  activeImports.set(userId, abortController);

  // Detect client disconnect → abort
  req.on("close", () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const tokens = await getUserTokens(userId);
    if (!tokens) {
      activeImports.delete(userId);
      return res
        .status(400)
        .json({ message: "Google Drive not connected." });
    }

    const { fileIds, directoryId } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      activeImports.delete(userId);
      return res.status(400).json({ message: "No files selected." });
    }

    if (fileIds.length > 20) {
      activeImports.delete(userId);
      return res
        .status(400)
        .json({ message: "Maximum 20 files per import." });
    }

    // Resolve target directory
    let targetDirId = directoryId;
    if (!targetDirId) {
      const user = await User.findById(userId).select("rootDirId").lean();
      if (!user?.rootDirId) {
        activeImports.delete(userId);
        return res.status(404).json({ message: "Root directory not found." });
      }
      targetDirId = user.rootDirId.toString();
    }

    // Verify directory exists and belongs to user
    const dir = await Directory.findOne({ _id: targetDirId, userId }).lean();
    if (!dir) {
      activeImports.delete(userId);
      return res
        .status(404)
        .json({ message: "Target directory not found." });
    }

    // Pre-fetch metadata for all files to calculate total size
    const metadataList = [];
    let totalSize = 0;

    for (const fileId of fileIds) {
      try {
        const meta = await getFileMetadata(tokens, fileId, userId);
        if (meta.isFolder || !meta.canDownload) continue;
        metadataList.push(meta);
        // Google Docs have no size, estimate 1MB
        totalSize += meta.size || 1 * 1024 * 1024;
      } catch (metaErr) {
        console.warn(`[Import] Failed to get metadata for ${fileId}:`, metaErr.message);
      }
    }

    if (metadataList.length === 0) {
      activeImports.delete(userId);
      return res
        .status(400)
        .json({ message: "No importable files found in selection." });
    }

    // Check storage quota
    const user = await User.findById(userId)
      .select("storageUsed storageLimit")
      .lean();

    if (user.storageUsed + totalSize > user.storageLimit) {
      activeImports.delete(userId);
      return res.status(413).json({
        message:
          "Storage quota exceeded. Please free up space or upgrade.",
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        importSize: totalSize,
      });
    }

    // ─── Set up SSE ─────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const sendSSE = (event, data) => {
      if (!res.writableEnded) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    // Send initial event
    sendSSE("start", {
      totalFiles: metadataList.length,
      totalSize,
    });

    const imported = [];
    const failed = [];
    let importedSize = 0;
    let cancelled = false;

    // ─── Sequential import (1 file at a time) ───────────────
    for (let i = 0; i < metadataList.length; i++) {
      if (abortController.signal.aborted) {
        cancelled = true;
        break;
      }

      const meta = metadataList[i];
      const storageName = generateStorageName(meta.name);
      const destPath = path.join(STORAGE_ROOT, userId, storageName);

      sendSSE("progress", {
        index: i,
        fileId: meta.id,
        fileName: meta.name,
        status: "downloading",
        percent: 0,
      });

      try {
        const estimatedSize = meta.size || 1 * 1024 * 1024;

        const result = await streamImportFile(
          tokens,
          meta.id,
          destPath,
          (bytesWritten) => {
            const percent = estimatedSize
              ? Math.min(99, Math.round((bytesWritten / estimatedSize) * 100))
              : 50;
            sendSSE("progress", {
              index: i,
              fileId: meta.id,
              fileName: meta.name,
              status: "downloading",
              percent,
            });
          },
          userId,
          abortController.signal,
        );

        // Create file record in DB (with duplicate name handling)
        const storagePath = `${userId}/${storageName}`;
        let finalName = result.fileName;
        let attempt = 0;
        let fileDoc = null;

        while (!fileDoc) {
          try {
            fileDoc = await File.create({
              originalName: finalName,
              storageName,
              mimeType: result.mimeType,
              size: result.bytesWritten,
              userId,
              directoryId: targetDirId,
              storagePath,
            });
          } catch (err) {
            if (err?.code === 11000) {
              attempt++;
              const ext = finalName.includes(".")
                ? `.${finalName.split(".").pop()}`
                : "";
              const baseName = finalName.includes(".")
                ? finalName.slice(0, finalName.lastIndexOf("."))
                : finalName;
              const cleanBase = baseName.replace(/\s*\(\d+\)$/, "");
              finalName = `${cleanBase} (${attempt})${ext}`;
            } else {
              throw err;
            }
          }
        }

        // Update user storage
        await User.updateOne(
          { _id: userId },
          { $inc: { storageUsed: result.bytesWritten } },
        );

        importedSize += result.bytesWritten;

        // Record activity (fire-and-forget)
        recordActivity({
          userId,
          action: ACTIVITY_ACTIONS.UPLOADED,
          resourceType: RESOURCE_TYPES.FILE,
          resourceId: fileDoc._id,
          resourceSnapshot: {
            name: fileDoc.originalName,
            mimeType: fileDoc.mimeType,
            size: fileDoc.size,
          },
          parentDirId: targetDirId,
          metadata: { source: "google-drive" },
        }).catch((err) =>
          console.error("Activity[google-import]:", err.message),
        );

        imported.push({
          fileId: meta.id,
          fileName: fileDoc.originalName,
          size: result.bytesWritten,
        });

        sendSSE("progress", {
          index: i,
          fileId: meta.id,
          fileName: fileDoc.originalName,
          status: "complete",
          percent: 100,
        });
      } catch (importErr) {
        if (abortController.signal.aborted) {
          cancelled = true;
          await fsp.unlink(destPath).catch(() => {});
          break;
        }

        console.error(
          `[Import] Failed to import ${meta.name}:`,
          importErr.message,
        );
        failed.push({
          fileId: meta.id,
          fileName: meta.name,
          error: importErr.message,
        });

        sendSSE("progress", {
          index: i,
          fileId: meta.id,
          fileName: meta.name,
          status: "failed",
          percent: 0,
          error: importErr.message,
        });
      }
    }

    if (cancelled) {
      sendSSE("cancelled", {
        imported: imported.length,
        failed: failed.length,
        totalSize: importedSize,
        files: imported,
        errors: failed,
      });
    } else {
      // Send completion event
      sendSSE("done", {
        imported: imported.length,
        failed: failed.length,
        totalSize: importedSize,
        files: imported,
        errors: failed,
      });

      // Notification (fire-and-forget)
      if (imported.length > 0) {
        const title =
          imported.length === 1
            ? `Imported "${imported[0].fileName}" from Google Drive`
            : `${imported.length} files imported from Google Drive`;

        createNotification(userId, {
          type: "upload",
          title,
          description: `Successfully imported to "${dir.name}".`,
          actionPath: "/dashboard/drive",
        }).catch((err) =>
          console.error("Notification[google-import]:", err),
        );
      }
    }

    res.end();
  } catch (err) {
    // If SSE headers were already sent, close the stream
    if (res.headersSent) {
      try {
        const errorData = JSON.stringify({
          error: err.message || "Import failed",
        });
        res.write(`event: error\ndata: ${errorData}\n\n`);
      } catch (_) {}
      res.end();
    } else {
      next(err);
    }
  } finally {
    activeImports.delete(userId);
  }
};

// ─── Get Google Drive File Thumbnail Proxy ─────────────────────
export const getGoogleThumbnail = async (req, res, next) => {
  try {
    const tokens = await getUserTokens(req.user.id);
    if (!tokens) {
      return res.status(400).json({ message: "Google Drive not connected." });
    }

    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ message: "File ID is required." });
    }

    let thumbnailLink = req.query.thumbnailLink;
    const { drive, oauth2Client } = createDriveClient(tokens, req.user.id);

    if (!thumbnailLink) {
      const metaRes = await drive.files.get({
        fileId,
        fields: "thumbnailLink",
        supportsAllDrives: true,
      });
      thumbnailLink = metaRes.data.thumbnailLink;
    }

    if (!thumbnailLink) {
      return res.status(404).json({ message: "Thumbnail not available for this file." });
    }

    // Google Drive thumbnails default to 220px; replace with 400px for crisp display
    const highResThumbnail = thumbnailLink.replace(/=s\d+$/, "=s400");

    // Fetch the fresh access token (auto-refreshes if expired)
    const { token: freshAccessToken } = await oauth2Client.getAccessToken();

    // Fetch the thumbnail using global fetch with Bearer token authentication
    const response = await fetch(highResThumbnail, {
      headers: {
        Authorization: `Bearer ${freshAccessToken || tokens.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch thumbnail: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};
