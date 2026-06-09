import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  ChevronDown,
  Clock,
  Cloud,
  Folder,
  Home,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  CreditCard,
  ShieldCheck,
  HardDrive,
  LogOut,
  Laptop,
  Monitor,
  Moon,
  Sun,
  Keyboard,
  X,
  CheckCircle2,
} from "lucide-react";
import { easeSmooth, tweenEnter } from "@/lib/motion-presets";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { chip, iconBtn, primaryBtn, Kbd } from "./dashboard-tokens.jsx";
import { FloatingActionButton } from "./FloatingActionButton.jsx";
import { AiAssistantPanel } from "./AiAssistantPanel.jsx";

/* ───────────────────────── Sidebar ───────────────────────── */

const navMain = [
  { icon: Home, label: "Home", to: "home" },
  { icon: Folder, label: "My Drive", to: "drive", count: 248 },
  { icon: Share2, label: "Shared Files", to: "shared", count: 14 },
  { icon: Clock, label: "Recent", to: "recent" },
  { icon: Star, label: "Starred", to: "starred" },
  { icon: Trash2, label: "Trash", to: "trash" },
];

function Sidebar({ collapsed, onClose, mobileOpen }) {
  const location = useLocation();
  // Extract the active segment from URL: /dashboard/home → "home"
  const activeSegment =
    location.pathname.split("/").filter(Boolean).pop() || "home";

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-background/40 backdrop-blur-sm lg:hidden"
        />
      )}
      <motion.aside
        initial={{ x: -20, opacity: 0, width: collapsed ? 76 : 260 }}
        animate={{ x: 0, opacity: 1, width: collapsed ? 76 : 260 }}
        transition={{
          x: { type: "tween", duration: 0.78, delay: 0.04, ease: easeSmooth },
          opacity: {
            type: "tween",
            duration: 0.78,
            delay: 0.04,
            ease: easeSmooth,
          },
          width: { type: "tween", duration: 0.3, ease: easeSmooth },
        }}
        style={{ willChange: "width" }}
        className={[
          "fixed inset-y-0 left-0 z-40 h-full lg:relative lg:inset-auto shrink-0",
          "bg-background/60 backdrop-blur-xl border-r border-border/70",
          "flex flex-col overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* brand */}
        <div className="h-16 flex items-center px-5 border-b border-border/60">
          <Link
            to="/dashboard/home"
            className="flex items-center gap-2.5 group"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Cloud className="h-4 w-4 text-primary-foreground" />
            </span>
            {!collapsed && (
              <div className="flex flex-col leading-none">
                <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                  Drivya
                </span>
                <span className="text-[10.5px] font-medium text-muted-foreground mt-1">
                  Personal · Pro
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-7">
          <SidebarGroup
            onClose={onClose}
            label="Library"
            items={navMain}
            active={activeSegment}
            collapsed={collapsed}
          />
        </nav>

        {/* storage card */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tweenEnter(0.65, 0.2)}
            className="m-3 rounded-2xl glass p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/90">
                Storage
              </span>
              <span className={chip}>
                <Sparkles className="h-3 w-3 text-primary" />
                Pro
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "62%" }}
                transition={{
                  type: "tween",
                  duration: 1.1,
                  delay: 0.35,
                  ease: easeSmooth,
                }}
                className="h-full rounded-full bg-gradient-primary"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>156 GB of 250 GB</span>
              <Link to='/dashboard/payment?plan=pro' onClick={onClose} className="font-semibold text-foreground hover:text-primary transition-colors">
                Upgrade
              </Link>
            </div>
          </motion.div>
        )}

        <motion.div className="px-3 pb-3 pt-1">
          <Link
            onClick={onClose}
            to="/dashboard/settings"
            className={[
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              activeSegment === "settings"
                ? "bg-secondary/70 text-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </motion.div>
      </motion.aside>
    </>
  );
}

