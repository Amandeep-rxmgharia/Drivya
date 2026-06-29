import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Key,
  Fingerprint,
  Laptop,
  Clock,
  Bell,
  Lock,
  Smartphone,
  Monitor,
  Globe,
  Shield,
  MoreHorizontal,
  Chrome,
  X,
  Check,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  SettingSection,
  SettingRow,
  SettingBanner,
  TierBadge,
} from "../setting-primitives";
import {
  SettingToggle,
  SettingSelect,
  SettingRadioGroup,
  SettingInput,
} from "../setting-controls";
import {
  changePassword,
  updateProfile,
  getActiveSessions,
  revokeSession,
  revokeOtherSessions,
} from "../../../../api/account.js";

/* ═══════════════════════ Password Strength ═══════════════════════ */

const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "letter", label: "Contains a letter", test: (p) => /[a-zA-Z]/.test(p) },
  { key: "number", label: "Contains a number", test: (p) => /\d/.test(p) },
];

function computeStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 20, label: "Weak", color: "bg-red-500" };
  if (score === 2) return { score: 40, label: "Fair", color: "bg-amber-500" };
  if (score === 3) return { score: 65, label: "Good", color: "bg-yellow-500" };
  if (score === 4) return { score: 85, label: "Strong", color: "bg-emerald-500" };
  return { score: 100, label: "Very Strong", color: "bg-emerald-400" };
}

/* ═══════════════════════ Password Change Form ═══════════════════════ */

