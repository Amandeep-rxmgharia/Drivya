import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

// Extensions for which Dropbox can generate thumbnails
const THUMBNAIL_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".tiff", ".tif",
  ".bmp", ".ppm", ".pdf",
]);

function canHaveThumbnail(fileName, tag) {
  if (tag === "folder") return false;
  const ext = path.extname(fileName || "").toLowerCase();
  return THUMBNAIL_EXTENSIONS.has(ext);
}
import { refreshAccessToken } from "../../config/dropboxOAuthConfig.js";

/**
 * Helper: make an authenticated Dropbox RPC request.
 * Automatically refreshes the access token if expired, and persists the
 * new token back to the DB.
 *
 * @param {object} tokens   - { access_token, refresh_token }
 * @param {string} endpoint - Dropbox API endpoint path (e.g. "/2/files/list_folder")
 * @param {object} body     - JSON body
 * @param {string|null} userId - for auto-saving refreshed tokens
 * @returns {Promise<object>} - parsed JSON response
 */
async function dropboxRPC(tokens, endpoint, body, userId = null) {
  let res = await fetch(`https://api.dropboxapi.com${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // If 401, try refreshing the token once
  if (res.status === 401 && tokens.refresh_token) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    tokens.access_token = refreshed.access_token;

    // Persist refreshed token if we have a userId
    if (userId) {
      try {
        const { default: User } = await import("../../models/userModel.js");
        const { encryptTokens } = await import(
          "../../services/google/googleTokenCrypto.js"
        );
        const encrypted = encryptTokens(tokens);
        await User.updateOne(
          { _id: userId },
          {
            dropboxTokensEnc: encrypted.enc,
            dropboxTokensIv: encrypted.iv,
            dropboxTokensAuthTag: encrypted.authTag,
          },
        );
      } catch (err) {
        console.error("Failed to save refreshed Dropbox tokens:", err.message);
      }
    }

    // Retry the request with fresh token
    res = await fetch(`https://api.dropboxapi.com${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    const errBody = await res.text();
    throw Object.assign(
      new Error(`Dropbox API error: ${res.status} ${errBody}`),
      { status: res.status },
    );
  }

  return res.json();
}

/**
 * List files/folders in a Dropbox directory with cursor-based pagination.
 *
 * @param {object} tokens - { access_token, refresh_token }
 * @param {{ path?: string, cursor?: string }} options
 * @param {string|null} userId
 * @returns {Promise<{ files: object[], cursor: string, hasMore: boolean }>}
 */
export async function listFiles(
  tokens,
  { path: folderPath, cursor } = {},
  userId = null,
) {
  let data;

  if (cursor) {
    // Continue from cursor
    data = await dropboxRPC(
      tokens,
      "/2/files/list_folder/continue",
      { cursor },
      userId,
    );
  } else {
    data = await dropboxRPC(
      tokens,
      "/2/files/list_folder",
      {
        path: folderPath || "",
        recursive: false,
        include_mounted_folders: true,
        include_non_downloadable_files: false,
        limit: 100,
      },
      userId,
    );
  }

  const files = (data.entries || []).map((entry) => ({
    id: entry.id || entry.path_lower,
    name: entry.name,
    pathLower: entry.path_lower,
    pathDisplay: entry.path_display,
    isFolder: entry[".tag"] === "folder",
    size: entry.size || null,
    modifiedTime: entry.server_modified || entry.client_modified || null,
    mimeType: guessDropboxMimeType(entry.name, entry[".tag"]),
    canDownload: entry[".tag"] === "file",
    hasThumbnail: canHaveThumbnail(entry.name, entry[".tag"]),
  }));

  return {
    files,
    cursor: data.cursor || null,
    hasMore: data.has_more || false,
  };
}

/**
 * Search files in a Dropbox account.
 *
 * @param {object} tokens - { access_token, refresh_token }
 * @param {string} query  - search term
 * @param {string|null} userId
 * @returns {Promise<{ files: object[] }>}
 */
export async function searchFiles(tokens, query, userId = null) {
  const data = await dropboxRPC(
    tokens,
    "/2/files/search_v2",
    {
      query,
      options: {
        max_results: 50,
        file_status: "active",
      },
    },
    userId,
  );

  const files = (data.matches || [])
    .filter((m) => m.metadata?.metadata)
    .map((m) => {
      const entry = m.metadata.metadata;
      return {
        id: entry.id || entry.path_lower,
        name: entry.name,
        pathLower: entry.path_lower,
        pathDisplay: entry.path_display,
        isFolder: entry[".tag"] === "folder",
        size: entry.size || null,
        modifiedTime: entry.server_modified || entry.client_modified || null,
        mimeType: guessDropboxMimeType(entry.name, entry[".tag"]),
        canDownload: entry[".tag"] === "file",
        hasThumbnail: canHaveThumbnail(entry.name, entry[".tag"]),
      };
    });

  return { files };
}

