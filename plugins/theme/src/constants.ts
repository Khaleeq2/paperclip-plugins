export const PLUGIN_ID = "blazo.paperclip-theme";
export const PLUGIN_VERSION = "0.1.0";

export const SLOT_IDS = {
  settingsPage: "theme-settings-page",
} as const;

export const EXPORT_NAMES = {
  settingsPage: "ThemeSettingsPage",
} as const;

export const STATE_KEYS = {
  activeTheme: "active-theme",
} as const;

export const DATA_ENDPOINTS = {
  activeTheme: "active-theme",
  presets: "presets",
} as const;

export const ACTION_NAMES = {
  applyTheme: "apply-theme",
  resetTheme: "reset-theme",
} as const;

/**
 * Semantic CSS custom properties that control Paperclip's entire look.
 * Grouped by role for the settings UI.
 */
export const TOKEN_GROUPS = {
  surface: {
    label: "Surfaces",
    description: "Background and card colors",
    tokens: ["--background", "--card", "--muted", "--accent"],
  },
  text: {
    label: "Text",
    description: "Foreground and label colors",
    tokens: ["--foreground", "--card-foreground", "--muted-foreground", "--accent-foreground"],
  },
  interactive: {
    label: "Interactive",
    description: "Buttons, links, and primary actions",
    tokens: ["--primary", "--primary-foreground"],
  },
  feedback: {
    label: "Feedback",
    description: "Errors and destructive actions",
    tokens: ["--destructive", "--destructive-foreground"],
  },
  structure: {
    label: "Structure",
    description: "Borders, radius, and layout",
    tokens: ["--border", "--input", "--ring"],
  },
  charts: {
    label: "Charts",
    description: "Dashboard visualization colors",
    tokens: ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"],
  },
} as const;

/**
 * Complete theme configuration shape.
 * Values are raw CSS values (oklch, hex, px, etc.).
 */
export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  author: string;
  isDark: boolean;
  tokens: Record<string, string>;
  radius: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The default Paperclip dark theme — extracted from the shipped CSS.
 * This is the baseline; all presets override from here.
 */
export const PAPERCLIP_DARK_DEFAULTS: Record<string, string> = {
  "--background": "oklch(14.5% 0 0)",
  "--foreground": "oklch(98.5% 0 0)",
  "--card": "oklch(14.5% 0 0)",
  "--card-foreground": "oklch(98.5% 0 0)",
  "--primary": "oklch(98.5% 0 0)",
  "--primary-foreground": "oklch(20.5% 0 0)",
  "--muted": "oklch(21.5% 0 0)",
  "--muted-foreground": "oklch(71.5% 0 0)",
  "--accent": "oklch(21.5% 0 0)",
  "--accent-foreground": "oklch(98.5% 0 0)",
  "--destructive": "oklch(57.7% 0.245 27.325)",
  "--destructive-foreground": "oklch(57.7% 0.245 27.325)",
  "--border": "oklch(27.4% 0 0)",
  "--input": "oklch(27.4% 0 0)",
  "--ring": "oklch(44.2% 0 0)",
  "--chart-1": "oklch(64.6% 0.222 41.116)",
  "--chart-2": "oklch(60% 0.118 184.704)",
  "--chart-3": "oklch(39.8% 0 0)",
  "--chart-4": "oklch(82.8% 0.189 84.429)",
  "--chart-5": "oklch(76.9% 0.188 70.08)",
};

export const PAPERCLIP_LIGHT_DEFAULTS: Record<string, string> = {
  "--background": "oklch(100% 0 0)",
  "--foreground": "oklch(14.5% 0 0)",
  "--card": "oklch(100% 0 0)",
  "--card-foreground": "oklch(14.5% 0 0)",
  "--primary": "oklch(20.5% 0 0)",
  "--primary-foreground": "oklch(98.5% 0 0)",
  "--muted": "oklch(97% 0 0)",
  "--muted-foreground": "oklch(55.6% 0 0)",
  "--accent": "oklch(97% 0 0)",
  "--accent-foreground": "oklch(20.5% 0 0)",
  "--destructive": "oklch(57.7% 0.245 27.325)",
  "--destructive-foreground": "oklch(57.7% 0.245 27.325)",
  "--border": "oklch(92.2% 0 0)",
  "--input": "oklch(92.2% 0 0)",
  "--ring": "oklch(87.1% 0 0)",
  "--chart-1": "oklch(64.6% 0.222 41.116)",
  "--chart-2": "oklch(60% 0.118 184.704)",
  "--chart-3": "oklch(39.8% 0 0)",
  "--chart-4": "oklch(82.8% 0.189 84.429)",
  "--chart-5": "oklch(76.9% 0.188 70.08)",
};

/**
 * Curated theme presets.
 * Each preset provides a complete token override set.
 */
