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
          label="Recovery Codes"
          description="12-digit single-use codes for emergency account access."
        >
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
            <Key className="h-3.5 w-3.5" />
            Download Codes
          </button>
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
