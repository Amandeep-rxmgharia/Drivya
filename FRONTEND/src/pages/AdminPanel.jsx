import { useState, useEffect, useRef } from "react";
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
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    ring: "ring-purple-500/20",
    dot: "bg-purple-400",
    gradient: "from-purple-500 to-violet-600",
  },
  moderator: {
    label: "Moderator",
    icon: ShieldAlert,
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    ring: "ring-sky-500/20",
    dot: "bg-sky-400",
    gradient: "from-sky-500 to-blue-600",
  },
  user: {
    label: "User",
    icon: UsersIcon,
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    ring: "ring-zinc-500/20",
    dot: "bg-zinc-400",
    gradient: "from-zinc-500 to-zinc-600",
  },
};

const AUDIT_ACTION_CONFIG = {
  ROLE_CHANGE: { label: "Role Changed", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: UserCog },
  USER_SUSPEND: { label: "Suspended", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Ban },
  USER_UNSUSPEND: { label: "Unsuspended", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: Undo2 },
  USER_DELETE: { label: "Deleted", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: Trash2 },
};

/* ────────────────────────── sub-components ────────────────────────── */

function StatCard({ icon: Icon, label, value, subtitle, gradient }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl p-5 transition-all hover:border-border hover:bg-card/80 hover:shadow-lg"
    >
      <div className="absolute -top-12 -right-12 h-28 w-28 rounded-full bg-gradient-to-br opacity-[0.07] group-hover:opacity-[0.12] transition-opacity" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{label}</span>
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
          {subtitle && <p className="text-[10px] text-muted-foreground leading-relaxed">{subtitle}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="h-4.5 w-4.5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.user;
  const Ic = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg ${cfg.bg} px-2.5 py-1 text-[10.5px] font-bold ${cfg.text} ring-1 ring-inset ${cfg.ring} uppercase tracking-wide`}>
      <Ic className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function StatusDot({ active }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`relative h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-rose-400"}`}>
        {active && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />}
      </span>
      <span className={`text-[10.5px] font-semibold ${active ? "text-emerald-400" : "text-rose-400"}`}>
        {active ? "Active" : "Suspended"}
      </span>
    </span>
  );
}