function SidebarGroup({ label, items, active, collapsed, onClose }) {
  return (
    <div>
      {!collapsed && (
        <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
          {label}
        </div>
      )}
      <ul className="space-y-0.5">
        {items.map((it, i) => {
          const isActive = active === it.to;
          return (
            <li
              key={it.to}
              className="animate-fade-in"
              style={{
                animationDelay: `${0.12 + i * 0.05}s`,
                animationFillMode: "both",
              }}
            >
              <Link
                onClick={onClose}
                to={`/dashboard/${it.to}`}
                className={[
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary/80 text-foreground border border-border/60 shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                  collapsed ? "justify-center" : "",
                ].join(" ")}
                title={collapsed ? it.label : undefined}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-gradient-primary shadow-glow" />
                )}
                <it.icon
                  className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{it.label}</span>
                    {it.count != null && (
                      <span className="text-[10.5px] font-semibold text-muted-foreground/70">
                        {it.count}
                      </span>
                    )}
                    {it.badge && (
                      <span className="rounded-md bg-gradient-primary px-1.5 py-0.5 text-[9.5px] font-semibold text-primary-foreground shadow-glow">
                        {it.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────────────────────── Topbar ───────────────────────── */

const STATUS_META = {
  active: { color: "bg-emerald-500 shadow-[0_0_8px_oklch(0.55_0.22_150)]", label: "Active" },
  away: { color: "bg-amber-500 shadow-[0_0_8px_oklch(0.79_0.16_85)]", label: "Away" },
  dnd: { color: "bg-rose-500 shadow-[0_0_8px_oklch(0.62_0.24_27)]", label: "Do Not Disturb" },
};

const NOTIFICATION_TYPES = {
  sharing: {
    icon: Share2,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10 border border-blue-500/20",
  },
  storage: {
    icon: HardDrive,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-500/10 border border-amber-500/20",
  },
  security: {
    icon: ShieldCheck,
    iconColor: "text-rose-500",
    bgColor: "bg-rose-500/10 border border-rose-500/20",
  },
  system: {
    icon: Sparkles,
    iconColor: "text-purple-500",
    bgColor: "bg-purple-500/10 border border-purple-500/20",
  },
  upload: {
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-500/10 border border-emerald-500/20",
  },
};

const formatTimeAgo = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const MOCK_NOTIFICATIONS = [
  {
    id: "1",
    title: "Suspicious Login Alert",
    description: "New login detected from Safari on macOS (San Francisco, CA).",
    type: "security",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    read: false,
    actionLabel: "Review activity",
    actionPath: "/dashboard/settings/security",
  },
  {
    id: "2",
    title: "Storage Limit Warning",
    description: "Your storage is at 62% of capacity. Clean up files or upgrade to get more space.",
    type: "storage",
    timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
    read: false,
    actionLabel: "Manage storage",
    actionPath: "/dashboard/settings/storage",
  },
  {
    id: "3",
    title: "Folder Shared",
    description: "Sarah Jenkins shared the folder 'Q3 Presentation Assets' with you.",
    type: "sharing",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionLabel: "View files",
    actionPath: "/dashboard/shared",
  },
  {
    id: "4",
    title: "Scheduled Maintenance",
    description: "Drivya will undergo system maintenance on June 8 at 02:00 UTC (15 min expected downtime).",
    type: "system",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionLabel: "Details",
    actionPath: "/dashboard/settings/notifications",
  },
];

const getInitials = (name) => {
  if (!name) return "AM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

function Topbar({
  onToggleSidebar,
  onMobileMenu,
  sidebarCollapsed,
  onOpenAiAssistant,
  userProfile,
  setUserProfile,
  notifications,
  markAsRead,
  toggleRead,
  deleteNotification,
  markAllRead,
  clearAllNotifications,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const bellDropdownRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { mode, setMode } = useTheme();

  const isMac = typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform || "");
  const modKeySymbol = isMac ? "⌘" : "Ctrl";

  // Close dropdown on click outside
  useEffect(() => {
    if (!profileOpen) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  // Close bell dropdown on click outside or ESC
  useEffect(() => {
    if (!bellOpen) return;
    const handleClickOutside = (event) => {
      if (bellDropdownRef.current && !bellDropdownRef.current.contains(event.target)) {
        setBellOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [bellOpen]);

  const initials = getInitials(userProfile?.displayName);
  const currentStatus = userProfile?.status || "active";

  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={tweenEnter(0.72, 0.1)}
      className="shrink-0 z-20 bg-background/60 backdrop-blur-xl border-b border-border/70"
    >
      <div className="h-16 flex items-center gap-3 px-4 md:px-6">
        <button onClick={onMobileMenu} className={`${iconBtn} lg:hidden`}>
          <Menu className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleSidebar}
          className={`${iconBtn} hidden lg:inline-flex`}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 hidden lg:block" />
          ) : (
            <PanelLeftClose className="h-4 w-4 hidden lg:block" />
          )}
        </button>

        {/* search */}
        <div className="flex-1 max-w-2xl">
          <div className="group relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              id="topbar-search-input"
              placeholder="Search files, folders, people…"
              className="h-10 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-24 text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
              <Kbd>{modKeySymbol}</Kbd>
              <Kbd>K</Kbd>
            </div>
          </div>
        </div>

        {/* premium ai assistant */}
        <button
          onClick={onOpenAiAssistant}
          className="group relative hidden xl:flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 h-10 transition-all cursor-pointer overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-x-full" />
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Ask Drivya AI
          </span>
          <div className="ml-2 flex items-center gap-0.5 rounded-md bg-background/50 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-primary uppercase ring-1 ring-primary/20 shadow-sm backdrop-blur-sm">
            BETA
          </div>
        </button>

        <ThemeToggle className="hidden sm:inline-flex" />

        {/* Bell Icon & Dropdown */}
        <div className="relative flex items-center justify-center" ref={bellDropdownRef}>
          <button
            onClick={() => setBellOpen((o) => !o)}
            className={`${iconBtn} relative ${bellOpen ? "bg-secondary" : ""}`}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary shadow-glow ring-2 ring-background animate-pulse" />
            )}
          </button>
          
          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 mt-2 top-full w-80 sm:w-[380px] rounded-2xl border border-border bg-popover shadow-elegant p-3 z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-foreground text-sm">Notifications</span>
                    {notifications.filter((n) => !n.read).length > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {notifications.filter((n) => !n.read).length} new
                      </span>
                    )}
                  </div>
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <button
                      onClick={() => markAllRead()}
                      className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1.5 p-0.5 mb-2 rounded-lg bg-secondary/35 border border-border/40">
                  <button
                    onClick={() => setFilter("all")}
                    className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-md transition-all ${
                      filter === "all"
                        ? "bg-secondary text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    onClick={() => setFilter("unread")}
                    className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-md transition-all ${
                      filter === "unread"
                        ? "bg-secondary text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Unread ({notifications.filter((n) => !n.read).length})
                  </button>
                </div>

                {/* Notifications List */}
                {notifications.filter((n) => filter === "all" || !n.read).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="h-12 w-12 rounded-full bg-secondary/35 border border-border/40 flex items-center justify-center text-muted-foreground/60 mb-3">
                      <Bell className="h-5 w-5 opacity-40 animate-bounce" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      {filter === "all" ? "No notifications" : "All caught up!"}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground mt-0.5 max-w-[200px]">
                      {filter === "all"
                        ? "You don't have any notifications at the moment."
                        : "You have no unread notifications."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-0.5 scrollbar-thin">
                    {notifications
                      .filter((n) => filter === "all" || !n.read)
                      .map((n) => {
                        const typeConfig = NOTIFICATION_TYPES[n.type] || NOTIFICATION_TYPES.system;
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              markAsRead(n.id);
                              if (n.actionPath) {
                                navigate(n.actionPath);
                                setBellOpen(false);
                              }
                            }}
                            className={`group/item relative flex gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              n.read
                                ? "bg-transparent border-transparent hover:bg-secondary/40 text-muted-foreground"
                                : "bg-secondary/40 border-border/40 hover:bg-secondary/60 text-foreground"
                            }`}
                          >
                            {/* Left Icon */}
                            <div className="relative shrink-0 mt-0.5">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${typeConfig.bgColor}`}>
                                <typeConfig.icon className={`h-4 w-4 ${typeConfig.iconColor}`} />
                              </div>
                              {!n.read && (
                                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-popover" />
                              )}
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 min-w-0 pr-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className={`text-xs font-semibold truncate ${n.read ? "text-foreground/80 font-medium" : "text-foreground"}`}>
                                  {n.title}
                                </span>
                                <span className="text-[9.5px] text-muted-foreground shrink-0 mt-0.5 font-medium">
                                  {formatTimeAgo(n.timestamp)}
                                </span>
                              </div>
                              <p className="text-[11px] leading-relaxed text-muted-foreground mt-0.5 line-clamp-2">
                                {n.description}
                              </p>

                              {/* Notification Action */}
                              {n.actionLabel && (
                                <div className="mt-2 flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(n.id);
                                      if (n.actionPath) {
                                        navigate(n.actionPath);
                                        setBellOpen(false);
                                      }
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 rounded-md transition-colors"
                                  >
                                    {n.actionLabel}
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Hover Quick Actions */}
                            <div className="absolute right-2 bottom-2 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 bg-popover/90 backdrop-blur-sm pl-1 py-0.5 rounded-md shadow-sm border border-border/40">
                              <button
                                onClick={(e) => toggleRead(n.id, e)}
                                title={n.read ? "Mark as unread" : "Mark as read"}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                              >
                                {n.read ? (
                                  <div className="h-3 w-3 rounded-full border border-primary" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                              </button>
                              <button
                                onClick={(e) => deleteNotification(n.id, e)}
                                title="Delete notification"
                                className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60 text-[11px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllNotifications();
                    }}
                    disabled={notifications.length === 0}
                    className="font-semibold text-muted-foreground hover:text-rose-500 transition-colors disabled:opacity-40 disabled:hover:text-muted-foreground"
                  >
                    Clear all
                  </button>
                  <button
                    onClick={() => {
                      setBellOpen(false);
                      navigate("/dashboard/settings/notifications");
                    }}
                    className="font-semibold text-primary hover:underline transition-all"
                  >
                    Notification settings
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* profile */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl pl-1 pr-2 h-10 hover:bg-secondary/50 transition-colors relative"
          >
            <div className="relative">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary ring-1 ring-border flex items-center justify-center text-xs font-semibold text-primary-foreground shadow-glow">
                {initials}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background ${STATUS_META[currentStatus]?.color}`} />
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-popover shadow-elegant p-2.5 z-50 overflow-hidden"
              >
                {/* Header card info */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-secondary/25 border border-border/40 mb-2">
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-glow">
                      {initials}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-popover ${STATUS_META[currentStatus]?.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {userProfile?.displayName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {userProfile?.email}
                    </div>
                  </div>
                </div>

                {/* Status selector inline */}
                <div className="px-2 py-1.5 border-b border-border/60">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Set Status
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {Object.entries(STATUS_META).map(([statusKey, meta]) => {
                      const isSelected = currentStatus === statusKey;
                      return (
                        <button
                          key={statusKey}
                          onClick={() => setUserProfile((p) => ({ ...p, status: statusKey }))}
                          className={`flex items-center justify-center gap-1.5 px-1.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                            isSelected
                              ? "bg-secondary border-border/80 text-foreground"
                              : "bg-transparent border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${meta.color}`} />
                          <span className="truncate">{meta.label.split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Appearance Theme Selector (Highly suitable according to user interaction) */}
                <div className="md:hidden px-2 py-1.5 border-b border-border/60">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Appearance Theme
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "light", label: "Light", icon: Sun },
                      { id: "dark", label: "Dark", icon: Moon },
                      { id: "system", label: "System", icon: Monitor },
                    ].map((themeItem) => {
                      const isSelected = mode === themeItem.id;
                      return (
                        <button
                          key={themeItem.id}
                          onClick={() => setMode(themeItem.id)}
                          className={`flex items-center justify-center gap-1.5 px-1.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                            isSelected
                              ? "bg-secondary border-border/80 text-foreground"
                              : "bg-transparent border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                          }`}
                        >
                          <themeItem.icon className="h-3 w-3" />
                          <span>{themeItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Actions group */}
                <div className="py-1 border-b border-border/60">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onOpenAiAssistant();
                    }}
                    className="w-full lg:hidden flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                      <span>Ask Drivya AI</span>
                    </div>
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md border border-primary/20">
                      BETA
                    </span>
                  </button>
                </div>

                {/* Menu items */}
                <div className="space-y-0.5 mt-1.5">
                  {[
                    { label: "Account & Profile", icon: User, path: "/dashboard/settings/account" },
                    { label: "Storage details", icon: HardDrive, path: "/dashboard/settings/storage" },
                    { label: "Sync & Devices", icon: Laptop, path: "/dashboard/settings/sync" },
                    { label: "Security & 2FA", icon: ShieldCheck, path: "/dashboard/settings/security" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        navigate(item.path);
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4 text-muted-foreground/75 group-hover:text-primary transition-colors" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 -rotate-90 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-muted-foreground/50" />
                    </button>
                  ))}
                </div>

                <div className="my-1.5 h-px bg-border/60" />

                {/* Sign out */}
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    // Clear profile state and redirect to Auth
                    localStorage.removeItem("drivya-user-profile");
                    navigate("/auth");
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12.5px] font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all group"
                >
                  <LogOut className="h-4 w-4 text-rose-500/80 group-hover:text-rose-600 transition-colors" />
                  <span>Sign out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}

/* ───────────────────────── Dashboard Layout ───────────────────────── */

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiRequest, setAiRequest] = useState(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("drivya-notifications");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return MOCK_NOTIFICATIONS;
  });

  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    localStorage.setItem("drivya-notifications", JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (notif) => {
    const newNotif = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notif,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Add visual toast
    const toastId = crypto.randomUUID();
    setToasts((prev) => [...prev, { id: toastId, ...newNotif }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4000);
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const toggleRead = (id, event) => {
    event?.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const deleteNotification = (id, event) => {
    event?.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    const handleAddNotification = (e) => {
      if (e.detail) {
        addNotification(e.detail);
      }
    };
    window.addEventListener("add-drivya-notification", handleAddNotification);
    return () => {
      window.removeEventListener("add-drivya-notification", handleAddNotification);
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const shortcutsEnabled = localStorage.getItem("drivya-shortcuts") !== "false";
      if (!shortcutsEnabled) return;

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();

      // Check if user is typing in input or textarea
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.isContentEditable
      );

      // Search shortcut (⌘+K or Ctrl+K) - focus search bar
      if (isCmdOrCtrl && !isShift && key === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("topbar-search-input");
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      if (isTyping) return;

      // Upload shortcut (⌘+U or Ctrl+U)
      if (isCmdOrCtrl && !isShift && key === "u") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-upload-modal"));
        return;
      }

      // New Folder shortcut (⌘+N or Ctrl+N)
      if (isCmdOrCtrl && !isShift && key === "n") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-folder-modal"));
        return;
      }

      // Settings shortcut (⌘+⇧+S or Ctrl+Shift+S)
      if (isCmdOrCtrl && isShift && key === "s") {
        e.preventDefault();
        navigate("/dashboard/settings");
        return;
      }

      // Help shortcut (⌘+/ or Ctrl+/)
      if (isCmdOrCtrl && !isShift && key === "/") {
        e.preventDefault();
        setShortcutHelpOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [navigate]);

  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("drivya-user-profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      displayName: "Amelia Moreau",
      email: "amelia@drivya.com",
      username: "amelia-moreau",
      phone: "+1 (555) 012-3456",
      language: "en",
      timezone: "auto",
      status: "active",
      tier: "Free",
    };
  });

  useEffect(() => {
    localStorage.setItem("drivya-user-profile", JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    const handleOpenAi = (e) => {
      setAiAssistantOpen(true);
      if (e.detail) {
        setAiRequest(e.detail);
      }
    };
    window.addEventListener("open-drivya-ai", handleOpenAi);
    return () => window.removeEventListener("open-drivya-ai", handleOpenAi);
  }, []);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden text-foreground">
      {/* ambient page glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, var(--ambient-radial-large), transparent), radial-gradient(ellipse 60% 40% at 90% 30%, var(--ambient-blob-b), transparent)",
        }}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <motion.div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar
            sidebarCollapsed={collapsed}
            onToggleSidebar={() => setCollapsed((c) => !c)}
            onMobileMenu={() => setMobileOpen(true)}
            onOpenAiAssistant={() => {
              setAiAssistantOpen(true);
              setAiRequest(null);
            }}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            notifications={notifications}
            markAsRead={markAsRead}
            toggleRead={toggleRead}
            deleteNotification={deleteNotification}
            markAllRead={markAllRead}
            clearAllNotifications={clearAllNotifications}
          />
          <main
            className="dashboard-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 space-y-6"
            style={{ scrollbarGutter: "stable" }}
          >
            <Outlet context={{ userProfile, setUserProfile }} />
          </main>
        </motion.div>
      </div>
      <FloatingActionButton />
      <AiAssistantPanel
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        initialRequest={aiRequest}
        clearInitialRequest={() => setAiRequest(null)}
      />
      <AnimatePresence>
        {shortcutHelpOpen && (
          <ShortcutHelpModal onClose={() => setShortcutHelpOpen(false)} />
        )}
      </AnimatePresence>

      {/* Floating toasts container */}
      <div className="fixed bottom-24 right-6 z-[100] pointer-events-none flex flex-col gap-2.5 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => {
            const typeConfig = NOTIFICATION_TYPES[toast.type] || NOTIFICATION_TYPES.system;
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                className="pointer-events-auto flex w-full gap-3 rounded-2xl glass shadow-elegant border border-border/80 bg-popover/90 p-4"
              >
                <div className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${typeConfig.bgColor}`}>
                  <typeConfig.icon className={`h-4 w-4 ${typeConfig.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <span className="text-xs font-semibold text-foreground block">
                    {toast.title}
                  </span>
                  <p className="text-[11px] leading-relaxed text-muted-foreground mt-0.5">
                    {toast.description}
                  </p>
                </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/65 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────────────────────── Shortcut Help Modal ───────────────────────── */

function ShortcutHelpModal({ onClose }) {
  const isMac = typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform || "");
  const mod = isMac ? "⌘" : "Ctrl";
  const shift = isMac ? "⇧" : "Shift";

  const shortcutsList = [
    { keys: [mod, "K"], action: "Search", desc: "Focus the search bar in the topbar" },
    { keys: [mod, "U"], action: "Upload Files", desc: "Open the file upload dialog" },
    { keys: [mod, "N"], action: "New Folder", desc: "Create a new folder in the current directory" },
    { keys: [mod, shift, "S"], action: "Settings", desc: "Navigate to the Settings panel" },
    { keys: [mod, "D"], action: "Download", desc: "Download the currently selected file" },
    { keys: [mod, shift, "C"], action: "Copy Share Link", desc: "Copy the share link of the selected file" },
    { keys: ["Del"], action: "Move to Trash", desc: "Delete the selected file" },
    { keys: [mod, "/"], action: "Shortcut Help", desc: "Toggle this shortcut reference dialog" },
  ];

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        className="relative w-full max-w-lg rounded-2xl glass shadow-elegant overflow-hidden border border-border bg-card/90"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "tween", duration: 0.3, ease: easeSmooth }}
      >
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-ambient-primary blur-3xl opacity-60 pointer-events-none" />

        <div className="relative p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow text-primary-foreground">
                <Keyboard className="h-5 w-5 animate-pulse" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Keyboard Shortcuts
                </h3>
                <p className="text-xs text-muted-foreground">
                  Quick key bindings to speed up your workflow
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/65 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-xl border border-border/60 bg-secondary/20 divide-y divide-border/40 max-h-[350px] overflow-y-auto pr-1">
            {shortcutsList.map((s) => (
              <div
                key={s.action}
                className="flex items-center justify-between px-4 py-3 hover:bg-secondary/10 transition-colors"
              >
                <div className="min-w-0 pr-4">
                  <span className="text-xs font-semibold text-foreground block">
                    {s.action}
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    {s.desc}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-md border border-border bg-secondary/80 px-1.5 py-0.5 text-[10px] font-bold text-foreground/80 shadow-sm"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-medium font-semibold">
            <span>Press <kbd className="border border-border bg-secondary/40 px-1 rounded">Esc</kbd> to close</span>
            <span>Shortcuts are {localStorage.getItem("drivya-shortcuts") !== "false" ? "Enabled" : "Disabled"}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
