export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "phishguard.theme";

export function readThemePreference(): ThemeMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function saveThemePreference(theme: ThemeMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Keep the active page usable if browser storage is unavailable.
  }
}

export function applyThemePreference(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}