import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { getFileTypeStyle } from "@/lib/file-types";

/**
 * @param {{
 *   kind: import('@/lib/file-types').FileKind;
 *   size?: 'sm' | 'md' | 'lg';
 *   className?: string;
 *   hovered?: boolean;
 * }} props
 */
export function FileTypeIcon({ kind, size = "md", className, hovered = false }) {
  const { icon: Icon, gradient, glow, ring } = getFileTypeStyle(kind);

  const sizes = {
    sm: { box: "h-9 w-9 rounded-lg", icon: "h-4 w-4" },
    md: { box: "h-11 w-11 rounded-xl", icon: "h-[18px] w-[18px]" },
    lg: { box: "h-12 w-12 rounded-xl", icon: "h-5 w-5" },
  };

  const s = sizes[size];

  return (
    <motion.div
      className={cn("relative shrink-0", s.box, className)}
      aria-hidden
    >
      <motion.div
        className={cn(
          "absolute inset-0 bg-gradient-to-br blur-md transition-opacity duration-500",
          gradient,
          hovered ? "opacity-70" : "opacity-35",
        )}
      />
      <motion.div
        className={cn(
          "relative flex h-full w-full items-center justify-center bg-gradient-to-br ring-1 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          s.box,
          gradient,
          ring,
          hovered ? cn(glow, "scale-[1.03]") : "scale-100",
        )}
      >
        <Icon
          className={cn(s.icon, "text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]")}
          strokeWidth={1.75}
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-t from-black/20 via-transparent to-white/15"
          aria-hidden
        />
      </motion.div>
    </motion.div>
  );
}
