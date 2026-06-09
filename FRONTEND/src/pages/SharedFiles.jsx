import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Eye,
  ExternalLink,
  Globe,
  LayoutGrid,
  Link2,
  Link2Off,
  List,
  Lock,
  MoreHorizontal,
  Search,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Share2,
  Shield,
  ShieldCheck,
  Star,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { easeSmooth } from "@/lib/motion-presets";
import { detectFileKind } from "@/lib/file-types";
import { FileTypeIcon } from "@/components/dashboard/FileTypeIcon";
import {
  card,
  subtleHover,
  chip,
  iconBtn,
  primaryBtn,
} from "@/components/dashboard/dashboard-tokens";

/* ───────────────────────── Mock Data ───────────────────────── */

const SHARED_FILES = [
  {
    id: "s1",
    name: "Brand Guidelines v3.pdf",
    size: "4.2 MB",
    sharedAt: "May 22, 2026",
    expiresAt: "Jun 22, 2026",
    views: 47,
    linkActive: true,
    password: true,
    starred: true,
    linkUrl: "drivya.link/a8f3kd",
    downloads: 12,
  },
  {
    id: "s2",
    name: "Q4-keynote-final.mp4",
    size: "128 MB",
    sharedAt: "May 20, 2026",
    expiresAt: null,
    views: 203,
    linkActive: true,
    password: false,
    starred: false,
    linkUrl: "drivya.link/v9x2mn",
    downloads: 89,
  },
  {
    id: "s3",
    name: "Hero-shot-005.png",
    size: "8.1 MB",
    sharedAt: "May 18, 2026",
    expiresAt: "May 25, 2026",
    views: 31,
    linkActive: true,
    password: true,
    starred: true,
    linkUrl: "drivya.link/p4w7rt",
    downloads: 5,
  },
  {
    id: "s4",
    name: "investor-deck.key",
    size: "12.4 MB",
    sharedAt: "May 15, 2026",
    expiresAt: "May 30, 2026",
    views: 156,
    linkActive: true,
    password: true,
    starred: false,
    linkUrl: "drivya.link/d2k8jf",
    downloads: 42,
  },
  {
    id: "s5",
    name: "podcast-ep12.mp3",
    size: "48 MB",
    sharedAt: "May 12, 2026",
    expiresAt: null,
    views: 512,
    linkActive: true,
    password: false,
    starred: false,
    linkUrl: "drivya.link/m7n3vb",
    kind: "audio",
    downloads: 234,
  },
  {
    id: "s6",
    name: "api-routes.ts",
    size: "24 KB",
    sharedAt: "May 10, 2026",
    expiresAt: "Jun 10, 2026",
    views: 8,
    linkActive: false,
    password: false,
    starred: false,
    linkUrl: "drivya.link/c1q9zx",
    kind: "code",
    downloads: 2,
  },
  {
    id: "s7",
    name: "Design System",
    size: "248 items",
    sharedAt: "May 8, 2026",
    expiresAt: null,
    views: 94,
    linkActive: true,
    password: true,
    starred: true,
    linkUrl: "drivya.link/f5s6hy",
    kind: "folder",
    downloads: 0,
  },
  {
    id: "s9",
    name: "onboarding-flow.fig",
    size: "34 MB",
    sharedAt: "May 3, 2026",
    expiresAt: "Jun 3, 2026",
    views: 67,
    linkActive: true,
    password: false,
    starred: false,
    linkUrl: "drivya.link/g2h9qk",
    downloads: 18,
  },
];

const FILTER_OPTIONS = [
  { id: "all", label: "All Links" },
  { id: "active", label: "Active" },
  { id: "protected", label: "Protected" },
  { id: "expired", label: "Expired" },
];

const SORT_OPTIONS = [
  { id: "recent", label: "Most Recent" },
  { id: "views", label: "Most Viewed" },
  { id: "name", label: "Name" },
];

const rowEase = "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

/* ───────────────────────── Hero Section ───────────────────────── */

