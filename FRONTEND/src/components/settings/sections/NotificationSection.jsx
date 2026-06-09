import { useState } from "react";
import {
  Bell,
  Mail,
  Smartphone,
  Monitor,
  Moon,
  Clock,
  MessageSquare,
} from "lucide-react";
import { SettingSection, SettingRow } from "../setting-primitives";
import { SettingToggle, SettingSelect } from "../setting-controls";

const CATEGORIES = [
  {
    id: "sharing",
    label: "Sharing Activity",
    description: "New shares, access requests, link views",
    defaultEmail: true,
    defaultPush: false,
  },
  {
    id: "storage",
    label: "Storage Alerts",
    description: "Quota warnings, cleanup suggestions",
    defaultEmail: true,
    defaultPush: true,
  },
  {
    id: "security",
    label: "Security Events",
    description: "New logins, 2FA changes, suspicious activity",
    defaultEmail: true,
    defaultPush: true,
    locked: true,
  },
  {
    id: "collaboration",
    label: "Collaboration",
    description: "Comments, edits by others, mentions",
    defaultEmail: false,
    defaultPush: false,
  },
  {
    id: "system",
    label: "System Updates",
    description: "Maintenance windows, new features",
    defaultEmail: true,
    defaultPush: false,
  },
  {
    id: "billing",
    label: "Billing",
    description: "Payment confirmations, renewal reminders",
    defaultEmail: true,
    defaultPush: false,
  },
  {
    id: "sync",
    label: "Sync Status",
    description: "Sync errors, conflicts, completion",
    defaultEmail: false,
    defaultPush: false,
  },
];

export default function NotificationSection() {
  const [inApp, setInApp] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [desktopEnabled, setDesktopEnabled] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState("realtime");
  const [quietHours, setQuietHours] = useState(false);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");

  const [categoryPrefs, setCategoryPrefs] = useState(() => {
    const prefs = {};
    CATEGORIES.forEach((cat) => {
      prefs[cat.id] = {
        email: cat.defaultEmail,
        push: cat.defaultPush,
        inApp: true,
      };
    });
    return prefs;
  });

  const toggleCategoryChannel = (catId, channel) => {
    setCategoryPrefs((prev) => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        [channel]: !prev[catId][channel],
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Channels */}
      <SettingSection
        id="notification-channels"
        icon={Bell}
        title="Notification Channels"
        description="Choose how you receive notifications."
      >
        <SettingRow
          label="In-App Notifications"
          description="Bell icon notifications in the dashboard."
          badge={
            <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
              Always on
            </span>
          }
        >
          <SettingToggle checked={inApp} onChange={() => {}} disabled />
        </SettingRow>

        <SettingRow
          label="Email Notifications"
          description="Receive notifications via email."
        >
          <SettingToggle checked={emailEnabled} onChange={setEmailEnabled} />
        </SettingRow>

        <SettingRow
          label="Browser Push"
          description="Desktop push notifications from your browser."
        >
          <SettingToggle checked={pushEnabled} onChange={setPushEnabled} />
        </SettingRow>

        <SettingRow
          label="Desktop App"
          description="Native notifications from the Drivya desktop app."
        >
          <SettingToggle
            checked={desktopEnabled}
            onChange={setDesktopEnabled}
          />
        </SettingRow>
      </SettingSection>

      {/* Categories */}
      <SettingSection
        id="notification-categories"
        icon={MessageSquare}
        title="Notification Categories"
        description="Fine-grained control over what triggers notifications."
      >
        <div className="px-6 py-3">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_3.5rem_3.5rem_3.5rem] gap-2 mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
            <span>Category</span>
            <span className="text-center">App</span>
            <span className="text-center">Email</span>
            <span className="text-center">Push</span>
          </div>

          <div className="space-y-1">
            {CATEGORIES.map((cat) => {
              const prefs = categoryPrefs[cat.id];
              return (
                <div
                  key={cat.id}
                  className="grid grid-cols-[1fr_3.5rem_3.5rem_3.5rem] gap-2 items-center rounded-lg px-1 py-2 hover:bg-secondary/20 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {cat.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {cat.description}
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <SettingToggle
                      size="sm"
                      checked={prefs.inApp}
                      onChange={() =>
                        !cat.locked && toggleCategoryChannel(cat.id, "inApp")
                      }
                      disabled={cat.locked}
                    />
                  </div>
                  <div className="flex justify-center">
                    <SettingToggle
                      size="sm"
                      checked={prefs.email}
                      onChange={() => toggleCategoryChannel(cat.id, "email")}
                    />
                  </div>
                  <div className="flex justify-center">
                    <SettingToggle
                      size="sm"
                      checked={prefs.push}
                      onChange={() => toggleCategoryChannel(cat.id, "push")}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SettingSection>

      {/* Email Digest */}
      <SettingSection
        id="digest"
        icon={Mail}
        title="Email Digest"
        description="Aggregate notifications into periodic summaries."
      >
        <SettingRow
          label="Digest Frequency"
          description="How often to receive email summaries."
        >
          <SettingSelect
            value={digestFrequency}
            onChange={setDigestFrequency}
            options={[
              { value: "realtime", label: "Real-time (individual)" },
              { value: "hourly", label: "Hourly digest" },
              { value: "daily", label: "Daily digest" },
              { value: "weekly", label: "Weekly digest" },
              { value: "disabled", label: "Disabled" },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* Quiet Hours */}
      <SettingSection
        id="quiet-hours"
        icon={Moon}
        title="Quiet Hours"
        description="Suppress non-critical notifications during specific times."
      >
        <SettingRow
          label="Enable Quiet Hours"
          description="Mute notifications during your rest hours."
        >
          <SettingToggle checked={quietHours} onChange={setQuietHours} />
        </SettingRow>

        {quietHours && (
          <>
            <SettingRow label="Start Time">
              <SettingSelect
                value={quietStart}
                onChange={setQuietStart}
                options={[
                  { value: "20:00", label: "8:00 PM" },
                  { value: "21:00", label: "9:00 PM" },
                  { value: "22:00", label: "10:00 PM" },
                  { value: "23:00", label: "11:00 PM" },
                  { value: "00:00", label: "12:00 AM" },
                ]}
              />
            </SettingRow>
            <SettingRow label="End Time">
              <SettingSelect
                value={quietEnd}
                onChange={setQuietEnd}
                options={[
                  { value: "05:00", label: "5:00 AM" },
                  { value: "06:00", label: "6:00 AM" },
                  { value: "07:00", label: "7:00 AM" },
                  { value: "08:00", label: "8:00 AM" },
                  { value: "09:00", label: "9:00 AM" },
                ]}
              />
            </SettingRow>
          </>
        )}
      </SettingSection>
    </div>
  );
}
