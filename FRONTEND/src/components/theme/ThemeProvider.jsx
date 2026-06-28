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
const DENSITY_STORAGE_KEY = "drivya-density";
const FONT_SIZE_STORAGE_KEY = "drivya-font-size";
const SCREEN_READER_STORAGE_KEY = "drivya-screen-reader";

const FONT_SIZE_MAP = {
  small: "13px",
  default: "15px",
  medium: "17px",
  large: "19px",
  xl: "21px",
};

function readStoredAccent() {
  try {
    const v = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (v) return v;
  } catch {
    /* ignore */
  }
  return "default";
}

function readStoredDensity() {
  try {
    const v = localStorage.getItem(DENSITY_STORAGE_KEY);
    if (v === "compact" || v === "comfortable" || v === "spacious") return v;
  } catch {
    /* ignore */
  }
  return "comfortable";
}

function readStoredFontSize() {
  try {
    const v = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (v === "small" || v === "default" || v === "medium" || v === "large" || v === "xl") return v;
  } catch {
    /* ignore */
  }
  return "default";
}

function readStoredScreenReader() {
  try {
    return localStorage.getItem(SCREEN_READER_STORAGE_KEY) === "true";
  } catch {
    /* ignore */
  }
  return false;
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
  const [density, setDensityState] = useState(() => readStoredDensity());
  const [fontSize, setFontSizeState] = useState(() => readStoredFontSize());
  const [screenReader, setScreenReaderState] = useState(() => readStoredScreenReader());

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

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, density);
    } catch {
      /* ignore */
    }
  }, [density]);

  useEffect(() => {
    const size = FONT_SIZE_MAP[fontSize] || "14px";
    document.documentElement.style.fontSize = size;
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
    } catch {
      /* ignore */
    }
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute("data-screen-reader", screenReader ? "true" : "false");
    try {
      localStorage.setItem(SCREEN_READER_STORAGE_KEY, screenReader ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, [screenReader]);

  const setMode = useCallback((next) => {
    if (next === "light" || next === "dark" || next === "system")
      setModeState(next);
  }, []);

  const setAccentColor = useCallback((next) => {
    if (typeof next === "string") {
      setAccentColorState(next);
    }
  }, []);

  const setDensity = useCallback((next) => {
    if (next === "compact" || next === "comfortable" || next === "spacious") {
      setDensityState(next);
    }
  }, []);

  const setFontSize = useCallback((next) => {
    if (next === "small" || next === "default" || next === "medium" || next === "large" || next === "xl") {
      setFontSizeState(next);
    }
  }, []);

  const setScreenReader = useCallback((next) => {
    setScreenReaderState(!!next);
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
      density,
      setDensity,
      fontSize,
      setFontSize,
      screenReader,
      setScreenReader,
    }),
    [
      mode,
      resolved,
      setMode,
      accentColor,
      setAccentColor,
      density,
      setDensity,
      fontSize,
      setFontSize,
      screenReader,
      setScreenReader,
    ],
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
