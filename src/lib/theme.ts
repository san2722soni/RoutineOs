import type { ThemePreference } from "@/src/types";

export type ThemeMode = ThemePreference;

function createTheme(mode: ThemeMode) {
  if (mode === "dark") {
    return {
      mode,
      background: "#0F1216",
      surface: "#11141A",
      surfaceAlt: "#181C24",
      text: "#f8fafc",
      mutedText: "#94A3B8",
      border: "rgba(255,255,255,0.12)",
      primary: "#38bdf8",
      primaryText: "#0B0D10",
      input: "#0B0D10",
      accent: "#FFE2B8",
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
    };
  }

  return {
    mode,
    background: "#EAF0F4",
    surface: "#F5F8FA",
    surfaceAlt: "#DEE7ED",
    text: "#17232D",
    mutedText: "#5D7180",
    border: "#C8D5DD",
    primary: "#087EA4",
    primaryText: "#FFFFFF",
    input: "#E3EBF0",
    accent: "#55B9D6",
    success: "#3C9B72",
    warning: "#C98232",
    error: "#C95C61",
  };
}

const themes = { dark: createTheme("dark"), light: createTheme("light") };
export function appTheme(mode: ThemeMode) { return themes[mode]; }

export function modeFromSetting(themeMode?: ThemePreference): ThemeMode {
  return themeMode === "dark" ? "dark" : "light";
}
