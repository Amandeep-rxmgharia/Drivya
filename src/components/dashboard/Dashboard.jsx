import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  ChevronDown,
  Cloud,
  Folder,
  Home,
  Loader2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { easeSmooth, tweenEnter } from "@/lib/motion-presets";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Link, Outlet, useLocation } from "react-router-dom";
import { chip, iconBtn, primaryBtn, Kbd } from "./dashboard-tokens.jsx";
import { FloatingActionButton } from "./FloatingActionButton.jsx";


/* ───────────────────────── Sidebar ───────────────────────── */

const navMain = [
  { icon: Home, label: "Home", to: "home" },
  { icon: Folder, label: "My Drive", to: "drive", count: 248 },
  { icon: Share2, label: "Shared Files", to: "shared", count: 14 },
  { icon: Loader2, label: "Recent", to: "recent" },
  { icon: Star, label: "Starred", to: "starred" },
  { icon: Trash2, label: "Trash", to: "trash" },
];

function Sidebar({ collapsed, onClose, mobileOpen }) {
  const location = useLocation();
  // Extract the active segment from URL: /dashboard/home → "home"
  const activeSegment = location.pathname.split("/").filter(Boolean).pop() || "home";

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-background/40 backdrop-blur-sm lg:hidden"
        />
      )}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={tweenEnter(0.78, 0.04)}
        className={[
          "fixed inset-y-0 left-0 z-40 h-full lg:relative lg:inset-auto shrink-0",
          "bg-background/60 backdrop-blur-xl border-r border-border/70",
          "flex flex-col transition-[width,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          collapsed ? "w-[76px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* brand */}
        <div className="h-16 flex items-center px-5 border-b border-border/60">
          <Link to="/dashboard/home" className="flex items-center gap-2.5 group">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Cloud className="h-4 w-4 text-primary-foreground" />
            </span>
            {!collapsed && (
              <div className="flex flex-col leading-none">
                <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                  Drivya
                </span>
                <span className="text-[10.5px] font-medium text-muted-foreground mt-1">
                  Personal · Pro
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-7">
          <SidebarGroup
            label="Library"
            items={navMain}
            active={activeSegment}
            collapsed={collapsed}
          />
        </nav>

        {/* storage card */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tweenEnter(0.65, 0.2)}
            className="m-3 rounded-2xl glass p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/90">
                Storage
              </span>
              <span className={chip}>
                <Sparkles className="h-3 w-3 text-primary" />Pro
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "62%" }}
                transition={{ type: "tween", duration: 1.1, delay: 0.35, ease: easeSmooth }}
                className="h-full rounded-full bg-gradient-primary"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>156 GB of 250 GB</span>
              <button className="font-semibold text-foreground hover:text-primary transition-colors">
                Upgrade
              </button>
            </div>
          </motion.div>
        )}

        <motion.div className="px-3 pb-3 pt-1">
          <Link
            to="/dashboard/settings"
            className={[
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              activeSegment === "settings"
                ? "bg-secondary/70 text-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </motion.div>
      </motion.aside>
    </>
  );
}

function SidebarGroup({ label, items, active, collapsed }) {
  return (
    <div>
      {!collapsed && (
        <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
          {label}
        </div>
      )}
      <ul className="space-y-0.5">
        {items.map((it, i) => {
          const isActive = active === it.to;
          return (
            <li
              key={it.to}
              className="animate-fade-in"
              style={{ animationDelay: `${0.12 + i * 0.05}s`, animationFillMode: 'both' }}
            >
              <Link
                to={`/dashboard/${it.to}`}
                className={[
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary/80 text-foreground border border-border/60 shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                  collapsed ? "justify-center" : "",
                ].join(" ")}
                title={collapsed ? it.label : undefined}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-gradient-primary shadow-glow" />
                )}
                <it.icon
                  className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{it.label}</span>
                    {it.count != null && (
                      <span className="text-[10.5px] font-semibold text-muted-foreground/70">
                        {it.count}
                      </span>
                    )}
                    {it.badge && (
                      <span className="rounded-md bg-gradient-primary px-1.5 py-0.5 text-[9.5px] font-semibold text-primary-foreground shadow-glow">
                        {it.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────────────────────── Topbar ───────────────────────── */

function Topbar({ onToggleSidebar, onMobileMenu, sidebarCollapsed }) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={tweenEnter(0.72, 0.1)}
      className="shrink-0 z-20 bg-background/60 backdrop-blur-xl border-b border-border/70"
    >
      <div className="h-16 flex items-center gap-3 px-4 md:px-6">
        <button onClick={onMobileMenu} className={`${iconBtn} lg:hidden`}>
          <Menu className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleSidebar}
          className={`${iconBtn} hidden lg:inline-flex`}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 hidden lg:block" />
          ) : (
            <PanelLeftClose className="h-4 w-4 hidden lg:block" />
          )}
        </button>

        {/* search */}
        <div className="flex-1 max-w-2xl">
          <div className="group relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files, folders, people…"
              className="h-10 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-24 text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </div>
          </div>
        </div>

        {/* premium ai assistant */}
        <button className="group relative hidden xl:flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 h-10 transition-all cursor-pointer overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-x-full" />
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Ask Drivya AI
          </span>
          <div className="ml-2 flex items-center gap-0.5 rounded-md bg-background/50 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-primary uppercase ring-1 ring-primary/20 shadow-sm backdrop-blur-sm">
            BETA
          </div>
        </button>

        <ThemeToggle className="hidden sm:inline-flex" />

        <button className={`${iconBtn} relative`}>
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary shadow-glow ring-2 ring-background" />
        </button>

        {/* profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl pl-1 pr-2 h-10 hover:bg-secondary/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-primary ring-1 ring-border flex items-center justify-center text-xs font-semibold text-primary-foreground shadow-glow">
              AM
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-popover shadow-elegant p-2">
              <div className="px-3 py-2.5">
                <div className="text-sm font-semibold text-foreground">
                  Amelia Moreau
                </div>
                <div className="text-xs text-muted-foreground">
                  amelia@drivya.com
                </div>
              </div>
              <div className="my-1 h-px bg-border" />
              {["Account", "Billing", "Security", "Sign out"].map((l) => (
                <button
                  key={l}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-foreground/80 hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}

/* ───────────────────────── Dashboard Layout ───────────────────────── */

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden text-foreground">
      {/* ambient page glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, var(--ambient-radial-large), transparent), radial-gradient(ellipse 60% 40% at 90% 30%, var(--ambient-blob-b), transparent)",
        }}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <motion.div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar
            sidebarCollapsed={collapsed}
            onToggleSidebar={() => setCollapsed((c) => !c)}
            onMobileMenu={() => setMobileOpen(true)}
          />
          <main
            className="dashboard-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 space-y-6"
            style={{ scrollbarGutter: "stable" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex flex-col min-h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </motion.div>
      </div>
      <FloatingActionButton />
    </div>
  );
}
