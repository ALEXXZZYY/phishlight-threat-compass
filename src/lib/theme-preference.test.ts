import { beforeEach, describe, expect, it } from "vitest";

import { applyThemePreference, readThemePreference, saveThemePreference } from "@/lib/theme-preference";

describe("theme preference", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
  });

  it("uses dark mode by default and restores a saved light preference", () => {
    expect(readThemePreference()).toBe("dark");

    saveThemePreference("light");

    expect(readThemePreference()).toBe("light");
  });

  it("applies the selected theme without leaving the other theme active", () => {
    applyThemePreference("light");
    expect(document.documentElement).toHaveClass("light");
    expect(document.documentElement).not.toHaveClass("dark");

    applyThemePreference("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).not.toHaveClass("light");
  });
});