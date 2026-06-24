import { useState, useRef, useEffect, useCallback } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  Copy,
  Download,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Share2,
  Star,
  Trash2,
  X,
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
 *   onRename?: (id: string, newName: string) => Promise<void>;
 *   onCopyLink?: (id: string) => void;
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
  onPreview,
  onDelete,
  onRename,
  onCopyLink,
  className,
}) {
  const [hovered, setHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y }
  const { ref: revealRef, isVisible } = useScrollReveal();
  const kind = detectFileKind(file.name, file.kind);
  const isGrid = viewType === "grid";
  const isUploading =
    file.uploadProgress != null &&
    file.uploadProgress >= 0 &&
    file.uploadProgress < 100;

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleStartRename = useCallback(() => {
    setContextMenu(null);
    setIsRenaming(true);
  }, []);

  const handleFinishRename = useCallback(
    async (newName) => {
      setIsRenaming(false);
      if (newName && newName !== file.name && onRename) {
        try {
          await onRename(file.id, newName);
        } catch {
          // error handled upstream
        }
      }
    },
    [file.id, file.name, onRename],
  );

  return (
    <article
      ref={revealRef}
      role="row"
      aria-selected={selected}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={handleContextMenu}
      className={cn("group", isGrid ? "min-w-0" : "px-1 sm:px-2", className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.35s ease-out, transform 0.35s ease-out",
        willChange: isVisible ? "auto" : "opacity, transform",
      }}
    >
      <button
        type="button"
        onClick={() => !isRenaming && onSelect?.(file.id)}
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
            isRenaming={isRenaming}
            onStartRename={handleStartRename}
            onFinishRename={handleFinishRename}
            onStar={onStar}
            onShare={onShare}
            onDownload={onDownload}
            onPreview={onPreview}
            onDelete={onDelete}
            onRename={onRename}
            onCopyLink={onCopyLink}
          />
        ) : (
          <ListLayout
            file={file}
            kind={kind}
            isUploading={isUploading}
            hovered={hovered}
            selected={selected}
            isRenaming={isRenaming}
            onStartRename={handleStartRename}
            onFinishRename={handleFinishRename}
            onStar={onStar}
            onShare={onShare}
            onDownload={onDownload}
            onPreview={onPreview}
            onDelete={onDelete}
            onRename={onRename}
            onCopyLink={onCopyLink}
          />
        )}
      </button>

      {/* Context Menu Portal */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            file={file}
            onClose={() => setContextMenu(null)}
            onRename={handleStartRename}
            onPreview={() => { setContextMenu(null); onPreview?.(file); }}
            onDownload={() => { setContextMenu(null); onDownload?.(file.id); }}
            onShare={() => { setContextMenu(null); onShare?.(file.id); }}
            onStar={() => { setContextMenu(null); onStar?.(file.id); }}
            onCopyLink={() => { setContextMenu(null); onCopyLink?.(file.id); }}
            onDelete={() => { setContextMenu(null); onDelete?.(file.id); }}
          />
        )}
      </AnimatePresence>
    </article>
  );
}

/* ───────────────────────── Grid Layout ───────────────────────── */

function GridLayout({
  file,
  kind,
  isUploading,
  hovered,
  selected,
  isRenaming,
  onStartRename,
  onFinishRename,
  onStar,
  onShare,
  onDownload,
  onPreview,
  onDelete,
  onRename,
  onCopyLink,
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <FileTypeIcon kind={kind} />
        <QuickActions
          file={file}
          fileId={file.id}
          starred={file.starred}
          isDirectory={file.isDirectory}
          visible={hovered || selected}
          compact
          onStar={onStar}
          onShare={onShare}
          onDownload={onDownload}
          onPreview={onPreview}
          onDelete={onDelete}
          onRename={onStartRename}
          onCopyLink={onCopyLink}
        />
      </div>

      <div className="mt-3 min-w-0 flex-1 space-y-1">
        {isRenaming ? (
          <InlineRenameInput
            currentName={file.name}
            onFinish={onFinishRename}
          />
        ) : (
          <h4
            className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground"
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (onRename) onStartRename();
            }}
          >
            {file.name}
          </h4>
        )}
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

/* ───────────────────────── List Layout ───────────────────────── */

