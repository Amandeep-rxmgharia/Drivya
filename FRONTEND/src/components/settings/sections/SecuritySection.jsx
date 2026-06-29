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
  QrCode,
  Copy,
  Download,
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
import {
  setup2FA,
  verify2FA,
  regenerateBackupCodes,
  disable2FA,
} from "../../../../api/auth.js";

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
                  className={`text-[10px] font-bold uppercase tracking-wider ${strength.score <= 20
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
                    className={`inline-flex items-center gap-1 text-[11px] transition-colors duration-200 ${rule.passed
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

  const [twoFAEnabled, setTwoFAEnabled] = useState(!!userProfile?.twoFAEnabled);
  const [loginAlerts, setLoginAlerts] = useState(userProfile?.loginAlerts !== false);

  const [activeFlow, setActiveFlow] = useState(null); // null, 'setup_intro', 'setup_verify', 'setup_success', 'regenerate_verify', 'regenerate_success', 'disable_verify'
  const [manualEntryKey, setManualEntryKey] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [pending2FACode, setPending2FACode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [is2FASubmitting, setIs2FASubmitting] = useState(false);
  const [twoFAError, setTwoFAError] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const handleCopyKey = () => {
    if (!manualEntryKey) return;
    navigator.clipboard.writeText(manualEntryKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyCodes = () => {
    if (backupCodes.length === 0) return;
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    if (backupCodes.length === 0) return;
    const element = document.createElement("a");
    const file = new Blob([
      "DRIVYA TWO-FACTOR AUTHENTICATION BACKUP CODES\n",
      "=============================================\n",
      "Keep these codes in a safe place. Each code can be used once.\n\n",
      backupCodes.join("\n"),
      "\n\nGenerated on: " + new Date().toLocaleString()
    ], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "drivya-backup-codes.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const [sessionTimeout, setSessionTimeout] = useState("1h");
  const [encryptionLevel, setEncryptionLevel] = useState("standard");

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Sync 2FA + login alerts with userProfile context updates
  useEffect(() => {
    if (!userProfile) return;
    setLoginAlerts(userProfile.loginAlerts !== false);
    if (userProfile.twoFAEnabled !== undefined) setTwoFAEnabled(!!userProfile.twoFAEnabled);
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
            className={`inline-flex h-9 items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-all ${showPasswordForm
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
            twoFAEnabled ? (
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            ) : (
              <span className="rounded-md bg-secondary border border-border px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                Inactive
              </span>
            )
          }
        >
          <SettingToggle
            checked={twoFAEnabled}
            disabled={activeFlow !== null}
            onChange={(checked) => {
              if (checked) {
                setTwoFAError("");
                setPending2FACode("");
                setActiveFlow("setup_intro");
              } else {
                setTwoFAError("");
                setPending2FACode("");
                setActiveFlow("disable_verify");
              }
            }}
          />
        </SettingRow>

        {twoFAEnabled && activeFlow === null && (
          <>
            <SettingRow
              label="Authentication Method"
              description="Choose your preferred 2FA method."
              vertical
            >
              <div className="flex gap-2 flex-col sm:flex-row">
                <div className="flex-1 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-left">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary bg-primary/10 text-primary">
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">
                      Authenticator App
                    </span>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      Use Google Authenticator, Authy, or any TOTP app to generate verification codes.
                    </p>
                  </div>
                </div>
              </div>
            </SettingRow>

            <SettingRow
              label="Backup Codes"
              description="10 single-use codes to access your account if you lose your device."
            >
              <button
                type="button"
                onClick={() => {
                  setPending2FACode("");
                  setTwoFAError("");
                  setActiveFlow("regenerate_verify");
                }}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors"
              >
                <Key className="h-3.5 w-3.5" />
                Regenerate Backup Codes
              </button>
            </SettingRow>
          </>
        )}

        <AnimatePresence mode="wait">
          {activeFlow && (
            <motion.div
              key={activeFlow}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              {/* Setup Intro */}
              {activeFlow === "setup_intro" && (
                <div className="px-6 py-5 border-t border-border/40 bg-secondary/10">
                  <div className="space-y-4 max-w-xl">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Set up an Authenticator App</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Drivya uses Time-Based One-Time Passwords (TOTP) to protect your account. You will need an authenticator app like Google Authenticator, Microsoft Authenticator, Authy, or 1Password on your mobile device to scan the QR code and generate verification codes.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        disabled={is2FASubmitting}
                        onClick={async () => {
                          setTwoFAError("");
                          setBackupCodes([]);
                          setPending2FACode("");
                          setIs2FASubmitting(true);
                          try {
                            const data = await setup2FA();
                            setManualEntryKey(data.manualEntryKey);
                            setOtpauthUrl(data.otpauthUrl);
                            setActiveFlow("setup_verify");
                          } catch (err) {
                            setTwoFAError(
                              err?.response?.data?.message || "Failed to start 2FA setup."
                            );
                          } finally {
                            setIs2FASubmitting(false);
                          }
                        }}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {is2FASubmitting ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Initializing...
                          </>
                        ) : (
                          "Next: Scan QR Code"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFlow(null)}
                        disabled={is2FASubmitting}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                    {twoFAError && (
                      <div className="pt-2">
                        <SettingBanner variant="destructive" icon={AlertTriangle}>
                          {twoFAError}
                        </SettingBanner>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Setup Verify */}
              {activeFlow === "setup_verify" && (
                <div className="px-6 py-5 border-t border-border/40 bg-secondary/10">
                  <div className="space-y-5 max-w-xl">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Scan the QR Code</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Open your authenticator app, select "Add account" or scan a barcode, and scan the QR code below.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-5 items-center bg-background/60 p-4 rounded-xl border border-border/50">
                        {otpauthUrl && (
                          <div className="p-2.5 bg-white rounded-lg border border-border shrink-0 shadow-sm">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(otpauthUrl)}`}
                              alt="2FA QR Code"
                              className="h-[150px] w-[150px]"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="space-y-2.5 w-full">
                          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <QrCode className="h-3.5 w-3.5" />
                            Or enter the manual key:
                          </div>
                          <div className="flex items-center gap-1.5 w-full">
                            <code className="flex-1 font-mono text-xs select-all break-all rounded-lg border border-border/60 bg-secondary/30 p-2 text-foreground font-bold leading-normal">
                              {manualEntryKey}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopyKey}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[11px] font-semibold text-foreground hover:bg-secondary/40 transition-colors shrink-0"
                            >
                              {copiedKey ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-500" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 text-muted-foreground" />
                                  Copy
                                  </>
                              )}
                            </button>
                          </div>
                          <p className="text-[10.5px] text-muted-foreground leading-normal">
                            Account: <strong className="text-foreground">{userProfile?.email}</strong><br />
                            Issuer: <strong className="text-foreground">Drivya</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-border/40 pt-4">
                      <h4 className="text-sm font-semibold text-foreground">Verify Verification Code</h4>
                      <p className="text-xs text-muted-foreground">
                        Enter the 6-digit verification code generated by your authenticator app to complete setup.
                      </p>
                      <div className="flex gap-2 items-end max-w-sm">
                        <div className="flex-1">
                          <SettingInput
                            type="text"
                            value={pending2FACode}
                            onChange={(val) => {
                              setPending2FACode(val);
                              if (twoFAError) setTwoFAError("");
                            }}
                            placeholder="000000"
                            icon={ShieldCheck}
                            maxLength={6}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={is2FASubmitting || pending2FACode.trim().length !== 6}
                          onClick={async () => {
                            setTwoFAError("");
                            setBackupCodes([]);
                            setIs2FASubmitting(true);
                            try {
                              const data = await verify2FA({
                                code: pending2FACode.trim(),
                              });
                              setTwoFAEnabled(true);
                              setBackupCodes(data.backupCodes || []);
                              if (setUserProfile) {
                                setUserProfile((prev) => ({
                                  ...prev,
                                  twoFAEnabled: true,
                                }));
                              }
                              setPending2FACode("");
                              setActiveFlow("setup_success");
                            } catch (err) {
                              if (err?.response?.data?.code === "TWOFA_REQUIRED") {
                                setTwoFAError("Please complete 2FA step-up first.");
                              } else {
                                setTwoFAError(
                                  err?.response?.data?.message || "Invalid 2FA code."
                                );
                              }
                            } finally {
                              setIs2FASubmitting(false);
                            }
                          }}
                          className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {is2FASubmitting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            "Verify & Enable"
                          )}
                        </button>
                      </div>
                      {twoFAError && (
                        <div className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1.5">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {twoFAError}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-border/40 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFlow("setup_intro");
                          setTwoFAError("");
                          setPending2FACode("");
                        }}
                        disabled={is2FASubmitting}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFlow(null);
                          setTwoFAError("");
                          setPending2FACode("");
                        }}
                        disabled={is2FASubmitting}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Screen (Setup Success or Regenerate Success) */}
              {(activeFlow === "setup_success" || activeFlow === "regenerate_success") && (
                <div className="px-6 py-5 border-t border-border/40 bg-secondary/10">
                  <div className="space-y-4 max-w-xl">
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {activeFlow === "setup_success"
                            ? "2FA Enabled Successfully!"
                            : "New Backup Codes Generated!"}
                        </p>
                        <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
                          {activeFlow === "setup_success"
                            ? "Your account is now protected with two-factor authentication."
                            : "Your previous backup codes are no longer valid."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Save Your Backup Codes</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Backup codes allow you to access your account if you lose your 2FA device. Store these in a secure place — they will not be shown again. Each code can only be used once.
                      </p>

                      <div className="grid grid-cols-2 gap-2 bg-background/60 p-4 rounded-xl border border-border/50 font-mono text-xs font-semibold text-foreground tabular-nums select-all">
                        {backupCodes.map((code, idx) => (
                          <div
                            key={code}
                            className="flex items-center gap-2 border-b border-border/30 pb-1 last:border-0 sm:odd:pr-2 sm:even:pl-2"
                          >
                            <span className="text-[10px] text-muted-foreground/60 w-5 shrink-0">
                              {idx + 1}.
                            </span>
                            <span>{code}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleCopyCodes}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-foreground hover:bg-secondary/40 transition-colors"
                        >
                          {copiedCodes ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              Copied to Clipboard
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                              Copy Codes
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadCodes}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-foreground hover:bg-secondary/40 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                          Download Codes (.txt)
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-border/40 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFlow(null);
                          setBackupCodes([]);
                        }}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Regenerate Verification */}
              {activeFlow === "regenerate_verify" && (
                <div className="px-6 py-5 border-t border-border/40 bg-secondary/10">
                  <div className="space-y-4 max-w-xl">
                    <SettingBanner variant="warning" icon={AlertTriangle}>
                      Regenerating backup codes will invalidate all your currently active backup codes. You will receive 10 new codes to save.
                    </SettingBanner>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">Confirm with Authenticator Code</h4>
                      <p className="text-xs text-muted-foreground">
                        Enter the 6-digit code from your authenticator app to authorize code regeneration.
                      </p>
                      <div className="flex gap-2 items-end max-w-sm">
                        <div className="flex-1">
                          <SettingInput
                            type="text"
                            value={pending2FACode}
                            onChange={(val) => {
                              setPending2FACode(val);
                              if (twoFAError) setTwoFAError("");
                            }}
                            placeholder="000000"
                            icon={ShieldCheck}
                            maxLength={6}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={is2FASubmitting || pending2FACode.trim().length !== 6}
                          onClick={async () => {
                            setTwoFAError("");
                            setBackupCodes([]);
                            setIs2FASubmitting(true);
                            try {
                              const data = await regenerateBackupCodes({
                                code: pending2FACode.trim(),
                              });
                              setBackupCodes(data.backupCodes || []);
                              setPending2FACode("");
                              setActiveFlow("regenerate_success");
                            } catch (err) {
                              setTwoFAError(
                                err?.response?.data?.message || "Failed to regenerate backup codes."
                              );
                            } finally {
                              setIs2FASubmitting(false);
                            }
                          }}
                          className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {is2FASubmitting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            "Regenerate Codes"
                          )}
                        </button>
                      </div>
                      {twoFAError && (
                        <div className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1.5">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {twoFAError}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFlow(null);
                          setTwoFAError("");
                          setPending2FACode("");
                        }}
                        disabled={is2FASubmitting}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Disable Verification */}
              {activeFlow === "disable_verify" && (
                <div className="px-6 py-5 border-t border-border/40 bg-destructive/[0.02]">
                  <div className="space-y-4 max-w-xl">
                    <SettingBanner variant="destructive" icon={AlertTriangle}>
                      Warning: Disabling two-factor authentication significantly reduces your account security. You will only need your password to log in.
                    </SettingBanner>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">Confirm Disabling 2FA</h4>
                      <p className="text-xs text-muted-foreground">
                        Enter the 6-digit code from your authenticator app to disable 2FA.
                      </p>
                      <div className="flex gap-2 items-end max-w-sm">
                        <div className="flex-1">
                          <SettingInput
                            type="text"
                            value={pending2FACode}
                            onChange={(val) => {
                              setPending2FACode(val);
                              if (twoFAError) setTwoFAError("");
                            }}
                            placeholder="000000"
                            icon={ShieldCheck}
                            maxLength={6}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={is2FASubmitting || pending2FACode.trim().length !== 6}
                          onClick={async () => {
                            setTwoFAError("");
                            setIs2FASubmitting(true);
                            try {
                              await disable2FA({
                                code: pending2FACode.trim(),
                              });
                              setTwoFAEnabled(false);
                              setBackupCodes([]);
                              setPending2FACode("");
                              setManualEntryKey("");
                              setOtpauthUrl("");
                              if (setUserProfile) {
                                setUserProfile((prev) => ({
                                  ...prev,
                                  twoFAEnabled: false,
                                }));
                              }
                              setActiveFlow(null);
                            } catch (err) {
                              setTwoFAError(
                                err?.response?.data?.message || "Failed to disable 2FA."
                              );
                            } finally {
                              setIs2FASubmitting(false);
                            }
                          }}
                          className="inline-flex h-9 items-center gap-2 rounded-xl bg-destructive px-4 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                        >
                          {is2FASubmitting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Disabling...
                            </>
                          ) : (
                            "Disable 2FA"
                          )}
                        </button>
                      </div>
                      {twoFAError && (
                        <div className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1.5">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {twoFAError}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFlow(null);
                          setTwoFAError("");
                          setPending2FACode("");
                        }}
                        disabled={is2FASubmitting}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${session.current
                      ? "border-primary/20 bg-primary/[0.03]"
                      : "border-border/60 bg-secondary/20 hover:bg-secondary/30"
                      }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${session.current
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
    </div >
  );
}
