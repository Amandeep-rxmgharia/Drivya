import { memo, useRef, useEffect, Fragment, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  Beaker,
  Bell,
  ChevronDown,
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
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
  },
  {
    id: "storage",
    label: "Storage",
    icon: HardDrive,
  },
  {
    id: "sharing",
    label: "Sharing Defaults",
    icon: Share2,
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
  },
  {
    id: "labs",
    label: "Labs",
    icon: Beaker,
    badge: "Beta",
  },
];

const SettingsNav = memo(function SettingsNav({ className }) {
  const { section } = useParams();
  const active = section || "account";

  return (
    <nav
      className={cn(
        "hidden lg:flex flex-col w-56 shrink-0 sticky top-0 h-fit max-h-[calc(100vh-10rem)] overflow-y-auto pr-2 py-1",
        className,
      )}
      aria-label="Settings navigation"
    >
      <ul className="space-y-0.5">
        {SETTINGS_SECTIONS.map((item) => {
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
    </nav>
  );
});

/* ═══════════════════════ Mobile Section Picker ═══════════════════════ */

export function SettingsMobilePicker() {
  const { section } = useParams();
  const active = section || "account";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen]);

  const activeSection = SETTINGS_SECTIONS.find((s) => s.id === active) || SETTINGS_SECTIONS[0];
  const ActiveIcon = activeSection.icon;

  return (
    <div className="lg:hidden mb-6" ref={dropdownRef}>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="inline-flex h-10 items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
          aria-expanded={dropdownOpen}
        >
          <div className="flex items-center gap-2">
            <ActiveIcon className="h-4 w-4 text-primary" />
            <span>{activeSection.label}</span>
            {activeSection.badge && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary">
                {activeSection.badge}
              </span>
            )}
            {activeSection.tier && (
              <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-accent">
                {activeSection.tier}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform text-muted-foreground",
              dropdownOpen && "rotate-180"
            )}
          />
        </button>
        {dropdownOpen && (
          <div className="absolute left-0 z-30 mt-2 min-w-[200px] max-h-[300px] overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-elegant animate-fade-in">
            {SETTINGS_SECTIONS.map((item) => {
              const ItemIcon = item.icon;
              const isActive = active === item.id;
              return (
                <Link
                  key={item.id}
                  to={`/dashboard/settings/${item.id}`}
                  onClick={() => setDropdownOpen(false)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-xs transition-colors flex items-center gap-2.5 cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <ItemIcon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider",
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
                        "rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider",
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
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsNav;
