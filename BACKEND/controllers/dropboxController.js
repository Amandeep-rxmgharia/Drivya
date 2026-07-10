import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fsp from "node:fs/promises";
import User from "../models/userModel.js";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import {
  getDropboxAuthUrl as buildDropboxAuthUrl,
  getTokensFromCode,
  getAccountInfo,
  revokeToken,
  refreshAccessToken,
} from "../config/dropboxOAuthConfig.js";
import {
  encryptTokens,
  decryptTokens,
} from "../services/google/googleTokenCrypto.js";
import {
  listFiles,
  searchFiles,
  getFileMetadata,
  streamImportFile,
} from "../services/dropbox/dropboxService.js";
import { generateStorageName } from "../middlewares/uploadMiddleware.js";
import { recordActivity } from "../services/activityService.js";
import { ACTIVITY_ACTIONS } from "../constants/activityConstants.js";
import { RESOURCE_TYPES } from "../constants/shareConstants.js";
import { createNotification } from "../services/notificationService.js";
import redis from "../config/redisClient.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.resolve(__dirname, "..", "storage");

// ─── OAuth CSRF state stored in Redis with auto-expiry ───
const STATE_TTL_SECONDS = 600; // 10 minutes
const STATE_PREFIX = "oauth:dropbox:state:";

// ─── Import concurrency: distributed lock in Redis + local AbortController ───
const IMPORT_LOCK_PREFIX = "import:lock:dropbox:";
const IMPORT_LOCK_TTL = 1800; // 30 min safety net
const localAbortControllers = new Map(); // userId → AbortController (process-local)

async function acquireImportLock(userId) {
  const result = await redis.set(`${IMPORT_LOCK_PREFIX}${userId}`, "1", { EX: IMPORT_LOCK_TTL, NX: true });
  return result === "OK";
}

async function releaseImportLock(userId) {
  await redis.del(`${IMPORT_LOCK_PREFIX}${userId}`);
  localAbortControllers.delete(userId);
}

// ─── Get Dropbox OAuth URL ─────────────────────────────────
export const getDropboxAuthUrl = async (req, res, next) => {
  try {
    const state = randomBytes(32).toString("hex");
    await redis.set(
      `${STATE_PREFIX}${state}`,
      JSON.stringify({ userId: req.user.id }),
      { EX: STATE_TTL_SECONDS },
    );

    const url = buildDropboxAuthUrl(state);
    return res.json({ url });
  } catch (err) {
    next(err);
  }
};

