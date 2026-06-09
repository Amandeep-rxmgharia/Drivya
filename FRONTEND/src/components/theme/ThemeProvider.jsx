import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "drivya-theme";

/** @typedef {'light' | 'dark' | 'system'} ThemeMode */

const ThemeContext = createContext(null);

function getSystemDark() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** @returns {ThemeMode} */
function readStoredMode() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

/** @param {ThemeMode} mode */
function resolveMode(mode) {
  if (mode === "system") return getSystemDark() ? "dark" : "light";
  return mode;
}

const ACCENT_STORAGE_KEY = "drivya-accent";

function readStoredAccent() {
  try {
    const v = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (v) return v;
  } catch {
    /* ignore */
  }
  return "default";
}

/** Apply class before React — keep in sync with index.html inline script */
export function applyThemeClass(mode) {
  const resolved = resolveMode(mode);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = resolved;
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => readStoredMode());
  const [accentColor, setAccentColorState] = useState(() => readStoredAccent());

  const resolved = useMemo(() => resolveMode(mode), [mode]);

  useEffect(() => {
    applyThemeClass(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    const meta = document.getElementById("theme-color-meta");
    if (meta) {
      meta.setAttribute("content", resolved === "dark" ? "#0b0e18" : "#f4f6f9");
    }
  }, [mode, resolved]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accentColor);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accentColor);
    } catch {
      /* ignore */
    }
  }, [accentColor]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeClass("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next) => {
    if (next === "light" || next === "dark" || next === "system")
      setModeState(next);
  }, []);

  const setAccentColor = useCallback((next) => {
    if (typeof next === "string") {
      setAccentColorState(next);
    }
  }, []);

  const value = useMemo(
    () => ({
      /** @type {ThemeMode} */
      mode,
      /** @type {'light' | 'dark'} */
      resolved,
      setMode,
      accentColor,
      setAccentColor,
    }),
    [mode, resolved, setMode, accentColor, setAccentColor],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
