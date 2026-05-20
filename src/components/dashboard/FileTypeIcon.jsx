import { cn } from "@/lib/utils";
import { getFileTypeStyle } from "@/lib/file-types";

/**
 * @param {{
 *   kind: import('@/lib/file-types').FileKind;
 *   size?: 'sm' | 'md' | 'lg';
 *   className?: string;
 * }} props
 */
export function FileTypeIcon({ kind, size = "md", className }) {
  const { icon: Icon, tile, iconColor } = getFileTypeStyle(kind);

  const sizes = {
    sm: { box: "h-9 w-9 rounded-lg", icon: "h-4 w-4" },
    md: { box: "h-10 w-10 rounded-xl", icon: "h-[18px] w-[18px]" },
    lg: { box: "h-11 w-11 rounded-xl", icon: "h-5 w-5" },
  };

  const s = sizes[size];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center border",
        s.box,
        tile,
        className,
      )}
      aria-hidden
    >
      <Icon className={cn(s.icon, iconColor)} strokeWidth={2} />
    </div>
  );
}
