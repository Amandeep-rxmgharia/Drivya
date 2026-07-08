import { lazy, Suspense, useState, useMemo, useEffect } from "react";
import { formatBytes } from "@/lib/file-types";
import { getActiveSessions } from "../../api/account.js";
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
const StorageSection = lazy(
  () => import("@/components/settings/sections/StorageSection"),
);
const SharingSection = lazy(
  () => import("@/components/settings/sections/SharingSection"),
);
const AppearanceSection = lazy(
  () => import("@/components/settings/sections/AppearanceSection"),
);
const BillingSection = lazy(
  () => import("@/components/settings/sections/BillingSection"),
);
const LabsSection = lazy(
  () => import("@/components/settings/sections/LabsSection"),
);

const SECTION_COMPONENTS = {
  account: AccountSection,
  security: SecuritySection,
  storage: StorageSection,
  sharing: SharingSection,
  appearance: AppearanceSection,
  billing: BillingSection,
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

  const [sessionsCount, setSessionsCount] = useState(null);

  useEffect(() => {
    let active = true;
    async function fetchSessions() {
      try {
        const data = await getActiveSessions();
        if (active && data?.sessions) {
          setSessionsCount(data.sessions.length);
        }
      } catch (err) {
        console.error("Failed to fetch sessions for settings quick stats:", err);
      }
    }
    fetchSessions();
    return () => {
      active = false;
    };
  }, []);

  const storageStat = userProfile
    ? `${formatBytes(userProfile.storageUsed || 0)} / ${formatBytes(userProfile.storageLimit || 1024 * 1024 * 1024)}`
    : "0 B / 1 GB";

  const devicesStat = sessionsCount !== null 
    ? sessionsCount 
    : "Loading...";

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
        <div className="flex items-center gap-10 flex-wrap">
          {[
            { label: "Plan", value: currentTier },
            { label: "Storage", value: storageStat },
            sessionsCount ? { label: "Devices", value: devicesStat } : {},
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