export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: "default-dark",
    name: "Paperclip Dark",
    description: "The stock Paperclip dark theme",
    author: "Paperclip",
    isDark: true,
    tokens: { ...PAPERCLIP_DARK_DEFAULTS },
    radius: "0",
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },
  {
    id: "default-light",
    name: "Paperclip Light",
    description: "The stock Paperclip light theme",
    author: "Paperclip",
    isDark: false,
    tokens: { ...PAPERCLIP_LIGHT_DEFAULTS },
    radius: "0",
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },
  {
    id: "midnight-blue",
    name: "Midnight Blue",
    description: "Deep navy surfaces with electric blue accents",
    author: "Khaleeq Fisher",
    isDark: true,
    tokens: {
      "--background": "oklch(15.5% 0.025 260)",
      "--foreground": "oklch(95% 0.01 250)",
      "--card": "oklch(18% 0.02 260)",
      "--card-foreground": "oklch(95% 0.01 250)",
      "--primary": "oklch(65% 0.18 250)",
      "--primary-foreground": "oklch(98% 0 0)",
      "--muted": "oklch(22% 0.02 260)",
      "--muted-foreground": "oklch(68% 0.02 250)",
      "--accent": "oklch(25% 0.03 260)",
      "--accent-foreground": "oklch(95% 0.01 250)",
      "--destructive": "oklch(60% 0.22 25)",
      "--destructive-foreground": "oklch(60% 0.22 25)",
      "--border": "oklch(28% 0.03 260)",
      "--input": "oklch(28% 0.03 260)",
      "--ring": "oklch(65% 0.18 250)",
      "--chart-1": "oklch(65% 0.18 250)",
      "--chart-2": "oklch(72% 0.15 170)",
      "--chart-3": "oklch(55% 0.12 300)",
      "--chart-4": "oklch(80% 0.15 85)",
      "--chart-5": "oklch(60% 0.2 30)",
    },
    radius: "0.5rem",
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },
  {
    id: "emerald-noir",
    name: "Emerald Noir",
    description: "Elegant dark with rich green highlights",
    author: "Khaleeq Fisher",
    isDark: true,
    tokens: {
      "--background": "oklch(14% 0.015 155)",
      "--foreground": "oklch(96% 0.01 155)",
      "--card": "oklch(17% 0.015 155)",
      "--card-foreground": "oklch(96% 0.01 155)",
      "--primary": "oklch(62% 0.19 155)",
      "--primary-foreground": "oklch(98% 0 0)",
      "--muted": "oklch(21% 0.015 155)",
      "--muted-foreground": "oklch(68% 0.02 155)",
      "--accent": "oklch(24% 0.02 155)",
      "--accent-foreground": "oklch(96% 0.01 155)",
      "--destructive": "oklch(58% 0.22 25)",
      "--destructive-foreground": "oklch(58% 0.22 25)",
      "--border": "oklch(27% 0.02 155)",
      "--input": "oklch(27% 0.02 155)",
      "--ring": "oklch(62% 0.19 155)",
      "--chart-1": "oklch(62% 0.19 155)",
      "--chart-2": "oklch(68% 0.14 200)",
      "--chart-3": "oklch(50% 0.10 280)",
      "--chart-4": "oklch(78% 0.16 90)",
      "--chart-5": "oklch(72% 0.18 50)",
    },
    radius: "0.375rem",
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },
  {
    id: "warm-sand",
    name: "Warm Sand",
    description: "Soft warm light theme with earthy tones",
    author: "Khaleeq Fisher",
    isDark: false,
    tokens: {
      "--background": "oklch(97% 0.01 75)",
      "--foreground": "oklch(20% 0.02 60)",
      "--card": "oklch(99% 0.005 75)",
      "--card-foreground": "oklch(20% 0.02 60)",
      "--primary": "oklch(45% 0.12 55)",
      "--primary-foreground": "oklch(98% 0.005 75)",
      "--muted": "oklch(93% 0.01 75)",
      "--muted-foreground": "oklch(50% 0.02 60)",
      "--accent": "oklch(93% 0.015 75)",
      "--accent-foreground": "oklch(25% 0.02 60)",
      "--destructive": "oklch(55% 0.22 25)",
      "--destructive-foreground": "oklch(55% 0.22 25)",
      "--border": "oklch(88% 0.015 75)",
      "--input": "oklch(88% 0.015 75)",
      "--ring": "oklch(45% 0.12 55)",
      "--chart-1": "oklch(55% 0.18 40)",
      "--chart-2": "oklch(58% 0.12 180)",
      "--chart-3": "oklch(45% 0.08 280)",
      "--chart-4": "oklch(75% 0.16 90)",
      "--chart-5": "oklch(65% 0.15 55)",
    },
    radius: "0.75rem",
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },
  {
    id: "rose-twilight",
    name: "Rosé Twilight",
    description: "Dusky pink-tinted dark theme with warm accents",
    author: "Khaleeq Fisher",
    isDark: true,
    tokens: {
      "--background": "oklch(15% 0.02 340)",
      "--foreground": "oklch(95% 0.01 340)",
      "--card": "oklch(18% 0.02 340)",
      "--card-foreground": "oklch(95% 0.01 340)",
      "--primary": "oklch(68% 0.16 340)",
      "--primary-foreground": "oklch(98% 0 0)",
      "--muted": "oklch(22% 0.02 340)",
      "--muted-foreground": "oklch(68% 0.02 340)",
      "--accent": "oklch(25% 0.025 340)",
      "--accent-foreground": "oklch(95% 0.01 340)",
      "--destructive": "oklch(58% 0.24 20)",
      "--destructive-foreground": "oklch(58% 0.24 20)",
      "--border": "oklch(28% 0.025 340)",
      "--input": "oklch(28% 0.025 340)",
      "--ring": "oklch(68% 0.16 340)",
      "--chart-1": "oklch(68% 0.16 340)",
      "--chart-2": "oklch(65% 0.14 200)",
      "--chart-3": "oklch(55% 0.10 280)",
      "--chart-4": "oklch(78% 0.16 85)",
      "--chart-5": "oklch(72% 0.18 45)",
    },
    radius: "0.5rem",
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },
];
