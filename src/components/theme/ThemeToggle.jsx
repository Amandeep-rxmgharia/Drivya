import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

const modes = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ className }) {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted/40 p-0.5 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      {modes.map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={`${label} theme`}
            aria-pressed={active}
            onClick={() => setMode(id)}
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200",
              "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active && "bg-background text-foreground shadow-sm",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 2} />
          </button>
        );
      })}
    </div>
  );
}
