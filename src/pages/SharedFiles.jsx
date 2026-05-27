import { useState, useMemo, useEffect, useCallback, memo } from "react";
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
  Share2,
  Shield,
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

function SharedHero() {
  const activeLinks = SHARED_FILES.filter((f) => f.linkActive).length;
  const totalViews = SHARED_FILES.reduce((sum, f) => sum + f.views, 0);
  const totalDownloads = SHARED_FILES.reduce((sum, f) => sum + f.downloads, 0);
  const protectedCount = SHARED_FILES.filter((f) => f.password).length;

  return (
    <section className={`${card} ${subtleHover} relative overflow-hidden p-6 md:p-10 animate-fade-in`}>
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
            <span className="font-semibold text-foreground">{activeLinks} active links</span>{" "}
            with a total of{" "}
            <span className="font-semibold text-foreground">{totalViews.toLocaleString()} views</span>{" "}
            this month.
          </p>
        </div>

        {/* stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatMini icon={Link2} label="Active Links" value={activeLinks} />
          <StatMini icon={Eye} label="Total Views" value={totalViews.toLocaleString()} />
          <StatMini icon={Download} label="Downloads" value={totalDownloads.toLocaleString()} />
          <StatMini icon={Shield} label="Protected" value={protectedCount} accent />
        </div>
      </div>
    </section>
  );
}

function StatMini({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border shrink-0",
          accent
            ? "border-accent/20 bg-accent/10 text-accent"
            : "border-primary/20 bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-lg font-semibold tracking-tight text-foreground tabular-nums leading-none">
          {value}
        </div>
        <div className="text-[10px] font-medium text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}

/* ───────────────────────── Sharing Tips ───────────────────────── */

function SharingTips() {
  const tips = [
    { icon: Shield, title: "Password Protection", description: "Add a password to your shared links for an extra layer of security.", color: "primary" },
    { icon: Clock, title: "Expiring Links", description: "Set an expiration date to automatically revoke access after a period.", color: "accent" },
    { icon: Eye, title: "View Analytics", description: "Track who's accessing your files with detailed view and download stats.", color: "primary" },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
      {tips.map((tip, i) => (
        <div
          key={tip.title}
          className={`${card} ${subtleHover} p-5 cursor-default animate-fade-in`}
          style={{ animationDelay: `${0.05 + i * 0.05}s`, animationFillMode: "both" }}
        >
          <div
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-xl border",
              tip.color === "primary"
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-accent/20 bg-accent/10 text-accent"
            )}
          >
            <tip.icon className="h-4 w-4" />
          </div>
          <h4 className="mt-3 font-display text-sm font-semibold text-foreground">{tip.title}</h4>
          <p className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed">{tip.description}</p>
        </div>
      ))}
    </section>
  );
}

/* ───────────────────────── Shared Files Section ───────────────────────── */

function SharedFilesSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState("grid");
  const [copiedId, setCopiedId] = useState(null);
  const [modalFile, setModalFile] = useState(null);
  const [starred, setStarred] = useState(() =>
    Object.fromEntries(SHARED_FILES.filter((f) => f.starred).map((f) => [f.id, true]))
  );
  const [linkStates, setLinkStates] = useState(() =>
    Object.fromEntries(SHARED_FILES.map((f) => [f.id, f.linkActive]))
  );

  const filteredFiles = useMemo(() => {
    let list = [...SHARED_FILES];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (filter === "active") list = list.filter((f) => linkStates[f.id]);
    if (filter === "protected") list = list.filter((f) => f.password);
    if (filter === "expired") list = list.filter((f) => f.expired || !linkStates[f.id]);
    list.sort((a, b) => {
      if (sortBy === "views") return b.views - a.views;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return new Date(b.sharedAt) - new Date(a.sharedAt);
    });
    return list;
  }, [searchQuery, filter, sortBy, linkStates]);

  const handleCopyLink = useCallback((fileId, url) => {
    navigator.clipboard?.writeText?.(`https://${url}`);
    setCopiedId(fileId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleToggleLink = useCallback((fileId) => {
    setLinkStates((prev) => ({ ...prev, [fileId]: !prev[fileId] }));
  }, []);

  const toggleStar = useCallback((id) => {
    setStarred((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

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
                {filteredFiles.length} item{filteredFiles.length === 1 ? "" : "s"}
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
              <div className="flex rounded-xl border border-border bg-secondary/40 p-0.5" role="tablist">
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
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", sortOpen && "rotate-180")} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 z-20 mt-2 min-w-[140px] rounded-xl border border-border bg-popover p-1 shadow-elegant animate-fade-in">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => { setSortBy(opt.id); setSortOpen(false); }}
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          sortBy === opt.id
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
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
                    view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                    view === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
              : "flex flex-col gap-2"
          )}
          role="list"
        >
          {filteredFiles.length === 0 ? (
            <EmptyState />
          ) : (
            filteredFiles.map((file, i) => (
              <SharedFileCard
                key={file.id}
                file={file}
                index={i}
                isGrid={isGrid}
                linkActive={linkStates[file.id]}
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
            file={modalFile}
            linkActive={linkStates[modalFile.id]}
            isStarred={Boolean(starred[modalFile.id])}
            copiedId={copiedId}
            onCopyLink={handleCopyLink}
            onToggleLink={handleToggleLink}
            onStar={toggleStar}
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
  const isExpired = file.expired;
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
                {file.password && <SecurityBadge />}
                {isStarred && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                    <Star className="h-2.5 w-2.5 fill-current" /> Starred
                  </span>
                )}
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
                      : "border-border bg-secondary/30 text-muted-foreground/50 cursor-not-allowed"
                )}
              >
                {isCopied ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy Link</>}
              </button>

              <button
                type="button"
                onClick={() => onToggleLink(file.id)}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors shrink-0",
                  linkActive
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                    : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                )}
                title={linkActive ? "Disable link" : "Enable link"}
              >
                {linkActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
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
                    {isStarred && (
                      <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        <Star className="h-2.5 w-2.5 fill-current" /> Starred
                      </span>
                    )}
                    {isExpired ? (
                      <StatusBadge variant="expired" />
                    ) : linkActive ? (
                      <StatusBadge variant="active" />
                    ) : (
                      <StatusBadge variant="disabled" />
                    )}
                    {file.password && <SecurityBadge />}
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

function FileActions({ fileId, starred, visible, compact, onStar, onOpenModal }) {
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
        compact ? "" : "max-md:opacity-100 max-md:pointer-events-auto"
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
      <button type="button" className={cn(btn, "hover:text-destructive")} title="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {!compact && (
        <button type="button" className={btn} title="Details" onClick={onOpenModal}>
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── Link Detail Modal ───────────────────────── */

function LinkDetailModal({
  file,
  linkActive,
  isStarred,
  copiedId,
  onCopyLink,
  onToggleLink,
  onStar,
  onClose,
}) {
  const kind = detectFileKind(file.name, file.kind);
  const isCopied = copiedId === file.id;
  const isExpired = file.expired;

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
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

      {/* Panel — full-screen sheet on mobile, side slider on tablet+ */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.3, ease: easeSmooth }}
        className={cn(
          "fixed z-50 overflow-y-auto bg-background shadow-elegant",
          /* Mobile: full width & height */
          "inset-0",
          /* Tablet (md): right-side slider */
          "md:inset-y-0 md:inset-x-auto md:right-0 md:w-[420px] md:max-w-[85vw] md:border-l md:border-border",
          /* Desktop (lg): wider slider */
          "lg:w-[460px]",
          /* Mobile: round top corners for sheet feel */
          "rounded-t-2xl md:rounded-t-none",
        )}
        style={{ scrollbarGutter: "stable", WebkitOverflowScrolling: "touch" }}
      >
        {/* Mobile drag handle indicator */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="px-4 pb-6 pt-2 space-y-5 sm:px-5 md:p-6 md:space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileTypeIcon kind={kind} size="lg" />
              <div className="min-w-0">
                <h2 className="font-display text-base sm:text-lg font-semibold text-foreground truncate">{file.name}</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">{file.size} · Shared {file.sharedAt}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className={cn(iconBtn, "h-9 w-9 shrink-0")}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-2">
            {isExpired ? <StatusBadge variant="expired" /> : linkActive ? <StatusBadge variant="active" /> : <StatusBadge variant="disabled" />}
            {file.password && <SecurityBadge />}
            {isStarred && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                <Star className="h-2.5 w-2.5 fill-current" /> Starred
              </span>
            )}
          </div>

          {/* Share Link URL */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3 sm:p-4 space-y-2.5 sm:space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">Share Link</div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2.5 text-xs sm:text-sm text-foreground font-mono truncate select-all overflow-x-auto">
                https://{file.linkUrl}
              </div>
              <button
                type="button"
                onClick={() => onCopyLink(file.id, file.linkUrl)}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-4 text-xs font-medium transition-all shrink-0 w-full sm:w-auto",
                  isCopied
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                )}
              >
                {isCopied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
              </button>
            </div>
          </div>

          {/* Analytics */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div className="rounded-xl border border-border bg-secondary/30 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5 sm:mb-2">
                <Eye className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Views</span>
              </div>
              <div className="font-display text-xl sm:text-2xl font-semibold text-foreground tabular-nums">{file.views}</div>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5 sm:mb-2">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Downloads</span>
              </div>
              <div className="font-display text-xl sm:text-2xl font-semibold text-foreground tabular-nums">{file.downloads}</div>
            </div>
          </div>

          {/* Link Settings */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3 sm:p-4 space-y-2.5 sm:space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">Link Settings</div>

            <div className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-2 text-sm text-foreground/80">
                <Lock className="h-4 w-4 text-muted-foreground" /> Password
              </span>
              {file.password ? (
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">Enabled</span>
              ) : (
                <span className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-md">Off</span>
              )}
            </div>

            <div className="h-px bg-border/60" />

            <div className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-2 text-sm text-foreground/80">
                <Clock className="h-4 w-4 text-muted-foreground" /> Expires
              </span>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-md",
                file.expiresAt
                  ? isExpired ? "text-destructive bg-destructive/10" : "text-foreground/80 bg-secondary/50"
                  : "text-muted-foreground bg-secondary/50"
              )}>
                {file.expiresAt || "Never"}
              </span>
            </div>

            <div className="h-px bg-border/60" />

            <div className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-2 text-sm text-foreground/80">
                <Globe className="h-4 w-4 text-muted-foreground" /> Status
              </span>
              <button
                type="button"
                onClick={() => onToggleLink(file.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 sm:py-1 rounded-lg border transition-colors cursor-pointer",
                  linkActive
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
                    : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
                )}
              >
                {linkActive ? <><ToggleRight className="h-3.5 w-3.5" /> Active</> : <><ToggleLeft className="h-3.5 w-3.5" /> Disabled</>}
              </button>
            </div>
          </div>

          {/* File Actions */}
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 mb-2 sm:mb-3">File Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onStar(file.id)}
                className={cn(
                  "inline-flex h-11 sm:h-10 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
                  isStarred
                    ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "border-border bg-secondary/40 text-foreground/80 hover:bg-secondary/70"
                )}
              >
                <Star className={cn("h-4 w-4", isStarred && "fill-current")} />
                {isStarred ? "Unstar" : "Star"}
              </button>
              <button
                type="button"
                className="inline-flex h-11 sm:h-10 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 text-sm font-medium text-foreground/80 hover:bg-secondary/70 transition-colors"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
            <button
              type="button"
              onClick={() => onToggleLink(file.id)}
              className={cn(
                "w-full inline-flex h-11 sm:h-10 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all",
                linkActive
                  ? "border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10"
                  : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
              )}
            >
              {linkActive ? <><Link2Off className="h-4 w-4" /> Disable Link</> : <><Link2 className="h-4 w-4" /> Enable Link</>}
            </button>
            <button
              type="button"
              className="w-full inline-flex h-11 sm:h-10 items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Delete Shared Link
            </button>
          </div>

          {/* Bottom safe area spacer for mobile */}
          <div className="h-4 md:h-0" />
        </div>
      </motion.div>
    </>
  );
}

/* ───────────────────────── Badge Components ───────────────────────── */

function StatusBadge({ variant }) {
  const styles = {
    active: { className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: Globe, label: "Active" },
    disabled: { className: "border-border bg-secondary/50 text-muted-foreground", icon: Link2Off, label: "Disabled" },
    expired: { className: "border-destructive/25 bg-destructive/10 text-destructive", icon: Clock, label: "Expired" },
  };
  const s = styles[variant];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", s.className)}>
      <s.icon className="h-3 w-3" /> {s.label}
    </span>
  );
}

function SecurityBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
      <Lock className="h-2.5 w-2.5" /> Password
    </span>
  );
}

/* ───────────────────────── Empty State ───────────────────────── */

function EmptyState() {
  return (
    <div className="col-span-full mx-auto flex max-w-sm flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-14 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary/60 text-primary">
        <Share2 className="h-5 w-5" />
      </span>
      <h4 className="mt-4 font-display text-base font-semibold text-foreground">No shared links found</h4>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Files you share via link will appear here. Generate a share link from any file in your drive to get started.
      </p>
    </div>
  );
}

/* ───────────────────────── Page Export ───────────────────────── */

export default function SharedFiles() {
  return (
    <>
      <SharedHero />
      <SharedFilesSection />
      <SharingTips />
    </>
  );
}
