import { motion } from "motion/react";

export function DashboardLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-20 text-center animate-fade-in">
      <div className="relative flex items-center justify-center h-20 w-20 mb-6" style={{ perspective: "1000px" }}>
        {/* Ambient Glow */}
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse pointer-events-none" />

        {/* Ring 1 (X-axis rotation) */}
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/20"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateX: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        {/* Ring 2 (Y-axis rotation) */}
        <motion.div
          className="absolute inset-2 rounded-full border border-dashed border-accent/30 border-t-accent"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: 360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        />

        {/* Ring 3 (Z-axis rotation) */}
        <motion.div
          className="absolute inset-4 rounded-full border border-primary/40 border-t-primary"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />

        {/* Glowing Core */}
        <motion.div
          className="absolute h-2.5 w-2.5 rounded-full bg-gradient-to-br from-primary to-accent shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-bold tracking-[0.3em] text-foreground/80 uppercase">
          Initializing
        </span>
        <span className="text-[8px] font-semibold tracking-[0.2em] text-primary uppercase opacity-60 animate-pulse">
          Secure Tunnel
        </span>
      </div>
    </div>
  );
}
