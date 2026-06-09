import { useState } from "react";
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
} from "../setting-controls";

const MOCK_SESSIONS = [
  {
    id: 1,
    device: "MacBook Pro",
    browser: "Chrome 126",
    os: "macOS Sequoia",
    ip: "73.162.xxx.xxx",
    location: "San Francisco, US",
    lastActive: "Active now",
    current: true,
  },
  {
    id: 2,
    device: "iPhone 16 Pro",
    browser: "Drivya iOS App",
    os: "iOS 19.1",
    ip: "73.162.xxx.xxx",
    location: "San Francisco, US",
    lastActive: "2 hours ago",
    current: false,
  },
  {
    id: 3,
    device: "Windows Desktop",
    browser: "Firefox 130",
    os: "Windows 11",
    ip: "185.42.xxx.xxx",
    location: "Lisbon, PT",
    lastActive: "3 days ago",
    current: false,
  },
];

export default function SecuritySection() {
  const [twoFAEnabled, setTwoFAEnabled] = useState(true);
  const [twoFAMethod, setTwoFAMethod] = useState("totp");
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("1h");
  const [encryptionLevel, setEncryptionLevel] = useState("standard");

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
          description="Last changed 45 days ago. Must be at least 12 characters."
        >
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
            <Key className="h-3.5 w-3.5" />
            Change Password
          </button>
        </SettingRow>
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
                },
                {
                  value: "webauthn",
                  label: "Hardware Security Key",
                  description: "Use a FIDO2/WebAuthn key like YubiKey.",
                },
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

      {/* Passkeys */}
      <SettingSection
        id="passkeys"
        icon={Fingerprint}
        title="Passkeys"
        description="Sign in with biometrics — fingerprint, Face ID, or Windows Hello."
      >
        <SettingRow
          label="Registered Passkeys"
          description="No passkeys registered yet."
        >
          <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-opacity">
            <Fingerprint className="h-3.5 w-3.5" />
            Add Passkey
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
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {MOCK_SESSIONS.length} active sessions
            </span>
            <button className="text-xs font-semibold text-destructive hover:text-destructive/80 transition-colors">
              Sign Out All Others
            </button>
          </div>

          <div className="space-y-2">
            {MOCK_SESSIONS.map((session) => (
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
                  {session.os.includes("macOS") ||
                  session.os.includes("iOS") ? (
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
                    <span
                      className={
                        session.current ? "text-emerald-500 font-semibold" : ""
                      }
                    >
                      {session.lastActive}
                    </span>
                  </div>
                </div>
                {!session.current && (
                  <button
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Revoke session"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
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
          label="Session Timeout"
          description="Auto-lock the dashboard after inactivity."
        >
          <SettingSelect
            value={sessionTimeout}
            onChange={setSessionTimeout}
            options={[
              { value: "15m", label: "15 minutes" },
              { value: "30m", label: "30 minutes" },
              { value: "1h", label: "1 hour" },
              { value: "4h", label: "4 hours" },
              { value: "8h", label: "8 hours" },
              { value: "never", label: "Never" },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Login Alerts"
          description="Get notified when your account is accessed from a new device."
        >
          <SettingToggle checked={loginAlerts} onChange={setLoginAlerts} />
        </SettingRow>
      </SettingSection>

      {/* Encryption */}
      <SettingSection
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
      </SettingSection>
    </div>
  );
}
