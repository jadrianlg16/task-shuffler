/** Where and how the app is running. Everything here is safe to call at any time. */

/** Browser-only build (VITE_STORAGE=local): tasks live in this browser alone. */
export const usesLocalStorage = import.meta.env.VITE_STORAGE === "local";

/** Inside an iframe, e.g. the portfolio demo. */
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin parent: definitely embedded
  }
}

/** `?demo` in the URL asks for the example tasks on first run. */
export function isDemoRequested(): boolean {
  return new URLSearchParams(window.location.search).has("demo");
}

/** Opened from the Home Screen / as an installed app. */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone or iPad (iPadOS reports itself as a Mac, but with touch). */
export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}
