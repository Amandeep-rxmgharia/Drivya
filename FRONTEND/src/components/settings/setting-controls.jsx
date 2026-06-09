import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════ Toggle Switch ═══════════════════════ */

export function SettingToggle({
  checked = false,
  onChange,
  disabled = false,
  size = "default",
  label,
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "group relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        size === "sm" ? "h-5 w-9" : "h-6 w-11",
        checked
          ? "bg-primary shadow-[0_0_12px_-3px_var(--color-primary)]"
          : "bg-border/80 hover:bg-border",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "pointer-events-none inline-block rounded-full bg-white shadow-md ring-0",
          size === "sm" ? "h-4 w-4" : "h-5 w-5",
          checked
            ? size === "sm"
              ? "translate-x-4"
              : "translate-x-5"
            : "translate-x-0",
        )}
      />
    </button>
  );
}

/* ═══════════════════════ Select Dropdown ═══════════════════════ */

export function SettingSelect({
  value,
  onChange,
  options = [],
  disabled = false,
  placeholder = "Select…",
  className,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) =>
    typeof o === "string" ? o === value : o.value === value,
  );
  const displayLabel = selected
    ? typeof selected === "string"
      ? selected
      : selected.label
    : placeholder;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-9 w-full min-w-[160px] items-center justify-between gap-2 rounded-xl border border-border bg-secondary/30 px-3 text-sm font-medium text-foreground transition-all",
          "hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          disabled && "opacity-50 cursor-not-allowed",
          open && "border-primary/40 ring-2 ring-primary/10",
        )}
      >
        <span className={cn(!selected && "text-muted-foreground")}>
          {displayLabel}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-1.5 max-h-56 w-full min-w-[180px] overflow-auto rounded-xl border border-border bg-popover p-1 shadow-elegant"
          >
            {options.map((opt) => {
              const optValue = typeof opt === "string" ? opt : opt.value;
              const optLabel = typeof opt === "string" ? opt : opt.label;
              const isSelected = optValue === value;
              return (
                <button
                  key={optValue}
                  type="button"
                  onClick={() => {
                    onChange?.(optValue);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/80 hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <span className="flex-1 text-left">{optLabel}</span>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════ Text Input ═══════════════════════ */

export function SettingInput({
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  icon: Icon,
  suffix,
  className,
  maxLength,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={cn("relative group", className)}>
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
      )}
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={cn(
          "h-9 w-full rounded-xl border border-border bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all",
          "focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
          Icon ? "pl-9 pr-3" : "px-3",
          isPassword && "pr-9",
          suffix && "pr-14",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </button>
      )}
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════ Radio Group ═══════════════════════ */

export function SettingRadioGroup({
  value,
  onChange,
  options = [],
  disabled = false,
  direction = "vertical",
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "flex gap-2",
        direction === "vertical" ? "flex-col" : "flex-row flex-wrap",
      )}
    >
      {options.map((opt) => {
        const optValue = typeof opt === "string" ? opt : opt.value;
        const optLabel = typeof opt === "string" ? opt : opt.label;
        const optDesc = typeof opt === "string" ? undefined : opt.description;
        const isSelected = optValue === value;
        return (
          <button
            key={optValue}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange?.(optValue)}
            className={cn(
              "group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200",
              isSelected
                ? "border-primary/30 bg-primary/5 shadow-sm"
                : "border-border bg-secondary/20 hover:bg-secondary/40 hover:border-border/80",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                isSelected
                  ? "border-primary"
                  : "border-muted-foreground/40 group-hover:border-muted-foreground/60",
              )}
            >
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="h-2 w-2 rounded-full bg-primary"
                />
              )}
            </span>
            <div className="min-w-0">
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  isSelected ? "text-foreground" : "text-foreground/80",
                )}
              >
                {optLabel}
              </span>
              {optDesc && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {optDesc}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════ Segmented Control ═══════════════════════ */

export function SettingSegmented({
  value,
  onChange,
  options = [],
  disabled = false,
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-secondary/40 p-0.5">
      {options.map((opt) => {
        const optValue = typeof opt === "string" ? opt : opt.value;
        const optLabel = typeof opt === "string" ? opt : opt.label;
        const isSelected = optValue === value;
        return (
          <button
            key={optValue}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(optValue)}
            className={cn(
              "relative rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
              isSelected
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            {optLabel}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════ Slider ═══════════════════════ */

export function SettingSlider({
  value = 50,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = "",
  disabled = false,
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3 w-full max-w-xs">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none bg-border/60 cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_8px_-2px_var(--color-primary)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
        style={{
          background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${pct}%, var(--color-border) ${pct}%, var(--color-border) 100%)`,
        }}
      />
      <span className="text-xs font-semibold tabular-nums text-foreground min-w-[3rem] text-right">
        {value}
        {suffix}
      </span>
    </div>
  );
}