function PaginationBar({ page, limit, total, onPrev, onNext }) {
  const start = total > 0 ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 px-1">
      <span>
        {total > 0 ? `${start}–${end} of ${total}` : "No results"}
      </span>
      <div className="flex items-center gap-1">
        <span className="mr-2 text-foreground/60">Page {page} of {totalPages || 1}</span>
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="h-7 w-7 rounded-lg border border-border/60 bg-secondary/20 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onNext}
          disabled={page * limit >= total}
          className="h-7 w-7 rounded-lg border border-border/60 bg-secondary/20 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────── main component ────────────────────────── */

export default function AdminPanel() {
  const { user, isAdmin, isModerator } = useAuth();
  const isAdminUser = isAdmin();
  const searchDebounceRef = useRef(null);

  const [activeTab, setActiveTab] = useState("users");
  const [stats, setStats] = useState(null);

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

  // Confirmation modal (no 2FA)
  const [confirmModal, setConfirmModal] = useState(null);
  const [actionError, setActionError] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  /* ── data fetching ───────────────────────────── */

  const fetchStats = async () => {
    try { setStats(await getPlatformStats()); } catch (e) { console.error("Stats:", e); }
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
      ? [{ id: "logs", label: "Audit Trail", icon: History, count: logsTotal }]
      : []),
  ];

  const colSpan = isAdminUser ? 6 : 5;

  return (
    <div className="space-y-6 pb-10">

      {/* ─── Hero Header ─────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/50 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="absolute -top-40 -right-32 h-80 w-80 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-purple-500/8 blur-3xl pointer-events-none" />

        <div className="relative px-7 py-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-glow">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  Admin Console
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAdminUser ? "Full access — manage users, roles, and review audit trails" : "Read-only view — monitoring user accounts and platform health"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <RoleBadge role={user?.role} />
            <button
              onClick={() => { fetchStats(); fetchUsers(); if (activeTab === "logs") fetchLogs(); }}
              className="h-9 px-3.5 rounded-xl border border-border/70 bg-secondary/30 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all inline-flex items-center gap-2 active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* ─── Stats Grid ──────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            icon={UsersIcon}
            label="Total Users"
            value={stats.totalUsers}
            subtitle={`${stats.activeUsers} active · ${stats.totalUsers - stats.activeUsers} suspended`}
            gradient="from-blue-500 to-indigo-600"
          />
          <StatCard
            icon={HardDrive}
            label="Storage Used"
            value={formatStorage(stats.totalStorageUsed)}
            subtitle="Combined across all accounts"
            gradient="from-violet-500 to-purple-600"
          />
          <StatCard
            icon={FileText}
            label="Total Files"
            value={stats.totalFiles.toLocaleString()}
            subtitle="Uploaded to the platform"
            gradient="from-emerald-500 to-teal-600"
          />
          <StatCard
            icon={Share2}
            label="Shared Links"
            value={stats.totalShares}
            subtitle="Public & collaboration links"
            gradient="from-amber-500 to-orange-600"
          />
        </div>
      )}

      {/* ─── Tab Navigation ──────────────────────── */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-secondary/20 border border-border/40 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-md border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-secondary/60 text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab: Users ──────────────────────────── */}
      {activeTab === "users" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              defaultValue={userSearch}
              onChange={handleSearchInput}
              className="h-10 w-full rounded-xl border border-border/60 bg-card/40 backdrop-blur pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/8 transition-all"
            />
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/40 bg-secondary/8">
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">User</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Role</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em] hidden md:table-cell">Storage</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Status</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em] hidden lg:table-cell">Joined</th>
                    {isAdminUser && (
                      <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em] text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={colSpan} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="h-5 w-5 text-muted-foreground/40 animate-spin" />
                          <span className="text-xs text-muted-foreground">Loading users…</span>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={colSpan} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <UsersIcon className="h-8 w-8 text-muted-foreground/25" />
                          <span className="text-xs text-muted-foreground">No users found</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isSelf = u._id === user?.id;
                      const rcfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;

                      return (
                        <motion.tr
                          key={u._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="group hover:bg-secondary/8 transition-colors"
                        >
                          {/* User Info */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${rcfg.gradient} flex items-center justify-center text-[11px] font-bold text-white shadow-sm shrink-0`}>
                                {u.name?.charAt(0)?.toUpperCase() || "?"}
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
                          <td className="px-5 py-3.5">
                            <RoleBadge role={u.role} />
                          </td>

                          {/* Storage */}
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <div className="space-y-1.5 max-w-[120px]">
                              <div className="flex justify-between text-[10px]">
                                <span className="font-semibold text-foreground">{formatStorage(u.storageUsed)}</span>
                                <span className="text-muted-foreground">{formatStorage(u.storageLimit)}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                                  style={{ width: `${Math.min(100, ((u.storageUsed || 0) / (u.storageLimit || 1)) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5">
                            <StatusDot active={u.isActive !== false} />
                          </td>

                          {/* Joined */}
                          <td className="px-5 py-3.5 hidden lg:table-cell">
                            <span className="text-[10.5px] text-muted-foreground">{timeAgo(u.createdAt)}</span>
                          </td>

                          {/* Actions (admin only) */}
                          {isAdminUser && (
                            <td className="px-5 py-3.5 text-right">
                              <div className="inline-flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                {/* Role dropdown */}
                                <select
                                  value={u.role}
                                  disabled={isSelf}
                                  onChange={(e) => openConfirm("role", u, e.target.value)}
                                  className="h-7 bg-secondary/40 border border-border/60 text-[10.5px] font-semibold rounded-lg px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer appearance-none"
                                >
                                  <option value="user">User</option>
                                  <option value="moderator">Moderator</option>
                                  <option value="admin">Admin</option>
                                </select>

                                {/* Suspend toggle */}
                                <button
                                  onClick={() => openConfirm("suspend", u)}
                                  disabled={isSelf}
                                  title={u.isActive ? "Suspend" : "Unsuspend"}
                                  className={`h-7 w-7 rounded-lg border transition-all inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                                    u.isActive
                                      ? "border-amber-500/20 bg-amber-500/8 text-amber-400 hover:bg-amber-500/20"
                                      : "border-emerald-500/20 bg-emerald-500/8 text-emerald-400 hover:bg-emerald-500/20"
                                  }`}
                                >
                                  {u.isActive ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                                </button>

                                {/* Delete */}
                                <button
                                  onClick={() => openConfirm("delete", u)}
                                  disabled={isSelf}
                                  title="Delete permanently"
                                  className="h-7 w-7 rounded-lg border border-rose-500/20 bg-rose-500/8 text-rose-400 hover:bg-rose-500/20 transition-all inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!usersLoading && users.length > 0 && (
              <div className="px-5 py-3 border-t border-border/30">
                <PaginationBar
                  page={usersPage}
                  limit={usersLimit}
                  total={usersTotal}
                  onPrev={() => setUsersPage((p) => Math.max(1, p - 1))}
                  onNext={() => setUsersPage((p) => p + 1)}
                />
              </div>
            )}
          </div>

          {/* Moderator banner */}
          {!isAdminUser && (
            <div className="flex items-center gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3">
              <Eye className="h-4 w-4 text-sky-400 shrink-0" />
              <p className="text-[11px] text-sky-300/80">
                You have <strong className="text-sky-300">read-only</strong> access as a moderator. Contact an admin to perform user management actions.
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
          <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/40 bg-secondary/8">
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">When</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Performed By</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Action</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Target</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em] hidden lg:table-cell">Details</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em] hidden md:table-cell">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {logsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="h-5 w-5 text-muted-foreground/40 animate-spin" />
                          <span className="text-xs text-muted-foreground">Loading audit trail…</span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <History className="h-8 w-8 text-muted-foreground/25" />
                          <span className="text-xs text-muted-foreground">No audit entries recorded yet</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((l) => {
                      const acfg = AUDIT_ACTION_CONFIG[l.action] || AUDIT_ACTION_CONFIG.ROLE_CHANGE;
                      const ActionIcon = acfg.icon;

                      return (
                        <tr key={l._id} className="hover:bg-secondary/8 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="text-[10.5px] text-foreground font-medium whitespace-nowrap">{new Date(l.createdAt).toLocaleDateString()}</div>
                            <div className="text-[9.5px] text-muted-foreground/60 mt-0.5">{new Date(l.createdAt).toLocaleTimeString()}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="text-xs font-semibold text-foreground">{l.performedBy?.name || "System"}</div>
                            <div className="text-[10px] text-muted-foreground/60 mt-0.5">{l.performedBy?.email}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg ${acfg.bg} ${acfg.color} border ${acfg.border} px-2 py-1 text-[10px] font-bold`}>
                              <ActionIcon className="h-3 w-3" />
                              {acfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {l.targetUserId ? (
                              <>
                                <div className="text-xs font-medium text-foreground">{l.targetUserId.name}</div>
                                <div className="text-[10px] text-muted-foreground/60 mt-0.5">{l.targetUserId.email}</div>
                              </>
                            ) : (
                              <span className="text-[10.5px] text-muted-foreground/50 italic">Deleted user</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 hidden lg:table-cell max-w-[200px]">
                            {l.details && Object.keys(l.details).length > 0 ? (
                              <div className="text-[10px] text-muted-foreground/70 font-mono bg-secondary/20 rounded-lg px-2 py-1 truncate">
                                {Object.entries(l.details).map(([k, v]) => `${k}: ${v}`).join(" → ")}
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <span className="text-[10px] font-mono text-muted-foreground/50">{l.ip || "—"}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!logsLoading && logs.length > 0 && (
              <div className="px-5 py-3 border-t border-border/30">
                <PaginationBar
                  page={logsPage}
                  limit={logsLimit}
                  total={logsTotal}
                  onPrev={() => setLogsPage((p) => Math.max(1, p - 1))}
                  onNext={() => setLogsPage((p) => p + 1)}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── Confirmation Modal (no 2FA) ─────────── */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-background/70 backdrop-blur-sm"
              onClick={() => !actionSubmitting && setConfirmModal(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              className="relative w-full max-w-sm rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      confirmModal.type === "delete" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {confirmModal.type === "role" && "Change Role"}
                        {confirmModal.type === "suspend" && (confirmModal.targetUser.isActive ? "Suspend Account" : "Unsuspend Account")}
                        {confirmModal.type === "delete" && "Delete Account"}
                      </h3>
                      <p className="text-[10.5px] text-muted-foreground mt-0.5">This action cannot be undone easily</p>
                    </div>
                  </div>
                  <button
                    onClick={() => !actionSubmitting && setConfirmModal(null)}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors inline-flex items-center justify-center"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Description */}
                <div className="rounded-xl bg-secondary/20 border border-border/30 p-3.5 text-[11px] leading-relaxed text-muted-foreground">
                  {confirmModal.type === "role" && (
                    <p>
                      Change <strong className="text-foreground">{confirmModal.targetUser.name}</strong>'s role from <strong className="text-foreground">{confirmModal.targetUser.role}</strong> to <strong className="text-foreground">{confirmModal.newRole}</strong>. Their active sessions will be revoked.
                    </p>
                  )}
                  {confirmModal.type === "suspend" && (
                    <p>
                      {confirmModal.targetUser.isActive ? (
                        <>Suspend <strong className="text-foreground">{confirmModal.targetUser.name}</strong>'s account. They will be logged out immediately and unable to access the platform.</>
                      ) : (
                        <>Restore access for <strong className="text-foreground">{confirmModal.targetUser.name}</strong>. They will be able to log in again.</>
                      )}
                    </p>
                  )}
                  {confirmModal.type === "delete" && (
                    <p className="text-rose-400/90">
                      Permanently delete <strong className="text-foreground">{confirmModal.targetUser.name}</strong> and all their files, shares, and data. This is <strong>irreversible</strong>.
                    </p>
                  )}
                </div>

                {/* Error */}
                {actionError && (
                  <div className="text-[10.5px] text-rose-400 bg-rose-500/8 border border-rose-500/15 rounded-lg px-3 py-2">
                    {actionError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => !actionSubmitting && setConfirmModal(null)}
                    disabled={actionSubmitting}
                    className="h-8 px-3.5 rounded-lg border border-border/60 bg-secondary/30 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={actionSubmitting}
                    className={`h-8 px-4 rounded-lg text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50 ${
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
