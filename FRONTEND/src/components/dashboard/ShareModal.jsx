import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Check,
  Copy,
  Link2,
  Link2Off,
  Lock,
  Clock,
  Globe,
  Plus,
  Loader2,
  ChevronDown,
  Eye,
  EyeOff,
  Trash2,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { detectFileKind } from "@/lib/file-types";
import { FileTypeIcon } from "@/components/dashboard/FileTypeIcon";
import { iconBtn, primaryBtn } from "./dashboard-tokens.jsx";
import {
  createShare,
  getShare,
  updateShare,
  inviteCollaborator,
  updateCollaboratorRole,
  revokeCollaborator,
} from "../../../api/shares.js";

// Premium Toast Notification
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

export function ShareModal({ file, onClose, onShareUpdated }) {
  const [activeTab, setActiveTab] = useState("collaborators");
  const [shareId, setShareId] = useState(null);
  const [shareLinkUrl, setShareLinkUrl] = useState("");
  const [isLoadingShare, setIsLoadingShare] = useState(true);
  const [linkActive, setLinkActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  const [visibility, setVisibility] = useState("Public");
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [expiration, setExpiration] = useState("Never");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");
  const [isInviting, setIsInviting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showExpirationDropdown, setShowExpirationDropdown] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const addToast = (message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
  };

  const loadShare = useCallback(async () => {
    if (!file?.id) return;

    setIsLoadingShare(true);
    try {
      const { share } = await createShare({ resourceId: file.id });
      setShareId(share.id);
      setShareLinkUrl(share.fullLinkUrl || `https://${share.linkUrl}`);
      setLinkActive(share.linkActive);
      setHasPassword(share.password);
      setPasswordEnabled(share.password);
      setVisibility(share.visibility);

      if (share.expiresAt) {
        setExpiration(share.expiresAt);
      }

      const detail = await getShare(share.id);
      setSharedUsers(detail.sharedUsers);
      onShareUpdated?.(file.id, share);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to load share settings.");
    } finally {
      setIsLoadingShare(false);
    }
  }, [file?.id, onShareUpdated]);

  useEffect(() => {
    loadShare();
  }, [loadShare]);

  // Esc key & Scroll Lock
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const syncShare = async (updates) => {
    if (!shareId) return null;
    setIsSaving(true);
    try {
      const { share } = await updateShare(shareId, updates);
      setLinkActive(share.linkActive);
      setHasPassword(share.password);
      setPasswordEnabled(share.password);
      setVisibility(share.visibility);
      if (share.expiresAt) setExpiration(share.expiresAt);
      onShareUpdated?.(file.id, share);
      return share;
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update share.");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    const url = shareLinkUrl || `https://drivya.link/${file.id}`;
    navigator.clipboard?.writeText?.(url);
    setCopied(true);
    addToast("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);

    if (!linkActive && shareId) {
      const share = await syncShare({ isActive: true });
      if (share) {
        setLinkActive(true);
        addToast("Share link enabled");
      }
    }
  };

  const handleToggleLink = async () => {
    if (!shareId) return;
    const nextState = !linkActive;
    const share = await syncShare({ isActive: nextState });
    if (share) {
      setLinkActive(nextState);
      addToast(nextState ? "Share link enabled" : "Share link disabled");
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !shareId) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      addToast("Please enter a valid email address");
      return;
    }

    setIsInviting(true);
    try {
      await inviteCollaborator(shareId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      const detail = await getShare(shareId);
      setSharedUsers(detail.sharedUsers);
      addToast(`Invited ${inviteEmail.trim()} as ${inviteRole}`);
      setInviteEmail("");

      if (!linkActive) {
        const share = await syncShare({ isActive: true });
        if (share) setLinkActive(true);
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to send invite.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateUserRole = async (email, newRole) => {
    const collaborator = sharedUsers.find((u) => u.email === email);
    if (!collaborator?.id || collaborator.role === "Owner" || !shareId) return;

    try {
      await updateCollaboratorRole(shareId, collaborator.id, newRole);
      setSharedUsers((prev) =>
        prev.map((user) =>
          user.email === email ? { ...user, role: newRole } : user,
        ),
      );
      addToast(`Role updated to ${newRole} for ${email}`);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update role.");
    }
  };

  const handleRemoveUser = async (email) => {
    const collaborator = sharedUsers.find((u) => u.email === email);
    if (!collaborator?.id || collaborator.role === "Owner" || !shareId) return;

    try {
      await revokeCollaborator(shareId, collaborator.id);
      setSharedUsers((prev) => prev.filter((user) => user.email !== email));
      addToast(`Access revoked for ${email}`);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to revoke access.");
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!password.trim() || !shareId) {
      addToast("Please enter a password");
      return;
    }

    const share = await syncShare({
      password: password.trim(),
      visibility: "restricted",
    });
    if (share) {
      setHasPassword(true);
      setPasswordEnabled(true);
      setVisibility("Restricted");
      setPasswordSaved(true);
      addToast("Share link password successfully set");
      setTimeout(() => setPasswordSaved(false), 1500);
    }
  };

  const handleVisibilityChange = async (val) => {
    setVisibility(val);
    if (!shareId) return;

    if (val === "Public") {
      const share = await syncShare({
        visibility: "public",
        passwordEnabled: false,
        password: null,
      });
      if (share) {
        setPasswordEnabled(false);
        setPassword("");
        addToast("Visibility set to Public");
      }
    } else {
      addToast("Visibility set to Restricted");
      await syncShare({ visibility: "restricted" });
    }
  };

  const handleExpirationChange = async (val) => {
    setExpiration(val);
    setShowExpirationDropdown(false);
    if (!shareId) return;

    const share = await syncShare({ expirationPreset: val });
    if (share) addToast(`Expiration set to ${val}`);
  };

  const kind = detectFileKind(file.name, file.kind);
  const shareLinkDisplay = shareLinkUrl || `https://drivya.link/${file.id}`;

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{ willChange: "opacity" }}
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-[4px]"
        onClick={onClose}
      />

      {/* Modal Container — bottom-sheet on mobile, centered on sm+ */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          style={{ willChange: "transform, opacity" }}
          className={cn(
            "relative w-full pointer-events-auto",
            // Mobile: bottom sheet, no rounded bottom corners, taller max-height
            "max-h-[92dvh] rounded-t-3xl sm:rounded-3xl",
            // Tablet: centered card with max-width
            "sm:max-w-lg md:max-w-xl",
            "border border-white/10 dark:border-white/5 bg-background/90 dark:bg-card/85 shadow-elegant",
            "backdrop-blur-lg noise",
            "flex flex-col overflow-hidden",
          )}
        >
          {/* Layered Lightweight Ambient Glows */}
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/15 blur-[50px] pointer-events-none animate-pulse" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-accent/10 blur-[50px] pointer-events-none" />

          {/* Mobile drag handle indicator */}
          <div className="flex justify-center pt-3 pb-0 sm:hidden relative z-10">
            <div className="w-10 h-1.5 rounded-full bg-border/80" />
          </div>

          {/* Scrollable content wrapper */}
          <div className="overflow-y-auto overscroll-contain flex-1 p-5 sm:p-6">
            {isLoadingShare ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground font-medium">
                  Loading share settings...
                </p>
              </div>
            ) : (
              <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                <div className="p-1.5 sm:p-2 bg-secondary/40 border border-border/40 rounded-xl sm:rounded-2xl shadow-sm shrink-0">
                  <FileTypeIcon kind={kind} size="lg" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-sm sm:text-base font-bold text-foreground truncate tracking-tight max-w-[160px] sm:max-w-none">
                      {file.name}
                    </h2>
                    <span className="text-[9px] font-bold text-muted-foreground/60 bg-secondary/50 px-2 py-0.5 rounded-lg shrink-0 border border-border/30">
                      {file.size}
                    </span>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 mt-1 font-semibold">
                    Secure Cloud Share Settings
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

            {/* Elegant Tab Switcher */}
            <div className="mt-4 sm:mt-5 p-1 bg-secondary/30 border border-border/50 rounded-2xl relative z-10 flex">
              {["collaborators", "link"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setShowExpirationDropdown(false);
                  }}
                  className={cn(
                    "relative flex-1 py-2.5 sm:py-2 text-[10px] font-extrabold uppercase tracking-wider transition-colors duration-250 cursor-pointer text-center z-10 select-none",
                    activeTab === tab
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTabPill"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                      className="absolute inset-0 bg-gradient-primary rounded-xl z-[-1] shadow-glow"
                    />
                  )}
                  {tab === "collaborators" ? "Collaborators" : "Link Settings"}
                </button>
              ))}
            </div>

            {/* Tab Content Box */}
            <div className="mt-4 sm:mt-5 relative z-10 sm:min-h-[305px] flex flex-col justify-start">
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
                    {/* Section: Invite Collaborators */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 block pl-1">
                        Invite Collaborators
                      </label>

                      {/* Mobile: stacked layout / Desktop: inline layout */}
                      <form
                        onSubmit={handleSendInvite}
                        className="flex flex-col sm:flex-row gap-2"
                      >
                        <div className="relative flex-1">
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="Add email address..."
                            className="h-12 sm:h-11 w-full rounded-2xl border border-border/60 bg-secondary/15 pl-4 pr-4 sm:pr-32 text-sm sm:text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                          />

                          {/* Segmented Viewer/Editor CSS selector — hidden on mobile, shown inside input on sm+ */}
                          <div className="hidden sm:flex absolute right-1.5 top-1/2 -translate-y-1/2 bg-secondary/50 border border-border/40 p-0.5 rounded-xl select-none">
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

                        {/* Mobile-only: role selector + invite button row */}
                        <div className="flex sm:hidden gap-2">
                          <div className="flex bg-secondary/50 border border-border/40 p-0.5 rounded-xl select-none flex-1">
                            {["Viewer", "Editor"].map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setInviteRole(role)}
                                className={cn(
                                  "rounded-lg flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider cursor-pointer transition-all duration-150 text-center",
                                  inviteRole === role
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {role}
                              </button>
                            ))}
                          </div>

                          <button
                            type="submit"
                            disabled={isInviting || !inviteEmail.trim()}
                            className={cn(
                              primaryBtn,
                              "h-11 px-5 shadow-glow rounded-2xl text-xs gap-1.5 font-bold shrink-0 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition-all",
                            )}
                          >
                            {isInviting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                Invite
                              </>
                            )}
                          </button>
                        </div>

                        {/* Desktop-only invite button */}
                        <button
                          type="submit"
                          disabled={isInviting || !inviteEmail.trim()}
                          className={cn(
                            primaryBtn,
                            "hidden sm:inline-flex h-11 px-4.5 shadow-glow rounded-2xl text-xs gap-1.5 font-bold shrink-0 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition-all",
                          )}
                        >
                          {isInviting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Invite
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Collaborators list with seamless dynamic transitions */}
                    <div className="space-y-2 flex-1 flex flex-col justify-start">
                      <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 block pl-1">
                        Currently Accessing ({sharedUsers.length})
                      </label>

                      <div className="max-h-[200px] sm:max-h-[175px] overflow-y-auto rounded-2xl border border-border/50 bg-secondary/10 p-2 sm:p-2.5 space-y-2 scrollbar-thin flex-1">
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
                              className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs p-2.5 sm:p-2 bg-secondary/15 border border-border/30 hover:border-border/60 hover:bg-secondary/35 rounded-2xl overflow-hidden"
                              style={{ transformOrigin: "top" }}
                            >
                              {/* User info row */}
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Custom Vibrant Initials-based Avatar */}
                                <div
                                  className={cn(
                                    "h-9 w-9 rounded-xl font-display font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border bg-gradient-to-br",
                                    getAvatarGradient(user.name),
                                  )}
                                >
                                  {user.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
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

                              {/* Controls row — on mobile sits below user info */}
                              <div className="flex items-center gap-2 shrink-0 pl-12 sm:pl-0">
                                {user.role === "Owner" ? (
                                  <span className="text-[9px] font-extrabold text-muted-foreground/80 bg-secondary/50 border border-border/40 px-3 py-1 rounded-xl uppercase tracking-wider">
                                    Owner
                                  </span>
                                ) : (
                                  <>
                                    {/* Dynamic User Role Selector Switcher (Lightweight CSS-based switch) */}
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

                                    {/* Access Revocation Button */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveUser(user.email)
                                      }
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
                    key="link"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4 w-full flex-1"
                  >
                    {/* Share Link Terminal Bar */}
                    <div className="rounded-2xl border border-border/60 bg-secondary/10 p-3.5 sm:p-4 space-y-4 w-full">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 sm:gap-2.5 text-[10px] sm:text-xs font-semibold text-foreground/90 uppercase tracking-wider">
                          {linkActive ? (
                            <Globe className="h-4 w-4 text-primary animate-pulse" />
                          ) : (
                            <Link2Off className="h-4 w-4 text-muted-foreground" />
                          )}
                          Share Link Status
                        </span>

                        {/* iOS-style toggle slider */}
                        <button
                          type="button"
                          onClick={handleToggleLink}
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

                      {/* Link URL + Copy — stacks on mobile */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div
                          className={cn(
                            "flex-1 rounded-xl border border-border/80 px-3 sm:px-3.5 py-2.5 text-xs font-mono truncate select-all bg-background/50 flex items-center gap-2 transition-all",
                            !linkActive && "opacity-50 pointer-events-none",
                          )}
                        >
                          {linkActive && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                          )}
                          <span className="truncate">{shareLinkDisplay}</span>
                        </div>

                        {/* Morphing Copy Button */}
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className={cn(
                            "inline-flex h-[42px] sm:h-[38px] items-center justify-center gap-1.5 rounded-xl border px-4 text-xs font-semibold transition-all shrink-0 cursor-pointer w-full sm:w-auto",
                            copied
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
                              : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 active:scale-95",
                          )}
                        >
                          <AnimatePresence mode="wait">
                            {copied ? (
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
                                Copy Link
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>
                      </div>

                      {/* Link Security Grid (Visibility + Expiry) — single col on mobile, 2-col on sm+ */}
                      <div
                        className={cn(
                          "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 pt-1 text-xs transition-all",
                          !linkActive && "opacity-50 pointer-events-none",
                        )}
                      >
                        {/* Visibility Double switch slider (Lightweight CSS-based switch) */}
                        <div className="flex flex-col gap-2 border border-border/40 bg-background/25 rounded-2xl p-3">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground/80" />{" "}
                            Link Visibility
                          </span>

                          <div className="flex bg-secondary/30 border border-border/40 p-0.5 rounded-xl select-none">
                            {["Public", "Restricted"].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleVisibilityChange(val)}
                                className={cn(
                                  "flex-1 rounded-lg py-2 sm:py-1.5 text-[9px] font-extrabold uppercase tracking-wider cursor-pointer text-center transition-all duration-150",
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

                        {/* Expiration dropdown selector */}
                        <div className="flex flex-col gap-2 border border-border/40 bg-background/25 rounded-2xl p-3 relative">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/80" />{" "}
                            Expiration Time
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setShowExpirationDropdown((prev) => !prev)
                            }
                            className="w-full flex items-center justify-between border border-border/50 bg-secondary/20 rounded-xl px-3 py-2.5 sm:py-2 text-left cursor-pointer hover:bg-secondary/40 transition-colors h-[38px] sm:h-[34px]"
                          >
                            <span className="text-[11px] font-bold text-foreground">
                              {expiration}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 text-muted-foreground/60 transition-transform",
                                showExpirationDropdown && "rotate-180",
                              )}
                            />
                          </button>

                          <AnimatePresence>
                            {showExpirationDropdown && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ type: "tween", duration: 0.4 }}
                                className="absolute left-0 right-0 bottom-full z-30 mb-2.5 rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md p-1 shadow-elegant"
                              >
                                {["Never", "1 Day", "7 Days", "30 Days"].map(
                                  (val) => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => handleExpirationChange(val)}
                                      className={cn(
                                        "w-full rounded-lg px-2.5 py-2.5 sm:py-2 text-left text-[11px] font-semibold transition-colors cursor-pointer",
                                        expiration === val
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

                      {/* Security Passwords Panel (Framer Motion Fluid expansion) */}
                      <div
                        className={cn(
                          "grid grid-cols-1 gap-3.5 text-xs transition-all",
                          !linkActive && "opacity-50 pointer-events-none",
                        )}
                      >
                        {visibility === "Public" ? (
                          <div className="flex items-start gap-2.5 border border-dashed border-emerald-500/25 bg-emerald-500/5 rounded-2xl px-3.5 sm:px-4 py-3 text-[10px] text-muted-foreground/80 font-medium leading-relaxed">
                            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>
                              Anyone with this link can view this file. Switch
                              the Visibility mode to <strong>Restricted</strong>{" "}
                              to restrict public access with password security.
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between border border-border/40 bg-background/25 rounded-2xl px-3.5 sm:px-4 py-2.5">
                              <span className="flex items-center gap-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">
                                <Lock className="h-3.5 w-3.5 text-muted-foreground/80" />{" "}
                                Password Protection
                              </span>

                              {/* Switch controller for password */}
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextState = !passwordEnabled;
                                  setPasswordEnabled(nextState);
                                  if (!nextState && shareId) {
                                    setPassword("");
                                    const share = await syncShare({
                                      passwordEnabled: false,
                                      password: null,
                                    });
                                    if (share) {
                                      setHasPassword(false);
                                      addToast("Password protection disabled");
                                    }
                                  }
                                }}
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
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pl-1 gap-1">
                                    <div className="text-[9px] font-bold text-muted-foreground/80 flex items-center gap-1.5 uppercase tracking-wider">
                                      <KeyRound className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                      {hasPassword
                                        ? "Update Security Key"
                                        : "Set Security Key"}
                                    </div>
                                    {hasPassword && (
                                      <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-tight bg-amber-500/5 px-2 py-0.5 rounded-lg border border-amber-500/10">
                                        Password is set
                                      </span>
                                    )}
                                  </div>

                                  {/* Password input + save — stacks on mobile */}
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                      <input
                                        type={
                                          showPassword ? "text" : "password"
                                        }
                                        value={password}
                                        onChange={(e) =>
                                          setPassword(e.target.value)
                                        }
                                        placeholder={
                                          hasPassword
                                            ? "Enter new password..."
                                            : "Create secure key..."
                                        }
                                        className="h-11 sm:h-10 w-full rounded-xl border border-border/80 bg-background/50 pl-3.5 pr-10 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-all font-mono"
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
                                        "h-11 sm:h-10 px-4 shadow-none rounded-xl text-xs gap-1.5 font-bold shrink-0 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-95 w-full sm:w-auto justify-center",
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
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
              </>
            )}
          </div>

          {/* Safe area bottom padding for mobile notch devices */}
          <div className="sm:hidden h-2 shrink-0" />
        </motion.div>
      </div>

      {/* Floating Toast Notification Portal */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-[99] flex flex-col gap-2 sm:max-w-sm pointer-events-none">
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
