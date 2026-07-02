import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDriveClient } from "../../config/googleOAuthConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.resolve(__dirname, "..", "..", "storage");

// ─── Google Docs MIME → export format mapping ───────────────
const GOOGLE_EXPORT_MAP = {
  "application/vnd.google-apps.document": {
    exportMime: "application/pdf",
    ext: ".pdf",
  },
  "application/vnd.google-apps.spreadsheet": {
    exportMime:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: ".xlsx",
  },
  "application/vnd.google-apps.presentation": {
    exportMime: "application/pdf",
    ext: ".pdf",
  },
  "application/vnd.google-apps.drawing": {
    exportMime: "image/png",
    ext: ".png",
  },
};

// MIME types that cannot be downloaded at all (no binary)
const SKIP_MIME_TYPES = new Set([
  "application/vnd.google-apps.form",
  "application/vnd.google-apps.map",
  "application/vnd.google-apps.site",
  "application/vnd.google-apps.script",
  "application/vnd.google-apps.folderlookup",
  "application/vnd.google-apps.shortcut",
]);

/**
 * List files in Google Drive with pagination & optional search.
 * Only fetches metadata — zero file content bandwidth.
 *
 * @param {object} tokens - Decrypted Google OAuth tokens
 * @param {{ pageToken?: string, query?: string, folderId?: string }} options
 * @returns {Promise<{ files: object[], nextPageToken?: string }>}
 */
export async function listFiles(tokens, { pageToken, query, folderId } = {}, userId = null) {
  const { drive } = createDriveClient(tokens, userId);

  // Build query string
  const qParts = ["trashed = false"];
  if (folderId) {
    qParts.push(`'${folderId}' in parents`);
  }
  if (query) {
    // Escape single quotes in search
    const escaped = query.replace(/'/g, "\\'");
    qParts.push(`name contains '${escaped}'`);
  }

  const res = await drive.files.list({
    q: qParts.join(" and "),
    pageSize: 100,
    pageToken: pageToken || undefined,
    fields:
      "nextPageToken,files(id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink,parents)",
    orderBy: "folder,name",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const files = (res.data.files || []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size ? parseInt(f.size, 10) : null,
    modifiedTime: f.modifiedTime,
    iconLink: f.iconLink,
    thumbnailLink: f.thumbnailLink || null,
    isFolder: f.mimeType === "application/vnd.google-apps.folder",
    isGoogleDoc: f.mimeType?.startsWith("application/vnd.google-apps."),
    canDownload: !SKIP_MIME_TYPES.has(f.mimeType),
    exportInfo: GOOGLE_EXPORT_MAP[f.mimeType] || null,
  }));

  return {
    files,
    nextPageToken: res.data.nextPageToken || null,
  };
}

/**
 * Get metadata for a single file.
 * @param {object} tokens
 * @param {string} fileId
 * @returns {Promise<object>}
 */
export async function getFileMetadata(tokens, fileId, userId = null) {
  const { drive } = createDriveClient(tokens, userId);

  const res = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,size,modifiedTime",
    supportsAllDrives: true,
  });

  const f = res.data;
  const exportInfo = GOOGLE_EXPORT_MAP[f.mimeType] || null;

  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size ? parseInt(f.size, 10) : null,
    modifiedTime: f.modifiedTime,
    isFolder: f.mimeType === "application/vnd.google-apps.folder",
    isGoogleDoc: f.mimeType?.startsWith("application/vnd.google-apps."),
    canDownload: !SKIP_MIME_TYPES.has(f.mimeType),
    exportInfo,
  };
}

/**
 * Stream a file from Google Drive directly to disk.
 * Zero memory buffering — pipe-through architecture.
 *
 * @param {object} tokens - Decrypted Google OAuth tokens
 * @param {string} googleFileId
 * @param {string} destPath - Absolute path on disk
 * @param {(bytesWritten: number) => void} [onProgress] - Progress callback
 * @returns {Promise<{ bytesWritten: number, mimeType: string, fileName: string }>}
 */
export async function streamImportFile(
  tokens,
  googleFileId,
  destPath,
  onProgress,
  userId = null,
) {
  const { drive } = createDriveClient(tokens, userId);

  // Fetch metadata first to determine download strategy
  const metaRes = await drive.files.get({
    fileId: googleFileId,
    fields: "id,name,mimeType,size",
    supportsAllDrives: true,
  });
  const meta = metaRes.data;

  if (SKIP_MIME_TYPES.has(meta.mimeType)) {
    throw new Error(`File type "${meta.mimeType}" cannot be downloaded.`);
  }

  let stream;
  let finalMimeType = meta.mimeType;
  let finalName = meta.name;

  const exportInfo = GOOGLE_EXPORT_MAP[meta.mimeType];

  if (exportInfo) {
    // Google Docs/Sheets/Slides — must use export
    const exportRes = await drive.files.export(
      { fileId: googleFileId, mimeType: exportInfo.exportMime },
      { responseType: "stream" },
    );
    stream = exportRes.data;
    finalMimeType = exportInfo.exportMime;
    // Append correct extension if missing
    if (!finalName.endsWith(exportInfo.ext)) {
      finalName += exportInfo.ext;
    }
  } else {
    // Regular binary file — direct download
    const downloadRes = await drive.files.get(
      { fileId: googleFileId, alt: "media" },
      { responseType: "stream" },
    );
    stream = downloadRes.data;
  }

  // Ensure destination directory exists
  await fsp.mkdir(path.dirname(destPath), { recursive: true });

  // Pipe-through: Google stream → disk (no RAM buffering)
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(destPath);
    let bytesWritten = 0;

    stream.on("data", (chunk) => {
      bytesWritten += chunk.length;
      if (onProgress) onProgress(bytesWritten);
    });

    stream.on("error", (err) => {
      writer.destroy();
      // Clean up partial file
      fsp.unlink(destPath).catch(() => {});
      reject(err);
    });

    writer.on("error", (err) => {
      stream.destroy();
      fsp.unlink(destPath).catch(() => {});
      reject(err);
    });

    writer.on("finish", () => {
      resolve({
        bytesWritten,
        mimeType: finalMimeType,
        fileName: finalName,
      });
    });

    stream.pipe(writer);
  });
}
