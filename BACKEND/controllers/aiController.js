import { chat as chatService } from "../services/aiService.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import { recordActivity } from "../services/activityService.js";
import { ACTIVITY_ACTIONS } from "../constants/activityConstants.js";
import { RESOURCE_TYPES } from "../constants/shareConstants.js";
import { createNotification } from "../services/notificationService.js";
import { getFileStream } from "../services/storageService.js";
import {PDFParse} from "pdf-parse";

// ─── Text-extractable MIME types ─────────────────────────────────
const TEXT_MIME_PREFIXES = [
    "text/",                          // text/plain, text/html, text/csv, text/markdown, …
];
const TEXT_MIME_EXACT = new Set([
    "application/json",
    "application/xml",
    "application/javascript",
    "application/x-javascript",
    "application/typescript",
    "application/x-sh",
    "application/x-httpd-php",
    "application/sql",
    "application/x-yaml",
    "application/yaml",
    "application/toml",
    "application/x-python-script",
]);

// Common text-based file extensions (fallback when MIME is generic)
const TEXT_EXTENSIONS = new Set([
    ".txt", ".md", ".markdown", ".csv", ".json", ".jsonl",
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".py", ".pyw", ".rb", ".go", ".rs", ".java", ".c", ".cpp", ".h", ".hpp",
    ".cs", ".swift", ".kt", ".kts", ".scala", ".r",
    ".html", ".htm", ".css", ".scss", ".sass", ".less",
    ".xml", ".svg", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf",
    ".env", ".sh", ".bash", ".zsh", ".bat", ".ps1", ".cmd",
    ".sql", ".graphql", ".gql",
    ".log", ".dockerfile",
]);

const MAX_CONTENT_CHARS = 12000; // Stay within Gemini context limits

function isTextMime(mimeType) {
    if (!mimeType) return false;
    const lower = mimeType.toLowerCase();
    if (TEXT_MIME_PREFIXES.some((p) => lower.startsWith(p))) return true;
    if (TEXT_MIME_EXACT.has(lower)) return true;
    return false;
}

function getExtension(filename) {
    if (!filename) return "";
    const dot = filename.lastIndexOf(".");
    return dot !== -1 ? filename.substring(dot).toLowerCase() : "";
}

/**
 * Read a Node.js ReadStream into a Buffer.
 */
function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
}

/**
 * Extract text content from a file stored on disk.
 * Returns { content, unsupported } — one will be set.
 */
async function extractFileContent(file) {
    const mime = (file.mimeType || "").toLowerCase();
    const ext = getExtension(file.originalName);

    // PDF extraction
    if (mime === "application/pdf" || ext === ".pdf") {
        try {
            const stream = getFileStream(file.storagePath);
            const buffer = await streamToBuffer(stream);
            const parser = new PDFParse({ data: buffer });
            const data = await parser.getText();
            await parser.destroy();
            const text = (data.text || "").trim();
            if (!text) {
                return { content: null, unsupported: "This PDF appears to contain only images/scans with no extractable text." };
            }
            return { content: text.substring(0, MAX_CONTENT_CHARS) };
        } catch (err) {
            console.error("AI: PDF extraction failed:", err.message);
            return { content: null, unsupported: "Failed to extract text from this PDF." };
        }
    }

    // Text-based files
    if (isTextMime(mime) || TEXT_EXTENSIONS.has(ext)) {
        try {
            const stream = getFileStream(file.storagePath);
            const buffer = await streamToBuffer(stream);
            const text = buffer.toString("utf-8").trim();
            if (!text) {
                return { content: null, unsupported: "This file appears to be empty." };
            }
            return { content: text.substring(0, MAX_CONTENT_CHARS) };
        } catch (err) {
            console.error("AI: Text extraction failed:", err.message);
            return { content: null, unsupported: "Failed to read this file." };
        }
    }

    // Unsupported binary types (images, videos, archives, etc.)
    return {
        content: null,
        unsupported: `Cannot summarize this file type (${mime || ext || "unknown"}). AI summarization currently supports text-based files (TXT, MD, JSON, code files, etc.) and PDFs.`,
    };
}

