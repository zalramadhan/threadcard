import type { CardSettings, Theme } from "./types";

export const THEMES: Theme[] = [
  {
    id: "paper",
    name: "Paper",
    background: "#F7F3EC",
    card: "#FFFFFF",
    text: "#111111",
    muted: "#6B6B6B",
    border: "#E7E1D6",
    accent: "#0095F6",
  },
  {
    id: "snow",
    name: "Snow",
    background: "#FFFFFF",
    card: "#FFFFFF",
    text: "#0A0A0A",
    muted: "#737373",
    border: "#E5E5E5",
    accent: "#0095F6",
  },
  {
    id: "fog",
    name: "Fog",
    background: "#E9EDF0",
    card: "#F7F9FA",
    text: "#101418",
    muted: "#66707A",
    border: "#D8DEE3",
    accent: "#0095F6",
  },
  {
    id: "sand",
    name: "Sand",
    background: "#E8DFCF",
    card: "#F4EEE2",
    text: "#2B2418",
    muted: "#7A6A55",
    border: "#DCCFBB",
    accent: "#0074B8",
  },
  {
    id: "olive",
    name: "Olive",
    background: "#E6E8DC",
    card: "#F3F4EC",
    text: "#1C2117",
    muted: "#6B7263",
    border: "#D5D9C8",
    accent: "#2F6B4F",
  },
  {
    id: "ink",
    name: "Ink",
    background: "#000000",
    card: "#0A0A0A",
    text: "#FAFAFA",
    muted: "#A3A3A3",
    border: "#262626",
    accent: "#4CB5FF",
  },
  {
    id: "slate",
    name: "Slate",
    background: "#14161A",
    card: "#1B1E24",
    text: "#F5F5F5",
    muted: "#9CA3AF",
    border: "#2E333B",
    accent: "#5AB0FF",
  },
  {
    id: "mono",
    name: "Mono",
    background: "#F2F2F2",
    card: "#FFFFFF",
    text: "#000000",
    muted: "#666666",
    border: "#D9D9D9",
    accent: "#0066CC",
  },
];

export const DEFAULT_THEME_ID = "paper";

export function getTheme(themeId: string): Theme {
  return THEMES.find((theme) => theme.id === themeId) ?? THEMES[0];
}

export function defaultSettings(): CardSettings {
  const theme = getTheme(DEFAULT_THEME_ID);
  return {
    themeId: theme.id,
    background: theme.background,
    textColor: theme.text,
    accentColor: theme.accent,
    font: "sans",
    fontSize: 40,
    padding: 64,
    aspect: "auto",
    showAvatar: true,
    showVerified: true,
    showTimestamp: true,
    showCounts: true,
    showMedia: true,
  };
}

export function settingsForTheme(
  settings: CardSettings,
  themeId: string,
): CardSettings {
  const theme = getTheme(themeId);
  return {
    ...settings,
    themeId: theme.id,
    background: theme.background,
    textColor: theme.text,
    accentColor: theme.accent,
  };
}
