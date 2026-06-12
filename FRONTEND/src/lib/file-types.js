import {
  Archive,
  Code2,
  File,
  FileText,
  Film,
  Folder,
  Image,
  Music,
} from "lucide-react";

/** @typedef {'folder'|'image'|'video'|'pdf'|'archive'|'document'|'audio'|'code'|'file'} FileKind */

/**
 * Muted, professional type styles — work in light and dark via semantic tints.
 * @type {Record<FileKind, {
 *   label: string;
 *   icon: import('lucide-react').LucideIcon;
 *   tile: string;
 *   iconColor: string;
 * }>}
 */
export const FILE_TYPE_STYLES = {
  folder: {
    label: "Folder",
    icon: Folder,
    tile: "bg-violet-500/10 border-violet-500/20 dark:bg-violet-500/15 dark:border-violet-400/25",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  image: {
    label: "Image",
    icon: Image,
    tile: "bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/15 dark:border-rose-400/25",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  video: {
    label: "Video",
    icon: Film,
    tile: "bg-red-500/10 border-red-500/20 dark:bg-red-500/15 dark:border-red-400/25",
    iconColor: "text-red-600 dark:text-red-400",
  },
  pdf: {
    label: "PDF",
    icon: FileText,
    tile: "bg-red-600/10 border-red-600/20 dark:bg-red-500/15 dark:border-red-400/25",
    iconColor: "text-red-700 dark:text-red-400",
  },
  archive: {
    label: "Archive",
    icon: Archive,
    tile: "bg-amber-500/10 border-amber-500/25 dark:bg-amber-500/15 dark:border-amber-400/25",
    iconColor: "text-amber-700 dark:text-amber-400",
  },
  document: {
    label: "Document",
    icon: FileText,
    tile: "bg-sky-500/10 border-sky-500/20 dark:bg-sky-500/15 dark:border-sky-400/25",
    iconColor: "text-sky-700 dark:text-sky-400",
  },
  audio: {
    label: "Audio",
    icon: Music,
    tile: "bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-400/25",
    iconColor: "text-emerald-700 dark:text-emerald-400",
  },
  code: {
    label: "Code",
    icon: Code2,
    tile: "bg-indigo-500/10 border-indigo-500/20 dark:bg-indigo-500/15 dark:border-indigo-400/25",
    iconColor: "text-indigo-700 dark:text-indigo-400",
  },
  file: {
    label: "File",
    icon: File,
    tile: "bg-muted/60 border-border dark:bg-secondary/50",
    iconColor: "text-muted-foreground",
  },
};

const EXT_MAP = {
  folder: ["folder"],
  image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "heic", "bmp", "ico"],
  video: ["mp4", "mov", "avi", "mkv", "webm", "m4v"],
  pdf: ["pdf"],
  archive: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"],
  document: [
    "doc",
    "docx",
    "txt",
    "md",
    "rtf",
    "odt",
    "key",
    "pages",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
    "csv",
  ],
  audio: ["mp3", "wav", "flac", "aac", "ogg", "m4a"],
  code: [
    "js",
    "jsx",
    "ts",
    "tsx",
    "py",
    "rb",
    "go",
    "rs",
    "java",
    "c",
    "cpp",
    "h",
    "css",
    "scss",
    "html",
    "json",
    "yaml",
    "yml",
    "sql",
    "sh",
    "vue",
    "svelte",
  ],
};

/**
 * @param {string} filename
 * @param {FileKind|string} [override]
 * @returns {FileKind}
 */
export function detectFileKind(filename, override) {
  if (override) {
    const validKinds = new Set(["folder", "image", "video", "pdf", "archive", "document", "audio", "code", "file"]);
    if (validKinds.has(override)) {
      return /** @type {FileKind} */ (override);
    }
    
    // Check if it is a MIME type
    const mime = override.toLowerCase();
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (mime === "application/pdf") return "pdf";
    if (
      mime.startsWith("text/") || 
      mime === "application/msword" || 
      mime.includes("officedocument") || 
      mime.includes("epub")
    ) {
      const ext = filename.toLowerCase().split(".").pop() ?? "";
      if (EXT_MAP.code.includes(ext)) return "code";
      return "document";
    }
    if (
      mime.includes("zip") || 
      mime.includes("tar") || 
      mime.includes("rar") || 
      mime.includes("7z") ||
      mime.includes("compressed")
    ) {
      return "archive";
    }
  }

  const lower = filename.toLowerCase();
  if (lower.endsWith("/") || !lower.includes(".")) {
    const base = lower.split("/").pop() ?? lower;
    if (!base.includes(".")) return "folder";
  }
  const ext = lower.split(".").pop() ?? "";
  for (const [kind, exts] of Object.entries(EXT_MAP)) {
    if (exts.includes(ext)) return /** @type {FileKind} */ (kind);
  }
  return "file";
}

/**
 * @param {FileKind} kind
 */
export function getFileTypeStyle(kind) {
  return FILE_TYPE_STYLES[kind] ?? FILE_TYPE_STYLES.file;
}
