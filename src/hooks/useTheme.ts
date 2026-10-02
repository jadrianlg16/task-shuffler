import { useEffect, useSyncExternalStore } from "react";
import { useUIStore } from "@/store/uiStore";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemTheme(onChange: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** The OS dark-mode setting, re-rendering when it changes. */
function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(
    subscribeToSystemTheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false
  );
}

/**
 * The chosen theme ("light", "dark" or "system") and what it resolves to now.
 * Components that draw something theme-specific should use `isDark`, which
 * follows OS changes while the theme is "system".
 */
export function useTheme() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const systemDark = useSystemPrefersDark();
  const isDark = theme === "dark" || (theme === "system" && systemDark);

  const cycleTheme = () => {
    const next =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  return { theme, isDark, setTheme, cycleTheme };
}

/** Keeps the `dark` class on <html> in step with the theme. Call once, at the root. */
export function useApplyTheme() {
  const { isDark } = useTheme();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);
}
