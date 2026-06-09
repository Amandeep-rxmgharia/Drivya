import { useState } from "react";
import {
  Smartphone,
  Monitor,
  Wifi,
  WifiOff,
  Cloud,
  HardDrive,
  Laptop,
  Tablet,
  RefreshCw,
  X,
  ArrowDownUp,
} from "lucide-react";
import {
  SettingSection,
  SettingRow,
  SettingBanner,
} from "../setting-primitives";
import {
  SettingToggle,
  SettingSelect,
  SettingSlider,
  SettingRadioGroup,
} from "../setting-controls";

const MOCK_DEVICES = [
  {
    id: 1,
    name: 'MacBook Pro 16"',
    type: "laptop",
    os: "macOS Sequoia 15.3",
    lastSync: "Synced now",
    status: "active",
    storage: "48.2 GB cached",
  },
  {
    id: 2,
    name: "iPhone 16 Pro",
    type: "phone",
    os: "iOS 19.1",
    lastSync: "2 min ago",
    status: "active",
    storage: "2.1 GB cached",
  },
  {
    id: 3,
    name: "iPad Air",
    type: "tablet",
    os: "iPadOS 19.1",
    lastSync: "3 days ago",
    status: "idle",
    storage: "850 MB cached",
  },
];

const deviceIcons = {
  laptop: Laptop,
  phone: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
};

export default function SyncSection() {
  const [syncMode, setSyncMode] = useState("smart");
  const [mobileAutoUpload, setMobileAutoUpload] = useState(false);
  const [uploadContent, setUploadContent] = useState("photos");
  const [wifiOnly, setWifiOnly] = useState(true);
  const [includeScreenshots, setIncludeScreenshots] = useState(false);
  const [offlineStarred, setOfflineStarred] = useState(true);
  const [maxCache, setMaxCache] = useState(2048);
  const [uploadLimit, setUploadLimit] = useState(0);
  const [downloadLimit, setDownloadLimit] = useState(0);
  const [conflictResolution, setConflictResolution] = useState("ask");

  return (
    <div className="space-y-6">
      {/* Desktop Sync */}
      <SettingSection
        id="desktop-sync"
        icon={Cloud}
        title="Desktop Sync"
        description="Configure how files sync between your computer and the cloud."
      >
        <SettingRow
          label="Sync Mode"
          description="Choose how files are synced to your local drive."
          vertical
        >
          <SettingRadioGroup
            value={syncMode}
            onChange={setSyncMode}
            options={[
              {
                value: "everything",
                label: "Sync Everything",
                description:
                  "All files downloaded to local disk. Requires sufficient storage.",
              },
              {
                value: "selective",
                label: "Selective Sync",
                description:
                  "Choose which folders to sync locally. Others remain cloud-only.",
              },
              {
                value: "smart",
                label: "Smart Sync",
                description:
                  "All files visible in filesystem. Downloaded on demand when opened.",
              },
              {
                value: "paused",
                label: "Pause Sync",
                description:
                  "All sync operations paused. Changes queued for later.",
              },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* Mobile Auto-Upload */}
      <SettingSection
        id="mobile-upload"
        icon={Smartphone}
        title="Mobile Auto-Upload"
        description="Automatically back up photos and videos from your camera roll."
      >
        <SettingRow
          label="Auto-Upload"
          description="Automatically upload new photos and videos."
        >
          <SettingToggle
            checked={mobileAutoUpload}
            onChange={setMobileAutoUpload}
          />
        </SettingRow>

        {mobileAutoUpload && (
          <>
            <SettingRow
              label="Upload Content"
              description="What to auto-upload from your device."
            >
              <SettingSelect
                value={uploadContent}
                onChange={setUploadContent}
                options={[
                  { value: "photos", label: "Photos only" },
                  { value: "photos-videos", label: "Photos + Videos" },
                  { value: "all", label: "All new files" },
                ]}
              />
            </SettingRow>

            <SettingRow
              label="Wi-Fi Only"
              description="Only upload when connected to Wi-Fi."
            >
              <SettingToggle checked={wifiOnly} onChange={setWifiOnly} />
            </SettingRow>

            <SettingRow
              label="Include Screenshots"
              description="Auto-upload screenshots along with photos."
            >
              <SettingToggle
                checked={includeScreenshots}
                onChange={setIncludeScreenshots}
              />
            </SettingRow>
          </>
        )}
      </SettingSection>

      {/* Offline Access */}
      <SettingSection
        id="offline"
        icon={WifiOff}
        title="Offline Access"
        description="Make files available when you're not connected."
      >
        <SettingRow
          label="Auto-Offline Starred Files"
          description="Automatically download starred files for offline access."
        >
          <SettingToggle
            checked={offlineStarred}
            onChange={setOfflineStarred}
          />
        </SettingRow>

        <SettingRow
          label="Max Offline Cache"
          description="Maximum storage for offline files on this device."
        >
          <SettingSlider
            value={maxCache}
            onChange={setMaxCache}
            min={512}
            max={10240}
            step={512}
            suffix=" MB"
          />
        </SettingRow>
      </SettingSection>

      {/* Connected Devices */}
      <SettingSection
        id="devices"
        icon={Monitor}
        title="Connected Devices"
        description="Devices running the Drivya sync client."
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {MOCK_DEVICES.length} devices · Unlimited (Pro)
            </span>
          </div>
          <div className="space-y-2">
            {MOCK_DEVICES.map((device) => {
              const DeviceIcon = deviceIcons[device.type] || Monitor;
              return (
                <div
                  key={device.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    device.status === "active"
                      ? "border-primary/15 bg-primary/[0.02]"
                      : "border-border/60 bg-secondary/20"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      device.status === "active"
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border bg-secondary/50 text-muted-foreground"
                    }`}
                  >
                    <DeviceIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {device.name}
                      </span>
                      {device.status === "active" && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {device.os} · {device.storage} · {device.lastSync}
                    </div>
                  </div>
                  <button
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Unlink device"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </SettingSection>

      {/* Bandwidth */}
      <SettingSection
        id="bandwidth"
        icon={ArrowDownUp}
        title="Bandwidth Management"
        description="Throttle sync speeds to save network bandwidth."
      >
        <SettingRow label="Upload Speed Limit" description="0 = unlimited.">
          <SettingSlider
            value={uploadLimit}
            onChange={setUploadLimit}
            min={0}
            max={100000}
            step={1000}
            suffix=" KB/s"
          />
        </SettingRow>

        <SettingRow label="Download Speed Limit" description="0 = unlimited.">
          <SettingSlider
            value={downloadLimit}
            onChange={setDownloadLimit}
            min={0}
            max={100000}
            step={1000}
            suffix=" KB/s"
          />
        </SettingRow>
      </SettingSection>

      {/* Conflict Resolution */}
      <SettingSection
        id="conflict"
        icon={RefreshCw}
        title="Sync Conflict Resolution"
        description="What happens when the same file is edited in multiple places."
      >
        <SettingRow
          label="Resolution Strategy"
          description="Automatic behavior for sync conflicts."
        >
          <SettingSelect
            value={conflictResolution}
            onChange={setConflictResolution}
            options={[
              { value: "ask", label: "Always ask" },
              { value: "keep-both", label: "Keep both copies" },
              { value: "server", label: "Server wins" },
              { value: "local", label: "Local wins" },
              { value: "recent", label: "Most recent wins" },
            ]}
          />
        </SettingRow>
      </SettingSection>
    </div>
  );
}
