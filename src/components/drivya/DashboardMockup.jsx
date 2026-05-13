import { motion } from "motion/react";
import { FileText, Image as ImageIcon, Film, Folder, Upload, Check } from "lucide-react";
import { easeSmooth, tweenEnter } from "@/lib/motion-presets";

const loopEase = [0.45, 0.05, 0.55, 0.95];

export function DashboardMockup() {
  return (
    <div className="relative w-full aspect-[5/4] max-w-xl mx-auto">
      <div className="absolute -inset-10 blur-2xl bg-[radial-gradient(closest-side,var(--ambient-radial-large),transparent)]" />
      <div className="absolute -right-10 top-10 h-40 w-40 rounded-full blur-3xl bg-[radial-gradient(closest-side,var(--ambient-blob-b),transparent)]" />

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={tweenEnter(0.85, 0)}
        className="relative glass rounded-2xl p-5 shadow-elegant overflow-hidden"
      >
        <div className="flex items-center gap-1.5 mb-4">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <div className="ml-3 text-xs text-muted-foreground font-medium">drivya.app / my-drive</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Folder, name: "Projects", count: "128" },
            { icon: Folder, name: "Photos", count: "2.4k" },
            { icon: Folder, name: "Work", count: "56" },
          ].map((f, i) => (
            <motion.div
              key={f.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "tween",
                duration: 0.55,
                delay: 0.14 + i * 0.09,
                ease: easeSmooth,
              }}
              className="rounded-xl border border-border bg-card/40 p-3 hover:bg-card/70 transition-colors duration-300"
            >
              <f.icon className="h-5 w-5 text-primary mb-2" />
              <div className="text-sm font-medium">{f.name}</div>
              <div className="text-xs text-muted-foreground">{f.count} files</div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {[
            { icon: ImageIcon, name: "hero-shot.png", size: "4.2 MB", progress: 100 },
            { icon: Film, name: "demo-reel.mp4", size: "128 MB", progress: 64 },
            { icon: FileText, name: "contract.pdf", size: "212 KB", progress: 100 },
          ].map((file, i) => (
            <motion.div
              key={file.name}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                type: "tween",
                duration: 0.62,
                delay: 0.32 + i * 0.1,
                ease: easeSmooth,
              }}
              className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2"
            >
              <file.icon className="h-4 w-4 text-primary-glow shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{file.name}</div>
                <div className="mt-1 h-1 w-full rounded-full bg-border overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${file.progress}%` }}
                    transition={{
                      type: "tween",
                      duration: 1.25,
                      delay: 0.55 + i * 0.12,
                      ease: easeSmooth,
                    }}
                    className="h-full bg-gradient-primary"
                  />
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground shrink-0">{file.size}</div>
              {file.progress === 100 && <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />}
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: loopEase }}
        className="absolute -left-6 top-10 glass rounded-xl p-3 shadow-glow w-44 hidden sm:block"
      >
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Uploading</span>
        </div>
        <div className="mt-2 text-[10px] text-muted-foreground">3 files · 24 MB/s</div>
        <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
          <motion.div
            className="h-full bg-gradient-primary"
            animate={{ width: ["10%", "90%", "10%"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: loopEase }}
          />
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: loopEase, delay: 0.5 }}
        className="absolute -right-4 bottom-8 glass rounded-xl p-3 shadow-glow w-44 hidden sm:block"
      >
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-400" />
          <span className="text-xs font-medium">Synced</span>
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">All devices up to date</div>
      </motion.div>
    </div>
  );
}