const SharedHero = memo(function SharedHero({
  linkStates = {},
  passwordConfig = {},
}) {
  const activeLinks = SHARED_FILES.filter(
    (f) => linkStates[f.id] ?? f.linkActive,
  ).length;
  const totalViews = SHARED_FILES.reduce((sum, f) => sum + f.views, 0);
  const totalDownloads = SHARED_FILES.reduce((sum, f) => sum + f.downloads, 0);
  const protectedCount = SHARED_FILES.filter(
    (f) => passwordConfig[f.id]?.enabled ?? f.password,
  ).length;

  return (
    <section
      className={`${card} ${subtleHover} relative overflow-hidden p-6 md:p-10 animate-fade-in`}
    >
      {/* ambient glows */}
      <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-ambient-primary blur-3xl opacity-80 pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-ambient-primary blur-3xl opacity-50 pointer-events-none" />

      <div className="relative flex flex-col gap-8">
        <div className="max-w-xl">
          <div className={chip}>
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
            All links encrypted
          </div>
          <h1 className="mt-5 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-foreground">
            Shared <span className="text-gradient">Files</span>
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed max-w-lg">
            Manage all your shared file links in one place. You have{" "}
            <span className="font-semibold text-foreground">
              {activeLinks} active links
            </span>{" "}
            with a total of{" "}
            <span className="font-semibold text-foreground">
              {totalViews.toLocaleString()} views
            </span>{" "}
            this month.
          </p>
        </div>

        {/* stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatMini icon={Link2} label="Active Links" value={activeLinks} />
          <StatMini
            icon={Eye}
            label="Total Views"
            value={totalViews.toLocaleString()}
          />
          <StatMini
            icon={Download}
            label="Downloads"
            value={totalDownloads.toLocaleString()}
          />
          <StatMini
            icon={Shield}
            label="Protected"
            value={protectedCount}
            accent
          />
        </div>
      </div>
    </section>
  );
});

const StatMini = memo(function StatMini({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border shrink-0",
          accent
            ? "border-accent/20 bg-accent/10 text-accent"
            : "border-primary/20 bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-lg font-semibold tracking-tight text-foreground tabular-nums leading-none">
          {value}
        </div>
        <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
});

/* ───────────────────────── Sharing Tips ───────────────────────── */

function SharingTips() {
  const tips = [
    {
      icon: Shield,
      title: "Password Protection",
      description:
        "Add a password to your shared links for an extra layer of security.",
      color: "primary",
    },
    {
      icon: Clock,
      title: "Expiring Links",
      description:
        "Set an expiration date to automatically revoke access after a period.",
      color: "accent",
    },
    {
      icon: Eye,
      title: "View Analytics",
      description:
        "Track who's accessing your files with detailed view and download stats.",
      color: "primary",
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
      {tips.map((tip, i) => (
        <div
          key={tip.title}
          className={`${card} ${subtleHover} p-5 cursor-default animate-fade-in`}
          style={{
            animationDelay: `${0.05 + i * 0.05}s`,
            animationFillMode: "both",
          }}
        >
          <div
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-xl border",
              tip.color === "primary"
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-accent/20 bg-accent/10 text-accent",
            )}
          >
            <tip.icon className="h-4 w-4" />
          </div>
          <h4 className="mt-3 font-display text-sm font-semibold text-foreground">
            {tip.title}
          </h4>
          <p className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed">
            {tip.description}
          </p>
        </div>
      ))}
    </section>
  );
}

/* ───────────────────────── Shared Files Section ───────────────────────── */

function SharedFilesSection({
  starred,
  setStarred,
  linkStates,
  setLinkStates,
  passwordConfig,
  onPasswordUpdate,
  visibilityStates,
  onVisibilityToggle,
  expirationStates,
  onExpirationUpdate,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState("grid");
  const [copiedId, setCopiedId] = useState(null);
  const [modalFile, setModalFile] = useState(null);

  const filteredFiles = useMemo(() => {
    let list = [...SHARED_FILES];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (filter === "active") list = list.filter((f) => linkStates[f.id]);
    if (filter === "protected")
      list = list.filter((f) => passwordConfig[f.id]?.enabled);
    if (filter === "expired") {
      list = list.filter((f) => {
        const expiresAt = expirationStates[f.id];
        const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
        return isExpired || !linkStates[f.id];
      });
    }
    list.sort((a, b) => {
      if (sortBy === "views") return b.views - a.views;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return new Date(b.sharedAt) - new Date(a.sharedAt);
    });
    return list;
  }, [
    searchQuery,
    filter,
    sortBy,
    linkStates,
    passwordConfig,
    expirationStates,
  ]);

  const handleCopyLink = useCallback((fileId, url) => {
    navigator.clipboard?.writeText?.(`https://${url}`);
    setCopiedId(fileId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleToggleLink = useCallback(
    (fileId) => {
      setLinkStates((prev) => ({ ...prev, [fileId]: !prev[fileId] }));
    },
    [setLinkStates],
  );

  const toggleStar = useCallback(
    (id) => {
      setStarred((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    [setStarred],
  );

  const handleOpenModal = useCallback((file) => {
    setModalFile(file);
  }, []);

  const isGrid = view === "grid";

  return (
    <>
      <section
        className={cn(card, "overflow-hidden animate-fade-in")}
        aria-labelledby="shared-files-heading"
      >
        {/* ── Header ── */}
        <header className="border-b border-border px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-secondary/50 text-primary">
                  <Share2 className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Link Management
                </span>
              </div>
              <h3
                id="shared-files-heading"
                className="mt-3 font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl"
              >
                Your Shared Links
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredFiles.length} item
                {filteredFiles.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search files…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-44 rounded-xl border border-border bg-secondary/30 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Filter tabs */}
              <div
                className="flex rounded-xl border border-border bg-secondary/40 p-0.5"
                role="tablist"
              >
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === opt.id}
                    onClick={() => setFilter(opt.id)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      filter === opt.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortOpen((o) => !o)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  aria-expanded={sortOpen}
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  {SORT_OPTIONS.find((s) => s.id === sortBy)?.label}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      sortOpen && "rotate-180",
                    )}
                  />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 z-20 mt-2 min-w-[140px] rounded-xl border border-border bg-popover p-1 shadow-elegant animate-fade-in">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSortBy(opt.id);
                          setSortOpen(false);
                        }}
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          sortBy === opt.id
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View toggle */}
              <div className="flex rounded-xl border border-border bg-secondary/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    view === "list"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="List view"
                  aria-pressed={view === "list"}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    view === "grid"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── List column headings (matches FilesLayout exactly) ── */}
        {!isGrid && (
          <div className="hidden md:grid md:grid-cols-[1fr_auto] gap-10 border-b border-border/60 px-5 py-2 sm:px-6">
            <div className="grid grid-cols-[minmax(0,1fr)_6rem_4.5rem] gap-8 lg:gap-11 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span className="pl-5">Name</span>
              <span>Shared</span>
              <span>Views</span>
            </div>
            <span className="w-36 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground pr-1">
              Actions
            </span>
          </div>
        )}

        {/* ── Files ── */}
        <div
          className={cn(
            "p-4 sm:p-4",
            isGrid
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              : "flex flex-col gap-2",
          )}
          role="list"
        >
          {filteredFiles.length === 0 ? (
            <EmptyState />
          ) : (
            filteredFiles.map((file, i) => (
              <SharedFileCard
                key={file.id}
                file={{ ...file, expiresAt: expirationStates[file.id] }}
                index={i}
                isGrid={isGrid}
                linkActive={linkStates[file.id]}
                passwordProtected={passwordConfig[file.id]?.enabled}
                visibility={visibilityStates[file.id]}
                isStarred={Boolean(starred[file.id])}
                copiedId={copiedId}
                onCopyLink={handleCopyLink}
                onToggleLink={handleToggleLink}
                onStar={toggleStar}
                onOpenModal={handleOpenModal}
              />
            ))
          )}
        </div>
      </section>

      {/* ── Modal ── */}
      <AnimatePresence>
        {modalFile && (
          <LinkDetailModal
            file={{ ...modalFile, expiresAt: expirationStates[modalFile.id] }}
            linkActive={linkStates[modalFile.id]}
            isStarred={Boolean(starred[modalFile.id])}
            visibility={visibilityStates[modalFile.id]}
            passwordEnabled={passwordConfig[modalFile.id]?.enabled}
            passwordValue={passwordConfig[modalFile.id]?.value}
            copiedId={copiedId}
            onCopyLink={handleCopyLink}
            onToggleLink={handleToggleLink}
            onStar={toggleStar}
            onPasswordUpdate={onPasswordUpdate}
            onVisibilityToggle={onVisibilityToggle}
            onExpirationUpdate={onExpirationUpdate}
            onClose={() => setModalFile(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ───────────────────────── Shared File Card (grid + list) ───────────────────────── */

const SharedFileCard = memo(function SharedFileCard({
  file,
  index,
  isGrid,
  linkActive,
  passwordProtected,
  visibility,
  isStarred,
  copiedId,
  onCopyLink,
  onToggleLink,
  onStar,
  onOpenModal,
}) {
  const [hovered, setHovered] = useState(false);
  const { ref: revealRef, isVisible } = useScrollReveal();
  const kind = detectFileKind(file.name, file.kind);
  const isExpired = file.expiresAt
    ? new Date(file.expiresAt) < new Date()
    : false;
  const isCopied = copiedId === file.id;

  return (
    <article
      ref={revealRef}
      role="listitem"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn("group", isGrid ? "min-w-0" : "px-1 sm:px-2")}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.35s ease-out, transform 0.35s ease-out",
        willChange: isVisible ? "auto" : "opacity, transform",
      }}
    >
      <div
        className={cn(
          "relative w-full text-left rounded-xl border outline-none",
          "bg-card border-border shadow-sm dark:bg-card/50 dark:backdrop-blur-sm dark:shadow-none",
          rowEase,
          "transition-[transform,box-shadow,border-color,background-color]",
          hovered && [
            "-translate-y-px border-primary/25 bg-secondary/60",
            "shadow-sm dark:shadow-[0_8px_24px_-12px_rgba(59,130,246,0.2)]",
          ],
          "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isGrid && "flex h-full flex-col p-4",
          !isGrid && "p-3.5 sm:p-4",
          !linkActive && !isExpired && "opacity-65",
        )}
      >
        {isGrid ? (
          /* ── Grid Layout ── */
          <>
            <div className="flex items-start justify-between gap-2">
              <FileTypeIcon kind={kind} />
              <FileActions
                fileId={file.id}
                starred={isStarred}
                visible={hovered}
                compact
                onStar={onStar}
                onOpenModal={() => onOpenModal(file)}
              />
            </div>

            <div className="mt-3 min-w-0 flex-1 space-y-1">
              <h4 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground">
                {file.name}
              </h4>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {file.size} · {file.sharedAt}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {isExpired ? (
                  <StatusBadge variant="expired" />
                ) : linkActive ? (
                  <StatusBadge variant="active" />
                ) : (
                  <StatusBadge variant="disabled" />
                )}
                <VisibilityBadge isPublic={visibility !== "Restricted"} />
                <PasswordBadge enabled={passwordProtected} />
                {isStarred && <StarredBadge />}
              </div>
            </div>

            {/* View/download stats */}
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {file.views} views
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3" /> {file.downloads}
              </span>
            </div>

            {/* Bottom actions */}
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onCopyLink(file.id, file.linkUrl)}
                disabled={!linkActive || isExpired}
                className={cn(
                  "flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-medium transition-all duration-200",
                  isCopied
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : linkActive && !isExpired
                      ? "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                      : "border-border bg-secondary/30 text-muted-foreground/50 cursor-not-allowed",
                )}
              >
                {isCopied ? (
                  <>
                    <Check className="h-3 w-3" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy Link
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onToggleLink(file.id)}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors shrink-0",
                  linkActive
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                    : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50",
                )}
                title={linkActive ? "Disable link" : "Enable link"}
              >
                {linkActive ? (
                  <ToggleRight className="h-4 w-4" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onOpenModal(file)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors shrink-0"
                title="Link details"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          /* ── List Layout (matches FileRow ListLayout exactly) ── */
          <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-6">
            <div className="flex min-w-0 items-start gap-3 sm:items-center md:grid md:grid-cols-[minmax(0,1fr)_6rem_4.5rem] md:gap-8 lg:gap-11">
              {/* Name + icon */}
              <div className="flex min-w-0 items-center gap-3">
                <FileTypeIcon kind={kind} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-semibold text-foreground sm:text-[15px]">
                      {file.name}
                    </h4>
                    {isStarred && <StarredBadge />}
                    {isExpired ? (
                      <StatusBadge variant="expired" />
                    ) : linkActive ? (
                      <StatusBadge variant="active" />
                    ) : (
                      <StatusBadge variant="disabled" />
                    )}
                    <VisibilityBadge isPublic={visibility !== "Restricted"} />
                    <PasswordBadge enabled={passwordProtected} />
                  </div>
                  <p className="text-[11px] text-muted-foreground md:hidden">
                    {file.sharedAt} · {file.size}
                  </p>
                </div>
              </div>

              {/* Shared date */}
              <div className="hidden md:flex md:items-center text-left text-sm tabular-nums text-muted-foreground">
                {file.sharedAt}
              </div>

              {/* Views */}
              <div className="hidden md:flex md:items-center md:justify-start text-sm font-medium tabular-nums text-foreground/80">
                <Eye className="h-3 w-3 text-muted-foreground/60 mr-1.5" />
                {file.views}
              </div>
            </div>

            {/* Actions column */}
            <div className="flex items-center justify-between gap-3 md:justify-end md:w-36 md:pr-1">
              <FileActions
                fileId={file.id}
                starred={isStarred}
                visible={hovered}
                onStar={onStar}
                onOpenModal={() => onOpenModal(file)}
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
});

/* ───────────────────────── File Actions Toolbar ───────────────────────── */

function FileActions({
  fileId,
  starred,
  visible,
  compact,
  onStar,
  onOpenModal,
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
      <button type="button" className={btn} title="Download">
        <Download className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={cn(btn, "hover:text-destructive")}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {!compact && (
        <button
          type="button"
          className={btn}
          title="Details"
          onClick={onOpenModal}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// Minimal Toast Component for LinkDetailModal
function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-elegant border border-white/10 dark:border-white/5 bg-background/85 dark:bg-card/90 backdrop-blur-md text-xs font-semibold text-foreground z-[100] max-w-sm pointer-events-auto"
    >
      <span className="h-2 w-2 rounded-full bg-primary shadow-glow animate-pulse shrink-0" />
      <span className="leading-tight">{message}</span>
    </motion.div>
  );
}

// Custom Vibrant Gradient Avatar Engine for Premium Feel
const getAvatarGradient = (name = "") => {
  const colors = [
    "from-indigo-500/25 to-cyan-500/25 text-indigo-600 dark:text-cyan-300 border-indigo-500/20",
    "from-violet-500/25 to-fuchsia-500/25 text-violet-600 dark:text-fuchsia-300 border-violet-500/20",
    "from-pink-500/25 to-rose-500/25 text-pink-600 dark:text-rose-300 border-pink-500/20",
    "from-amber-500/25 to-orange-500/25 text-amber-600 dark:text-orange-300 border-amber-500/20",
    "from-emerald-500/25 to-teal-500/25 text-emerald-600 dark:text-teal-300 border-emerald-500/20",
    "from-sky-500/25 to-blue-600/25 text-sky-600 dark:text-blue-300 border-sky-500/20",
  ];
  const charCodeSum = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[charCodeSum % colors.length];
};

// Expiry Date Calculation Helper
const calculateExpiryDate = (val) => {
  if (val === "Never") return null;
  const days = val === "1 Day" ? 1 : val === "7 Days" ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

function LinkDetailModal({
  file,
  linkActive: initialLinkActive,
  isStarred: initialStarred,
  visibility: initialVisibility,
  passwordEnabled: initialPasswordEnabled,
  passwordValue: initialPasswordValue,
  copiedId,
  onCopyLink,
  onToggleLink,
  onStar,
  onPasswordUpdate,
  onVisibilityToggle,
  onExpirationUpdate,
  onClose,
}) {
  const kind = detectFileKind(file.name, file.kind);
  const isCopied = copiedId === file.id;
  const isExpired = file.expiresAt
    ? new Date(file.expiresAt) < new Date()
    : false;

  // Local state for interactive settings
  const [activeTab, setActiveTab] = useState("collaborators"); // "collaborators" | "settings"
  const [linkActive, setLinkActive] = useState(initialLinkActive);
  const [isStarred, setIsStarred] = useState(initialStarred);
  const [visibility, setVisibility] = useState(
    initialVisibility || (file.password ? "Restricted" : "Public"),
  );

  // Password protection state
  const [passwordEnabled, setPasswordEnabled] = useState(
    initialPasswordEnabled ?? file.password ?? false,
  );
  const [password, setPassword] = useState(initialPasswordValue || "");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [showExpirationDropdown, setShowExpirationDropdown] = useState(false);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");
  const [isInviting, setIsInviting] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Seed with default users to make modification immediately testable
  const [sharedUsers, setSharedUsers] = useState([
    { email: "amelia@drivya.com", role: "Owner", name: "Amelia Moreau" },
    { email: "marketing@drivya.com", role: "Editor", name: "Marketing Team" },
    { email: "finance@drivya.com", role: "Viewer", name: "Finance Team" },
  ]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const addToast = (message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleActive = () => {
    onToggleLink(file.id);
    const nextState = !linkActive;
    setLinkActive(nextState);
    addToast(
      nextState ? "Link status set to Active" : "Link status set to Disabled",
    );
  };

  const handleStarToggle = () => {
    onStar(file.id);
    const nextState = !isStarred;
    setIsStarred(nextState);
    addToast(nextState ? "Starred file link" : "Unstarred file link");
  };

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      addToast("Please enter a valid email address");
      return;
    }

    setIsInviting(true);
    setTimeout(() => {
      const email = inviteEmail.trim();
      setSharedUsers((prev) => [
        ...prev,
        { email, role: inviteRole, name: email.split("@")[0] },
      ]);
      addToast(`Invited ${email} as ${inviteRole}`);
      setInviteEmail("");
      setIsInviting(false);
    }, 800);
  };

  const handleUpdateUserRole = (email, newRole) => {
    setSharedUsers((prev) =>
      prev.map((user) =>
        user.email === email ? { ...user, role: newRole } : user,
      ),
    );
    addToast(`Role updated to ${newRole} for ${email}`);
  };

  const handleRemoveUser = (email) => {
    setSharedUsers((prev) => prev.filter((user) => user.email !== email));
    addToast(`Access revoked for ${email}`);
  };

  const handleSavePassword = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      addToast("Please enter a password");
      return;
    }
    setPasswordSaved(true);
    // Sync with parent when actually saved
    onPasswordUpdate?.(file.id, true, password);
    addToast("Share link password successfully set");
    setTimeout(() => setPasswordSaved(false), 1500);
  };

  const handlePasswordToggle = () => {
    const nextState = !passwordEnabled;
    setPasswordEnabled(nextState);

    // Only sync with parent immediately if turning OFF
    // If turning ON, we wait for "Apply" (handleSavePassword)
    if (!nextState) {
      onPasswordUpdate?.(file.id, false);
      addToast("Password protection disabled");
    } else {
      if (initialPasswordValue) {
        setPasswordSaved(true);
        // Sync with parent when actually saved
        onPasswordUpdate?.(file.id, true, password);
        addToast("Share link password successfully set");
        setTimeout(() => setPasswordSaved(false), 1500);
      } else {
        addToast("Set a password to enable protection");
      }
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Side Slider Sheet Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.3, ease: easeSmooth }}
        className={cn(
          "fixed z-50 overflow-y-auto shadow-elegant noise",
          "inset-y-0 right-0 w-full md:w-[440px] md:max-w-[90vw] border-l border-white/10 dark:border-white/5 bg-background/85 dark:bg-card/80 backdrop-blur-xl",
          "rounded-l-3xl flex flex-col justify-between",
        )}
        style={{ scrollbarGutter: "stable", WebkitOverflowScrolling: "touch" }}
      >
        {/* Ambient Gradient Blobs */}
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-primary/10 blur-[50px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-20 left-0 h-40 w-40 rounded-full bg-accent/5 blur-[50px] pointer-events-none" />

        <div className="px-5 pb-6 pt-6 space-y-5 sm:px-6 md:space-y-6 flex-1 flex flex-col justify-start relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-2 bg-secondary/40 border border-border/40 rounded-2xl shadow-sm shrink-0">
                <FileTypeIcon kind={kind} size="lg" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-base sm:text-lg font-bold text-foreground truncate leading-tight">
                  {file.name}
                </h2>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 mt-1 font-semibold">
                  Shared {file.sharedAt} · {file.size}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                iconBtn,
                "h-9 w-9 shrink-0 hover:bg-secondary/80 border border-border/30 rounded-xl hover:scale-105 active:scale-95 transition-all",
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-2">
            {isExpired ? (
              <StatusBadge variant="expired" />
            ) : linkActive ? (
              <StatusBadge variant="active" />
            ) : (
              <StatusBadge variant="disabled" />
            )}
            <VisibilityBadge isPublic={visibility !== "Restricted"} />
            <PasswordBadge enabled={passwordEnabled} />
            {isStarred && <StarredBadge />}
          </div>

          {/* Segmented sliding switcher */}
          <div className="p-1 bg-secondary/30 border border-border/50 rounded-2xl flex">
            {["collaborators", "settings"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider transition-colors duration-250 cursor-pointer text-center z-10 select-none",
                  activeTab === tab
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTabPillDetail"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 bg-gradient-primary rounded-xl z-[-1] shadow-glow"
                  />
                )}
                {tab === "collaborators" ? "Collaborators" : "Link & Stats"}
              </button>
            ))}
          </div>

          {/* Tab Content Box with stable height */}
          <div className="min-h-[365px] overflow-hidden flex flex-col justify-start">
            <AnimatePresence mode="wait">
              {activeTab === "collaborators" ? (
                <motion.div
                  key="collaborators"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4 w-full flex-1 flex flex-col"
                >
                  {/* Invite People */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 block pl-1">
                      Invite People & Manage Access
                    </label>

                    <form onSubmit={handleSendInvite} className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="Invite by email..."
                          className="h-11 w-full rounded-2xl border border-border/60 bg-secondary/15 pl-4 pr-32 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                        />

                        {/* Segmented Viewer/Editor CSS selector */}
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex bg-secondary/50 border border-border/40 p-0.5 rounded-xl select-none">
                          {["Viewer", "Editor"].map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => setInviteRole(role)}
                              className={cn(
                                "rounded-lg px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider cursor-pointer transition-all duration-150",
                                inviteRole === role
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isInviting || !inviteEmail.trim()}
                        className={cn(
                          primaryBtn,
                          "h-11 px-4.5 shadow-glow rounded-2xl text-xs gap-1.5 font-bold shrink-0 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition-all",
                        )}
                      >
                        {isInviting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4" /> Invite
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Collaborators Access List */}
                  <div className="space-y-2 flex-1 flex flex-col justify-start">
                    <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 block pl-1">
                      Access List ({sharedUsers.length})
                    </label>
                    <div className="rounded-2xl border border-border/50 bg-secondary/10 p-2.5 space-y-2 scrollbar-thin">
                      <AnimatePresence initial={false}>
                        {sharedUsers.map((user) => (
                          <motion.div
                            key={user.email}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{
                              opacity: 0,
                              height: 0,
                              padding: 0,
                              margin: 0,
                              border: 0,
                            }}
                            transition={{ type: "tween", duration: 0.18 }}
                            className="w-full flex items-center justify-between gap-3 text-xs p-2 bg-secondary/15 border border-border/30 hover:border-border/60 hover:bg-secondary/35 rounded-2xl overflow-hidden"
                            style={{ transformOrigin: "top" }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  "h-9 w-9 rounded-xl font-display font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border bg-gradient-to-br",
                                  getAvatarGradient(user.name),
                                )}
                              >
                                {user.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate leading-tight flex items-center gap-2">
                                  {user.name}
                                  {user.role === "Owner" && (
                                    <span className="text-[8px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {user.email}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {user.role === "Owner" ? (
                                <span className="text-[9px] font-extrabold text-muted-foreground/80 bg-secondary/50 border border-border/40 px-3 py-1 rounded-xl uppercase tracking-wider">
                                  Owner
                                </span>
                              ) : (
                                <>
                                  {/* Dynamic User Role Selector Switcher */}
                                  <div className="flex bg-secondary/55 border border-border/45 p-0.5 rounded-xl select-none">
                                    {["Viewer", "Editor"].map((r) => (
                                      <button
                                        key={r}
                                        type="button"
                                        onClick={() =>
                                          handleUpdateUserRole(user.email, r)
                                        }
                                        className={cn(
                                          "rounded-lg px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider cursor-pointer transition-all duration-150",
                                          user.role === r
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground",
                                        )}
                                      >
                                        {r}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Revoke button */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveUser(user.email)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all cursor-pointer"
                                    title="Revoke access"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4 w-full flex-1"
                >
                  {/* Share Link Terminal */}
                  <div className="rounded-2xl border border-border/60 bg-secondary/10 p-4 space-y-4 w-full">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2.5 text-xs font-semibold text-foreground/90 uppercase tracking-wider">
                        {linkActive ? (
                          <Globe className="h-4 w-4 text-primary animate-pulse" />
                        ) : (
                          <Link2Off className="h-4 w-4 text-muted-foreground" />
                        )}
                        Share Link
                      </span>

                      <button
                        type="button"
                        onClick={handleToggleActive}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer border border-transparent",
                          linkActive
                            ? "bg-primary border-primary/20 shadow-glow"
                            : "bg-secondary border-border/60",
                        )}
                      >
                        <motion.span
                          layout
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                            linkActive ? "translate-x-6" : "translate-x-1",
                          )}
                        />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div
                        className={cn(
                          "flex-1 rounded-xl border border-border/80 px-3.5 py-2.5 text-xs font-mono truncate select-all bg-background/50 flex items-center gap-2 transition-all",
                          !linkActive && "opacity-50 pointer-events-none",
                        )}
                      >
                        {linkActive && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                        )}
                        <span className="truncate">https://{file.linkUrl}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onCopyLink(file.id, file.linkUrl)}
                        className={cn(
                          "inline-flex h-[38px] items-center justify-center gap-1.5 rounded-xl border px-4 text-xs font-semibold transition-all shrink-0 cursor-pointer",
                          isCopied
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
                            : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 active:scale-95",
                        )}
                      >
                        <AnimatePresence mode="wait">
                          {isCopied ? (
                            <motion.span
                              key="copied"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              className="flex items-center gap-1.5"
                            >
                              <Check className="h-4 w-4" />
                              Copied
                            </motion.span>
                          ) : (
                            <motion.span
                              key="copy"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              className="flex items-center gap-1.5"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                  </div>

                  {/* Analytics Grid */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="rounded-2xl border border-border/40 bg-secondary/10 p-3 sm:p-4 hover:border-border/80 transition-colors">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                        <Eye className="h-4 w-4 text-primary" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em]">
                          Views
                        </span>
                      </div>
                      <div className="font-display text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-none">
                        {file.views}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-secondary/10 p-3 sm:p-4 hover:border-border/80 transition-colors">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                        <ArrowUpRight className="h-4 w-4 text-accent" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em]">
                          Downloads
                        </span>
                      </div>
                      <div className="font-display text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-none">
                        {file.downloads}
                      </div>
                    </div>
                  </div>

                  {/* Link Settings Card Wrapper */}
                  <div
                    className={cn(
                      "rounded-2xl border border-border bg-secondary/15 p-4 space-y-4 w-full transition-all",
                      !linkActive && "opacity-50 pointer-events-none",
                    )}
                  >
                    {/* Visibility Switch Control */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground/80" />{" "}
                        Link Visibility
                      </span>

                      <div className="flex bg-secondary/35 border border-border/40 p-0.5 rounded-xl select-none shrink-0">
                        {["Public", "Restricted"].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setVisibility(val);
                              onVisibilityToggle?.(file.id, val);
                              if (val === "Public") {
                                setPasswordEnabled(false);
                                setPassword("");
                                onPasswordUpdate?.(file.id, false, "");
                              }
                              addToast(`Visibility set to ${val}`);
                            }}
                            className={cn(
                              "rounded-lg px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider cursor-pointer transition-all duration-150",
                              visibility === val
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Expiration Label */}
                    <div className="h-px bg-border/40" />

                    <div className="flex items-center justify-between text-xs relative">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/80" />{" "}
                        Link Expiry
                      </span>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setShowExpirationDropdown((prev) => !prev)
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-xl border cursor-pointer transition-colors",
                            file.expiresAt
                              ? isExpired
                                ? "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15"
                                : "border-border/60 bg-secondary/50 text-foreground hover:bg-secondary/80"
                              : "border-border/60 bg-secondary/50 text-muted-foreground hover:bg-secondary/80",
                          )}
                        >
                          <span>{file.expiresAt || "Never"}</span>
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 text-muted-foreground/60 transition-transform",
                              showExpirationDropdown && "rotate-180",
                            )}
                          />
                        </button>

                        <AnimatePresence>
                          {showExpirationDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ type: "tween", duration: 0.2 }}
                              className="absolute right-0 top-full z-30 mt-1.5 min-w-[120px] rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md p-1 shadow-elegant"
                            >
                              {["Never", "1 Day", "7 Days", "30 Days"].map(
                                (val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => {
                                      const calculated =
                                        calculateExpiryDate(val);
                                      onExpirationUpdate?.(file.id, calculated);
                                      setShowExpirationDropdown(false);
                                      addToast(`Expiration set to ${val}`);
                                    }}
                                    className={cn(
                                      "w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors cursor-pointer",
                                      (val === "Never" && !file.expiresAt) ||
                                        (val !== "Never" &&
                                          file.expiresAt &&
                                          file.expiresAt ===
                                            calculateExpiryDate(val))
                                        ? "bg-secondary text-foreground"
                                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                                    )}
                                  >
                                    {val}
                                  </button>
                                ),
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Security Passwords Toggle Protection */}
                    <div className="h-px bg-border/40" />

                    {visibility === "Public" ? (
                      <div className="flex items-start gap-2.5 border border-dashed border-emerald-500/25 bg-emerald-500/5 rounded-2xl px-4 py-3 text-[10px] text-muted-foreground/80 font-medium leading-relaxed">
                        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          Anyone with this link can access. Toggle Link
                          Visibility to <strong>Restricted</strong> to lock with
                          password protection.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="flex items-center mb-3 justify-between">
                          <span className="flex items-center gap-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">
                            <Lock className="h-3.5 w-3.5 text-muted-foreground/80" />{" "}
                            Password Security
                          </span>

                          <button
                            type="button"
                            onClick={handlePasswordToggle}
                            className={cn(
                              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer border border-transparent",
                              passwordEnabled
                                ? "bg-amber-500 border-amber-500/20"
                                : "bg-secondary border-border/60",
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm",
                                passwordEnabled
                                  ? "translate-x-5"
                                  : "translate-x-1",
                              )}
                            />
                          </button>
                        </div>
                        <AnimatePresence initial={false}>
                          {passwordEnabled && (
                            <motion.form
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ type: "tween", duration: 0.4 }}
                              onSubmit={handleSavePassword}
                              className="overflow-hidden space-y-2 border-t border-border/30"
                            >
                              <div className="flex items-center justify-between pl-1">
                                <div className="text-[9px] font-bold text-muted-foreground/80 flex items-center gap-1.5 uppercase tracking-wider">
                                  <KeyRound className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                  {initialPasswordValue
                                    ? "Update Security Key"
                                    : "Set Security Key"}
                                </div>
                                {initialPasswordValue && (
                                  <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-tight bg-amber-500/5 px-2 py-0.5 rounded-lg border border-amber-500/10">
                                    Current: {initialPasswordValue}
                                  </span>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) =>
                                      setPassword(e.target.value)
                                    }
                                    placeholder={
                                      initialPasswordValue
                                        ? `Current: ${initialPasswordValue}`
                                        : "Create secure key..."
                                    }
                                    className="h-10 w-full rounded-xl border border-border/80 bg-background/50 pl-3.5 pr-10 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-all font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>

                                <button
                                  type="submit"
                                  disabled={!password.trim()}
                                  className={cn(
                                    primaryBtn,
                                    "h-10 px-4 shadow-none rounded-xl text-xs gap-1.5 font-bold shrink-0 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-95",
                                  )}
                                >
                                  {passwordSaved ? (
                                    <>
                                      <Check className="h-4 w-4" />
                                      Saved
                                    </>
                                  ) : (
                                    "Apply"
                                  )}
                                </button>
                              </div>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* File Actions Footer Toolbar */}
        <div className="border-t border-border/40 p-4 space-y-2 bg-secondary/10 relative z-10 shrink-0">
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 pl-1 mb-2">
            Actions
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleStarToggle}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-95",
                isStarred
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "border-border bg-background/40 hover:bg-background/80 text-foreground/85",
              )}
            >
              <Star className={cn("h-4 w-4", isStarred && "fill-current")} />
              {isStarred ? "Unstar Link" : "Star Link"}
            </button>

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background/40 hover:bg-background/80 text-xs font-semibold text-foreground/85 transition-all cursor-pointer active:scale-95"
            >
              <Download className="h-4 w-4" /> Download File
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleActive}
            className={cn(
              "w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95",
              linkActive
                ? "border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10"
                : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10",
            )}
          >
            {linkActive ? (
              <>
                <Link2Off className="h-4 w-4" /> Disable Link
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" /> Enable Link
              </>
            )}
          </button>

          <button
            type="button"
            className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer active:scale-95"
          >
            <Trash2 className="h-4 w-4" /> Delete Shared Link
          </button>
        </div>
      </motion.div>

      {/* Floating Toast Portal */}
      <div className="fixed bottom-4 hidden left-4 z-[99] md:flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </>,
    document.body,
  );
}

/* ───────────────────────── Badge Components ───────────────────────── */

function StatusBadge({ variant }) {
  const styles = {
    active: {
      className:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      icon: Globe,
      label: "Active",
    },
    disabled: {
      className: "border-border bg-secondary/50 text-muted-foreground",
      icon: Link2Off,
      label: "Disabled",
    },
    expired: {
      className: "border-destructive/25 bg-destructive/10 text-destructive",
      icon: Clock,
      label: "Expired",
    },
  };
  const s = styles[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        s.className,
      )}
    >
      <s.icon className="h-3 w-3" /> {s.label}
    </span>
  );
}

function StarredBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
      <Star className="h-2.5 w-2.5 fill-current" /> Starred
    </span>
  );
}

function VisibilityBadge({ isPublic }) {
  return isPublic ? (
    <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/25 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-400">
      <Globe className="h-2.5 w-2.5" /> Public
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/25 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-400">
      <Shield className="h-2.5 w-2.5" /> Restricted
    </span>
  );
}

function PasswordBadge({ enabled }) {
  return enabled ? (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
      <Lock className="h-2.5 w-2.5" /> Password
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-500/20 bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
      <KeyRound className="h-2.5 w-2.5" /> No Password
    </span>
  );
}

/* ───────────────────────── Empty State ───────────────────────── */

function EmptyState() {
  return (
    <div className="col-span-full mx-auto flex max-w-sm flex-col items-center justify-center rounded-xl  px-6 py-14 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border text-primary">
        <Share2 className="h-5 w-5" />
      </span>
      <h4 className="mt-4 font-display text-base font-semibold text-foreground">
        No shared links found
      </h4>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Files you share via link will appear here. Generate a share link from
        any file in your drive to get started.
      </p>
    </div>
  );
}

/* ───────────────────────── Page Export ───────────────────────── */

export default function SharedFiles() {
  const [starred, setStarred] = useState(() =>
    Object.fromEntries(
      SHARED_FILES.filter((f) => f.starred).map((f) => [f.id, true]),
    ),
  );
  const [linkStates, setLinkStates] = useState(() =>
    Object.fromEntries(SHARED_FILES.map((f) => [f.id, f.linkActive])),
  );
  // Combined state to reduce re-renders and fix lag
  const [passwordConfig, setPasswordConfig] = useState(() =>
    Object.fromEntries(
      SHARED_FILES.map((f) => [
        f.id,
        {
          enabled: f.password,
          value: f.password ? "drivya123" : "",
        },
      ]),
    ),
  );
  const [visibilityStates, setVisibilityStates] = useState(() =>
    Object.fromEntries(
      SHARED_FILES.map((f) => [f.id, f.password ? "Restricted" : "Public"]),
    ),
  );
  const [expirationStates, setExpirationStates] = useState(() =>
    Object.fromEntries(SHARED_FILES.map((f) => [f.id, f.expiresAt])),
  );
  const handleVisibilityToggle = useCallback((fileId, visibility) => {
    setVisibilityStates((prev) => ({ ...prev, [fileId]: visibility }));
  }, []);

  const handlePasswordUpdate = useCallback((fileId, enabled, value) => {
    setPasswordConfig((prev) => ({
      ...prev,
      [fileId]: {
        enabled,
        value: value !== undefined ? value : prev[fileId].value,
      },
    }));
  }, []);

  const handleExpirationUpdate = useCallback((fileId, expiresAt) => {
    setExpirationStates((prev) => ({ ...prev, [fileId]: expiresAt }));
  }, []);

  return (
    <>
      <SharedHero linkStates={linkStates} passwordConfig={passwordConfig} />
      <SharedFilesSection
        starred={starred}
        setStarred={setStarred}
        linkStates={linkStates}
        setLinkStates={setLinkStates}
        passwordConfig={passwordConfig}
        onPasswordUpdate={handlePasswordUpdate}
        visibilityStates={visibilityStates}
        onVisibilityToggle={handleVisibilityToggle}
        expirationStates={expirationStates}
        onExpirationUpdate={handleExpirationUpdate}
      />
      <SharingTips />
    </>
  );
}
