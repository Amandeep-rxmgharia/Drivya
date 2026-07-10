import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Users as UsersIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  History,
  Search,
  UserX,
  UserCheck,
  Trash2,
  RefreshCw,
  HardDrive,
  Share2,
  FileText,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  Eye,
  UserCog,
  Crown,
  CircleDot,
  Ban,
  Undo2,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  listUsers,
  changeUserRole,
  toggleSuspend,
  deleteUser,
  getPlatformStats,
  getAuditLog,
} from "../../api/admin.js";
import {
  card,
  subtleHover,
  chip,
  primaryBtn,
  ghostBtn,
  Kbd,
} from "@/components/dashboard/dashboard-tokens";

const API_BASE = "http://localhost:3000";

/* ────────────────────────── helpers ────────────────────────── */

const formatStorage = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const ROLE_CONFIG = {
  admin: {
    label: "Admin",
    icon: Crown,
    bg: "bg-purple-550/10 dark:bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    ring: "ring-purple-500/20",
    dot: "bg-purple-500",
    gradient: "from-purple-500 to-violet-655 dark:to-violet-600",
  },
  moderator: {
    label: "Moderator",
    icon: ShieldAlert,
    bg: "bg-sky-555/10 dark:bg-sky-500/10",
    text: "text-sky-650 dark:text-sky-400",
    ring: "ring-sky-555/20 dark:ring-sky-555/20",
    dot: "bg-sky-500",
    gradient: "from-sky-500 to-blue-600",
  },
  user: {
    label: "User",
    icon: UsersIcon,
    bg: "bg-zinc-500/10",
    text: "text-zinc-655 dark:text-zinc-400",
    ring: "ring-zinc-500/20",
    dot: "bg-zinc-500",
    gradient: "from-zinc-500 to-zinc-600",
  },
};

const AUDIT_ACTION_CONFIG = {
  ROLE_CHANGE: { label: "Role Changed", color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: UserCog },
  USER_SUSPEND: { label: "Suspended", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Ban },
  USER_UNSUSPEND: { label: "Unsuspended", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: Undo2 },
  USER_DELETE: { label: "Deleted", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: Trash2 },
};

/* ────────────────────────── sub-components ────────────────────────── */

