import { cn } from "@/lib/utils";
import { Lock, Sparkles } from "lucide-react";

/* ═══════════════════════ Section Wrapper ═══════════════════════ */

export function SettingSection({
  id,
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-2xl glass shadow-elegant animate-fade-in",
        className,
      )}
    >
      {/* Header */}
      <div className="border-b border-border/60 px-6 py-5">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-border/40">{children}</div>
    </section>
  );
}

/* ═══════════════════════ Setting Row ═══════════════════════ */

export function SettingRow({
  label,
  description,
  children,
  badge,
  tierRequired,
  vertical = false,
  className,
}) {
  const isLocked = tierRequired != null;
  return (
    <div
      className={cn(
        "relative px-6 py-4 transition-colors duration-200 hover:bg-secondary/20",
        isLocked && "opacity-60",
        className,
      )}
    >
      <div
        className={cn(
          "flex gap-4",
          vertical
            ? "flex-col"
            : "flex-col sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        {/* Left: Label + Description */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {badge}
            {tierRequired && <TierBadge tier={tierRequired} />}
          </div>
          {description && (
            <p className="text-[12px] text-muted-foreground leading-relaxed max-w-lg">
              {description}
            </p>
          )}
        </div>

        {/* Right: Control */}
        <div className="shrink-0 flex items-center gap-2">
          {isLocked ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Upgrade to {tierRequired}</span>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ Danger Zone ═══════════════════════ */

export function SettingDangerZone({ title, description, children }) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] shadow-sm animate-fade-in">
      <div className="border-b border-destructive/15 px-6 py-4">
        <h3 className="font-display text-sm font-semibold text-destructive">
          {title || "Danger Zone"}
        </h3>
        {description && (
          <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

/* ═══════════════════════ Tier Badge ═══════════════════════ */

export function TierBadge({ tier = "Pro" }) {
  const colors = {
    Pro: "bg-primary/10 text-primary border-primary/20",
    Team: "bg-accent/10 text-accent border-accent/20",
    Enterprise:
      "bg-gradient-to-r from-primary/10 to-accent/10 text-foreground border-primary/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
        colors[tier] || colors.Pro,
      )}
    >
      <Sparkles className="h-2.5 w-2.5" />
      {tier}
    </span>
  );
}

/* ═══════════════════════ Storage Meter ═══════════════════════ */

export function StorageMeter({
  used = 0,
  total = 100,
  unit = "GB",
  breakdown = [],
}) {
  const pct = Math.min((used / total) * 100, 100);
  const isWarning = pct >= 80;
  const isCritical = pct >= 95;
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="font-display text-lg font-semibold tracking-tight text-foreground tabular-nums">
          {used}{" "}
          <span className="text-sm font-medium text-muted-foreground">
            {unit}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          of {total} {unit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary/60 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isCritical
              ? "bg-destructive"
              : isWarning
                ? "bg-amber-500"
                : "bg-gradient-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {breakdown.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {breakdown.map((item, i) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 rounded-full bg-gradient-primary"
                style={{ opacity: 1 - i * 0.18 }}
              />
              <span className="text-muted-foreground flex-1">{item.label}</span>
              <span className="font-semibold text-foreground tabular-nums">
                {item.value} {unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ Info Banner ═══════════════════════ */

export function SettingBanner({ variant = "info", icon: Icon, children }) {
  const styles = {
    info: "border-primary/20 bg-primary/5 text-primary",
    warning:
      "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    success:
      "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    destructive: "border-destructive/20 bg-destructive/5 text-destructive",
  };
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium",
        styles[variant],
      )}
    >
      {Icon && <Icon className="h-4 w-4 mt-0 shrink-0" />}
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  );
}
