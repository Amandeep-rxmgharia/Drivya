import { createDriveClient } from "../../config/googleOAuthConfig.js";
import { saveFile } from "../storageService.js";

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
 * Stream a file from Google Drive and upload to R2.
 * Collects into buffer then uploads — supports AbortSignal for cancellation.
 *
 * @param {object} tokens - Decrypted Google OAuth tokens
 * @param {string} googleFileId
 * @param {string} storagePath - R2 object key (e.g. "userId/storageName")
 * @param {(bytesWritten: number) => void} [onProgress] - Progress callback
 * @param {string|null} userId
 * @param {AbortSignal} [abortSignal]
 * @returns {Promise<{ bytesWritten: number, mimeType: string, fileName: string }>}
 */
export async function streamImportFile(
  tokens,
  googleFileId,
  storagePath,
  onProgress,
  userId = null,
  abortSignal = null,
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
      { responseType: "stream", signal: abortSignal || undefined },
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
      { responseType: "stream", signal: abortSignal || undefined },
    );
    stream = downloadRes.data;
  }

  // Collect stream into buffer and upload to R2
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytesWritten = 0;

    // Handle abort
    if (abortSignal) {
      const onAbort = () => {
        stream.destroy(new Error("Import cancelled"));
      };
      if (abortSignal.aborted) {
        onAbort();
        return;
      }
      abortSignal.addEventListener("abort", onAbort, { once: true });
    }

    stream.on("data", (chunk) => {
      chunks.push(chunk);
      bytesWritten += chunk.length;
      if (onProgress) onProgress(bytesWritten);
    });

    stream.on("error", (err) => {
      reject(err);
    });

    stream.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const slashIndex = storagePath.indexOf("/");
        const folder = storagePath.substring(0, slashIndex);
        const fileKey = storagePath.substring(slashIndex + 1);
        await saveFile(folder, fileKey, buffer, finalMimeType);

        resolve({
          bytesWritten,
          mimeType: finalMimeType,
          fileName: finalName,
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}
