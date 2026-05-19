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

const rowEase = "duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

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
  selected = false,
  active = false,
  index = 0,
  onSelect,
  onStar,
  onShare,
  onDownload,
  onDelete,
  className,
  viewType
}) {
  const [hovered, setHovered] = useState(false);
  const kind = detectFileKind(file.name, file.kind);
  const isUploading =
    file.uploadProgress != null &&
    file.uploadProgress >= 0 &&
    file.uploadProgress < 100;

  return (
    <motion.article
      role="row"
      aria-selected={selected}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-32px" }}
      transition={{
        type: "tween",
        duration: 0.55,
        delay: index * 0.05,
        ease: easeSmooth,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn("group relative px-2 sm:px-3", className)}
    >
      <button
        type="button"
        onClick={() => onSelect?.(file.id)}
        className={cn(
          "relative w-full text-left rounded-2xl border outline-none",
          "bg-white/[0.03] backdrop-blur-md border-white/[0.08]",
          rowEase,
          "transition-[transform,box-shadow,border-color,background-color]",
          hovered &&
            !selected && [
              "-translate-y-0.5 border-primary/35 bg-white/[0.06]",
              "shadow-[0_8px_32px_-12px_rgba(59,130,246,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
            ],
          selected && [
            "border-primary/50 bg-primary/[0.08]",
            "shadow-[0_0_0_1px_rgba(99,102,241,0.25),0_12px_40px_-16px_rgba(99,102,241,0.45)] ring-1 ring-primary/20",
          ],
          active && !selected && "bg-secondary/50 border-white/12",
          "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity",
            rowEase,
            (hovered || selected) &&
              "opacity-100 bg-gradient-to-b from-white/[0.06] to-transparent",
          )}
          aria-hidden
        />

        <div className={`relative flex flex-col gap-3 ${viewType === 'grid' ? 'sm:min-h-40 md:min-h-45 lg:min-h-46' : ''} h-full justify-between p-3.5 sm:p-4 ${viewType !== 'grid' ? 'md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4' : ''}`}>
          <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
            <FileTypeIcon kind={kind} hovered={hovered || selected} />

            <div className="min-w-0 flex-1 self-center-safe space-y-1.5">
              { <div className="flex flex-wrap items-center gap-2">
                {<h4 className="text-nowrap text-[15px] font-semibold tracking-tight text-foreground sm:text-base">
                  {file.name}
                </h4> }
              {file.starred && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200/90">
                    <Star className="h-3 w-3 fill-amber-300/80 text-amber-300" aria-hidden />
                    Starred
                  </span>
                )}
                {file.shared && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-violet-400/20 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-200/90">
                    <Users className="h-3 w-3" aria-hidden />
                    Shared
                  </span>
                )}
              </div> }

              <p className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground ${viewType !== 'grid' ? 'md:hidden' : ''}`}>
                <span>{file.modifiedAt}</span>
              </p>
              <p className={`flex flex-wrap sm:hidden md:block items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground ${viewType !== 'grid' ? 'md:hidden' : ''}`}>
                <span>Size {file.size}</span>
              </p>

              {isUploading && (
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-[10px] font-medium">
                    <span className="inline-flex items-center gap-1.5 text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      Uploading…
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {file.uploadProgress}%
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-primary shadow-glow"
                      initial={{ width: 0 }}
                      animate={{ width: `${file.uploadProgress}%` }}
                      transition={{ duration: 0.6, ease: easeSmooth }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 md:justify-end md:gap-6">
            <dl className="hidden md:grid md:grid-cols-[minmax(7rem,1fr)_5.5rem_4.5rem] md:items-center md:gap-6 md:text-right">
              {file.name && (
                <div>
                  <dt className="sr-only">Namu</dt>
                </div>
              )}
              <div>
                <dt className="sr-only">Modified</dt>
                <dd className={`text-sm text-center text-muted-foreground/90 tabular-nums ${viewType === 'grid' ? 'md:hidden' : ''}`}>
                  {file.modifiedAt}
                </dd>
              </div>
              <div>
                <dt className="sr-only">Size</dt>
                <dd className={`text-sm text-left font-medium text-foreground/80 tabular-nums ${viewType === 'grid' ? 'md:hidden' : ''}`}>
                  {file.size}
                </dd>
              </div>
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
      </button>
    </motion.article>
  );
}

function FileRowActions({
  fileId,
  starred,
  visible,
  onStar,
  onShare,
  onDownload,
  onDelete,
}) {
  const stop = (e) => e.stopPropagation();

  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div
      role="toolbar"
      aria-label="File actions"
      className={cn(
        "flex items-center gap-0.5 rounded-xl border border-white/10 bg-black/20 p-0.5 backdrop-blur-md",
        "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-1 pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto md:group-focus-within:opacity-100 md:group-focus-within:pointer-events-auto",
        "max-md:opacity-100 max-md:translate-y-0 max-md:pointer-events-auto",
      )}
      onClick={stop}
      onKeyDown={stop}
    >
      <button
        type="button"
        className={cn(btn, starred && "text-amber-300 hover:text-amber-200")}
        title={starred ? "Unstar" : "Star"}
        aria-pressed={starred}
        onClick={() => onStar?.(fileId)}
      >
        <Star className={cn("h-4 w-4", starred && "fill-current")} />
      </button>
      <button
        type="button"
        className={btn}
        title="Share"
        onClick={() => onShare?.(fileId)}
      >
        <Share2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btn}
        title="Download"
        onClick={() => onDownload?.(fileId)}
      >
        <Download className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn(btn, "hover:text-destructive")}
        title="Delete"
        onClick={() => onDelete?.(fileId)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btn}
        title="More options"
        aria-label="More options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