// ─── Dropbox OAuth Callback ─────────────────────────────────
export const dropboxCallback = async (req, res, next) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(
        `${process.env.CORS_ORIGIN}/dashboard/home?dropbox=error&reason=${oauthError}`,
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${process.env.CORS_ORIGIN}/dashboard/home?dropbox=error&reason=missing_params`,
      );
    }

    // Validate CSRF state (Redis TTL handles expiry automatically)
    const stateRaw = await redis.get(`${STATE_PREFIX}${state}`);
    if (!stateRaw) {
      return res.redirect(
        `${process.env.CORS_ORIGIN}/dashboard/home?dropbox=error&reason=invalid_state`,
      );
    }
    await redis.del(`${STATE_PREFIX}${state}`);
    const stateData = JSON.parse(stateRaw);

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Get user info (email)
    const accountInfo = await getAccountInfo(tokens.access_token);

    // Encrypt and store tokens
    const encrypted = encryptTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    await User.updateOne(
      { _id: stateData.userId },
      {
        dropboxConnected: true,
        dropboxEmail: accountInfo.email,
        dropboxTokensEnc: encrypted.enc,
        dropboxTokensIv: encrypted.iv,
        dropboxTokensAuthTag: encrypted.authTag,
      },
    );

    return res.redirect(
      `${process.env.CORS_ORIGIN}/dashboard/home?dropbox=connected`,
    );
  } catch (err) {
    console.error("[Dropbox OAuth Callback] Error:", err.message);
    return res.redirect(
      `${process.env.CORS_ORIGIN}/dashboard/home?dropbox=error&reason=token_exchange_failed`,
    );
  }
};

// ─── Get Dropbox Connection Status ──────────────────────────
export const getDropboxStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("dropboxConnected dropboxEmail")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      connected: user.dropboxConnected || false,
      email: user.dropboxEmail || "",
    });
  } catch (err) {
    next(err);
  }
};

// ─── Disconnect Dropbox ─────────────────────────────────────
export const disconnectDropbox = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select(
        "dropboxConnected dropboxTokensEnc dropboxTokensIv dropboxTokensAuthTag",
      )
      .lean();

    if (!user || !user.dropboxConnected) {
      return res.status(400).json({ message: "Dropbox not connected." });
    }

    // Try to revoke the token (best-effort)
    try {
      const tokens = decryptTokens({
        enc: user.dropboxTokensEnc,
        iv: user.dropboxTokensIv,
        authTag: user.dropboxTokensAuthTag,
      });
      if (tokens.access_token) {
        await revokeToken(tokens.access_token);
      }
    } catch (revokeErr) {
      console.warn(
        "[Dropbox Disconnect] Token revoke failed:",
        revokeErr.message,
      );
    }

    // Clear stored tokens
    await User.updateOne(
      { _id: req.user.id },
      {
        dropboxConnected: false,
        dropboxEmail: "",
        dropboxTokensEnc: "",
        dropboxTokensIv: "",
        dropboxTokensAuthTag: "",
      },
    );

    return res.json({ message: "Dropbox disconnected." });
  } catch (err) {
    next(err);
  }
};

// ─── Helper: Get decrypted tokens for current user ──────────
async function getUserTokens(userId) {
  const user = await User.findById(userId)
    .select(
      "dropboxConnected dropboxTokensEnc dropboxTokensIv dropboxTokensAuthTag",
    )
    .lean();

  if (!user || !user.dropboxConnected) {
    return null;
  }

  return decryptTokens({
    enc: user.dropboxTokensEnc,
    iv: user.dropboxTokensIv,
    authTag: user.dropboxTokensAuthTag,
  });
}

// ─── List Dropbox Files ─────────────────────────────────────
export const listDropboxFiles = async (req, res, next) => {
  try {
    const tokens = await getUserTokens(req.user.id);
    if (!tokens) {
      return res.status(400).json({ message: "Dropbox not connected." });
    }

    const { path: folderPath, cursor, query } = req.query;

    // If searching, use search endpoint
    if (query && query.trim()) {
      const result = await searchFiles(tokens, query.trim(), req.user.id);
      return res.json(result);
    }

    const result = await listFiles(
      tokens,
      { path: folderPath || "", cursor },
      req.user.id,
    );

    return res.json(result);
  } catch (err) {
    if (err.status === 401) {
      await User.updateOne(
        { _id: req.user.id },
        {
          dropboxConnected: false,
          dropboxEmail: "",
          dropboxTokensEnc: "",
          dropboxTokensIv: "",
          dropboxTokensAuthTag: "",
        },
      );
      return res.status(401).json({
        message: "Dropbox authorization expired. Please reconnect.",
        code: "DROPBOX_TOKEN_EXPIRED",
      });
    }
    next(err);
  }
};

// ─── Cancel active Dropbox import ───────────────────────────
export const cancelDropboxImport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const controller = localAbortControllers.get(userId);
    if (!controller) {
      return res.status(404).json({ message: "No active import to cancel." });
    }
    controller.abort();
    return res.json({ message: "Import cancellation requested." });
  } catch (err) {
    next(err);
  }
};

// ─── Import Files from Dropbox (SSE streaming) ──────────────
export const importDropboxFiles = async (req, res, next) => {
  const userId = req.user.id;

  // Prevent concurrent imports for same user
  const lockAcquired = await acquireImportLock(userId);
  if (!lockAcquired) {
    return res.status(429).json({
      message: "An import is already in progress. Please wait.",
    });
  }

  const abortController = new AbortController();
  localAbortControllers.set(userId, abortController);

  // Detect client disconnect → abort
  req.on("close", () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const tokens = await getUserTokens(userId);
    if (!tokens) {
      await releaseImportLock(userId);
      return res.status(400).json({ message: "Dropbox not connected." });
    }

    const { filePaths, directoryId } = req.body;

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      await releaseImportLock(userId);
      return res.status(400).json({ message: "No files selected." });
    }

    if (filePaths.length > 20) {
      await releaseImportLock(userId);
      return res
        .status(400)
        .json({ message: "Maximum 20 files per import." });
    }

    // Resolve target directory
    let targetDirId = directoryId;
    if (!targetDirId) {
      const user = await User.findById(userId).select("rootDirId").lean();
      if (!user?.rootDirId) {
        await releaseImportLock(userId);
        return res.status(404).json({ message: "Root directory not found." });
      }
      targetDirId = user.rootDirId.toString();
    }

    // Verify directory exists and belongs to user
    const dir = await Directory.findOne({ _id: targetDirId, userId }).lean();
    if (!dir) {
      await releaseImportLock(userId);
      return res
        .status(404)
        .json({ message: "Target directory not found." });
    }

    // Pre-fetch metadata for all files to calculate total size
    const metadataList = [];
    let totalSize = 0;

    for (const filePath of filePaths) {
      try {
        const meta = await getFileMetadata(tokens, filePath, userId);
        if (meta.isFolder || !meta.canDownload) continue;
        metadataList.push(meta);
        totalSize += meta.size || 1 * 1024 * 1024;
      } catch (metaErr) {
        console.warn(
          `[Dropbox Import] Failed to get metadata for ${filePath}:`,
          metaErr.message,
        );
      }
    }

    if (metadataList.length === 0) {
      await releaseImportLock(userId);
      return res
        .status(400)
        .json({ message: "No importable files found in selection." });
    }

    // Check storage quota
    const user = await User.findById(userId)
      .select("storageUsed storageLimit")
      .lean();

    if (user.storageUsed + totalSize > user.storageLimit) {
      await releaseImportLock(userId);
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
      // Check if cancelled
      if (abortController.signal.aborted) {
        cancelled = true;
        break;
      }

      const meta = metadataList[i];
      const storageName = generateStorageName(meta.name);
      const destPath = path.join(STORAGE_ROOT, userId, storageName);

      sendSSE("progress", {
        index: i,
        fileId: meta.pathLower,
        fileName: meta.name,
        status: "downloading",
        percent: 0,
      });

      try {
        const estimatedSize = meta.size || 1 * 1024 * 1024;

        const result = await streamImportFile(
          tokens,
          meta.pathLower,
          destPath,
          (bytesWritten) => {
            const percent = estimatedSize
              ? Math.min(
                  99,
                  Math.round((bytesWritten / estimatedSize) * 100),
                )
              : 50;
            sendSSE("progress", {
              index: i,
              fileId: meta.pathLower,
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
          metadata: { source: "dropbox" },
        }).catch((err) =>
          console.error("Activity[dropbox-import]:", err.message),
        );

        imported.push({
          fileId: meta.pathLower,
          fileName: fileDoc.originalName,
          size: result.bytesWritten,
        });

        sendSSE("progress", {
          index: i,
          fileId: meta.pathLower,
          fileName: fileDoc.originalName,
          status: "complete",
          percent: 100,
        });
      } catch (importErr) {
        // If cancelled, the error is expected
        if (abortController.signal.aborted) {
          cancelled = true;
          // Clean up partial file
          await fsp.unlink(destPath).catch(() => {});
          break;
        }

        console.error(
          `[Dropbox Import] Failed to import ${meta.name}:`,
          importErr.message,
        );
        failed.push({
          fileId: meta.pathLower,
          fileName: meta.name,
          error: importErr.message,
        });

        sendSSE("progress", {
          index: i,
          fileId: meta.pathLower,
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
            ? `Imported "${imported[0].fileName}" from Dropbox`
            : `${imported.length} files imported from Dropbox`;

        createNotification(userId, {
          type: "upload",
          title,
          description: `Successfully imported to "${dir.name}".`,
          actionPath: "/dashboard/drive",
        }).catch((err) =>
          console.error("Notification[dropbox-import]:", err),
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
    await releaseImportLock(userId);
  }
};

// ─── Get Dropbox File Thumbnail Proxy ──────────────────────────
export const getDropboxThumbnail = async (req, res, next) => {
  try {
    const tokens = await getUserTokens(req.user.id);
    if (!tokens) {
      return res.status(400).json({ message: "Dropbox not connected." });
    }

    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ message: "File path is required." });
    }

    const apiArg = JSON.stringify({
      resource: { ".tag": "path", path: filePath },
      format: "jpeg",
      size: "w480h320",
      mode: "bestfit",
    });

    // Fetch thumbnail from Dropbox content-download endpoint
    let response = await fetch(
      "https://content.dropboxapi.com/2/files/get_thumbnail_v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Dropbox-API-Arg": apiArg,
        },
      },
    );

    // If 401, refresh token and retry once
    if (response.status === 401 && tokens.refresh_token) {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      tokens.access_token = refreshed.access_token;

      // Persist refreshed token
      try {
        const encrypted = encryptTokens(tokens);
        await User.updateOne(
          { _id: req.user.id },
          {
            dropboxTokensEnc: encrypted.enc,
            dropboxTokensIv: encrypted.iv,
            dropboxTokensAuthTag: encrypted.authTag,
          },
        );
      } catch (saveErr) {
        console.error("Failed to save refreshed Dropbox tokens:", saveErr.message);
      }

      response = await fetch(
        "https://content.dropboxapi.com/2/files/get_thumbnail_v2",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "Dropbox-API-Arg": apiArg,
          },
        },
      );
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[Dropbox Thumbnail] API error ${response.status} for path "${filePath}":`, errText);
      return res.status(404).json({ message: "Thumbnail not available for this file." });
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
