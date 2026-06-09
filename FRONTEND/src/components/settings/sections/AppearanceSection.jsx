import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Type,
  Maximize,
  Minimize,
  Accessibility,
  Keyboard,
  Sparkles,
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
  SettingSegmented,
} from "../setting-controls";

const ACCENT_COLORS = [
  { value: "default", label: "Drivya Blue", color: "oklch(0.48 0.17 255)" },
  { value: "ocean", label: "Ocean Teal", color: "oklch(0.55 0.14 195)" },
  { value: "sunset", label: "Sunset", color: "oklch(0.6 0.18 45)" },
  { value: "forest", label: "Forest", color: "oklch(0.5 0.15 150)" },
  { value: "rose", label: "Rose", color: "oklch(0.55 0.2 350)" },
  { value: "slate", label: "Slate", color: "oklch(0.5 0.02 265)" },
];

export default function AppearanceSection() {
  const { mode: theme, setMode: setTheme, accentColor, setAccentColor } = useTheme();
  const [density, setDensity] = useState("comfortable");
  const [fontSize, setFontSize] = useState("default");
  const [reducedMotion, setReducedMotion] = useState("default");
  const [screenReader, setScreenReader] = useState(false);
  const [shortcuts, setShortcuts] = useState(() => {
    return localStorage.getItem("drivya-shortcuts") !== "false";
  });

  const handleShortcutsChange = (val) => {
    setShortcuts(val);
    localStorage.setItem("drivya-shortcuts", val ? "true" : "false");
    window.dispatchEvent(new Event("storage"));
  };

  const isMac = typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform || "");
  const modKey = isMac ? "⌘" : "Ctrl";
  const shiftKey = isMac ? "⇧" : "Shift";

  return (
    <div className="space-y-6">
      {/* Theme */}
      <SettingSection
        id="theme"
        icon={Palette}
        title="Theme"
        description="Control the visual appearance of Drivya."
      >
        <SettingRow
          label="Color Mode"
          description="Choose between light, dark, or follow your system preference."
          vertical
        >
          <div className="grid grid-cols-3 gap-3 max-w-sm">
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ].map((opt) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 bg-secondary/20 hover:border-border hover:bg-secondary/30"
                  }`}
                >
                  <opt.icon
                    className={`h-5 w-5 transition-colors ${
                      isSelected ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </SettingRow>

        {/* Accent Color */}
        <SettingRow
          label="Accent Color"
          description="Customize the primary color across the interface."
          vertical
        >
          <div className="flex flex-wrap gap-2">
            {ACCENT_COLORS.map((c) => {
              const isSelected = accentColor === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAccentColor(c.value)}
                  title={c.label}
                  className={`group relative flex items-center gap-2 rounded-xl border px-3 py-2 transition-all duration-200 ${
                    isSelected
                      ? "border-primary/30 bg-primary/5 shadow-sm"
                      : "border-border/60 bg-secondary/20 hover:border-border hover:bg-secondary/30"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full ring-1 ring-black/10 dark:ring-white/10 shadow-sm"
                    style={{ backgroundColor: c.color }}
                  />
                  <span
                    className={`text-xs font-medium ${
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {c.label}
                  </span>
                  {isSelected && <Sparkles className="h-3 w-3 text-primary" />}
                </button>
              );
            })}
          </div>
        </SettingRow>
      </SettingSection>

      {/* Layout */}
      <SettingSection
        id="layout"
        icon={Maximize}
        title="Layout & Density"
        description="Adjust spacing and sizing of UI elements."
      >
        <SettingRow
          label="Content Density"
          description="Compact shows 40% more content, Spacious increases touch targets."
        >
          <SettingSegmented
            value={density}
            onChange={setDensity}
            options={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
              { value: "spacious", label: "Spacious" },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Font Size"
          description="Scale the base text size across the application."
        >
          <SettingSelect
            value={fontSize}
            onChange={setFontSize}
            options={[
              { value: "small", label: "Small (13px)" },
              { value: "default", label: "Default (14px)" },
              { value: "medium", label: "Medium (15px)" },
              { value: "large", label: "Large (16px)" },
              { value: "xl", label: "Extra Large (18px)" },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* Accessibility */}
      <SettingSection
        id="accessibility"
        icon={Accessibility}
        title="Accessibility"
        description="Make Drivya work better for everyone."
      >
        <SettingRow
          label="Motion Preferences"
          description="Reduce or disable animations for motion sensitivity."
          vertical
        >
          <SettingRadioGroup
            value={reducedMotion}
            onChange={setReducedMotion}
            options={[
              {
                value: "default",
                label: "Default",
                description: "All animations and transitions enabled.",
              },
              {
                value: "reduced",
                label: "Reduced Motion",
                description:
                  "Essential transitions only, shortened duration. Removes hover effects and parallax.",
              },
              {
                value: "off",
                label: "No Motion",
                description: "All animations disabled. Instant transitions.",
              },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Screen Reader Optimization"
          description="Enhanced ARIA labels, landmarks, live regions, and skip-navigation links."
        >
          <SettingToggle checked={screenReader} onChange={setScreenReader} />
        </SettingRow>
      </SettingSection>

      {/* Keyboard Shortcuts */}
      <SettingSection
        id="shortcuts"
        icon={Keyboard}
        title="Keyboard Shortcuts"
        description="Speed up your workflow with keyboard shortcuts."
      >
        <SettingRow
          label="Enable Shortcuts"
          description="Global keyboard shortcuts for common actions."
        >
          <SettingToggle checked={shortcuts} onChange={handleShortcutsChange} />
        </SettingRow>

        {shortcuts && (
          <div className="px-6 pb-4">
            <div className="rounded-xl border border-border/60 bg-secondary/20 divide-y divide-border/40">
              {[
                { keys: [modKey, "K"], action: "Search" },
                { keys: [modKey, "U"], action: "Upload" },
                { keys: [modKey, "N"], action: "New Folder" },
                { keys: [modKey, shiftKey, "S"], action: "Settings" },
                { keys: [modKey, "D"], action: "Download" },
                { keys: [modKey, shiftKey, "C"], action: "Copy Link" },
                { keys: ["Del"], action: "Move to Trash" },
                { keys: [modKey, "/"], action: "Shortcut Help" },
              ].map((s) => (
                <div
                  key={s.action}
                  className="flex items-center justify-between px-3.5 py-2.5"
                >
                  <span className="text-xs text-foreground/80">{s.action}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        className="inline-flex items-center justify-center min-w-[22px] rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SettingSection>
    </div>
  );
}
