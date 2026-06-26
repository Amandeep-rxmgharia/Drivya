import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  AtSign,
  Globe,
  Clock,
  Camera,
  Languages,
} from "lucide-react";
import {
  SettingSection,
  SettingRow,
  SettingDangerZone,
} from "../setting-primitives";
import {
  SettingInput,
  SettingToggle,
  SettingSelect,
} from "../setting-controls";

const getInitials = (name) => {
  if (!name) return "AM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function AccountSection({ userProfile, setUserProfile }) {
  // Local state fallback in case of direct usage without parent context
  const [localProfile, setLocalProfile] = useState({
    displayName: "Amelia Moreau",
    email: "amelia@drivya.com",
    phone: "+1 (555) 012-3456",
    language: "en",
    timezone: "auto",
  });

  const profile = userProfile || localProfile;

  const updateProfile = (key, value) => {
    if (setUserProfile) {
      setUserProfile((prev) => ({ ...prev, [key]: value }));
    } else {
      setLocalProfile((prev) => ({ ...prev, [key]: value }));
    }
  };

  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [autoTimezone, setAutoTimezone] = useState(true);

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <SettingSection
        id="profile"
        icon={User}
        title="Profile"
        description="Your personal information visible to collaborators."
      >
        {/* Avatar */}
        <SettingRow
          label="Profile Photo"
          description="Shown in sharing, comments, and your dashboard avatar."
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-primary ring-1 ring-border flex items-center justify-center text-sm font-semibold text-primary-foreground shadow-glow">
              {getInitials(profile.displayName)}
            </div>
            <div className="flex flex-col gap-1">
              <button className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors">
                <Camera className="h-3 w-3" />
                Upload
              </button>
              <span className="text-[10px] text-muted-foreground">
                JPG, PNG, WebP · Max 5 MB
              </span>
            </div>
          </div>
        </SettingRow>

        {/* Display Name */}
        <SettingRow
          label="Display Name"
          description="How others see you across Drivya."
        >
          <SettingInput
            value={profile.displayName}
            onChange={(val) => updateProfile("displayName", val)}
            placeholder="Your name"
            icon={User}
            maxLength={64}
            className="w-56"
          />
        </SettingRow>

        {/* Email */}
        <SettingRow
          label="Email Address"
          description="Primary login and notification email."
          badge={
            <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              Verified
            </span>
          }
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground/80 font-medium">
              {profile.email}
            </span>
            <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              Change
            </button>
          </div>
        </SettingRow>

        {/* Phone */}
        <SettingRow
          label="Phone Number"
          description="Used for SMS 2FA and account recovery."
        >
          <SettingInput
            value={profile.phone}
            onChange={(val) => updateProfile("phone", val)}
            placeholder="+1 (555) 000-0000"
            icon={Phone}
            className="w-56"
          />
        </SettingRow>
      </SettingSection>

      {/* Account Type */}
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
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
              <User className="h-3 w-3" />
              Personal · Pro
            </span>
          </div>
        </SettingRow>

        <SettingRow
          label="Member Since"
          description="When you created your Drivya account."
        >
          <span className="text-sm text-foreground/80 font-medium tabular-nums">
            January 12, 2025
          </span>
        </SettingRow>
      </SettingSection>

      {/* Danger Zone */}
      <SettingDangerZone
        title="Danger Zone"
        description="Irreversible actions. Proceed with extreme caution."
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Delete Account
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Permanently delete your account and all files.
            </p>
          </div>
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors shrink-0">
            Delete Account
          </button>
        </div>
      </SettingDangerZone>
    </div>
  );
}
