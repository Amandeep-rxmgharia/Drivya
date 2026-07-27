import { useState, useEffect, useMemo, useCallback } from "react";
import { HardDrive, Trash2, FileUp, Bell, RefreshCw, AlertTriangle, Clock, ArrowUpDown } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  SettingSection,
  SettingRow,
  StorageMeter,
  SettingBanner,
} from "../setting-primitives";
import {
  SettingToggle,
  SettingSelect,
} from "../setting-controls";
import {
  getStorageOverview,
  getStoragePreferences,
  updateStoragePreferences,
} from "../../../../api/storage.js";
import { emptyTrash } from "../../../../api/drive.js";
import { formatBytes } from "@/lib/file-types";

// ─── Helpers ─────────────────────────────────────────────────────

/** Convert days number to select value */
function daysToSelectValue(days) {
  if (days === 5) return "5d";
  if (days === 7) return "7d";
  if (days === 15) return "15d";
  if (days === 30) return "30d";
  if (days === 45) return "45d";
  if (days === 60) return "60d";
  if (days === 90) return "90d";
  return "30d";
}

/** Convert select value to days number */
function selectValueToDays(val) {
  if (val === "5d") return 5;
  if (val === "7d") return 7;
  if (val === "15d") return 15;
  if (val === "30d") return 30;
  if (val === "45d") return 45;
  if (val === "60d") return 60;
  if (val === "90d") return 90;
  return 30;
}

/** Compute a human-friendly display of the next cron run (daily at 2:00 AM UTC). */
function getNextCleanupDisplay() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(2, 0, 0, 0);
  // If 2 AM UTC already passed today, schedule for tomorrow
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  const diffMs = next - now;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const timeStr = next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = next.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  if (diffHrs > 0) {
    return `${dateStr} at ${timeStr} (in ~${diffHrs}h ${diffMins}m)`;
  }
  return `${dateStr} at ${timeStr} (in ~${diffMins}m)`;
}

// ─── Loading Skeleton ────────────────────────────────────────────

function StorageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl glass shadow-elegant animate-pulse">
        <div className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-secondary/40" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-36 rounded bg-secondary/40" />
              <div className="h-3 w-56 rounded bg-secondary/30" />
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="h-5 w-24 rounded bg-secondary/40" />
          <div className="h-2 w-full rounded-full bg-secondary/30" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 rounded bg-secondary/20" />
            ))}
          </div>
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 rounded-2xl glass shadow-elegant animate-pulse bg-secondary/10" />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export default function StorageSection({ userProfile, setUserProfile }) {
  // ── Overview data (from API) ──
  const [overview, setOverview] = useState(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState(null);

  // ── Preferences (from API) ──
  const [trashAutoEmpty, setTrashAutoEmpty] = useState("30d");
  const [alertThreshold80, setAlertThreshold80] = useState(true);
  const [alertThreshold95, setAlertThreshold95] = useState(true);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [saveError, setSaveError] = useState(null);
  const [savePending, setSavePending] = useState(false);

  // ── Plan-based trash day limit ──
  const [maxTrashDays, setMaxTrashDays] = useState(90);

  // ── Local-only settings (no backend) ──
  const [compressionPref, setCompressionPref] = useState("none");

  // ── Empty trash state ──
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // ── Fetch overview data ──
  const fetchOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    setOverviewError(null);
    try {
      const data = await getStorageOverview();
      setOverview(data);
    } catch (err) {
      setOverviewError(
        err.response?.data?.message || "Failed to load storage overview."
      );
    } finally {
      setIsLoadingOverview(false);
    }
  }, []);

  // ── Fetch preferences ──
  const fetchPreferences = useCallback(async () => {
    setIsLoadingPrefs(true);
    setSaveError(null);
    try {
      const res = await getStoragePreferences();
      const prefs = res?.preferences;
      if (prefs) {
        setTrashAutoEmpty(daysToSelectValue(prefs.trashAutoEmptyDays));
        setAlertThreshold80(prefs.alertAt80 !== false);
        setAlertThreshold95(prefs.alertAt95 !== false);
      }
      if (res?.maxTrashDays) {
        setMaxTrashDays(res.maxTrashDays);
      }
    } catch (err) {
      setSaveError(
        err.response?.data?.message || "Failed to load storage preferences."
      );
    } finally {
      setIsLoadingPrefs(false);
    }
  }, []);

  // ── Initial load ──
  useEffect(() => {
    fetchOverview();
    fetchPreferences();
  }, [fetchOverview, fetchPreferences]);

  // ── Debounced auto-save preferences (mirrors SharingSection pattern) ──
  const prefsPayload = useMemo(
    () => ({
      trashAutoEmptyDays: selectValueToDays(trashAutoEmpty),
      alertAt80: alertThreshold80,
      alertAt95: alertThreshold95,
    }),
    [trashAutoEmpty, alertThreshold80, alertThreshold95]
  );

  useEffect(() => {
    if (isLoadingPrefs) return;

    const t = setTimeout(async () => {
      setSavePending(true);
      setSaveError(null);
      try {
        await updateStoragePreferences(prefsPayload);
      } catch (err) {
        setSaveError(
          err.response?.data?.message || "Failed to save storage preferences."
        );
      } finally {
        setSavePending(false);
      }
    }, 450);

    return () => clearTimeout(t);
  }, [prefsPayload, isLoadingPrefs]);

  // ── Compute display values from overview ──
  const storageUsed = overview?.storageUsed ?? userProfile?.storageUsed ?? 0;
  const storageLimit = overview?.storageLimit ?? userProfile?.storageLimit ?? 1024 * 1024 * 1024;

  // Breakdown for the meter
  const breakdown = (overview?.breakdown || []).map((cat) => ({
    label: cat.label,
    value: cat.value,
  }));

  // Trash display
  const trashSize = overview?.trash?.totalSize ?? 0;
  const trashCount = overview?.trash?.count ?? 0;

  // ── Bandwidth display values ──
  const bandwidthUsed = overview?.bandwidthUsed ?? 0;
  const bandwidthLimit = overview?.bandwidthLimit ?? 10 * 1024 * 1024 * 1024;
  const bandwidthPct = bandwidthLimit > 0 ? Math.min(100, (bandwidthUsed / bandwidthLimit) * 100) : 0;

  // ── Trash day options filtered by plan ──
  const trashDayOptions = useMemo(() => {
    const allOptions = [
      { value: "5d", label: "5 days", days: 5 },
      { value: "7d", label: "7 days", days: 7 },
      { value: "15d", label: "15 days", days: 15 },
      { value: "30d", label: "30 days", days: 30 },
      { value: "45d", label: "45 days", days: 45 },
      { value: "60d", label: "60 days", days: 60 },
      { value: "90d", label: "90 days", days: 90 },
    ];
    const allowed = allOptions.filter((opt) => opt.days <= maxTrashDays);
    return allowed;
  }, [maxTrashDays]);

  // ── Empty Trash handler ──
  const handleEmptyTrash = useCallback(() => {
    setConfirmAction({
      title: "Empty trash?",
      description: `All ${trashCount} item${trashCount !== 1 ? "s" : ""} (${formatBytes(trashSize)}) in your trash will be permanently deleted. This action cannot be undone.`,
      confirmLabel: "Empty trash",
      onConfirm: async () => {
        setIsEmptyingTrash(true);
        try {
          await emptyTrash();
          // Refresh overview to reflect updated storage
          await fetchOverview();
          // Update the userProfile's storageUsed if possible
          if (setUserProfile && trashSize) {
            setUserProfile((prev) => ({
              ...prev,
              storageUsed: Math.max(0, (prev.storageUsed || 0) - trashSize),
            }));
          }
          setConfirmAction(null);
        } catch (err) {
          setConfirmAction(null);
          setOverviewError(
            err.response?.data?.message || "Failed to empty trash."
          );
        } finally {
          setIsEmptyingTrash(false);
        }
      },
    });
  }, [trashCount, trashSize, fetchOverview, setUserProfile]);

  // ── Loading state ──
  if (isLoadingOverview && isLoadingPrefs) {
    return <StorageSkeleton />;
  }

  return (
    <>
      {/* Error banners */}
      {overviewError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{overviewError}</span>
          <button
            onClick={() => { setOverviewError(null); fetchOverview(); }}
            className="text-xs font-semibold hover:underline"
          >
            Retry
          </button>
        </div>
      )}
      {saveError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {saveError}
        </div>
      )}

      <div className="space-y-6">
        {/* ═══ Storage Overview ═══ */}
        <SettingSection
          id="storage-overview"
          icon={HardDrive}
          title="Storage Overview"
          description="Your current storage usage and plan limits."
        >
          <div className="px-6 py-5">
            {isLoadingOverview && !overview ? (
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-24 rounded bg-secondary/40" />
                <div className="h-2 w-full rounded-full bg-secondary/30" />
              </div>
            ) : (
              <>
                 <StorageMeter
                  used={storageUsed}
                  total={storageLimit}
                  breakdown={breakdown}
                />
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => window.location.href = "/dashboard/payment"}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
                  >
                    Upgrade Storage
                  </button>
                  <button
                    onClick={fetchOverview}
                    disabled={isLoadingOverview}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/30 px-3 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingOverview ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
              </>
            )}
          </div>

          <SettingRow
            label="Trash Usage"
            description="Files in trash count toward your storage quota."
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {formatBytes(trashSize)}
              </span>
              {trashCount > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  ({trashCount} {trashCount === 1 ? "file" : "files"})
                </span>
              )}
              {trashSize > 0 && (
                <button
                  onClick={handleEmptyTrash}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  Empty Trash
                </button>
              )}
            </div>
          </SettingRow>
          <SettingRow
            label="Max File Size"
            description="Your plan's maximum single file upload size."
          >
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {overview?.maxUpload != null ? formatBytes(overview.maxUpload) : "Unlimited"}
              </span>
              <span className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                {overview?.planName || "Starter"}
              </span>
            </span>
          </SettingRow>

          {/* Bandwidth Usage */}
          <SettingRow
            label="Bandwidth Usage"
            description="Monthly data transfer used for downloads and previews."
          >
            <div className="w-full max-w-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground tabular-nums">
                  {formatBytes(bandwidthUsed)}
                </span>
                <span className="text-muted-foreground">
                  of {formatBytes(bandwidthLimit)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary/30 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    bandwidthPct >= 90
                      ? "bg-destructive"
                      : bandwidthPct >= 70
                        ? "bg-amber-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${bandwidthPct}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                Resets each billing cycle
              </div>
            </div>
          </SettingRow>
        </SettingSection>

        {/* ═══ Trash Settings ═══ */}
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
              options={trashDayOptions}
            />
          </SettingRow>

          <SettingRow
            label="Next Scheduled Cleanup"
            description="Expired trash files are automatically deleted on a daily schedule."
          >
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium text-foreground tabular-nums">
                {getNextCleanupDisplay()}
              </span>
            </div>
          </SettingRow>

          <SettingRow>
            <SettingBanner variant="info" icon={Trash2}>
              Files in trash will be permanently deleted after{" "}
              {{
                "5d": "5 days",
                "7d": "7 days",
                "15d": "15 days",
                "30d": "30 days",
                "45d": "45 days",
                "60d": "60 days",
                "90d": "90 days",
              }[trashAutoEmpty] || "30 days"}
              . This cannot be undone.
            </SettingBanner>
          </SettingRow>
        </SettingSection>

        {/* ═══ Storage Alerts ═══ */}
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
        </SettingSection>

        {/* Subtle saving indicator */}
        {savePending && (
          <div className="text-[11px] text-muted-foreground mt-2">
            Saving…
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            description={confirmAction.description}
            confirmLabel={confirmAction.confirmLabel}
            onConfirm={confirmAction.onConfirm}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
