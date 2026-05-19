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
 * @type {Record<FileKind, {
 *   label: string;
 *   icon: import('lucide-react').LucideIcon;
 *   gradient: string;
 *   glow: string;
 *   ring: string;
 * }>}
 */
export const FILE_TYPE_STYLES = {
  folder: {
    label: "Folder",
    icon: Folder,
    gradient: "from-blue-500/90 via-violet-500/85 to-purple-600/90",
    glow: "shadow-[0_0_24px_-4px_rgba(99,102,241,0.55)]",
    ring: "ring-violet-400/25",
  },
  image: {
    label: "Image",
    icon: Image,
    gradient: "from-pink-500/90 via-rose-400/85 to-orange-400/90",
    glow: "shadow-[0_0_24px_-4px_rgba(244,114,182,0.5)]",
    ring: "ring-pink-400/25",
  },
  video: {
    label: "Video",
    icon: Film,
    gradient: "from-red-500/90 via-rose-600/85 to-purple-600/90",
    glow: "shadow-[0_0_24px_-4px_rgba(239,68,68,0.45)]",
    ring: "ring-red-400/25",
  },
  pdf: {
    label: "PDF",
    icon: FileText,
    gradient: "from-red-600/95 via-rose-700/90 to-red-800/95",
    glow: "shadow-[0_0_24px_-4px_rgba(220,38,38,0.5)]",
    ring: "ring-red-500/30",
  },
  archive: {
    label: "Archive",
    icon: Archive,
    gradient: "from-amber-400/95 via-yellow-500/90 to-orange-500/90",
    glow: "shadow-[0_0_24px_-4px_rgba(245,158,11,0.45)]",
    ring: "ring-amber-400/25",
  },
  document: {
    label: "Document",
    icon: FileText,
    gradient: "from-cyan-500/90 via-sky-500/85 to-blue-600/90",
    glow: "shadow-[0_0_24px_-4px_rgba(6,182,212,0.45)]",
    ring: "ring-cyan-400/25",
  },
  audio: {
    label: "Audio",
    icon: Music,
    gradient: "from-emerald-500/90 via-teal-500/85 to-green-600/90",
    glow: "shadow-[0_0_24px_-4px_rgba(16,185,129,0.45)]",
    ring: "ring-emerald-400/25",
  },
  code: {
    label: "Code",
    icon: Code2,
    gradient: "from-indigo-500/90 via-violet-600/85 to-purple-700/90",
    glow: "shadow-[0_0_24px_-4px_rgba(99,102,241,0.5)]",
    ring: "ring-indigo-400/25",
  },
  file: {
    label: "File",
    icon: File,
    gradient: "from-slate-500/80 via-slate-600/75 to-slate-700/80",
    glow: "shadow-[0_0_20px_-6px_rgba(148,163,184,0.35)]",
    ring: "ring-white/10",
  },
};

const EXT_MAP = {
  folder: ["folder"],
  image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "heic", "bmp", "ico"],
  video: ["mp4", "mov", "avi", "mkv", "webm", "m4v"],
  pdf: ["pdf"],
  archive: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"],
  document: ["doc", "docx", "txt", "md", "rtf", "odt", "key", "pages", "ppt", "pptx", "xls", "xlsx", "csv"],
  audio: ["mp3", "wav", "flac", "aac", "ogg", "m4a"],
  code: ["js", "jsx", "ts", "tsx", "py", "rb", "go", "rs", "java", "c", "cpp", "h", "css", "scss", "html", "json", "yaml", "yml", "sql", "sh", "vue", "svelte"],
};

/**
 * @param {string} filename
 * @param {FileKind} [override]
 * @returns {FileKind}
 */
export function detectFileKind(filename, override) {
  if (override) return override;
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