function PasswordChangeForm({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const successTimerRef = useRef(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const strength = computeStrength(newPassword);
  const rulesStatus = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(newPassword),
  }));
  const allRulesPassed = rulesStatus.every((r) => r.passed);

  const validate = useCallback(() => {
    const errors = {};
    if (!currentPassword.trim()) {
      errors.currentPassword = "Current password is required.";
    }
    if (!newPassword) {
      errors.newPassword = "New password is required.";
    } else if (!allRulesPassed) {
      errors.newPassword = "Password doesn't meet requirements.";
    } else if (newPassword === currentPassword) {
      errors.newPassword = "New password must differ from current.";
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your new password.";
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    return errors;
  }, [currentPassword, newPassword, confirmPassword, allRulesPassed]);

  const handleSubmit = async () => {
    setError("");
    setFieldErrors({});
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess(true);
      // Auto-close after 2s
      successTimerRef.current = setTimeout(() => {
        onClose?.();
      }, 2000);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        "Something went wrong. Please try again.";

      if (err?.response?.status === 401) {
        setFieldErrors({ currentPassword: msg });
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-4"
      >
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Password updated successfully
            </p>
            <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
              Your new password is now active.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="px-6 pb-5 pt-1 space-y-4">
        {/* Global error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SettingBanner variant="destructive" icon={AlertTriangle}>
              {error}
            </SettingBanner>
          </motion.div>
        )}

        {/* Current Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Current Password
          </label>
          <SettingInput
            type="password"
            value={currentPassword}
            onChange={(val) => {
              setCurrentPassword(val);
              if (fieldErrors.currentPassword)
                setFieldErrors((p) => ({ ...p, currentPassword: "" }));
            }}
            placeholder="Enter your current password"
            icon={Lock}
            className="max-w-sm"
          />
          {fieldErrors.currentPassword && (
            <motion.p
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] font-medium text-destructive flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {fieldErrors.currentPassword}
            </motion.p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            New Password
          </label>
          <SettingInput
            type="password"
            value={newPassword}
            onChange={(val) => {
              setNewPassword(val);
              if (fieldErrors.newPassword)
                setFieldErrors((p) => ({ ...p, newPassword: "" }));
            }}
            placeholder="Enter a strong new password"
            icon={Key}
            className="max-w-sm"
          />
          {fieldErrors.newPassword && (
            <motion.p
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] font-medium text-destructive flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {fieldErrors.newPassword}
            </motion.p>
          )}

          {/* Strength Meter */}
          {newPassword.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 pt-1"
            >
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 max-w-sm rounded-full bg-secondary/60 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${strength.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${strength.score}%` }}
                    transition={{
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    strength.score <= 20
                      ? "text-red-500"
                      : strength.score <= 40
                        ? "text-amber-500"
                        : strength.score <= 65
                          ? "text-yellow-500"
                          : "text-emerald-500"
                  }`}
                >
                  {strength.label}
                </span>
              </div>

              {/* Requirements Checklist */}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {rulesStatus.map((rule) => (
                  <span
                    key={rule.key}
                    className={`inline-flex items-center gap-1 text-[11px] transition-colors duration-200 ${
                      rule.passed
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground/60"
                    }`}
                  >
                    {rule.passed ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    {rule.label}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Confirm New Password
          </label>
          <SettingInput
            type="password"
            value={confirmPassword}
            onChange={(val) => {
              setConfirmPassword(val);
              if (fieldErrors.confirmPassword)
                setFieldErrors((p) => ({ ...p, confirmPassword: "" }));
            }}
            placeholder="Re-enter your new password"
            icon={ShieldCheck}
            className="max-w-sm"
          />
          {fieldErrors.confirmPassword && (
            <motion.p
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] font-medium text-destructive flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {fieldErrors.confirmPassword}
            </motion.p>
          )}
          {/* Match indicator */}
          {confirmPassword.length > 0 &&
            !fieldErrors.confirmPassword &&
            confirmPassword === newPassword && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Passwords match
              </motion.p>
            )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                Update Password
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════ Security Section ═══════════════════════ */

export default function SecuritySection({ userProfile, setUserProfile }) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(true);
  const [twoFAMethod, setTwoFAMethod] = useState("totp");
  const [loginAlerts, setLoginAlerts] = useState(userProfile?.loginAlerts !== false);
  const [sessionTimeout, setSessionTimeout] = useState("1h");
  const [encryptionLevel, setEncryptionLevel] = useState("standard");

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Sync loginAlerts with userProfile context updates
  useEffect(() => {
    if (userProfile) {
      setLoginAlerts(userProfile.loginAlerts !== false);
    }
  }, [userProfile]);

  // Fetch active sessions on mount
  useEffect(() => {
    let cancelled = false;
    const fetchSessions = async () => {
      try {
        const data = await getActiveSessions();
        if (!cancelled && data?.sessions) {
          setSessions(data.sessions);
        }
      } catch (err) {
        console.error("Failed to load active sessions:", err);
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    };
    fetchSessions();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRevokeSession = async (sessionId) => {
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error("Failed to revoke session:", err);
      alert(err?.response?.data?.message || "Failed to revoke session.");
    }
  };

  const handleRevokeOthers = async () => {
    if (!window.confirm("Are you sure you want to sign out of all other devices?")) {
      return;
    }
    try {
      await revokeOtherSessions();
      setSessions((prev) => prev.filter((s) => s.current));
    } catch (err) {
      console.error("Failed to revoke other sessions:", err);
      alert(err?.response?.data?.message || "Failed to revoke other sessions.");
    }
  };

  const handleToggleLoginAlerts = async (checked) => {
    try {
      setLoginAlerts(checked);
      const data = await updateProfile({ loginAlerts: checked });
      if (data?.profile && setUserProfile) {
        setUserProfile((prev) => ({
          ...prev,
          loginAlerts: data.profile.loginAlerts !== false,
        }));
      }
    } catch (err) {
      console.error("Failed to update login alerts:", err);
      // Rollback on failure
      setLoginAlerts(!checked);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password */}
      <SettingSection
        id="password"
        icon={Key}
        title="Password"
        description="Manage your account password."
      >
        <SettingRow
          label="Password"
          description="Must be at least 8 characters with a letter and a number."
        >
          <button
            onClick={() => setShowPasswordForm((s) => !s)}
            className={`inline-flex h-9 items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-all ${
              showPasswordForm
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-secondary/40 text-foreground hover:bg-secondary/60"
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            {showPasswordForm ? "Hide Form" : "Change Password"}
          </button>
        </SettingRow>

        <AnimatePresence mode="wait">
          {showPasswordForm && (
            <PasswordChangeForm
              key="password-form"
              onClose={() => setShowPasswordForm(false)}
            />
          )}
        </AnimatePresence>
      </SettingSection>

      {/* 2FA */}
      <SettingSection
        id="2fa"
        icon={ShieldCheck}
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account."
      >
        <SettingRow
          label="Enable 2FA"
          description="Require a second factor when signing in."
          badge={
            twoFAEnabled && (
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            )
          }
        >
          <SettingToggle checked={twoFAEnabled} onChange={setTwoFAEnabled} />
        </SettingRow>

        {twoFAEnabled && (
          <SettingRow
            label="Authentication Method"
            description="Choose your preferred 2FA method."
            vertical
          >
            <SettingRadioGroup
              value={twoFAMethod}
              onChange={setTwoFAMethod}
              options={[
                {
                  value: "totp",
                  label: "Authenticator App",
                  description:
                    "Use Google Authenticator, Authy, or any TOTP app.",
                },
                {
                  value: "sms",
                  label: "SMS Code",
                  description: "Receive a verification code via text message.",
                }
              ]}
            />
          </SettingRow>
        )}

        <SettingRow
          label="Backup Codes"
          description="10 single-use codes for when you lose access to your 2FA device."
        >
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
            View Backup Codes
          </button>
        </SettingRow>
      </SettingSection>

      {/* Active Sessions */}
      <SettingSection
        id="sessions"
        icon={Laptop}
        title="Active Sessions"
        description="Devices currently signed in to your account."
      >
        <div className="px-6 py-2">
          {loadingSessions ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading active sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No active sessions found.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {sessions.length} active sessions
                </span>
                {sessions.some((s) => !s.current) && (
                  <button
                    onClick={handleRevokeOthers}
                    className="text-xs font-semibold text-destructive hover:text-destructive/80 transition-colors"
                  >
                    Sign Out All Others
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                      session.current
                        ? "border-primary/20 bg-primary/[0.03]"
                        : "border-border/60 bg-secondary/20 hover:bg-secondary/30"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                        session.current
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-border bg-secondary/50 text-muted-foreground"
                      }`}
                    >
                      {session.os.toLowerCase().includes("mac") ||
                      session.os.toLowerCase().includes("ios") ||
                      session.device.toLowerCase().includes("iphone") ||
                      session.device.toLowerCase().includes("ipad") ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Monitor className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {session.device}
                        </span>
                        {session.current && (
                          <span className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                            This device
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{session.browser}</span>
                        <span>·</span>
                        <span>{session.location}</span>
                        <span>·</span>
                        <span>IP: {session.ip}</span>
                        <span>·</span>
                        <span
                          className={
                            session.current ? "text-emerald-500 font-semibold" : ""
                          }
                        >
                          {session.lastActive === "Active now"
                            ? "Active now"
                            : `Last active: ${new Date(session.lastActive).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                    {!session.current && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        title="Revoke session"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </SettingSection>

      {/* Session & Login Settings */}
      <SettingSection
        id="login-settings"
        icon={Clock}
        title="Login Settings"
        description="Configure session behavior and alerts."
      >
        <SettingRow
          label="Login Alerts"
          description="Get notified when your account is accessed from a new device."
        >
          <SettingToggle checked={loginAlerts} onChange={handleToggleLoginAlerts} />
        </SettingRow>
      </SettingSection>

      {/* Encryption */}
      {/* <SettingSection
        id="encryption"
        icon={Lock}
        title="Encryption"
        description="Control how your data is encrypted at rest."
      >
        <SettingRow
          label="Encryption Level"
          description="Choose between standard server-managed keys or client-side encryption."
          vertical
        >
          <SettingRadioGroup
            value={encryptionLevel}
            onChange={setEncryptionLevel}
            options={[
              {
                value: "standard",
                label: "Standard (AES-256)",
                description:
                  "Server-side encryption. Drivya manages keys. Full feature support.",
              },
              {
                value: "enhanced",
                label: "Enhanced (Client-Side)",
                description:
                  "You hold the recovery key. Disables previews, AI search, and deduplication.",
              },
            ]}
          />
        </SettingRow>

        {encryptionLevel === "enhanced" && (
          <div className="px-6 pb-4">
            <SettingBanner variant="warning" icon={Shield}>
              Enhanced encryption disables server-side thumbnails, full-text
              search, and AI features. You must securely store your recovery key
              — Drivya cannot recover your data without it.
            </SettingBanner>
          </div>
        )}
      </SettingSection> */}
    </div>
  );
}