export async function chat(req, res, next) {
    try {
        const userId = req.user.id;
        const {
            query,
            featureFlags = {},
            fileContext = null,
            recentFiles = [],
            conversation = [],
        } = req.body || {};

        if (!query || typeof query !== "string") {
            return res.status(400).json({ message: "query is required" });
        }

        // If a fileContext with an ID is provided, look up and read the file
        let enrichedFileContext = fileContext;
        if (fileContext?.id) {
            console.log("[AI Chat] fileContext:", JSON.stringify(fileContext, null, 2));
            console.log("[AI Chat] userId:", userId, "type:", typeof userId);
            
            // Try different queries to pinpoint why it's not found
            const fileByIdOnly = await File.findById(fileContext.id).lean();
            if (!fileByIdOnly) {
                console.log("[AI Chat] DB Check: File does not exist at all in database with ID:", fileContext.id);
            } else {
                console.log("[AI Chat] DB Check: File exists!", {
                    originalName: fileByIdOnly.originalName,
                    userIdInDb: fileByIdOnly.userId,
                    isTrashed: fileByIdOnly.isTrashed,
                });
            }

            const file = await File.findOne({ _id: fileContext.id, userId, isTrashed: false }).lean();
            console.log("[AI Chat] Final file lookup result:", file ? "FOUND" : "NOT FOUND");
            if (file) {
                const { content, unsupported } = await extractFileContent(file);
                enrichedFileContext = {
                    ...fileContext,
                    name: file.originalName,
                    kind: file.mimeType,
                    size: file.size,
                    content,        // actual text content (or null)
                    unsupported,    // reason it can't be summarized (or undefined)
                };
            }
        }

        const result = await chatService({
            query,
            featureFlags,
            fileContext: enrichedFileContext,
            recentFiles,
            conversation,
        });

        // result shape: { message: string }
        return res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function organize(req, res, next) {
  try {
    const userId = req.user.id;
    const { suggestions, parentDirId } = req.body || {};

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return res.status(400).json({ message: "suggestions must be a non-empty array" });
    }

    // Resolve parent directory ID. If none, use user's rootDirId
    let resolvedParentDirId = parentDirId;
    if (!resolvedParentDirId || resolvedParentDirId === "root") {
      const user = await User.findById(userId).select("rootDirId").lean();
      if (!user?.rootDirId) {
        return res.status(404).json({ message: "Root directory not found." });
      }
      resolvedParentDirId = user.rootDirId.toString();
    }

    // Verify parent directory exists and belongs to user
    const parentDir = await Directory.findOne({ _id: resolvedParentDirId, userId }).lean();
    if (!parentDir) {
      return res.status(404).json({ message: "Target parent directory not found." });
    }

    const movedFiles = [];
    const skippedFiles = [];

    for (const sug of suggestions) {
      const { file: filename, action: targetFolderName } = sug;
      if (!filename || !targetFolderName) continue;

      // Find the file for this user (not trashed)
      // Check if it matches filename case-insensitively
      const file = await File.findOne({
        userId,
        isTrashed: false,
        originalName: { $regex: new RegExp(`^${escapeRegex(filename)}$`, "i") }
      });

      if (!file) {
        skippedFiles.push({ filename, reason: "File not found" });
        continue;
      }

      // Find or create the destination folder inside parentDirId
      let targetDir = await Directory.findOne({
        userId,
        name: { $regex: new RegExp(`^${escapeRegex(targetFolderName)}$`, "i") },
        parentDirId: resolvedParentDirId
      });

      if (!targetDir) {
        // Create directory
        targetDir = await Directory.create({
          name: targetFolderName,
          userId,
          parentDirId: resolvedParentDirId,
          path: [...parentDir.path, parentDir._id],
          depth: parentDir.depth + 1,
        });

        // Record directory creation notification / log
        createNotification(userId, {
          type: "system",
          title: `Created folder "${targetFolderName}"`,
          description: `Automatically created during smart organization.`,
        }).catch((err) => console.error("Notification[smart-dir-create]:", err));
      }

      // If the file is already in the target directory, skip
      if (file.directoryId.toString() === targetDir._id.toString()) {
        skippedFiles.push({ filename, reason: "Already in target directory" });
        continue;
      }

      // Check for name duplicate in target directory
      const duplicate = await File.findOne({
        userId,
        directoryId: targetDir._id,
        originalName: file.originalName,
        isTrashed: false
      }).lean();

      if (duplicate) {
        skippedFiles.push({ filename, reason: `File with same name already exists in "${targetFolderName}"` });
        continue;
      }

      // Move the file
      const oldParentId = file.directoryId;
      file.directoryId = targetDir._id;
      await file.save();

      // Record move activity
      recordActivity({
        userId,
        action: ACTIVITY_ACTIONS.MOVED,
        resourceType: RESOURCE_TYPES.FILE,
        resourceId: file._id,
        resourceSnapshot: {
          name: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
        },
        parentDirId: targetDir._id,
      }).catch((err) => console.error("Activity[smart-move]:", err.message));

      movedFiles.push({ filename: file.originalName, folder: targetFolderName });
    }

    // Trigger user notification about the smart organization results
    if (movedFiles.length > 0) {
      createNotification(userId, {
        type: "system",
        title: "Smart Organization Completed",
        description: `Successfully organized ${movedFiles.length} file(s) into folders.`,
        actionPath: `/dashboard/drive?dir=${resolvedParentDirId}`,
      }).catch((err) => console.error("Notification[smart-organize]:", err));
    }

    return res.json({
      message: "Smart organization completed",
      moved: movedFiles,
      skipped: skippedFiles
    });
  } catch (err) {
    next(err);
  }
}

function escapeRegex(string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}
