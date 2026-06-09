import { useState } from "react";
import {
  Shield,
  FileSearch,
  Clock,
  Scale,
  KeyRound,
  Users,
  ArrowUpRight,
  AlertTriangle,
  Search,
  Download,
  Lock,
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

const MOCK_AUDIT_ENTRIES = [
  {
    time: "2 min ago",
    user: "Amelia Moreau",
    action: "Changed sharing settings",
    resource: "Brand Guidelines v3.pdf",
    ip: "73.162.xxx.xxx",
  },
  {
    time: "15 min ago",
    user: "Amelia Moreau",
    action: "Uploaded 3 files",
    resource: "Design Assets/",
    ip: "73.162.xxx.xxx",
  },
  {
    time: "1 hour ago",
    user: "System",
    action: "Automated backup completed",
    resource: "Full account",
    ip: "—",
  },
  {
    time: "3 hours ago",
    user: "Amelia Moreau",
    action: "Enabled 2FA",
    resource: "Account security",
    ip: "73.162.xxx.xxx",
  },
  {
    time: "Yesterday",
    user: "Amelia Moreau",
    action: "Revoked shared link",
    resource: "api-routes.ts",
    ip: "185.42.xxx.xxx",
  },
];

export default function ComplianceSection() {
  const [dlpEnabled, setDlpEnabled] = useState(false);
  const [dlpMode, setDlpMode] = useState("warn");
  const [retentionEnabled, setRetentionEnabled] = useState(false);
  const [auditRetention, setAuditRetention] = useState("2y");

  return (
    <div className="space-y-6">
      <div className="px-1">
        <SettingBanner variant="info" icon={Shield}>
          Compliance features are available on the <strong>Team plan</strong>.
          Below is a preview of enterprise compliance capabilities. Some
          features are functional for your account.
        </SettingBanner>
      </div>

      {/* Audit Log */}
      <SettingSection
        id="audit-log"
        icon={FileSearch}
        title="Audit Log"
        description="Comprehensive, tamper-proof log of all account operations."
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground">
              Last 90 days · Pro plan
            </span>
            <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors">
              <Download className="h-3 w-3" />
              Export CSV
            </button>
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
            {MOCK_AUDIT_ENTRIES.map((entry, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/40 text-muted-foreground mt-0.5">
                  <Shield className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground">
                    <span className="font-semibold">{entry.user}</span>{" "}
                    <span className="text-foreground/70">{entry.action}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{entry.resource}</span>
                    <span>·</span>
                    <span className="font-mono text-[10px]">{entry.ip}</span>
                    <span>·</span>
                    <span>{entry.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SettingRow
          label="Log Retention"
          description="How long audit logs are retained."
        >
          <SettingSelect
            value={auditRetention}
            onChange={setAuditRetention}
            options={[
              { value: "90d", label: "90 days (Pro)" },
              { value: "1y", label: "1 year" },
              { value: "2y", label: "2 years (Team)" },
              { value: "7y", label: "7 years (Compliance)" },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* DLP */}
      <SettingSection
        id="dlp"
        icon={AlertTriangle}
        title="Data Loss Prevention (DLP)"
        description="Prevent accidental sharing of sensitive data."
      >
        <SettingRow
          label="Enable DLP Scanning"
          description="Scan file content on upload and before sharing for sensitive data."
          badge={<TierBadge tier="Team" />}
        >
          <SettingToggle checked={dlpEnabled} onChange={setDlpEnabled} />
        </SettingRow>

        {dlpEnabled && (
          <>
            <SettingRow
              label="Detection Mode"
              description="How DLP handles flagged content."
              vertical
            >
              <SettingRadioGroup
                value={dlpMode}
                onChange={setDlpMode}
                options={[
                  {
                    value: "warn",
                    label: "Warn Only",
                    description: "Show a warning but allow sharing.",
                  },
                  {
                    value: "block",
                    label: "Block Sharing",
                    description: "Prevent external sharing of flagged files.",
                  },
                  {
                    value: "approve",
                    label: "Require Approval",
                    description:
                      "Flagged files need admin approval before sharing.",
                  },
                ]}
              />
            </SettingRow>

            <SettingRow
              label="Detection Rules"
              description="PII patterns detected: SSN, credit cards, passport numbers."
            >
              <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
                Configure Rules
              </button>
            </SettingRow>
          </>
        )}
      </SettingSection>

      {/* Retention Policies */}
      <SettingSection
        id="retention"
        icon={Clock}
        title="Retention Policies"
        description="Define mandatory data retention and deletion rules."
      >
        <SettingRow
          label="Enable Retention Policies"
          description="Create rules to prevent premature deletion or enforce automatic cleanup."
          badge={<TierBadge tier="Team" />}
        >
          <SettingToggle
            checked={retentionEnabled}
            onChange={setRetentionEnabled}
          />
        </SettingRow>

        {retentionEnabled && (
          <SettingRow
            label="Policy Configuration"
            description="Set per-folder or per-label retention rules."
          >
            <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
              <Clock className="h-3.5 w-3.5" />
              Manage Policies
            </button>
          </SettingRow>
        )}
      </SettingSection>

      {/* SSO */}
      <SettingSection
        id="sso"
        icon={KeyRound}
        title="Single Sign-On (SSO)"
        description="SAML 2.0 and OIDC configuration for organization authentication."
      >
        <SettingRow
          label="SSO Configuration"
          description="Connect your identity provider for seamless authentication."
          badge={<TierBadge tier="Team" />}
          tierRequired="Team"
        />

        <SettingRow
          label="SCIM Provisioning"
          description="Automate user lifecycle management from your IdP."
          badge={<TierBadge tier="Team" />}
          tierRequired="Team"
        />
      </SettingSection>

      {/* eDiscovery */}
      <SettingSection
        id="ediscovery"
        icon={Search}
        title="eDiscovery"
        description="Search and export data across all org members for legal proceedings."
      >
        <SettingRow
          label="eDiscovery Tools"
          description="Cross-organization search, custodian collection, and legal hold management."
          badge={<TierBadge tier="Team" />}
          tierRequired="Team"
        />
      </SettingSection>
    </div>
  );
}