function ListLayout({
  file,
  kind,
  isUploading,
  hovered,
  selected,
  isRenaming,
  onStartRename,
  onFinishRename,
  onStar,
  onShare,
  onDownload,
  onPreview,
  onDelete,
  onRename,
  onCopyLink,
}) {
  return (
    <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-6">
      <div className="flex min-w-0 items-start gap-3 sm:items-center md:grid md:grid-cols-[minmax(0,1fr)_6rem_4.5rem] md:gap-8 lg:gap-11">
        <div className="flex min-w-0 items-center gap-3">
          <FileTypeIcon kind={kind} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {isRenaming ? (
                <InlineRenameInput
                  currentName={file.name}
                  onFinish={onFinishRename}
                />
              ) : (
                <h4
                  className="truncate text-sm font-semibold text-foreground sm:text-[15px]"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (onRename) onStartRename();
                  }}
                >
                  {file.name}
                </h4>
              )}
              {file.starred && <Badge variant="star">Starred</Badge>}
              {file.shared && <Badge variant="shared">Shared</Badge>}
            </div>
            <p className="text-[11px] text-muted-foreground md:hidden">
              {file.modifiedAt} · {file.size}
            </p>
            {isUploading && <UploadProgress percent={file.uploadProgress} />}
          </div>
        </div>

        <div className="hidden md:flex md:items-center text-left text-sm tabular-nums text-muted-foreground">
          {file.modifiedAt}
        </div>
        <div className="hidden md:flex md:items-center md:justify-start  text-right text-sm font-medium tabular-nums text-foreground/80">
          {file.size}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 md:justify-end md:w-36 md:pr-1">
        <QuickActions
          file={file}
          fileId={file.id}
          starred={file.starred}
          isDirectory={file.isDirectory}
          visible={hovered || selected}
          onStar={onStar}
          onShare={onShare}
          onDownload={onDownload}
          onPreview={onPreview}
          onDelete={onDelete}
          onRename={onStartRename}
          onCopyLink={onCopyLink}
        />
      </div>
    </div>
  );
}

/* ───────────────────────── Inline Rename Input ───────────────────────── */

