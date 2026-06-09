import { useState } from "react";
import { Eye, Database, Download, Cookie, Search, Users } from "lucide-react";
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

export default function PrivacySection() {
  const [activityTracking, setActivityTracking] = useState("full");
  const [dataResidency, setDataResidency] = useState("auto");
  const [thirdPartySharing, setThirdPartySharing] = useState(true);
  const [cookieLevel, setCookieLevel] = useState("functional");
  const [searchIndexing, setSearchIndexing] = useState("full");

  return (
    <div className="space-y-6">
      {/* Activity Tracking */}
      <SettingSection
        id="activity-tracking"
        icon={Eye}
        title="Activity Tracking"
        description="Control how Drivya collects usage data for analytics and recommendations."
      >
        <SettingRow
          label="Tracking Level"
          description="Choose how much usage data Drivya collects."
          vertical
        >
          <SettingRadioGroup
            value={activityTracking}
            onChange={setActivityTracking}
            options={[
              {
                value: "full",
                label: "Full Tracking",
                description:
                  "Usage analytics, improvement suggestions, and personalized recommendations.",
              },
              {
                value: "minimal",
                label: "Minimal Tracking",
                description:
                  "Essential system metrics only. No personalization.",
              },
              {
                value: "off",
                label: "Off",
                description:
                  "No analytics collected. Some features like AI suggestions will be unavailable.",
              },
            ]}
          />
        </SettingRow>

        {activityTracking === "off" && (
          <div className="px-6 pb-4">
            <SettingBanner variant="info" icon={Eye}>
              Disabling tracking removes storage insights from your Home
              dashboard and disables "Suggested files" features. Essential
              security logs are always collected.
            </SettingBanner>
          </div>
        )}
      </SettingSection>

      {/* Data Residency */}
      <SettingSection
        id="data-residency"
        icon={Database}
        title="Data Residency"
        description="Choose where your files are physically stored."
      >
        <SettingRow
          label="Storage Region"
          description="Primary region for file storage. Migration may take hours for large accounts."
        >
          <SettingSelect
            value={dataResidency}
            onChange={setDataResidency}
            options={[
              { value: "auto", label: "Auto (Nearest)" },
              { value: "us-east", label: "🇺🇸 US East" },
              { value: "us-west", label: "🇺🇸 US West" },
              { value: "eu-frankfurt", label: "🇩🇪 EU (Frankfurt)" },
              { value: "eu-ireland", label: "🇮🇪 EU (Ireland)" },
              { value: "ap-singapore", label: "🇸🇬 Asia Pacific (Singapore)" },
              { value: "ap-tokyo", label: "🇯🇵 Asia Pacific (Tokyo)" },
            ]}
          />
        </SettingRow>

        {dataResidency !== "auto" && (
          <div className="px-6 pb-4">
            <SettingBanner variant="info" icon={Database}>
              Your files will be stored in the selected region. Collaborators in
              other regions may experience slightly higher latency.
            </SettingBanner>
          </div>
        )}
      </SettingSection>

      {/* Search Indexing */}
      <SettingSection
        id="search-indexing"
        icon={Search}
        title="Search Indexing"
        description="Control how file contents are indexed for search."
      >
        <SettingRow
          label="Index Level"
          description="Determines what can be found via search."
          vertical
        >
          <SettingRadioGroup
            value={searchIndexing}
            onChange={setSearchIndexing}
            options={[
              {
                value: "full",
                label: "Full Content Indexing",
                description:
                  "File names, contents, and metadata. Enables AI-powered search.",
              },
              {
                value: "filename",
                label: "Filename Only",
                description: "Only file names and metadata are searchable.",
              },
              {
                value: "disabled",
                label: "Disabled",
                description:
                  "No indexing. Files only findable by exact filename in folder browser.",
              },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* Third-Party Sharing */}
      <SettingSection
        id="third-party"
        icon={Users}
        title="Third-Party Data"
        description="Control anonymized data sharing with analytics partners."
      >
        <SettingRow
          label="Anonymized Usage Sharing"
          description="Share aggregated, anonymized usage data to help improve Drivya. PII is never shared."
        >
          <SettingToggle
            checked={thirdPartySharing}
            onChange={setThirdPartySharing}
          />
        </SettingRow>
      </SettingSection>

      {/* Cookie Preferences */}
      <SettingSection
        id="cookies"
        icon={Cookie}
        title="Cookie Preferences"
        description="Manage cookie consent for the web client."
      >
        <SettingRow
          label="Cookie Level"
          description="Controls which types of cookies Drivya uses."
          vertical
        >
          <SettingRadioGroup
            value={cookieLevel}
            onChange={setCookieLevel}
            options={[
              {
                value: "essential",
                label: "Essential Only",
                description:
                  "Session, auth, and CSRF cookies. Required for basic functionality.",
              },
              {
                value: "functional",
                label: "Essential + Functional",
                description:
                  "Adds theme persistence, layout preferences, and saved UI states.",
              },
              {
                value: "analytics",
                label: "Essential + Functional + Analytics",
                description:
                  "Adds usage tracking cookies for service improvement.",
              },
              {
                value: "all",
                label: "Accept All",
                description: "All cookie categories enabled.",
              },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* Data Export */}
      <SettingSection
        id="data-export"
        icon={Download}
        title="Data Export"
        description="Download a copy of all your data (GDPR Article 20)."
      >
        <SettingRow
          label="Export Your Data"
          description="Generate a downloadable archive of your files, metadata, and account data. Preparation may take up to 24 hours."
        >
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
            <Download className="h-3.5 w-3.5" />
            Request Export
          </button>
        </SettingRow>
      </SettingSection>
    </div>
  );
}
