import { useState } from "react";
import { motion } from "motion/react";
import {
  Download,
  Loader2,
  MoreHorizontal,
  Share2,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { detectFileKind } from "@/lib/file-types";
import { easeSmooth } from "@/lib/motion-presets";
import { FileTypeIcon } from "./FileTypeIcon";

const rowEase = "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * @typedef {import('@/lib/file-types').FileKind} FileKind
 *
 * @typedef {Object} FileRowData
 * @property {string} id
 * @property {string} name
 * @property {string} size
 * @property {string} modifiedAt
 * @property {string} [owner]
 * @property {FileKind} [kind]
 * @property {boolean} [starred]
 * @property {boolean} [shared]
 * @property {number} [uploadProgress]
 */

/**
 * @param {{
 *   file: FileRowData;
 *   viewType?: 'list' | 'grid';
 *   selected?: boolean;
 *   active?: boolean;
 *   index?: number;
 *   onSelect?: (id: string) => void;
 *   onStar?: (id: string) => void;
 *   onShare?: (id: string) => void;
 *   onDownload?: (id: string) => void;
 *   onDelete?: (id: string) => void;
 *   className?: string;
 * }} props
 */
export function FileRow({
  file,
  viewType = "list",
  selected = false,
  active = false,
  index = 0,
  onSelect,
  onStar,
  onShare,
  onDownload,
  onDelete,
  className,
}) {
  const [hovered, setHovered] = useState(false);
  const kind = detectFileKind(file.name, file.kind);
  const isGrid = viewType === "grid";
  const isUploading =
    file.uploadProgress != null &&
    file.uploadProgress >= 0 &&
    file.uploadProgress < 100;

  return (
    <motion.article
      role="row"
      aria-selected={selected}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-24px" }}
      transition={{
        type: "tween",
        duration: 0.5,
        delay: index * 0.04,
        ease: easeSmooth,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn("group", isGrid ? "min-w-0" : "px-1 sm:px-2", className)}
    >
      <button
        type="button"
        onClick={() => onSelect?.(file.id)}
        className={cn(
          "relative w-full text-left rounded-xl border outline-none",
          "bg-card border-border shadow-sm dark:bg-card/50 dark:backdrop-blur-sm dark:shadow-none",
          rowEase,
          "transition-[transform,box-shadow,border-color,background-color]",
          hovered &&
            !selected && [
              "-translate-y-px border-primary/25 bg-secondary/60",
              "shadow-sm dark:shadow-[0_8px_24px_-12px_rgba(59,130,246,0.2)]",
            ],
          selected && [
            "border-primary/40 bg-primary/5",
            "ring-1 ring-primary/20 shadow-sm",
          ],
          active && !selected && "bg-secondary/70",
          "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isGrid && "flex h-full flex-col p-4",
          !isGrid && "p-3.5 sm:p-4",
        )}
      >
        {isGrid ? (
          <GridLayout
            file={file}
            kind={kind}
            isUploading={isUploading}
            hovered={hovered}
            selected={selected}
            onStar={onStar}
            onShare={onShare}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        ) : (
          <ListLayout
            file={file}
            kind={kind}
            isUploading={isUploading}
            hovered={hovered}
            selected={selected}
            onStar={onStar}
            onShare={onShare}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        )}
      </button>
    </motion.article>
  );
}

function GridLayout({
  file,
  kind,
  isUploading,
  hovered,
  selected,
  onStar,
  onShare,
  onDownload,
  onDelete,
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <FileTypeIcon kind={kind} />
        <FileRowActions
          fileId={file.id}
          starred={file.starred}
          visible={hovered || selected}
          compact
          onStar={onStar}
          onShare={onShare}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      </div>

      <div className="mt-3 min-w-0 flex-1 space-y-1">
        <h4 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground">
          {file.name}
        </h4>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {file.size} · {file.modifiedAt}
        </p>
        {(file.starred || file.shared) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {file.starred && <Badge variant="star">Starred</Badge>}
            {file.shared && <Badge variant="shared">Shared</Badge>}
          </div>
        )}
        {isUploading && <UploadProgress percent={file.uploadProgress} />}
      </div>
    </>
  );
}

function ListLayout({
  file,
  kind,
  isUploading,
  hovered,
  selected,
  onStar,
  onShare,
  onDownload,
  onDelete,
}) {
  return (
    <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
      <div className="flex min-w-0 items-start gap-3 sm:items-center">
        <FileTypeIcon kind={kind} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-foreground sm:text-[15px]">
              {file.name}
            </h4>
            {file.starred && <Badge variant="star">Starred</Badge>}
            {file.shared && <Badge variant="shared">Shared</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground md:hidden">
            {file.modifiedAt} · {file.size}
          </p>
          {isUploading && <UploadProgress percent={file.uploadProgress} />}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 md:justify-end">
        <dl className="hidden md:flex md:items-center md:gap-6 md:text-right text-sm text-muted-foreground">
          {/* {file.owner && (
            <div className="min-w-[5rem] truncate">{file.owner}</div>
          )} */}
          <div className="tabular-nums">{file.modifiedAt}</div>
          <div className="tabular-nums font-medium text-foreground/80">{file.size}</div>
        </dl>
        <FileRowActions
          fileId={file.id}
          starred={file.starred}
          visible={hovered || selected}
          onStar={onStar}
          onShare={onShare}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function Badge({ variant, children }) {
  const styles =
    variant === "star"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        styles,
      )}
    >
      {children}
    </span>
  );
}

function UploadProgress({ percent }) {
  return (
    <div className="space-y-1 pt-1">
      <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-1 text-primary">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          Uploading
        </span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full rounded-full bg-gradient-primary"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: easeSmooth }}
        />
      </div>
    </div>
  );
}

function FileRowActions({
  fileId,
  starred,
  visible,
  compact,
  onStar,
  onShare,
  onDownload,
  onDelete,
}) {
  const stop = (e) => e.stopPropagation();
  const btn =
    "inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

  return (
    <div
      role="toolbar"
      aria-label="File actions"
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-border bg-background/80 p-0.5 backdrop-blur-sm",
        "transition-all duration-200",
        visible
          ? "opacity-100"
          : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
        compact ? "" : "max-md:opacity-100 max-md:pointer-events-auto",
      )}
      onClick={stop}
      onKeyDown={stop}
    >
      <button
        type="button"
        className={cn(btn, starred && "text-amber-600 dark:text-amber-400")}
        title={starred ? "Unstar" : "Star"}
        aria-pressed={starred}
        onClick={() => onStar?.(fileId)}
      >
        <Star className={cn("h-3.5 w-3.5", starred && "fill-current")} />
      </button>
      <button type="button" className={btn} title="Share" onClick={() => onShare?.(fileId)}>
        <Share2 className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} title="Download" onClick={() => onDownload?.(fileId)}>
        <Download className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={cn(btn, "hover:text-destructive")}
        title="Delete"
        onClick={() => onDelete?.(fileId)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {!compact && (
        <button type="button" className={btn} title="More" aria-label="More options">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
