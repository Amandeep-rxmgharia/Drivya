import { useState } from "react";
import {
  Zap,
  Cloud,
  Box,
  MessageSquare,
  Link2,
  Check,
  ExternalLink,
  Plus,
} from "lucide-react";
import {
  SettingSection,
  SettingRow,
  SettingBanner,
  TierBadge,
} from "../setting-primitives";
import { SettingToggle } from "../setting-controls";

const CLOUD_INTEGRATIONS = [
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Import files and migrate from Google Drive",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 3.5h13.12l-3.43 6H6.28M15.66 15H2.55l3.43 6h13.11" />
      </svg>
    ),
    connected: true,
    color: "text-[#4285F4]",
    bgColor: "bg-[#4285F4]/10 border-[#4285F4]/20",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Sync and import from Dropbox",
    icon: <Box className="h-4 w-4" />,
    connected: false,
    color: "text-[#0061FF]",
    bgColor: "bg-[#0061FF]/10 border-[#0061FF]/20",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Connect Microsoft OneDrive",
    icon: <Cloud className="h-4 w-4" />,
    connected: false,
    color: "text-[#0078D4]",
    bgColor: "bg-[#0078D4]/10 border-[#0078D4]/20",
  },
];

const PRODUCTIVITY_INTEGRATIONS = [
  {
    id: "microsoft365",
    name: "Microsoft 365",
    description: "Edit Office files directly in-browser",
    connected: false,
    tier: "Pro",
  },
  {
    id: "google-workspace",
    name: "Google Workspace",
    description: "Open files with Google Docs, Sheets, Slides",
    connected: false,
    tier: "Pro",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Embed Drivya files in Notion pages",
    connected: false,
  },
  {
    id: "figma",
    name: "Figma",
    description: "Sync design assets with Figma projects",
    connected: false,
    tier: "Pro",
  },
];

const COMMUNICATION_INTEGRATIONS = [
  {
    id: "slack",
    name: "Slack",
    description: "Share files and receive notifications in Slack channels",
    connected: true,
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Post file links and get alerts in Teams",
    connected: false,
  },
  {
    id: "discord",
    name: "Discord",
    description: "Share files in Discord servers",
    connected: false,
  },
];

const AUTOMATION_INTEGRATIONS = [
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate workflows with 5,000+ apps",
    tier: "Pro",
  },
  {
    id: "make",
    name: "Make (Integromat)",
    description: "Build complex automation scenarios",
    tier: "Pro",
  },
  {
    id: "ifttt",
    name: "IFTTT",
    description: "Simple if-this-then-that automations",
  },
];

function IntegrationCard({ integration, type = "cloud" }) {
  const isConnected = integration.connected;
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3.5 transition-all duration-200 hover:bg-secondary/20 ${
        isConnected ? "border-primary/15 bg-primary/[0.02]" : "border-border/60"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          type === "cloud" && integration.bgColor
            ? `${integration.bgColor} ${integration.color}`
            : isConnected
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-border bg-secondary/50 text-muted-foreground"
        }`}
      >
        {integration.icon || <Zap className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {integration.name}
          </span>
          {integration.tier && <TierBadge tier={integration.tier} />}
          {isConnected && (
            <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              <Check className="h-2.5 w-2.5" /> Connected
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {integration.description}
        </div>
      </div>
      <button
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors shrink-0 ${
          isConnected
            ? "border-border bg-secondary/40 text-foreground/80 hover:bg-secondary/60"
            : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
        }`}
      >
        {isConnected ? (
          <>Manage</>
        ) : (
          <>
            <Plus className="h-3 w-3" /> Connect
          </>
        )}
      </button>
    </div>
  );
}

export default function IntegrationSection() {
  const [webhookEnabled, setWebhookEnabled] = useState(false);

  return (
    <div className="space-y-6">
      {/* Cloud Storage */}
      <SettingSection
        id="cloud-import"
        icon={Cloud}
        title="Cloud Storage"
        description="Connect external storage providers for import and migration."
      >
        <div className="px-6 py-3 space-y-2">
          {CLOUD_INTEGRATIONS.map((intg) => (
            <IntegrationCard key={intg.id} integration={intg} type="cloud" />
          ))}
        </div>
      </SettingSection>

      {/* Productivity */}
      <SettingSection
        id="productivity"
        icon={ExternalLink}
        title="Productivity Suite"
        description="Edit and collaborate with external tools."
      >
        <div className="px-6 py-3 space-y-2">
          {PRODUCTIVITY_INTEGRATIONS.map((intg) => (
            <IntegrationCard
              key={intg.id}
              integration={intg}
              type="productivity"
            />
          ))}
        </div>
      </SettingSection>

      {/* Communication */}
      <SettingSection
        id="communication"
        icon={MessageSquare}
        title="Communication"
        description="Share files directly to messaging platforms."
      >
        <div className="px-6 py-3 space-y-2">
          {COMMUNICATION_INTEGRATIONS.map((intg) => (
            <IntegrationCard key={intg.id} integration={intg} type="comm" />
          ))}
        </div>
      </SettingSection>

      {/* Automation */}
      <SettingSection
        id="automation"
        icon={Zap}
        title="Automation & Workflows"
        description="Connect Drivya to automation platforms."
      >
        <div className="px-6 py-3 space-y-2">
          {AUTOMATION_INTEGRATIONS.map((intg) => (
            <IntegrationCard key={intg.id} integration={intg} type="auto" />
          ))}
        </div>

        <SettingRow
          label="Custom Webhooks"
          description="Send real-time events to custom HTTP endpoints."
        >
          <SettingToggle
            checked={webhookEnabled}
            onChange={setWebhookEnabled}
          />
        </SettingRow>

        {webhookEnabled && (
          <div className="px-6 pb-4">
            <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
              <Link2 className="h-3.5 w-3.5" />
              Configure Webhooks
            </button>
          </div>
        )}
      </SettingSection>
    </div>
  );
}
