import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME } from "../config/r2Client.js";

// ─── Default signed-URL expiry (seconds) ─────────────────────────
const DEFAULT_UPLOAD_EXPIRY = 60 * 60;       // 1 hour
const DEFAULT_DOWNLOAD_EXPIRY = 60 * 60;     // 1 hour

/**
 * No-op — R2 bucket is provisioned externally.
 * Kept for API compatibility with app.js startup sequence.
 */
export async function ensureStorageRoot() {
  /* nothing to do — bucket already exists */
}

// ─── Signed URL Generation ───────────────────────────────────────

/**
 * Generate a presigned PUT URL for direct client → R2 upload.
 * @param {string} key - R2 object key (e.g. "{userId}/{storageName}")
 * @param {string} contentType - MIME type of the file
 * @param {number} [expiresIn] - URL validity in seconds (default: 1 h)
 * @returns {Promise<{ url: string, expiresAt: Date }>}
 */
export async function generateUploadUrl(key, contentType, expiresIn = DEFAULT_UPLOAD_EXPIRY) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(r2Client, command, { expiresIn });
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return { url, expiresAt };
}

/**
 * Generate a presigned GET URL for direct R2 → client download.
 * @param {string} key - R2 object key
 * @param {object} [options]
 * @param {number} [options.expiresIn] - URL validity in seconds (default: 1 h)
 * @param {string} [options.responseContentDisposition] - e.g. 'attachment; filename="file.txt"'
 * @param {string} [options.responseContentType] - override Content-Type header
 * @returns {Promise<{ url: string, expiresAt: Date }>}
 */
export async function generateDownloadUrl(key, options = {}) {
  const {
    expiresIn = DEFAULT_DOWNLOAD_EXPIRY,
    responseContentDisposition,
    responseContentType,
  } = options;

  const commandInput = {
    Bucket: R2_BUCKET_NAME,
    Key: key,
  };

  if (responseContentDisposition) {
    commandInput.ResponseContentDisposition = responseContentDisposition;
  }
  if (responseContentType) {
    commandInput.ResponseContentType = responseContentType;
  }

  const command = new GetObjectCommand(commandInput);
  const url = await getSignedUrl(r2Client, command, { expiresIn });
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return { url, expiresAt };
}

// ─── Server-Side File Operations ─────────────────────────────────

/**
 * Save a file buffer to R2 (server-side upload for avatars, imports, etc.).
 * @param {string} userId
 * @param {string} storageName - UUID-based file name
 * @param {Buffer} buffer
 * @param {string} [contentType] - optional MIME type
 * @returns {Promise<string>} storage path "{userId}/{storageName}"
 */
export async function saveFile(userId, storageName, buffer, contentType) {
  const key = `${userId}/${storageName}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    }),
  );

  return key;
}

/**
 * Get a readable stream for a stored file (server-side reads — AI extraction, etc.).
 * @param {string} storagePath - R2 object key "{userId}/{storageName}"
 * @returns {Promise<import('stream').Readable>}
 */
export async function getFileStream(storagePath) {
  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storagePath,
    }),
  );

  // response.Body is a Readable stream in Node.js
  return response.Body;
}

/**
 * Check if an object exists in R2 (used to validate uploads).
 * @param {string} key - R2 object key
 * @returns {Promise<{ exists: boolean, size?: number, contentType?: string }>}
 */
export async function headObject(key) {
  try {
    const response = await r2Client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      }),
    );
    return {
      exists: true,
      size: response.ContentLength,
      contentType: response.ContentType,
    };
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    throw err;
  }
}

/**
 * Delete a file from R2.
 * @param {string} storagePath - R2 object key "{userId}/{storageName}"
 */
export async function deleteFile(storagePath) {
  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: storagePath,
      }),
    );
  } catch (err) {
    // Ignore NotFound — file already deleted
    if (err.name !== "NotFound" && err.$metadata?.httpStatusCode !== 404) {
      throw err;
    }
  }
}

/**
 * Delete multiple files from R2 (batch delete, max 1000 per call).
 * @param {string[]} storagePaths
 */
export async function deleteFiles(storagePaths) {
  if (!storagePaths || storagePaths.length === 0) return;

  // R2/S3 batch delete supports max 1000 objects per request
  const BATCH_SIZE = 1000;

  for (let i = 0; i < storagePaths.length; i += BATCH_SIZE) {
    const batch = storagePaths.slice(i, i + BATCH_SIZE);
    const objects = batch.map((key) => ({ Key: key }));

    await r2Client.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: { Objects: objects, Quiet: true },
      }),
    );
  }
}

/**
 * Update (overwrite) file contents in R2.
 * @param {string} storagePath - R2 object key "{userId}/{storageName}"
 * @param {Buffer|string} content
 */
export async function updateFileContent(storagePath, content) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storagePath,
      Body: content,
    }),
  );
}
