import { useEffect, useMemo, useState } from "react";
import {
  Share2,
  Link2,
  Lock,
  Download,
  Droplet,
  Bell,
  User,
} from "lucide-react";
import {
  SettingSection,
  SettingRow,
  SettingBanner,
} from "../setting-primitives";
import {
  SettingSelect,
  SettingRadioGroup,
} from "../setting-controls";

import {
  getSharingDefaults,
  updateSharingDefaults,
} from "../../../../api/account.js";

function expiryToDays(val) {
  if (val === "never") return null;
  if (val === "1d") return 1;
  if (val === "7d") return 7;
  if (val === "30d") return 30;
  if (val === "90d") return 90;
  if (val === "365d") return 365;
  return null;
}

function daysToExpiry(days) {
  if (days == null) return "never";
  if (days === 1) return "1d";
  if (days === 7) return "7d";
  if (days === 30) return "30d";
  if (days === 90) return "90d";
  if (days === 365) return "365d";
  return "never";
}

export default function SharingSection() {
  const [defaultAccess, setDefaultAccess] = useState("view");
  const [defaultExpiry, setDefaultExpiry] = useState("never");
  const [passwordDefault, setPasswordDefault] = useState("suggest");
  const [publicProfile, setPublicProfile] = useState("name");

  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  const [saveError, setSaveError] = useState(null);
  const [savePending, setSavePending] = useState(false);

  const payload = useMemo(
    () => ({
      defaultAccess,
      defaultExpiryDays: expiryToDays(defaultExpiry),
      passwordDefault,
      publicProfile,
    }),
    [defaultAccess, defaultExpiry, passwordDefault, publicProfile],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoadingDefaults(true);
      setSaveError(null);
      try {
        const res = await getSharingDefaults();
        if (cancelled) return;

        setDefaultAccess(res?.defaults?.defaultAccess ?? "view");
        setDefaultExpiry(daysToExpiry(res?.defaults?.defaultExpiryDays ?? null));
        setPasswordDefault(res?.defaults?.passwordDefault ?? "suggest");
        setPublicProfile(res?.defaults?.publicProfile ?? "name");
      } catch (err) {
        if (!cancelled) {
          setSaveError(
            err.response?.data?.message || "Failed to load sharing defaults.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingDefaults(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let t;

    // debounce persist
    if (isLoadingDefaults) return;

    t = setTimeout(async () => {
      setSavePending(true);
      setSaveError(null);
      try {
        await updateSharingDefaults(payload);
      } catch (err) {
        setSaveError(
          err.response?.data?.message || "Failed to save sharing defaults.",
        );
      } finally {
        setSavePending(false);
      }
    }, 450);

    return () => clearTimeout(t);
  }, [payload, isLoadingDefaults]);

  return (
    <>
      {saveError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {saveError}
        </div>
      )}
      {isLoadingDefaults && (
        <div className="text-sm text-muted-foreground mb-4">
          Loading sharing settings…
        </div>
      )}

      <div className="space-y-6">
        {/* Link Defaults */}
        <SettingSection
          id="link-defaults"
          icon={Link2}
          title="Link Defaults"
          description="Default settings applied to new share links."
        >
          <SettingRow
            label="Default Access Level"
            description="Permission level for new share links."
          >
            <SettingSelect
              value={defaultAccess}
              onChange={setDefaultAccess}
              options={[
                { value: "view", label: "View only" },
                { value: "view-download", label: "View + Download" }
              ]}
            />
          </SettingRow>

          <SettingRow
            label="Default Expiration"
            description="When new share links expire by default."
          >
            <SettingSelect
              value={defaultExpiry}
              onChange={setDefaultExpiry}
              options={[
                { value: "1d", label: "1 day" },
                { value: "7d", label: "7 days" },
                { value: "30d", label: "30 days" },
                { value: "90d", label: "90 days" },
                { value: "365d", label: "1 year" },
                { value: "never", label: "Never expires" },
              ]}
            />
          </SettingRow>
        </SettingSection>

        {/* Security */}
        <SettingSection
          id="sharing-security"
          icon={Lock}
          title="Sharing Security"
          description="Control security defaults for shared content."
        >
          <SettingRow
            label="Password Protection"
            description="Auto-enable passwords on new share links."
            vertical
          >
            <SettingRadioGroup
              value={passwordDefault}
              onChange={setPasswordDefault}
              options={[
                {
                  value: "always",
                  label: "Always Require",
                  description:
                    "Auto-generate a strong password for every new link.",
                },
                {
                  value: "suggest",
                  label: "Suggest Password",
                  description:
                    "Show password option pre-enabled, user can remove.",
                },
                {
                  value: "never",
                  label: "Never Require",
                  description: "No password by default. User can add manually.",
                },
              ]}
            />
          </SettingRow>
        </SettingSection>

        {/* Public Profile */}
        <SettingSection
          id="public-profile"
          icon={User}
          title="Public Profile"
          description="What recipients see about you on shared file pages."
        >
          <SettingRow
            label="Shared Content Attribution"
            description="What is shown as 'Shared by' on your link landing pages."
            vertical
          >
            <SettingRadioGroup
              value={publicProfile}
              onChange={setPublicProfile}
              options={[
                {
                  value: "full",
                  label: "Full Profile",
                  description: "Name, avatar, and email visible to recipients.",
                },
                {
                  value: "name",
                  label: "Name Only",
                  description: "Only your display name shown.",
                },
                {
                  value: "anonymous",
                  label: "Anonymous",
                  description: 'Shown as "A Drivya user".',
                },
              ]}
            />
          </SettingRow>
        </SettingSection>
        {/* subtle "saving" state */}
        {savePending && (
          <div className="text-[11px] text-muted-foreground mt-2">
            Saving…
          </div>
        )}
      </div>
    </>
  );
}
