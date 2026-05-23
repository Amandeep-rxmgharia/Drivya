import { easeSmooth } from "@/lib/motion-presets";

/* ───────────────────────── CSS class tokens ───────────────────────── */

export const card = "rounded-2xl glass mt-6 shadow-elegant";
export const subtleHover =
  "transition-[box-shadow,transform,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-glow";
export const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground";
export const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors";
export const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 h-10 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90 active:translate-y-px transition-all";
export const ghostBtn =
  "inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3.5 h-10 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary/70 transition-colors";

/* ───────────────────────── Motion helpers ───────────────────────── */

export const viewport = { once: true, margin: "-60px" };
export const loopEase = [0.45, 0.05, 0.55, 0.95];

export const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "tween", duration: 0.72, ease: easeSmooth },
  },
};

export function fadeInView(delay = 0, y = 16) {
  return {
    initial: { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport,
    transition: { type: "tween", duration: 0.68, ease: easeSmooth, delay },
  };
}

/* ───────────────────────── Kbd component ───────────────────────── */

export function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}