function InlineRenameInput({ currentName, onFinish }) {
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // Select name without extension
      const dotIndex = currentName.lastIndexOf(".");
      if (dotIndex > 0) {
        inputRef.current.setSelectionRange(0, dotIndex);
      } else {
        inputRef.current.select();
      }
    }
  }, [currentName]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }
    onFinish(trimmed);
  };

  const handleCancel = () => {
    onFinish(null);
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div
      className="flex items-center gap-1.5 max-w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative flex-1 min-w-0">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          className={cn(
            "w-full rounded-lg border px-2.5 py-1.5 text-sm font-semibold text-foreground",
            "bg-background/90 backdrop-blur-sm outline-none",
            "transition-all duration-200",
            error
              ? "border-destructive ring-2 ring-destructive/20"
              : "border-primary/40 ring-2 ring-primary/20 focus:border-primary focus:ring-primary/30",
          )}
          maxLength={255}
        />
        {error && (
          <p className="absolute -bottom-5 left-0 text-[10px] text-destructive font-medium">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
        title="Save"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors shrink-0"
        title="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ───────────────────────── Badge ───────────────────────── */

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

/* ───────────────────────── Upload Progress ───────────────────────── */

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

/* ───────────────────────── Quick Actions (Redesigned) ───────────────────────── */

function QuickActions({
  file,
  fileId,
  starred,
  isDirectory,
  visible,
  compact,
  onStar,
  onShare,
  onDownload,
  onPreview,
  onDelete,
  onRename,
  onCopyLink,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const close = (e) => {
      if (
        moreRef.current &&
        !moreRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setMoreOpen(false);
      }
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [moreOpen]);

  const stop = (e) => e.stopPropagation();

  const iconBtn = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-xl",
    "text-muted-foreground transition-all duration-200",
    "hover:bg-secondary/80 hover:text-foreground hover:scale-105",
    "active:scale-95",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
  );

  return (
    <div
      role="toolbar"
      aria-label="File actions"
      className={cn(
        "flex items-center gap-0.5 rounded-xl border border-border/60 bg-background/90 p-0.5 backdrop-blur-md",
        "shadow-sm dark:shadow-none dark:bg-card/80",
        "transition-all duration-200",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto",
        compact ? "" : "max-md:opacity-100 max-md:translate-y-0 max-md:pointer-events-auto",
      )}
      onClick={stop}
      onKeyDown={stop}
    >
      {/* Star */}
      {!isDirectory && <Tooltip label={starred ? "Unstar" : "Star"}>
        <button
          type="button"
          className={cn(iconBtn, starred && "text-amber-500 dark:text-amber-400")}
          aria-pressed={starred}
          onClick={() => onStar?.(fileId)}
        >
          <Star className={cn("h-3.5 w-3.5", starred && "fill-current")} />
        </button>
      </Tooltip>}

      {/* Preview (only for files) */}
      {!isDirectory && onPreview && (
        <Tooltip label="Preview">
          <button
            type="button"
            className={iconBtn}
            onClick={() => onPreview?.(file)}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      )}

      {/* Download (only for files) */}
      {!isDirectory && (
        <Tooltip label="Download">
          <button
            type="button"
            className={iconBtn}
            onClick={() => onDownload?.(fileId)}
          >
            <Download className="h-3.5" />
          </button>
        </Tooltip>
      )}

      {/* More actions dropdown */}
      <div className="relative">
        <Tooltip label="More actions">
          <button
            ref={moreRef}
            type="button"
            className={cn(
              iconBtn,
              moreOpen && "bg-secondary text-foreground",
            )}
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            aria-label="More options"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>

      {/* Portaled dropdown — escapes stacking context */}
      <AnimatePresence>
        {moreOpen && (
          <PortaledDropdown
            anchorRef={moreRef}
            dropdownRef={dropdownRef}
            file={file}
            fileId={fileId}
            isDirectory={isDirectory}
            onRename={onRename}
            onPreview={onPreview}
            onShare={onShare}
            onCopyLink={onCopyLink}
            onDownload={onDownload}
            onDelete={onDelete}
            onClose={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Portaled Dropdown ───────────────────────── */

function PortaledDropdown({
  anchorRef,
  dropdownRef,
  file,
  fileId,
  isDirectory,
  onRename,
  onPreview,
  onShare,
  onCopyLink,
  onDownload,
  onDelete,
  onClose,
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Calculate position from anchor button
  useEffect(() => {
    if (!anchorRef.current) return;
    const updatePos = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const dropdownWidth = 192; // w-48 = 12rem = 192px
      let left = rect.right - dropdownWidth;
      let top = rect.bottom + 6;

      // Clamp to viewport
      if (left < 8) left = 8;
      if (left + dropdownWidth > window.innerWidth - 8)
        left = window.innerWidth - dropdownWidth - 8;

      setPos({ top, left });
    };
    updatePos();

    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [anchorRef]);

  return createPortal(
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: pos.top ? 1 : 0, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -4 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "fixed", top: pos.top, left: pos.left }}
      className={cn(
        "z-[200] w-48 origin-top-right",
        "rounded-xl border border-border bg-popover p-1.5",
        "shadow-elegant dark:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)]",
        "backdrop-blur-xl",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Rename */}
      {onRename && (
        <DropdownItem
          icon={<Pencil className="h-3.5 w-3.5" />}
          label="Rename"
          onClick={() => { onClose(); onRename(); }}
        />
      )}

      {/* Preview */}
      {!isDirectory && onPreview && (
        <DropdownItem
          icon={<Eye className="h-3.5 w-3.5" />}
          label="Preview"
          onClick={() => { onClose(); onPreview?.(file); }}
        />
      )}

      {/* Share */}
      {!isDirectory && <DropdownItem
        icon={<Share2 className="h-3.5 w-3.5" />}
        label="Share"
        onClick={() => { onClose(); onShare?.(fileId); }}
      />}

      {/* Copy link */}
      {onCopyLink && !isDirectory && (
        <DropdownItem
          icon={<Copy className="h-3.5 w-3.5" />}
          label="Copy link"
          onClick={() => { onClose(); onCopyLink?.(fileId); }}
        />
      )}

      {/* Download */}
      {isDirectory ? null : (
        <DropdownItem
          icon={<Download className="h-3.5 w-3.5" />}
          label="Download"
          onClick={() => { onClose(); onDownload?.(fileId); }}
        />
      )}

      {/* Divider */}
      {!isDirectory && <div className="my-1.5 h-px bg-border/60" />}

      {/* Delete */}
      <DropdownItem
        icon={<Trash2 className="h-3.5 w-3.5" />}
        label={isDirectory ? "Delete folder" : "Move to trash"}
        variant="destructive"
        onClick={() => { onClose(); onDelete?.(fileId); }}
      />
    </motion.div>,
    document.body,
  );
}

/* ───────────────────────── Dropdown Item ───────────────────────── */

function DropdownItem({ icon, label, variant, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium",
        "transition-all duration-150",
        variant === "destructive"
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground/80 hover:bg-secondary/80 hover:text-foreground",
      )}
    >
      <span className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-md shrink-0",
        variant === "destructive"
          ? "bg-destructive/10 text-destructive"
          : "bg-secondary/60 text-muted-foreground",
      )}>
        {icon}
      </span>
      {label}
    </button>
  );
}

/* ───────────────────────── Tooltip ───────────────────────── */

function Tooltip({ label, children }) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef(null);

  const handleEnter = () => {
    timeoutRef.current = setTimeout(() => setShow(true), 500);
  };
  const handleLeave = () => {
    clearTimeout(timeoutRef.current);
    setShow(false);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute -bottom-9 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-lg bg-foreground/90 px-2.5 py-1 text-[11px] font-medium text-background shadow-lg pointer-events-none"
          >
            {label}
            <span className="absolute -top-[3px] left-1/2 -translate-x-1/2 h-1.5 w-1.5 rotate-45 bg-foreground/90" />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Context Menu (Right-Click) ───────────────────────── */

function ContextMenu({
  x,
  y,
  file,
  onClose,
  onRename,
  onPreview,
  onDownload,
  onShare,
  onStar,
  onCopyLink,
  onDelete,
}) {
  const menuRef = useRef(null);

  // Adjust position so menu doesn't overflow viewport
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > vw - 12) adjustedX = vw - rect.width - 12;
      if (y + rect.height > vh - 12) adjustedY = vh - rect.height - 12;
      if (adjustedX < 12) adjustedX = 12;
      if (adjustedY < 12) adjustedY = 12;

      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  return createPortal(
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
      style={{ left: position.x, top: position.y }}
      className={cn(
        "fixed z-[200] w-52 origin-top-left",
        "rounded-xl border border-border bg-popover p-1.5",
        "shadow-elegant dark:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.6)]",
        "backdrop-blur-xl",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* File info header */}
      <div className="px-2.5 py-2 mb-1">
        <p className="text-xs font-semibold text-foreground truncate">
          {file.name}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {file.size} {file.size && file.modifiedAt && "·"} {file.modifiedAt}
        </p>
      </div>

      <div className="h-px bg-border/60 mb-1.5" />

      {/* Actions */}
      {!file.isDirectory && onPreview && (
        <DropdownItem
          icon={<Eye className="h-3.5 w-3.5" />}
          label="Preview"
          onClick={onPreview}
        />
      )}

      <DropdownItem
        icon={<Pencil className="h-3.5 w-3.5" />}
        label="Rename"
        onClick={onRename}
      />

      {!file.isDirectory && (
        <DropdownItem
          icon={<Download className="h-3.5 w-3.5" />}
          label="Download"
          onClick={onDownload}
        />
      )}
{!file.isDirectory && <DropdownItem
  icon={<Share2 className="h-3.5 w-3.5" />}
  label="Share"
  onClick={onShare}
/>}


      {!file.isDirectory && <DropdownItem
        icon={<Star className={cn("h-3.5 w-3.5", file.starred && "fill-amber-400 text-amber-400")} />}
        label={file.starred ? "Remove star" : "Add star"}
        onClick={onStar}
      />}

     {!file.isDirectory && <DropdownItem
        icon={<Copy className="h-3.5 w-3.5" />}
        label="Copy link"
        onClick={onCopyLink}
      />}

      {!file.isDirectory && <div className="my-1.5 h-px bg-border/60" />}

      <DropdownItem
        icon={<Trash2 className="h-3.5 w-3.5" />}
        label={file.isDirectory ? "Delete folder" : "Move to trash"}
        variant="destructive"
        onClick={onDelete}
      />
    </motion.div>,
    document.body,
  );
}
