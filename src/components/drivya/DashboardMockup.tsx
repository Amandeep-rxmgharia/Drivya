import { motion } from "motion/react";
import { FileText, Image as ImageIcon, Film, Folder, Upload, Check } from "lucide-react";

export function DashboardMockup() {
  return (
    <div className="relative w-full aspect-[5/4] max-w-xl mx-auto">
      {/* Glow */}
      <div className="absolute -inset-10 bg-[radial-gradient(closest-side,oklch(0.7_0.2_255/0.35),transparent)] blur-2xl" />
      <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-[oklch(0.65_0.25_290/0.4)] blur-3xl" />

      {/* Main panel */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative glass rounded-2xl p-5 shadow-elegant overflow-hidden"
      >
        <div className="flex items-center gap-1.5 mb-4">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <div className="ml-3 text-xs text-muted-foreground">drivya.app / my-drive</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Folder, name: "Projects", count: "128" },
            { icon: Folder, name: "Photos", count: "2.4k" },
            { icon: Folder, name: "Work", count: "56" },
          ].map((f, i) => (
            <motion.div
              key={f.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="rounded-xl border border-border bg-card/40 p-3 hover:bg-card/70 transition"
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2"
            >
              <file.icon className="h-4 w-4 text-primary-glow" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{file.name}</div>
                <div className="mt-1 h-1 w-full rounded-full bg-border overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${file.progress}%` }}
                    transition={{ duration: 1.4, delay: 0.6 + i * 0.15 }}
                    className="h-full bg-gradient-primary"
                  />
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground">{file.size}</div>
              {file.progress === 100 && <Check className="h-3.5 w-3.5 text-green-400" />}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Floating cards */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-6 top-10 glass rounded-xl p-3 shadow-glow w-44 hidden sm:block"
      >
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Uploading</span>
        </div>
        <div className="mt-2 text-[10px] text-muted-foreground">3 files · 24 MB/s</div>
        <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
          <motion.div className="h-full bg-gradient-primary" animate={{ width: ["10%", "90%", "10%"] }} transition={{ duration: 3, repeat: Infinity }} />
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
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