function AdminHero({ stats, isAdminUser }) {
  const totalUsers = stats?.totalUsers ?? 0;
  const activeUsers = stats?.activeUsers ?? 0;
  const totalStorageUsed = stats?.totalStorageUsed ?? 0;
  const totalFiles = stats?.totalFiles ?? 0;
  const totalShares = stats?.totalShares ?? 0;

  return (
    <section className={`${card} ${subtleHover} relative overflow-hidden p-6 md:p-10 animate-fade-in`}>
      {/* ambient glows */}
      <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-ambient-primary blur-3xl opacity-80 pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-ambient-primary blur-3xl opacity-50 pointer-events-none" />

      <div className="relative flex flex-col gap-8">
        <div className="max-w-xl">
          <div className={chip}>
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow animate-pulse" />
            {isAdminUser ? "Full Administrator Access" : "Moderator Access · Read-Only"}
          </div>
          <h1 className="mt-5 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-foreground">
            Admin <span className="text-gradient">Console</span>
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed max-w-lg text-sm">
            Manage system users, adjust roles, monitor storage, and review secure audit trails. There are currently{" "}
            <span className="font-semibold text-foreground">{totalUsers} users</span> registered, with{" "}
            <span className="font-semibold text-foreground">{activeUsers} active sessions</span>.
          </p>
        </div>

        {/* stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatMini
            icon={UsersIcon}
            label="Total Users"
            value={totalUsers}
            accentColor="border-blue-500/20 bg-blue-500/10 text-blue-500 dark:text-blue-400"
          />
          <StatMini
            icon={HardDrive}
            label="Storage Used"
            value={formatStorage(totalStorageUsed)}
            accentColor="border-purple-500/20 bg-purple-500/10 text-purple-500 dark:text-purple-400"
          />
          <StatMini
            icon={FileText}
            label="Total Files"
            value={totalFiles.toLocaleString()}
            accentColor="border-emerald-500/20 bg-emerald-500/10 text-emerald-550 dark:text-emerald-400"
          />
          <StatMini
            icon={Share2}
            label="Shared Links"
            value={totalShares}
            accentColor="border-accent/20 bg-accent/10 text-accent"
          />
        </div>
      </div>
    </section>
  );
}

function StatMini({ icon: Icon, label, value, accentColor }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg border shrink-0 ${accentColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-base md:text-lg font-semibold tracking-tight text-foreground tabular-nums leading-none truncate">
          {value}
        </div>
        <div className="text-[10px] font-medium text-muted-foreground mt-1 truncate">
          {label}
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.user;
  const Ic = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg ${cfg.bg} px-2.5 py-1 text-[10px] font-bold ${cfg.text} ring-1 ring-inset ${cfg.ring} uppercase tracking-wide`}>
      <Ic className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function StatusDot({ active, hasSession }) {
  let colorClass = "bg-rose-500";
  let textColorClass = "text-rose-550 dark:text-rose-400";
  let label = "Suspended";
  let ping = false;

  if (active) {
    if (hasSession) {
      colorClass = "bg-emerald-400";
      textColorClass = "text-emerald-555 dark:text-emerald-400";
      label = "Active";
      ping = true;
    } else {
      colorClass = "bg-amber-500";
      textColorClass = "text-amber-600 dark:text-amber-400";
      label = "Inactive";
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`relative h-2 w-2 rounded-full ${colorClass}`}>
        {ping && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-45" />}
        <span className={`absolute inset-0 rounded-full ${colorClass} h-2 w-2`} />
      </span>
      <span className={`text-[10.5px] font-semibold ${textColorClass}`}>
        {label}
      </span>
    </span>
  );
}

function RoleSelect({ value, onChange, disabled, size = "sm" }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
      return () => {
        window.removeEventListener("scroll", updateCoords, true);
        window.removeEventListener("resize", updateCoords);
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const options = [
    { value: "user", label: "User" },
    { value: "moderator", label: "Moderator" },
    { value: "admin", label: "Admin" },
  ];

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const isSmall = size === "sm";

  return (
    <div className={isSmall ? "inline-block" : "w-full"}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`inline-flex w-32 items-center justify-between gap-1.5 bg-secondary/40 hover:bg-secondary/65 border border-border/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
          isSmall
            ? "h-7 rounded-lg pl-2.5 pr-2 text-[10.5px] font-bold"
            : "h-9  rounded-xl px-3.5 text-xs font-semibold"
        }`}
      >
        <span className={isSmall ? "uppercase tracking-wide" : "uppercase tracking-wider"}>{selectedOption.label}</span>
        <ChevronDown className={`text-muted-foreground/80 transition-transform duration-200 ${open ? "rotate-180" : ""} ${isSmall ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
      </button>

      {open && createPortal(
        <AnimatePresence mode="wait">
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute",
              top: `${coords.top + 6}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
            className="rounded-xl border border-border/70 bg-popover/95 backdrop-blur-xl shadow-elegant p-1 z-[999] overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left rounded-lg transition-colors cursor-pointer ${
                  isSmall
                    ? "px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wide"
                    : "px-3 py-2 text-xs font-semibold uppercase tracking-wider"
                } ${
                  opt.value === value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function PaginationBar({ page, limit, total, onPrev, onNext }) {
  const start = total > 0 ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 px-1">
      <span>
        Showing <span className="font-semibold text-foreground">{start}–{end}</span> of <span className="font-semibold text-foreground">{total}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <span className="mr-2 text-foreground/60 hidden sm:inline">Page {page} of {totalPages || 1}</span>
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="h-8 w-8 rounded-lg border border-border/60 bg-secondary/30 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={onNext}
          disabled={page * limit >= total}
          className="h-8 w-8 rounded-lg border border-border/60 bg-secondary/30 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────── main component ────────────────────────── */

export default function AdminPanel() {
  const { setIsOutletLoading } = useOutletContext?.() || {};
  const { user, isAdmin, isModerator } = useAuth();
  const isAdminUser = isAdmin();
  const searchDebounceRef = useRef(null);

  const [activeTab, setActiveTab] = useState("users");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit] = useState(10);
  const [userSearch, setUserSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);

  // Audit
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLimit] = useState(15);
  const [logsLoading, setLogsLoading] = useState(true);

  const isLoading = statsLoading || (activeTab === "users" ? usersLoading : logsLoading);

  useEffect(() => {
    if (setIsOutletLoading) {
      setIsOutletLoading(isLoading);
    }
    return () => {
      if (setIsOutletLoading) setIsOutletLoading(false);
    };
  }, [isLoading, setIsOutletLoading]);

  // Confirmation modal (no 2FA)
  const [confirmModal, setConfirmModal] = useState(null);
  const [actionError, setActionError] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  /* ── data fetching ───────────────────────────── */

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      setStats(await getPlatformStats());
    } catch (e) {
      console.error("Stats:", e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const d = await listUsers({ page: usersPage, limit: usersLimit, search: userSearch });
      setUsers(d.items);
      setUsersTotal(d.pagination.total);
    } catch (e) { console.error("Users:", e); }
    finally { setUsersLoading(false); }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const d = await getAuditLog({ page: logsPage, limit: logsLimit });
      setLogs(d.items);
      setLogsTotal(d.pagination.total);
    } catch (e) { console.error("Audit:", e); }
    finally { setLogsLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchUsers(); }, [usersPage, userSearch]);
  useEffect(() => { if (activeTab === "logs") fetchLogs(); }, [activeTab, logsPage]);

  const handleSearchInput = (e) => {
    const val = e.target.value;
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setUserSearch(val);
      setUsersPage(1);
    }, 300);
  };

  /* ── admin actions ───────────────────────────── */

  const openConfirm = (type, targetUser, newRole = "") => {
    setConfirmModal({ type, targetUser, newRole });
    setActionError("");
  };

  const handleConfirm = async () => {
    if (!confirmModal) return;
    setActionSubmitting(true);
    setActionError("");

    try {
      const { type, targetUser, newRole } = confirmModal;
      if (type === "role") await changeUserRole(targetUser._id, newRole);
      else if (type === "suspend") await toggleSuspend(targetUser._id);
      else if (type === "delete") await deleteUser(targetUser._id);

      setConfirmModal(null);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setActionError(err.response?.data?.message || "Operation failed.");
    } finally {
      setActionSubmitting(false);
    }
  };

  /* ── tabs config ───────────────────────────── */

  const tabs = [
    { id: "users", label: "Users", icon: UsersIcon, count: stats?.totalUsers },
    ...(isAdminUser
      ? [{ id: "logs", label: <span>Audit&nbsp;Trail</span>, icon: History, count: logsTotal }]
      : []),
  ];

  return (
    <div className="space-y-6 pb-10">

      {/* ─── Hero & Stats Section ───────────────── */}
      <AdminHero stats={stats} isAdminUser={isAdminUser} />

      {/* ─── Controls: Navigation, Search, Actions ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/30 border border-border/40 w-fit backdrop-blur-md">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-2 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className={`h-3.5 w-3.5 transition-colors ${activeTab === tab.id ? "text-primary" : "text-muted-foreground"}`} />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                    activeTab === tab.id ? "bg-primary/15 text-primary" : "bg-secondary/80 text-muted-foreground/80"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          {activeTab === "users" && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search users by name, email..."
                defaultValue={userSearch}
                onChange={handleSearchInput}
                className="h-10 w-full rounded-xl border border-border bg-secondary/35 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2.5 self-start lg:self-center">
          <RoleBadge role={user?.role} />
          <button
            onClick={() => { fetchStats(); fetchUsers(); if (activeTab === "logs") fetchLogs(); }}
            className={`${ghostBtn} h-9 px-3.5 text-xs active:scale-95 cursor-pointer`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ─── Tab: Users ──────────────────────────── */}
      {activeTab === "users" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {usersLoading ? (
            <div className="rounded-2xl glass p-16 text-center shadow-elegant">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground font-medium">Loading users…</span>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl glass p-16 text-center shadow-elegant">
              <div className="flex flex-col items-center gap-2">
                <UsersIcon className="h-8 w-8 text-muted-foreground/20" />
                <span className="text-xs text-muted-foreground font-medium">No users found</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop View */}
              <div className="hidden xl:block rounded-2xl glass shadow-elegant overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 bg-secondary/20">
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">User</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Role</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Storage</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Status</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Joined</th>
                        {isAdminUser && (
                          <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em] text-right">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {users.map((u) => {
                        const isSelf = u._id === user?.id;
                        const rcfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;

                        const avatarUrl = u.avatarUrl;
                        const fullAvatarUrl = avatarUrl
                          ? avatarUrl.startsWith("http")
                            ? avatarUrl
                            : `${API_BASE}${avatarUrl}`
                          : null;

                        return (
                          <motion.tr
                            key={u._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="group hover:bg-secondary/10 transition-colors"
                          >
                            {/* User Info */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                  {fullAvatarUrl ? (
                                    <img
                                      src={fullAvatarUrl}
                                      alt={u.name || "User"}
                                      className="h-9 w-9 rounded-xl object-cover ring-1 ring-border shadow-sm"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        const sibling = e.target.nextSibling;
                                        if (sibling) sibling.style.display = "flex";
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    style={{ display: fullAvatarUrl ? "none" : "flex" }}
                                    className={`h-9 w-9 rounded-xl bg-gradient-to-br ${rcfg.gradient} flex items-center justify-center text-[11px] font-bold text-white shadow-sm shrink-0`}
                                  >
                                    {u.name?.charAt(0)?.toUpperCase() || "?"}
                                  </div>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                                    {u.name}
                                    {isSelf && (
                                      <span className="text-[8px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-md uppercase">You</span>
                                    )}
                                  </div>
                                  <div className="text-[10.5px] text-muted-foreground/70 truncate mt-0.5">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="px-6 py-4">
                              <RoleBadge role={u.role} />
                            </td>

                            {/* Storage */}
                            <td className="px-6 py-4">
                              <div className="space-y-1.5 max-w-[120px]">
                                <div className="flex justify-between text-[10px] font-medium">
                                  <span className="text-foreground">{formatStorage(u.storageUsed)}</span>
                                  <span className="text-muted-foreground/60">{formatStorage(u.storageLimit)}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-primary transition-all"
                                    style={{ width: `${Math.min(100, ((u.storageUsed || 0) / (u.storageLimit || 1)) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                              <StatusDot active={u.isActive !== false} hasSession={u.hasActiveSession} />
                            </td>

                            {/* Joined */}
                            <td className="px-6 py-4">
                              <span className="text-[10.5px] text-muted-foreground font-medium">{timeAgo(u.createdAt)}</span>
                            </td>

                            {/* Actions (admin only) */}
                            {isAdminUser && (
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                  {/* Role dropdown */}
                                  <RoleSelect
                                    value={u.role}
                                    disabled={isSelf}
                                    onChange={(val) => openConfirm("role", u, val)}
                                    size="sm"
                                  />

                                  {/* Suspend toggle */}
                                  <button
                                    onClick={() => openConfirm("suspend", u)}
                                    disabled={isSelf}
                                    title={u.isActive ? "Suspend" : "Unsuspend"}
                                    className={`h-7 w-7 rounded-lg border transition-all inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                                      u.isActive
                                        ? "border-amber-500/20 bg-amber-500/8 text-amber-555 dark:text-amber-400 hover:bg-amber-500/15"
                                        : "border-emerald-500/20 bg-emerald-500/8 text-emerald-555 dark:text-emerald-400 hover:bg-emerald-500/15"
                                    }`}
                                  >
                                    {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                  </button>

                                  {/* Delete */}
                                  <button
                                    onClick={() => openConfirm("delete", u)}
                                    disabled={isSelf}
                                    title="Delete permanently"
                                    className="h-7 w-7 rounded-lg border border-rose-500/20 bg-rose-500/8 text-rose-555 dark:text-rose-400 hover:bg-rose-500/15 transition-all inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t border-border/30 bg-secondary/10">
                  <PaginationBar
                    page={usersPage}
                    limit={usersLimit}
                    total={usersTotal}
                    onPrev={() => setUsersPage((p) => Math.max(1, p - 1))}
                    onNext={() => setUsersPage((p) => p + 1)}
                  />
                </div>
              </div>

              {/* Card Grid View (Tablet & Mobile) */}
              <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((u) => {
                  const isSelf = u._id === user?.id;
                  const rcfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;

                  const avatarUrl = u.avatarUrl;
                  const fullAvatarUrl = avatarUrl
                    ? avatarUrl.startsWith("http")
                      ? avatarUrl
                      : `${API_BASE}${avatarUrl}`
                    : null;

                  return (
                    <motion.div
                      key={u._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl glass p-5 space-y-4 shadow-elegant relative"
                    >
                      {/* Top Row: Avatar & Name & Role */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {fullAvatarUrl ? (
                              <img
                                src={fullAvatarUrl}
                                alt={u.name || "User"}
                                className="h-10 w-10 rounded-xl object-cover ring-1 ring-border shadow-sm"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  const sibling = e.target.nextSibling;
                                  if (sibling) sibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              style={{ display: fullAvatarUrl ? "none" : "flex" }}
                              className={`h-10 w-10 rounded-xl bg-gradient-to-br ${rcfg.gradient} flex items-center justify-center text-[13px] font-bold text-white shadow-sm shrink-0`}
                            >
                              {u.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                              {u.name}
                              {isSelf && (
                                <span className="text-[8px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-md uppercase">You</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground/70 truncate mt-0.5">{u.email}</div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <RoleBadge role={u.role} />
                          <StatusDot active={u.isActive !== false} hasSession={u.hasActiveSession} />
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-border/40" />

                      {/* Storage & Joined */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Storage Usage</span>
                          <div className="flex justify-between text-[10px] font-semibold">
                            <span className="text-foreground">{formatStorage(u.storageUsed)}</span>
                            <span className="text-muted-foreground/60">{formatStorage(u.storageLimit)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-primary transition-all"
                              style={{ width: `${Math.min(100, ((u.storageUsed || 0) / (u.storageLimit || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Joined</span>
                          <span className="text-xs text-foreground/80 font-medium">{timeAgo(u.createdAt)}</span>
                        </div>
                      </div>

                      {/* Actions (Admin Only & Not Self) */}
                      {isAdminUser && !isSelf && (
                        <>
                          <div className="h-px bg-border/40" />
                          <div className="flex items-center justify-between gap-3 pt-1">
                            {/* Role Select */}
                            <div className="flex-1">
                              <RoleSelect
                                value={u.role}
                                onChange={(val) => openConfirm("role", u, val)}
                                size="md"
                              />
                            </div>

                            {/* Suspend button */}
                            <button
                              onClick={() => openConfirm("suspend", u)}
                              title={u.isActive ? "Suspend" : "Unsuspend"}
                              className={`h-9 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                u.isActive
                                  ? "border-amber-500/20 bg-amber-500/8 text-amber-555 dark:text-amber-400 hover:bg-amber-500/15"
                                  : "border-emerald-500/20 bg-emerald-500/8 text-emerald-555 dark:text-emerald-400 hover:bg-emerald-500/15"
                              }`}
                            >
                              {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                              <span>{u.isActive ? "Suspend" : "Unsuspend"}</span>
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => openConfirm("delete", u)}
                              title="Delete permanently"
                              className="h-9 w-9 rounded-xl border border-rose-500/20 bg-rose-500/8 text-rose-555 dark:text-rose-400 hover:bg-rose-500/15 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
                <div className="rounded-2xl glass p-4 shadow-elegant col-span-1 md:col-span-2">
                  <PaginationBar
                    page={usersPage}
                    limit={usersLimit}
                    total={usersTotal}
                    onPrev={() => setUsersPage((p) => Math.max(1, p - 1))}
                    onNext={() => setUsersPage((p) => p + 1)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Moderator banner */}
          {!isAdminUser && (
            <div className="flex items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 shadow-sm">
              <Eye className="h-4 w-4 text-sky-400 shrink-0" />
              <p className="text-[11px] text-sky-300/80 leading-relaxed">
                You have <strong className="text-sky-300">read-only</strong> access as a moderator. Contact an administrator to perform user management actions.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── Tab: Audit Trail ────────────────────── */}
      {activeTab === "logs" && isAdminUser && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {logsLoading ? (
            <div className="rounded-2xl glass p-16 text-center shadow-elegant">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground font-medium">Loading audit trail…</span>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-2xl glass p-16 text-center shadow-elegant">
              <div className="flex flex-col items-center gap-2">
                <History className="h-8 w-8 text-muted-foreground/20" />
                <span className="text-xs text-muted-foreground font-medium">No audit entries recorded yet</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop View */}
              <div className="hidden xl:block rounded-2xl glass shadow-elegant overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 bg-secondary/20">
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">When</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Performed By</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Action</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Target</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em] hidden lg:table-cell">Details</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {logs.map((l) => {
                        const acfg = AUDIT_ACTION_CONFIG[l.action] || AUDIT_ACTION_CONFIG.ROLE_CHANGE;
                        const ActionIcon = acfg.icon;

                        return (
                          <tr key={l._id} className="hover:bg-secondary/10 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-[10.5px] text-foreground font-semibold whitespace-nowrap">{new Date(l.createdAt).toLocaleDateString()}</div>
                              <div className="text-[9.5px] text-muted-foreground/60 mt-0.5">{new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs font-semibold text-foreground">{l.performedBy?.name || "System"}</div>
                              <div className="text-[10px] text-muted-foreground/60 mt-0.5">{l.performedBy?.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-lg ${acfg.bg} ${acfg.color} border ${acfg.border} px-2 py-1 text-[10px] font-bold uppercase`}>
                                <ActionIcon className="h-3 w-3" />
                                {acfg.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {l.targetUserId ? (
                                <>
                                  <div className="text-xs font-semibold text-foreground">{l.targetUserId.name}</div>
                                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">{l.targetUserId.email}</div>
                                </>
                              ) : (
                                <span className="text-[10.5px] text-muted-foreground/50 italic">Deleted user</span>
                              )}
                            </td>
                            <td className="px-6 py-4 hidden lg:table-cell max-w-[200px]">
                              {l.details && Object.keys(l.details).length > 0 ? (
                                <div className="text-[10px] text-muted-foreground/75 font-mono bg-secondary/25 border border-border/40 rounded-lg px-2 py-1 truncate">
                                  {Object.entries(l.details).map(([k, v]) => `${k}: ${v}`).join(" → ")}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/40">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-mono text-muted-foreground/55">{l.ip || "—"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t border-border/30 bg-secondary/10">
                  <PaginationBar
                    page={logsPage}
                    limit={logsLimit}
                    total={logsTotal}
                    onPrev={() => setLogsPage((p) => Math.max(1, p - 1))}
                    onNext={() => setLogsPage((p) => p + 1)}
                  />
                </div>
              </div>

              {/* Card Grid View (Tablet & Mobile) */}
              <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                {logs.map((l) => {
                  const acfg = AUDIT_ACTION_CONFIG[l.action] || AUDIT_ACTION_CONFIG.ROLE_CHANGE;
                  const ActionIcon = acfg.icon;

                  return (
                    <div key={l._id} className="rounded-2xl glass p-5 space-y-4 shadow-elegant text-xs">
                      {/* Header: Action Badge & Time */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg ${acfg.bg} ${acfg.color} border ${acfg.border} px-2 py-1 text-[10px] font-bold uppercase tracking-wider`}>
                          <ActionIcon className="h-3.5 w-3.5" />
                          {acfg.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {new Date(l.createdAt).toLocaleDateString()} · {new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Performer & Target */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Performed By</span>
                          <span className="text-xs font-semibold text-foreground block truncate">{l.performedBy?.name || "System"}</span>
                          <span className="text-[10px] text-muted-foreground/70 block truncate">{l.performedBy?.email || ""}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Target User</span>
                          {l.targetUserId ? (
                            <>
                              <span className="text-xs font-semibold text-foreground block truncate">{l.targetUserId.name}</span>
                              <span className="text-[10px] text-muted-foreground/70 block truncate">{l.targetUserId.email}</span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground/40 italic block">Deleted user</span>
                          )}
                        </div>
                      </div>

                      {/* Details & IP */}
                      {((l.details && Object.keys(l.details).length > 0) || l.ip) && (
                        <>
                          <div className="h-px bg-border/40 my-1" />
                          <div className="space-y-2">
                            {l.details && Object.keys(l.details).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Details</span>
                                <div className="text-[10px] text-muted-foreground/80 font-mono bg-secondary/20 border border-border/30 rounded-lg px-2.5 py-1.5 break-all">
                                  {Object.entries(l.details).map(([k, v]) => `${k}: ${v}`).join(" → ")}
                                </div>
                              </div>
                            )}
                            {l.ip && (
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-muted-foreground uppercase tracking-wider">IP Address</span>
                                <span className="font-mono text-muted-foreground/60">{l.ip}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                <div className="rounded-2xl glass p-4 shadow-elegant col-span-1 md:col-span-2">
                  <PaginationBar
                    page={logsPage}
                    limit={logsLimit}
                    total={logsTotal}
                    onPrev={() => setLogsPage((p) => Math.max(1, p - 1))}
                    onNext={() => setLogsPage((p) => p + 1)}
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── Confirmation Modal (no 2FA) ─────────── */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-background/60 backdrop-blur-sm"
              onClick={() => !actionSubmitting && setConfirmModal(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              className="relative w-full max-w-md rounded-2xl glass shadow-elegant overflow-hidden border border-border bg-card/95"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-ambient-primary blur-3xl opacity-60 pointer-events-none" />

              <div className="relative p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      confirmModal.type === "delete" ? "bg-rose-500/15 text-rose-500 dark:text-rose-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-foreground">
                        {confirmModal.type === "role" && "Change Role"}
                        {confirmModal.type === "suspend" && (confirmModal.targetUser.isActive ? "Suspend Account" : "Unsuspend Account")}
                        {confirmModal.type === "delete" && "Delete Account"}
                      </h3>
                      <p className="text-[10.5px] text-muted-foreground mt-0.5">Please confirm your action</p>
                    </div>
                  </div>
                  <button
                    onClick={() => !actionSubmitting && setConfirmModal(null)}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/65 transition-colors inline-flex items-center justify-center cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Description */}
                <div className="rounded-xl bg-secondary/35 border border-border/50 p-4 text-xs leading-relaxed text-muted-foreground">
                  {confirmModal.type === "role" && (
                    <p>
                      Are you sure you want to change <strong className="text-foreground">{confirmModal.targetUser.name}</strong>'s role from <span className="font-bold text-foreground uppercase">{confirmModal.targetUser.role}</span> to <span className="font-bold text-primary uppercase">{confirmModal.newRole}</span>? Their active sessions will be revoked.
                    </p>
                  )}
                  {confirmModal.type === "suspend" && (
                    <p>
                      {confirmModal.targetUser.isActive ? (
                        <>Are you sure you want to suspend <strong className="text-foreground">{confirmModal.targetUser.name}</strong>'s account? They will be logged out immediately and blocked from logging back in.</>
                      ) : (
                        <>Are you sure you want to restore access for <strong className="text-foreground">{confirmModal.targetUser.name}</strong>? They will be allowed to log in again.</>
                      )}
                    </p>
                  )}
                  {confirmModal.type === "delete" && (
                    <p className="text-rose-500/90">
                      Are you sure you want to permanently delete <strong className="text-foreground">{confirmModal.targetUser.name}</strong>? This will delete all their files, shares, and data. This action is <strong>irreversible</strong>.
                    </p>
                  )}
                </div>

                {/* Error */}
                {actionError && (
                  <div className="text-[10.5px] text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5">
                    {actionError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    onClick={() => !actionSubmitting && setConfirmModal(null)}
                    disabled={actionSubmitting}
                    className="h-9 px-4 rounded-xl border border-border bg-secondary/35 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={actionSubmitting}
                    className={`h-9 px-5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                      confirmModal.type === "delete"
                        ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20 shadow-lg"
                        : "bg-primary hover:bg-primary/90 shadow-primary/20 shadow-lg"
                    }`}
                  >
                    {actionSubmitting ? "Processing…" : "Confirm"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
