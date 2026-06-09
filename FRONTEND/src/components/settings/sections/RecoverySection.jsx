import { useState } from "react";
import {
  RefreshCw,
  Mail,
  Phone,
  Users,
  Key,
  Database,
  Clock,
  Download,
  PauseCircle,
  Shield,
} from "lucide-react";
import {
  SettingSection,
  SettingRow,
  SettingBanner,
  SettingDangerZone,
} from "../setting-primitives";
import {
  SettingToggle,
  SettingSelect,
  SettingInput,
} from "../setting-controls";

export default function RecoverySection() {
  const [recoveryEmail, setRecoveryEmail] = useState("amelia.backup@gmail.com");
  const [recoveryPhone, setRecoveryPhone] = useState("+1 (555) 987-6543");
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState("weekly");
  const [backupEncryption, setBackupEncryption] = useState(true);

  return (
    <div className="space-y-6">
      {/* Recovery Methods */}
      <SettingSection
        id="recovery-methods"
        icon={Shield}
        title="Account Recovery"
        description="Configure fallback methods for account access recovery."
      >
        <SettingRow
          label="Recovery Email"
          description="A separate email address used only for account recovery."
        >
          <SettingInput
            value={recoveryEmail}
            onChange={setRecoveryEmail}
            placeholder="backup@example.com"
            icon={Mail}
            className="w-56"
          />
        </SettingRow>

        <SettingRow
          label="Recovery Phone"
          description="Fallback phone number for SMS-based identity verification."
        >
          <SettingInput
            value={recoveryPhone}
            onChange={setRecoveryPhone}
            placeholder="+1 (555) 000-0000"
            icon={Phone}
            className="w-56"
          />
        </SettingRow>

        <SettingRow
          label="Trusted Contacts"
          description="Designate up to 3 contacts who can help verify your identity. 2 of 3 must approve recovery."
        >
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
            <Users className="h-3.5 w-3.5" />
            Manage Contacts
          </button>
        </SettingRow>

        <SettingRow
          label="Recovery Codes"
          description="12-digit single-use codes for emergency account access."
        >
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
            <Key className="h-3.5 w-3.5" />
            Download Codes
          </button>
        </SettingRow>
      </SettingSection>

      {/* Data Backup */}
      <SettingSection
        id="data-backup"
        icon={Database}
        title="Data Backup"
        description="Automatic backup to external storage destinations."
      >
        <SettingRow
          label="Enable External Backup"
          description="Backup your Drivya data to S3-compatible storage."
        >
          <SettingToggle checked={backupEnabled} onChange={setBackupEnabled} />
        </SettingRow>

        {backupEnabled && (
          <>
            <SettingRow
              label="Backup Frequency"
              description="How often backups run."
            >
              <SettingSelect
                value={backupFrequency}
                onChange={setBackupFrequency}
                options={[
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                ]}
              />
            </SettingRow>

            <SettingRow
              label="Encrypt Backups"
              description="AES-256 encryption with a user-provided key."
            >
              <SettingToggle
                checked={backupEncryption}
                onChange={setBackupEncryption}
              />
            </SettingRow>

            <SettingRow
              label="Storage Destination"
              description="Connect your external S3-compatible storage."
            >
              <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
                <Database className="h-3.5 w-3.5" />
                Configure Storage
              </button>
            </SettingRow>

            <div className="px-6 pb-4">
              <div className="rounded-xl border border-border/60 bg-secondary/10 p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Last Backup
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      June 2, 2026 at 3:00 AM · 142.8 GB · Successful
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Healthy
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </SettingSection>

      {/* File Recovery */}
      <SettingSection
        id="file-recovery"
        icon={Clock}
        title="File Recovery"
        description="Recover accidentally deleted or corrupted files."
      >
        <SettingRow
          label="Point-in-Time Restore"
          description="Restore your account to a previous state. Available for the last 30 days (Pro)."
        >
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
            Restore Files
          </button>
        </SettingRow>

        <SettingRow
          label="Restore Window"
          description="How far back you can restore."
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              30 days
            </span>
            <span className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
              Pro
            </span>
          </div>
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
    </div>
  );
}
