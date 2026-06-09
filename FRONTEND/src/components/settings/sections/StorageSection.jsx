import { useState } from "react";
import { HardDrive, Trash2, History, Copy, FileUp, Bell } from "lucide-react";
import {
  SettingSection,
  SettingRow,
  StorageMeter,
  SettingBanner,
} from "../setting-primitives";
import {
  SettingToggle,
  SettingSelect,
  SettingSlider,
} from "../setting-controls";

export default function StorageSection() {
  const [trashAutoEmpty, setTrashAutoEmpty] = useState("30d");
  const [versionRetention, setVersionRetention] = useState("all");
  const [duplicateDetection, setDuplicateDetection] = useState("warn");
  const [compressionPref, setCompressionPref] = useState("none");
  const [alertThreshold80, setAlertThreshold80] = useState(true);
  const [alertThreshold95, setAlertThreshold95] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <SettingSection
        id="storage-overview"
        icon={HardDrive}
        title="Storage Overview"
        description="Your current storage usage and plan limits."
      >
        <div className="px-6 py-5">
          <StorageMeter
            used={156}
            total={250}
            unit="GB"
            breakdown={[
              { label: "Images", value: 64 },
              { label: "Videos", value: 48 },
              { label: "Documents", value: 32 },
              { label: "Archives", value: 12 },
            ]}
          />
          <div className="mt-4 flex items-center gap-3">
            <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-opacity">
              Upgrade Storage
            </button>
            <span className="text-[11px] text-muted-foreground">
              Pro plan · 2 TB available with upgrade
            </span>
          </div>
        </div>

        <SettingRow
          label="Trash Usage"
          description="Files in trash count toward your storage quota."
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground tabular-nums">
              4.2 GB
            </span>
            <button className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
              Empty Trash
            </button>
          </div>
        </SettingRow>

        <SettingRow
          label="Version History Usage"
          description="Space used by file version history."
        >
          <span className="text-sm font-semibold text-foreground tabular-nums">
            8.6 GB
          </span>
        </SettingRow>
      </SettingSection>

      {/* Trash Settings */}
      <SettingSection
        id="trash-settings"
        icon={Trash2}
        title="Trash Behavior"
        description="Configure automatic cleanup of deleted files."
      >
        <SettingRow
          label="Auto-Empty Trash"
          description="Permanently delete trash items after this period."
        >
          <SettingSelect
            value={trashAutoEmpty}
            onChange={setTrashAutoEmpty}
            options={[
              { value: "7d", label: "7 days" },
              { value: "30d", label: "30 days" },
              { value: "60d", label: "60 days" },
              { value: "90d", label: "90 days" },
              { value: "never", label: "Never (manual only)" },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* Version History */}
      <SettingSection
        id="version-history"
        icon={History}
        title="Version History"
        description="Control how long previous versions of files are kept."
      >
        <SettingRow
          label="Retention Policy"
          description="How long to keep previous file versions."
        >
          <SettingSelect
            value={versionRetention}
            onChange={setVersionRetention}
            options={[
              { value: "all", label: "Keep all versions" },
              { value: "10", label: "Last 10 versions" },
              { value: "30d", label: "30 days" },
              { value: "60d", label: "60 days" },
              { value: "90d", label: "90 days" },
              { value: "365d", label: "1 year" },
              { value: "disabled", label: "Disabled" },
            ]}
          />
        </SettingRow>

        {versionRetention === "disabled" && (
          <div className="px-6 pb-4">
            <SettingBanner variant="warning" icon={History}>
              Disabling version history means you won't be able to recover
              previous versions of edited files. This saves storage but reduces
              your safety net.
            </SettingBanner>
          </div>
        )}
      </SettingSection>

      {/* Duplicate Detection */}
      <SettingSection
        id="duplicate-detection"
        icon={Copy}
        title="Duplicate Detection"
        description="Identify and manage duplicate files to optimize storage."
      >
        <SettingRow
          label="On Upload"
          description="What happens when you upload a file that already exists."
        >
          <SettingSelect
            value={duplicateDetection}
            onChange={setDuplicateDetection}
            options={[
              { value: "warn", label: "Warn before uploading" },
              { value: "skip", label: "Auto-skip duplicates" },
              { value: "keep", label: "Always keep both" },
              { value: "disabled", label: "Disabled" },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Scan Existing Files"
          description="Run a one-time scan to find duplicates across your drive."
        >
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors">
            <Copy className="h-3.5 w-3.5" />
            Scan Now
          </button>
        </SettingRow>
      </SettingSection>

      {/* Large File Handling */}
      <SettingSection
        id="large-files"
        icon={FileUp}
        title="Large File Handling"
        description="Configure behavior for large uploads."
      >
        <SettingRow
          label="Max File Size"
          description="Your plan's maximum single file upload size."
        >
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">50 GB</span>
            <span className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
              Pro
            </span>
          </span>
        </SettingRow>

        <SettingRow
          label="Auto-Compression"
          description="Compress files during upload to save storage."
        >
          <SettingSelect
            value={compressionPref}
            onChange={setCompressionPref}
            options={[
              { value: "none", label: "No compression" },
              { value: "images", label: "Auto-compress images" },
              { value: "all", label: "Compress all compressible" },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* Storage Alerts */}
      <SettingSection
        id="storage-alerts"
        icon={Bell}
        title="Storage Alerts"
        description="Get notified when your storage is running low."
      >
        <SettingRow
          label="Alert at 80%"
          description="Receive an early warning when storage reaches 80%."
        >
          <SettingToggle
            checked={alertThreshold80}
            onChange={setAlertThreshold80}
          />
        </SettingRow>

        <SettingRow
          label="Alert at 95%"
          description="Critical alert when storage is nearly full."
        >
          <SettingToggle
            checked={alertThreshold95}
            onChange={setAlertThreshold95}
          />
        </SettingRow>

        <SettingRow
          label="Weekly Storage Summary"
          description="Email summary of your storage usage and activity."
        >
          <SettingToggle checked={weeklySummary} onChange={setWeeklySummary} />
        </SettingRow>
      </SettingSection>
    </div>
  );
}
