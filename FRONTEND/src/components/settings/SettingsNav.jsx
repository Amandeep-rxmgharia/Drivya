import { memo, useRef, useEffect, Fragment } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  Beaker,
  Bell,
  Code2,
  CreditCard,
  Eye,
  Folder,
  HardDrive,
  Palette,
  RefreshCw,
  Share2,
  Shield,
  ShieldCheck,
  Smartphone,
  User,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const SETTINGS_SECTIONS = [
  {
    id: "account",
    label: "Account & Profile",
    icon: User,
    group: "General",
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    group: "General",
  },
  {
    id: "privacy",
    label: "Privacy & Data",
    icon: Eye,
    group: "General",
  },
  {
    id: "storage",
    label: "Storage",
    icon: HardDrive,
    group: "Data",
  },
  {
    id: "files",
    label: "File Behavior",
    icon: Folder,
    group: "Data",
  },
  {
    id: "sharing",
    label: "Sharing Defaults",
    icon: Share2,
    group: "Data",
  },
  {
    id: "sync",
    label: "Sync & Devices",
    icon: Smartphone,
    group: "Data",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    group: "Preferences",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    group: "Preferences",
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Zap,
    group: "Platform",
  },
  {
    id: "developer",
    label: "Developer",
    icon: Code2,
    group: "Platform",
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    group: "Platform",
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: Shield,
    group: "Enterprise",
    tier: "Team",
  },
  {
    id: "recovery",
    label: "Recovery",
    icon: RefreshCw,
    group: "Enterprise",
  },
  {
    id: "labs",
    label: "Labs",
    icon: Beaker,
    group: "Enterprise",
    badge: "Beta",
  },
];

const GROUPS = ["General", "Data", "Preferences", "Platform", "Enterprise"];

const SettingsNav = memo(function SettingsNav({ className }) {
  const { section } = useParams();
  const active = section || "account";

  return (
    <nav
      className={cn(
        "hidden lg:flex flex-col w-56 shrink-0 sticky top-0 h-fit max-h-[calc(100vh-10rem)] overflow-y-auto pr-2 space-y-5 py-1",
        className,
      )}
      aria-label="Settings navigation"
    >
      {GROUPS.map((group) => {
        const items = SETTINGS_SECTIONS.filter((s) => s.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
              {group}
            </div>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <Link
                      to={`/dashboard/settings/${item.id}`}
                      className={cn(
                        "group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200",
                        isActive
                          ? "bg-secondary/80 text-foreground border border-border/60 shadow-sm"
                          : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="settings-nav-indicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-gradient-primary shadow-glow"
                          transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                          }}
                        />
                      )}
                      <item.icon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-colors",
                          isActive ? "text-primary" : "",
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                          {item.badge}
                        </span>
                      )}
                      {item.tier && (
                        <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                          {item.tier}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
});

/* ═══════════════════════ Mobile Section Picker ═══════════════════════ */

export function SettingsMobilePicker() {
  const { section } = useParams();
  const active = section || "account";
  const scrollRef = useRef(null);

  /* auto-scroll the active tab into view on mount / section change */
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector(
      `[data-section="${active}"]`,
    );
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [active]);

  return (
    <div className="lg:hidden mb-6">
      {/* Glass container with gradient fade edges */}
      <div className="relative glass rounded-2xl p-1.5">
        {/* Left fade */}
        <div
          className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-8 z-10 rounded-l-xl"
          style={{
            background:
              "linear-gradient(to right, var(--glass-bg), transparent)",
          }}
        />
        {/* Right fade */}
        <div
          className="pointer-events-none absolute right-1.5 top-1.5 bottom-1.5 w-8 z-10 rounded-r-xl"
          style={{
            background:
              "linear-gradient(to left, var(--glass-bg), transparent)",
          }}
        />

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 overflow-x-auto px-1.5 py-0.5 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {GROUPS.map((group, gi) => {
            const items = SETTINGS_SECTIONS.filter((s) => s.group === group);
            if (items.length === 0) return null;
            return (
              <Fragment key={group}>
                {/* Group divider (skip first) */}
                {gi > 0 && (
                  <div className="flex items-center shrink-0 px-1">
                    <div className="h-5 w-px bg-border/50 rounded-full" />
                  </div>
                )}

                {items.map((item) => {
                  const isActive = active === item.id;
                  return (
                    <Link
                      key={item.id}
                      to={`/dashboard/settings/${item.id}`}
                      data-section={item.id}
                      className={cn(
                        "group relative flex items-center gap-1.5 shrink-0 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground active:scale-[0.97]",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-colors",
                          isActive
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "rounded px-1 py-px text-[8px] font-bold uppercase tracking-wider",
                            isActive
                              ? "bg-white/20 text-primary-foreground"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.tier && (
                        <span
                          className={cn(
                            "rounded px-1 py-px text-[8px] font-bold uppercase tracking-wider",
                            isActive
                              ? "bg-white/20 text-primary-foreground"
                              : "bg-accent/10 text-accent",
                          )}
                        >
                          {item.tier}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SettingsNav;
