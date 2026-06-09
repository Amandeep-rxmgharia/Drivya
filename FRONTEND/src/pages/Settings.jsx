import { lazy, Suspense, useState, useMemo } from "react";
import { useParams, Navigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Settings as SettingsIcon, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { easeSmooth } from "@/lib/motion-presets";
import SettingsNav, {
  SETTINGS_SECTIONS,
  SettingsMobilePicker,
} from "@/components/settings/SettingsNav";
import {
  card,
  subtleHover,
  chip,
} from "@/components/dashboard/dashboard-tokens";

/* ─── Lazy section imports ─── */
const AccountSection = lazy(
  () => import("@/components/settings/sections/AccountSection"),
);
const SecuritySection = lazy(
  () => import("@/components/settings/sections/SecuritySection"),
);
const PrivacySection = lazy(
  () => import("@/components/settings/sections/PrivacySection"),
);
const StorageSection = lazy(
  () => import("@/components/settings/sections/StorageSection"),
);
const FileSection = lazy(
  () => import("@/components/settings/sections/FileSection"),
);
const SharingSection = lazy(
  () => import("@/components/settings/sections/SharingSection"),
);
const SyncSection = lazy(
  () => import("@/components/settings/sections/SyncSection"),
);
const NotificationSection = lazy(
  () => import("@/components/settings/sections/NotificationSection"),
);
const AppearanceSection = lazy(
  () => import("@/components/settings/sections/AppearanceSection"),
);
const IntegrationSection = lazy(
  () => import("@/components/settings/sections/IntegrationSection"),
);
const DeveloperSection = lazy(
  () => import("@/components/settings/sections/DeveloperSection"),
);
const BillingSection = lazy(
  () => import("@/components/settings/sections/BillingSection"),
);
const ComplianceSection = lazy(
  () => import("@/components/settings/sections/ComplianceSection"),
);
const RecoverySection = lazy(
  () => import("@/components/settings/sections/RecoverySection"),
);
const LabsSection = lazy(
  () => import("@/components/settings/sections/LabsSection"),
);

const SECTION_COMPONENTS = {
  account: AccountSection,
  security: SecuritySection,
  privacy: PrivacySection,
  storage: StorageSection,
  files: FileSection,
  sharing: SharingSection,
  sync: SyncSection,
  notifications: NotificationSection,
  appearance: AppearanceSection,
  integrations: IntegrationSection,
  developer: DeveloperSection,
  billing: BillingSection,
  compliance: ComplianceSection,
  recovery: RecoverySection,
  labs: LabsSection,
};

/* ═══════════════════════ Settings Hero ═══════════════════════ */

function SettingsHero({ activeSection, userProfile }) {
  const sectionMeta = SETTINGS_SECTIONS.find((s) => s.id === activeSection);
  const currentTier = userProfile?.tier || "Free";
  const planInfo = currentTier === "Team" 
    ? "Team Plan · All enterprise settings available" 
    : currentTier === "Pro" 
    ? "Pro Plan · All features available" 
    : "Free Plan · Upgrade to unlock Pro features";

  const storageStat = currentTier === "Team"
    ? "156 GB / 5 TB"
    : currentTier === "Pro"
    ? "156 / 2000 GB"
    : "8.4 / 10 GB";

  const devicesStat = currentTier === "Team"
    ? "Unlimited"
    : currentTier === "Pro"
    ? "Unlimited"
    : "2";

  return (
    <section
      className={`${card} ${subtleHover} relative overflow-hidden p-6 md:p-8 animate-fade-in`}
    >
      {/* ambient glow */}
      <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-ambient-primary blur-3xl opacity-80 pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-ambient-primary blur-3xl opacity-50 pointer-events-none" />

      <div className="relative flex flex-col  gap-6">
        <div>
          <div className={chip}>
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
            {planInfo}
          </div>
          <h1 className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-foreground">
            <span className="text-gradient">Settings</span>
          </h1>
          <p className="mt-2 text-muted-foreground leading-relaxed max-w-lg text-sm">
            Manage your account, security, privacy, and every aspect of your
            Drivya experience.
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: "Plan", value: currentTier },
            { label: "Storage", value: storageStat },
            { label: "Devices", value: devicesStat },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/60 bg-secondary/30 px-4 py-2.5 text-center min-w-[80px]"
            >
              <div className="font-display text-sm font-semibold text-foreground">
                {stat.value}
              </div>
              <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ Loading Skeleton ═══════════════════════ */

function SectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-14 rounded-xl bg-secondary/30" />
      <div className="h-48 rounded-2xl bg-secondary/20" />
      <div className="h-36 rounded-2xl bg-secondary/20" />
    </div>
  );
}

/* ═══════════════════════ Settings Page ═══════════════════════ */

export default function Settings() {
  const { section } = useParams();
  const activeSection = section || "account";
  const [searchQuery, setSearchQuery] = useState("");
  const { userProfile, setUserProfile } = useOutletContext();

  // Validate section ID
  const isValid = SETTINGS_SECTIONS.some((s) => s.id === activeSection);
  if (!isValid) {
    return <Navigate to="/dashboard/settings/account" replace />;
  }

  const ActiveComponent = SECTION_COMPONENTS[activeSection];
  const sectionMeta = SETTINGS_SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <SettingsHero activeSection={activeSection} userProfile={userProfile} />

      {/* Mobile section picker */}
      <SettingsMobilePicker />

      {/* Main layout: nav + content */}
      <div className="flex gap-6">
        {/* Left nav (desktop) */}
        <SettingsNav />

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {/* Section breadcrumb */}
          <div className="flex items-center gap-2 mb-5 px-1">
            <span className="text-xs font-medium text-muted-foreground">
              Settings
            </span>
            <span className="text-xs text-muted-foreground/50">/</span>
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              {sectionMeta && (
                <sectionMeta.icon className="h-3.5 w-3.5 text-primary" />
              )}
              {sectionMeta?.label}
            </span>
          </div>

          {/* Section content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Suspense fallback={<SectionSkeleton />}>
                {ActiveComponent && (
                  <ActiveComponent
                    userProfile={userProfile}
                    setUserProfile={setUserProfile}
                  />
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
