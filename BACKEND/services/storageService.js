import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.resolve(__dirname, "..", "storage");

/**
 * Ensure the storage root directory exists on startup.
 */
export async function ensureStorageRoot() {
  await fsp.mkdir(STORAGE_ROOT, { recursive: true });
}

/**
 * Get the absolute path to a user's storage directory.
 * @param {string} userId
 * @returns {string}
 */
function getUserDir(userId) {
  return path.join(STORAGE_ROOT, userId);
}

/**
 * Save a file buffer to the user's storage directory.
 * @param {string} userId
 * @param {string} storageName - UUID-based file name
 * @param {Buffer} buffer
 * @returns {Promise<string>} relative storage path "{userId}/{storageName}"
 */
export async function saveFile(userId, storageName, buffer) {
  const userDir = getUserDir(userId);
  await fsp.mkdir(userDir, { recursive: true });

  const filePath = path.join(userDir, storageName);
  await fsp.writeFile(filePath, buffer);

  return `${userId}/${storageName}`;
}

/**
 * Get a readable stream for a stored file.
 * @param {string} storagePath - relative path "{userId}/{storageName}"
 * @param {{ start?: number, end?: number }} [options] - optional byte range for streaming
 * @returns {import('node:fs').ReadStream}
 */
export function getFileStream(storagePath, options) {
  const absolutePath = path.join(STORAGE_ROOT, storagePath);
  if (!fs.existsSync(absolutePath)) {
    const err = new Error("File not found on disk.");
    err.status = 404;
    throw err;
  }
  return fs.createReadStream(absolutePath, options);
}

/**
 * Delete a file from disk.
 * @param {string} storagePath - relative path "{userId}/{storageName}"
 */
export async function deleteFile(storagePath) {
  const absolutePath = path.join(STORAGE_ROOT, storagePath);
  try {
    await fsp.unlink(absolutePath);
  } catch (err) {
    // Ignore ENOENT — file already deleted
    if (err.code !== "ENOENT") throw err;
  }
}

/**
 * Delete multiple files from disk.
 * @param {string[]} storagePaths
 */
export async function deleteFiles(storagePaths) {
  await Promise.allSettled(storagePaths.map((p) => deleteFile(p)));
}

/**
 * Update file contents on disk.
 * @param {string} storagePath - relative path "{userId}/{storageName}"
 * @param {Buffer|string} content
 */
export async function updateFileContent(storagePath, content) {
  const absolutePath = path.join(STORAGE_ROOT, storagePath);
  await fsp.writeFile(absolutePath, content);
}
