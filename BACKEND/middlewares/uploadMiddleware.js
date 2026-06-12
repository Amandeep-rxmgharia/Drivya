import multer from "multer";
import { randomUUID } from "node:crypto";
import path from "node:path";

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50 MB
const MAX_FILES_PER_REQUEST = parseInt(process.env.MAX_FILES_PER_REQUEST) || 10;

/**
 * Multer configured with memory storage.
 * Files are buffered in memory, then written to disk via storageService
 * so we can run validation (quota check) before committing.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST,
  },
  fileFilter(_req, file, cb) {
    // Sanitize original filename — strip path components
    file.originalname = path.basename(file.originalname);
    cb(null, true);
  },
});

/**
 * Generate a UUID-based storage name preserving the original extension.
 * @param {string} originalName
 * @returns {string}
 */
export function generateStorageName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return `${randomUUID()}${ext}`;
}

/**
 * Middleware: accept up to MAX_FILES_PER_REQUEST files on field "files".
 */
export const uploadFiles = upload.array("files", MAX_FILES_PER_REQUEST);