/**
 * Get metadata for a single Dropbox file.
 *
 * @param {object} tokens
 * @param {string} filePath - Dropbox path (path_lower)
 * @param {string|null} userId
 * @returns {Promise<object>}
 */
export async function getFileMetadata(tokens, filePath, userId = null) {
  const data = await dropboxRPC(
    tokens,
    "/2/files/get_metadata",
    { path: filePath },
    userId,
  );

  return {
    id: data.id || data.path_lower,
    name: data.name,
    pathLower: data.path_lower,
    pathDisplay: data.path_display,
    isFolder: data[".tag"] === "folder",
    size: data.size || null,
    modifiedTime: data.server_modified || data.client_modified || null,
    mimeType: guessDropboxMimeType(data.name, data[".tag"]),
    canDownload: data[".tag"] === "file",
  };
}

/**
 * Stream a file from Dropbox directly to disk.
 * Pipe-through architecture — zero RAM buffering.
 * Supports AbortSignal for cancellation.
 *
 * @param {object} tokens - { access_token, refresh_token }
 * @param {string} dropboxPath - Dropbox file path (path_lower)
 * @param {string} destPath - Absolute path on disk
 * @param {(bytesWritten: number) => void} [onProgress]
 * @param {string|null} userId
 * @param {AbortSignal} [abortSignal]
 * @returns {Promise<{ bytesWritten: number, mimeType: string, fileName: string }>}
 */
export async function streamImportFile(
  tokens,
  dropboxPath,
  destPath,
  onProgress,
  userId = null,
  abortSignal = null,
) {
  // Ensure we have a valid token (refresh if needed)
  let accessToken = tokens.access_token;

  // Attempt download; if 401, refresh and retry once
  let res = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath }),
    },
    signal: abortSignal || undefined,
  });

  if (res.status === 401 && tokens.refresh_token) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    tokens.access_token = refreshed.access_token;
    accessToken = refreshed.access_token;

    if (userId) {
      try {
        const { default: User } = await import("../../models/userModel.js");
        const { encryptTokens } = await import(
          "../../services/google/googleTokenCrypto.js"
        );
        const encrypted = encryptTokens(tokens);
        await User.updateOne(
          { _id: userId },
          {
            dropboxTokensEnc: encrypted.enc,
            dropboxTokensIv: encrypted.iv,
            dropboxTokensAuthTag: encrypted.authTag,
          },
        );
      } catch (err) {
        console.error("Failed to save refreshed Dropbox tokens:", err.message);
      }
    }

    res = await fetch("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath }),
      },
      signal: abortSignal || undefined,
    });
  }

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Dropbox download failed: ${res.status} ${errBody}`);
  }

  // Parse the Dropbox-API-Result header for file metadata
  const apiResult = res.headers.get("dropbox-api-result");
  let meta = {};
  try {
    meta = JSON.parse(apiResult || "{}");
  } catch (_) {}

  const fileName = meta.name || path.basename(dropboxPath);
  const mimeType = guessDropboxMimeType(fileName, "file");

  // Ensure destination directory exists
  await fsp.mkdir(path.dirname(destPath), { recursive: true });

  // Pipe response body → disk
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(destPath);
    let bytesWritten = 0;

    // Convert the web ReadableStream to a Node stream
    const nodeStream = Readable.fromWeb(res.body);

    // Handle abort
    if (abortSignal) {
      const onAbort = () => {
        nodeStream.destroy(new Error("Import cancelled"));
        writer.destroy();
      };
      if (abortSignal.aborted) {
        onAbort();
        return;
      }
      abortSignal.addEventListener("abort", onAbort, { once: true });
    }

    nodeStream.on("data", (chunk) => {
      bytesWritten += chunk.length;
      if (onProgress) onProgress(bytesWritten);
    });

    nodeStream.on("error", (err) => {
      writer.destroy();
      fsp.unlink(destPath).catch(() => {});
      reject(err);
    });

    writer.on("error", (err) => {
      nodeStream.destroy();
      fsp.unlink(destPath).catch(() => {});
      reject(err);
    });

    writer.on("finish", () => {
      resolve({
        bytesWritten,
        mimeType,
        fileName,
      });
    });

    nodeStream.pipe(writer);
  });
}

// ─── MIME type guessing for Dropbox files ─────────────────────
const EXT_MIME_MAP = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".zip": "application/zip",
  ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".xml": "application/xml",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ts": "application/typescript",
  ".py": "text/x-python",
  ".java": "text/x-java-source",
  ".cpp": "text/x-c++src",
  ".c": "text/x-csrc",
  ".go": "text/x-go",
  ".rs": "text/x-rustsrc",
  ".sh": "application/x-sh",
  ".md": "text/markdown",
};

function guessDropboxMimeType(fileName, tag) {
  if (tag === "folder") return "application/vnd.dropbox.folder";
  const ext = path.extname(fileName || "").toLowerCase();
  return EXT_MIME_MAP[ext] || "application/octet-stream";
}
