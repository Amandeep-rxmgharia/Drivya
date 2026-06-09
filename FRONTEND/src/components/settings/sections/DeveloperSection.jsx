import { useState } from "react";
import {
  Code2,
  Key,
  Globe,
  Link2,
  BarChart3,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  SettingSection,
  SettingRow,
  SettingBanner,
} from "../setting-primitives";
import { SettingToggle, SettingSelect } from "../setting-controls";

const MOCK_API_KEYS = [
  {
    id: 1,
    name: "Production App",
    prefix: "drv_prod_",
    masked: "••••••••••••a4f2",
    permissions: ["read", "write"],
    created: "Mar 15, 2026",
    lastUsed: "2 minutes ago",
    requests: "12,847",
  },
  {
    id: 2,
    name: "CI/CD Pipeline",
    prefix: "drv_ci_",
    masked: "••••••••••••8b1e",
    permissions: ["read"],
    created: "Apr 2, 2026",
    lastUsed: "1 hour ago",
    requests: "3,421",
  },
  {
    id: 3,
    name: "Mobile App",
    prefix: "drv_mob_",
    masked: "••••••••••••c7d9",
    permissions: ["read", "write", "share"],
    created: "May 10, 2026",
    lastUsed: "5 days ago",
    requests: "891",
  },
];

const MOCK_WEBHOOKS = [
  {
    id: 1,
    url: "https://api.myapp.com/webhooks/drivya",
    events: ["file.created", "file.shared"],
    active: true,
    lastDelivery: "200 OK · 2 min ago",
  },
  {
    id: 2,
    url: "https://hooks.slack.com/services/T0...",
    events: ["file.deleted"],
    active: false,
    lastDelivery: "No deliveries yet",
  },
];

export default function DeveloperSection() {
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (id) => {
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* API Keys */}
      <SettingSection
        id="api-keys"
        icon={Key}
        title="API Keys"
        description="Create and manage API keys for programmatic access."
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {MOCK_API_KEYS.length} keys · 50 max (Pro)
            </span>
            <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-primary px-3 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-opacity">
              <Plus className="h-3 w-3" />
              Generate Key
            </button>
          </div>

          <div className="space-y-2">
            {MOCK_API_KEYS.map((apiKey) => (
              <div
                key={apiKey.id}
                className="rounded-xl border border-border/60 bg-secondary/10 p-3.5 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {apiKey.name}
                      </span>
                      {apiKey.permissions.map((p) => (
                        <span
                          key={p}
                          className="rounded-md bg-secondary/60 border border-border/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <code className="font-mono text-foreground/70 bg-secondary/40 px-1.5 py-0.5 rounded">
                        {apiKey.prefix}
                        {apiKey.masked}
                      </code>
                      <button
                        onClick={() => handleCopy(apiKey.id)}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium"
                      >
                        {copiedKey === apiKey.id ? (
                          <>
                            <Check className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground/70">
                      Created {apiKey.created} · Last used {apiKey.lastUsed} ·{" "}
                      {apiKey.requests} requests
                    </div>
                  </div>
                  <button className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SettingSection>

      {/* Webhooks */}
      <SettingSection
        id="webhooks"
        icon={Link2}
        title="Webhooks"
        description="Receive real-time event notifications via HTTP callbacks."
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {MOCK_WEBHOOKS.length} endpoints
            </span>
            <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
              <Plus className="h-3 w-3" />
              Add Endpoint
            </button>
          </div>

          <div className="space-y-2">
            {MOCK_WEBHOOKS.map((webhook) => (
              <div
                key={webhook.id}
                className={`rounded-xl border p-3.5 transition-colors ${
                  webhook.active
                    ? "border-border/60 bg-secondary/10"
                    : "border-border/40 bg-secondary/5 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-foreground truncate">
                        {webhook.url}
                      </code>
                      {webhook.active ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      {webhook.events.map((evt) => (
                        <span
                          key={evt}
                          className="rounded-md bg-primary/10 border border-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary"
                        >
                          {evt}
                        </span>
                      ))}
                      <span className="text-[10px] text-muted-foreground/70">
                        · {webhook.lastDelivery}
                      </span>
                    </div>
                  </div>
                  <SettingToggle
                    size="sm"
                    checked={webhook.active}
                    onChange={() => {}}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </SettingSection>

      {/* API Usage */}
      <SettingSection
        id="api-usage"
        icon={BarChart3}
        title="API Usage"
        description="Monitor your API consumption and rate limits."
      >
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Today", value: "1,247" },
              { label: "This Month", value: "34,892" },
              { label: "Error Rate", value: "0.3%" },
              { label: "Rate Limit", value: "1,000/min" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border/60 bg-secondary/20 p-3 text-center"
              >
                <div className="font-display text-lg font-semibold tracking-tight text-foreground tabular-nums">
                  {stat.value}
                </div>
                <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <SettingRow
          label="Usage Alerts"
          description="Email alert when reaching 80% of monthly API quota."
        >
          <SettingToggle checked={true} onChange={() => {}} />
        </SettingRow>
      </SettingSection>

      {/* OAuth Apps */}
      <SettingSection
        id="oauth-apps"
        icon={Globe}
        title="OAuth Applications"
        description="Manage OAuth 2.0 applications using Drivya as a backend."
      >
        <SettingRow
          label="Registered Applications"
          description="No OAuth applications registered."
        >
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
            <Code2 className="h-3.5 w-3.5" />
            Register App
          </button>
        </SettingRow>
      </SettingSection>
    </div>
  );
}
