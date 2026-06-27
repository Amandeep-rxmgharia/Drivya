import { useState } from "react";
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
  SettingToggle,
  SettingSelect,
  SettingRadioGroup,
} from "../setting-controls";

export default function SharingSection() {
  const [defaultAccess, setDefaultAccess] = useState("view");
  const [defaultExpiry, setDefaultExpiry] = useState("never");
  const [passwordDefault, setPasswordDefault] = useState("suggest");
  const [downloadPermission, setDownloadPermission] = useState("allow");
  const [shareNotify, setShareNotify] = useState("first-view");
  const [publicProfile, setPublicProfile] = useState("name");

  return (
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
    </div>
  );
}
