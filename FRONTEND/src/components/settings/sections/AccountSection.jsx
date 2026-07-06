import { useState, useEffect, useRef, useCallback } from "react";
import {
  User,
  Mail,
  Camera,
  Languages,
  Check,
  Loader2,
  AlertTriangle,
  Lock,
  X,
  Pencil,
  Shield,
  Calendar,
  Trash2,
  Upload,
  ImageOff,
  PauseCircle,
} from "lucide-react";
import {
  SettingSection,
  SettingRow,
  SettingDangerZone,
  SettingBanner,
} from "../setting-primitives";
import { SettingInput } from "../setting-controls";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  deleteAccount,
} from "../../../../api/account.js";
import { logoutUser } from "../../../../api/auth.js";

const API_BASE = "http://localhost:3000";

/* ─── helpers ───────────────────────────────────────────────── */

const getInitials = (name) => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/* ═══════════════════════ Avatar Display ═══════════════════════ */

function AvatarDisplay({ avatarUrl, name, size = "lg", className = "" }) {
  const sizeClasses = {
    sm: "h-10 w-10 text-sm",
    md: "h-16 w-16 text-lg",
    lg: "h-20 w-20 text-xl",
  };

  const fullUrl = avatarUrl
    ? avatarUrl.startsWith("http")
      ? avatarUrl
      : `${API_BASE}${avatarUrl}`
    : null;
  return fullUrl ? (
    <img
      src={fullUrl}
      alt={name || "Avatar"}
      className={`${sizeClasses[size]} rounded-2xl object-cover ${className}`}
      onError={(e) => {
        e.target.style.display = "none";
        e.target.nextSibling.style.display = "flex";
      }}
    />
  ) : (
    <div
      className={`${sizeClasses[size]} rounded-2xl bg-gradient-primary flex items-center justify-center font-bold text-primary-foreground ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}

/* ═══════════════════════ Profile Hero Card ═══════════════════════ */

function ProfileHeroCard({ profile, onEditClick, onAvatarChange }) {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) onAvatarChange?.(file);
    e.target.value = "";
  };

  return (
    <div className="rounded-2xl glass shadow-elegant overflow-hidden animate-fade-in">
      {/* Gradient banner */}
      <div className="relative h-28 bg-gradient-primary overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_70%_20%,rgba(255,255,255,0.3),transparent_70%)]" />
        <div className="absolute -bottom-4 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -top-8 -left-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* Avatar + info overlay */}
      <div className="relative px-6 pb-6">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Avatar - positioned overlapping the banner */}
        <div className="relative -mt-10 mb-4 flex items-end justify-between">
          <div className="relative group">
            <div className="ring-4 ring-background shadow-xl transition-transform group-hover:scale-105 rounded-2xl overflow-hidden">
              {profile.avatarUrl ? (
                <img
                  src={
                    profile.avatarUrl.startsWith("http")
                      ? profile.avatarUrl
                      : `${API_BASE}${profile.avatarUrl}`
                  }
                  alt={profile.name}
                  className="h-20 w-20 object-cover rounded-2xl"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground">
                  {getInitials(profile.name)}
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-background border border-border shadow-md text-muted-foreground hover:text-primary hover:border-primary/40 transition-all opacity-0 group-hover:opacity-100"
              title="Change photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={onEditClick}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80 hover:border-primary/30 transition-all shadow-sm"
          >
            <Pencil className="h-3 w-3" />
            Edit Profile
          </button>
        </div>

        {/* User info */}
        <div className="space-y-1.5">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            {profile.name || "Your Name"}
          </h2>
          <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {profile.email}
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 ml-0.5">
                Verified
              </span>
            </span>
          </div>
        </div>

        {/* Quick stat chips */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] font-semibold text-primary">
            <Shield className="h-3 w-3" />
            Personal ·{" "}
            {profile.storageLimit > 5 * 1024 * 1024 * 1024
              ? "Team"
              : profile.storageLimit > 2 * 1024 * 1024 * 1024
                ? "Pro"
                : "Free"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/30 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Joined {formatDate(profile.memberSince)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ Edit Profile Modal ═══════════════════════ */

function EditProfileModal({
  open,
  onClose,
  profile,
  onSave,
  onAvatarUpload,
  onAvatarRemove,
  avatarUploading,
}) {
  const [form, setForm] = useState({
    name: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const nameRef = useRef(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm({
        name: profile.name || "",
      });
      setError("");
      setSuccess(false);
      setTimeout(() => nameRef.current?.focus(), 150);
    }
  }, [open, profile]);

  if (!open) return null;

  const hasChanges =
    form.name !== (profile.name || "");

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Invalid file type. Only JPG, PNG, and WebP are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Max size is 5 MB.");
      return;
    }

    setError("");
    onAvatarUpload?.(file);
    e.target.value = "";
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) {
      setError("Display name is required.");
      return;
    }
    if (form.name.trim().length < 3) {
      setError("Name must be at least 3 characters.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updates = {};
      if (form.name !== profile.name) updates.name = form.name.trim();

      if (Object.keys(updates).length > 0) {
        await onSave(updates);
      }
      setSuccess(true);
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        "Failed to update profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const currentAvatarUrl = profile.avatarUrl
    ? profile.avatarUrl.startsWith("http")
      ? profile.avatarUrl
      : `${API_BASE}${profile.avatarUrl}`
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-modal-backdrop"
        onClick={onClose}
      />
      <form
        onSubmit={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
            e.preventDefault();
            if (!saving && !success) handleSave();
          }
        }}
        className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-background shadow-2xl mx-4 overflow-hidden animate-modal-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Edit Profile
              </h3>
              <p className="text-xs text-muted-foreground">
                Update your personal information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Avatar section */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarSelect}
          />
          <div className="flex items-center gap-4">
            <div className="relative group">
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt={profile.name}
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-border/40 shadow-lg"
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-gradient-primary ring-2 ring-border/40 flex items-center justify-center text-lg font-bold text-primary-foreground shadow-lg">
                  {getInitials(form.name)}
                </div>
              )}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg bg-background border border-border shadow-sm text-muted-foreground hover:text-primary transition-all"
              >
                {avatarUploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Profile Photo
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                JPG, PNG, or WebP · Max 5 MB
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-50"
                >
                  <Upload className="h-3 w-3" />
                  {currentAvatarUrl ? "Change" : "Upload"}
                </button>
                {currentAvatarUrl && (
                  <button
                    onClick={() => onAvatarRemove?.()}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Name field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
              <User className="h-3 w-3 text-muted-foreground" />
              Display Name
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter your name"
              maxLength={50}
              className="h-10 w-full rounded-xl border border-border bg-secondary/30 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
            <p className="text-[10px] text-muted-foreground">
              This is how others will see you across Drivya.
            </p>
          </div>

          {/* Email field (read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-muted-foreground" />
              Email Address
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600 dark:text-emerald-400">
                Verified
              </span>
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="h-10 w-full rounded-xl border border-border bg-secondary/20 px-3.5 text-sm text-foreground/60 cursor-not-allowed"
            />
            <p className="text-[10px] text-muted-foreground">
              Email cannot be changed. Contact support for help.
            </p>
          </div>

          {/* Error / success messages */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5 shrink-0" />
              Profile updated successfully!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-6 py-4 bg-secondary/10">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 rounded-xl border border-border bg-secondary/50 px-4 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !hasChanges || success}
            className="h-9 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </>
            ) : success ? (
              <>
                <Check className="h-3 w-3" />
                Saved!
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════ Delete Confirmation Modal ═══════════════════════ */

function DeleteModal({ open, onClose, onConfirm, loading, email }) {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // step 1: warning, step 2: confirm

  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirmText("");
      setError("");
      setStep(1);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!password) {
      setError("Password is required to delete your account.");
      return;
    }
    setError("");
    try {
      await onConfirm(password);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete account.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-destructive/20 bg-background shadow-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-destructive/15 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Delete Account
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Step {step} of 2 — {step === 1 ? "Review warning" : "Confirm deletion"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step 1: Warning */}
        {step === 1 && (
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-2 text-sm text-foreground/80 leading-relaxed">
                  <p className="font-semibold text-destructive text-xs uppercase tracking-wide">
                    This action is permanent and cannot be undone
                  </p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive/60 shrink-0" />
                      All your files and folders will be permanently deleted
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive/60 shrink-0" />
                      All shared links will stop working immediately
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive/60 shrink-0" />
                      Your account data and settings cannot be recovered
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive/60 shrink-0" />
                      Collaborators will lose access to shared content
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 h-9 rounded-xl border border-border bg-secondary/40 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors"
              >
                Keep My Account
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 h-9 rounded-xl border border-destructive/30 bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
              >
                I Understand, Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Password confirmation */}
        {step === 2 && (
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-foreground/80 leading-relaxed">
              To confirm deletion, type{" "}
              <strong className="text-foreground font-mono bg-secondary/60 px-1.5 py-0.5 rounded text-xs">
                delete my account
              </strong>{" "}
              below and enter your password.
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground/70">
                  Type "delete my account"
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="delete my account"
                  className="h-9 w-full rounded-xl border border-border bg-secondary/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 transition-all focus:outline-none focus:border-destructive/50 focus:ring-2 focus:ring-destructive/10 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground/70">
                  Your password
                </label>
                <SettingInput
                  value={password}
                  onChange={setPassword}
                  type="password"
                  placeholder="Enter your password"
                  icon={Lock}
                  className="w-full"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setStep(1)}
                disabled={loading}
                className="flex-1 h-9 rounded-xl border border-border bg-secondary/40 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={
                  loading ||
                  !password ||
                  confirmText.toLowerCase() !== "delete my account"
                }
                className="flex-1 h-9 rounded-xl border border-destructive/30 bg-destructive text-xs font-semibold text-white hover:bg-destructive/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3" />
                    Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════ Main Component ═══════════════════════ */

export default function AccountSection({ userProfile, setUserProfile }) {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    language: "en",
    timezone: "auto",
    avatarUrl: "",
    memberSince: "",
    storageLimit: 1024 * 1024 * 1024,
  });
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // ─── Helper: sync profile to parent ────────────────────────
  const syncToParent = (p) => {
    if (!setUserProfile) return;
    setUserProfile((prev) => ({
      ...prev,
      displayName: p.name,
      name: p.name,
      email: p.email,
      language: p.language,
      timezone: p.timezone,
      avatarUrl: p.avatarUrl,
      storageUsed: p.storageUsed,
      storageLimit: p.storageLimit,
      hasPassword: p.hasPassword,
    }));
  };

  // ─── Fetch profile on mount ────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        if (!cancelled && data?.profile) {
          setProfile(data.profile);
          syncToParent(data.profile);
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Save profile (from edit modal) ────────────────────────
  const handleSaveProfile = async (updates) => {
    const data = await updateProfile(updates);
    if (data?.profile) {
      setProfile(data.profile);
      syncToParent(data.profile);
      window.dispatchEvent(new Event("refresh-drive"));
    }
  };

  // ─── Avatar upload ─────────────────────────────────────────
  const handleAvatarUpload = async (file) => {
    setAvatarUploading(true);
    try {
      const data = await uploadAvatar(file);
      if (data?.profile) {
        setProfile(data.profile);
        syncToParent(data.profile);
        window.dispatchEvent(new Event("refresh-drive"));
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setAvatarUploading(false);
    }
  };

  // ─── Avatar remove ─────────────────────────────────────────
  const handleAvatarRemove = async () => {
    setAvatarUploading(true);
    try {
      const data = await deleteAvatar();
      if (data?.profile) {
        setProfile(data.profile);
        syncToParent(data.profile);
        window.dispatchEvent(new Event("refresh-drive"));
      }
    } catch (err) {
      console.error("Avatar removal failed:", err);
    } finally {
      setAvatarUploading(false);
    }
  };

  // ─── Delete account ────────────────────────────────────────
  const handleDeleteAccount = async (password) => {
    setDeleting(true);
    await deleteAccount(password);
    await logoutUser();
    window.location.href = "/auth";
  };

  // ─── Derive tier label ────────────────────────────────────
  const tierLabel =
    profile.storageLimit > 5 * 1024 * 1024 * 1024
      ? "Team"
      : profile.storageLimit > 2 * 1024 * 1024 * 1024
        ? "Pro"
        : "Free";

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-52 rounded-2xl bg-secondary/20" />
        <div className="h-36 rounded-2xl bg-secondary/20" />
        <div className="h-28 rounded-2xl bg-secondary/20" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Profile Hero Card ─── */}
      <ProfileHeroCard
        profile={profile}
        onEditClick={() => setEditOpen(true)}
        onAvatarChange={handleAvatarUpload}
      />

      {/* ─── Profile Details (read-only display) ─── */}
      <SettingSection
        id="profile-details"
        icon={User}
        title="Profile Details"
        description="Your personal information visible to collaborators."
      >
        <SettingRow
          label="Display Name"
          description="How others see you across Drivya."
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground/80 font-medium">
              {profile.name || "—"}
            </span>
            <button
              onClick={() => setEditOpen(true)}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Edit
            </button>
          </div>
        </SettingRow>

        <SettingRow
          label="Email Address"
          description="Primary login and notification email."
          badge={
            <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              Verified
            </span>
          }
        >
          <span className="text-sm text-foreground/80 font-medium">
            {profile.email}
          </span>
        </SettingRow>
      </SettingSection>

      {/* ─── Account Info ─── */}
      <SettingSection
        id="account-type"
        icon={Languages}
        title="Account"
        description="Your account type and membership."
      >
        <SettingRow
          label="Account Type"
          description="Your current account context."
        >
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
            <User className="h-3 w-3" />
            Personal · {tierLabel}
          </span>
        </SettingRow>

        <SettingRow
          label="Member Since"
          description="When you created your Drivya account."
        >
          <span className="text-sm text-foreground/80 font-medium tabular-nums">
            {formatDate(profile.memberSince)}
          </span>
        </SettingRow>
      </SettingSection>
 {/* Account Deactivation */}
      <SettingDangerZone
        title="Account Deactivation"
        description="Temporarily freeze your account without deleting data."
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Deactivate Account
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Disables login and pauses sync. All data preserved. Reactivate
              anytime.
            </p>
          </div>
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors shrink-0">
            <PauseCircle className="h-3.5 w-3.5" />
            Deactivate
          </button>
        </div>
      </SettingDangerZone>
      {/* ─── Danger Zone ─── */}
      <SettingDangerZone
        title="Danger Zone"
        description="Irreversible actions. Proceed with extreme caution."
      >
        <div className="space-y-4">
          {/* Warning banner */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 mt-0 shrink-0" />
            <div className="flex-1 leading-relaxed">
              Deleting your account will permanently remove all your data
              including files, folders, shared links, and settings. This action
              cannot be reversed.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Delete Account
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <button
              onClick={() => setDeleteOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors shrink-0"
            >
              <Trash2 className="h-3 w-3" />
              Delete Account
            </button>
          </div>
        </div>
      </SettingDangerZone>
      {/* ─── Modals ─── */}
      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSave={handleSaveProfile}
        onAvatarUpload={handleAvatarUpload}
        onAvatarRemove={handleAvatarRemove}
        avatarUploading={avatarUploading}
      />
      <DeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        loading={deleting}
        email={profile.email}
      />
    </div>
  );
}
