import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
  type PluginHealthDiagnostics,
} from "@paperclipai/plugin-sdk";
import {
  PLUGIN_ID,
  STATE_KEYS,
  DATA_ENDPOINTS,
  ACTION_NAMES,
  THEME_PRESETS,
  REMOTE_REGISTRY_URL,
  type ThemeConfig,
} from "./constants.js";

let currentContext: PluginContext | null = null;

/** In-memory cache of remote themes, refreshed on startup. */
let remoteThemes: ThemeConfig[] = [];

/* ─── State helpers ──────────────────────────────────────────────── */

async function readTheme(ctx: PluginContext): Promise<ThemeConfig | null> {
  return (await ctx.state.get({
    scopeKind: "instance",
    stateKey: STATE_KEYS.activeTheme,
  })) as ThemeConfig | null;
}

async function writeTheme(
  ctx: PluginContext,
  theme: ThemeConfig,
): Promise<void> {
  await ctx.state.set(
    { scopeKind: "instance", stateKey: STATE_KEYS.activeTheme },
    theme,
  );
}

async function readUserThemes(ctx: PluginContext): Promise<ThemeConfig[]> {
  const stored = await ctx.state.get({
    scopeKind: "instance",
    stateKey: STATE_KEYS.userThemes,
  });
  if (!Array.isArray(stored)) return [];
  return stored as ThemeConfig[];
}

async function writeUserThemes(
  ctx: PluginContext,
  themes: ThemeConfig[],
): Promise<void> {
  await ctx.state.set(
    { scopeKind: "instance", stateKey: STATE_KEYS.userThemes },
    themes,
  );
}

/* ─── Remote registry fetch ──────────────────────────────────────── */

interface RegistryPayload {
  version: number;
  updatedAt: string;
  themes: ThemeConfig[];
}

function isValidTheme(t: unknown): t is ThemeConfig {
  if (typeof t !== "object" || t === null) return false;
  const obj = t as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.tokens === "object" &&
    obj.tokens !== null &&
    typeof obj.isDark === "boolean"
  );
}

async function fetchRemoteThemes(logger: PluginContext["logger"]): Promise<ThemeConfig[]> {
  try {
    const response = await fetch(REMOTE_REGISTRY_URL);
    if (!response.ok) {
      logger.warn(`Remote theme registry returned ${response.status}, using bundled fallback`);
      return [];
    }
    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !Array.isArray((payload as RegistryPayload).themes)
    ) {
      logger.warn("Remote theme registry has invalid shape, using bundled fallback");
      return [];
    }
    const themes = (payload as RegistryPayload).themes.filter(isValidTheme);
    logger.info(`Fetched ${themes.length} themes from remote registry`);
    return themes;
  } catch (err) {
    logger.warn(`Failed to fetch remote theme registry: ${String(err)}`);
    return [];
  }
}

/* ─── Merge logic: remote wins over bundled, user themes appended ── */

function mergePresets(
  bundled: ThemeConfig[],
  remote: ThemeConfig[],
  user: ThemeConfig[],
): ThemeConfig[] {
  const merged = new Map<string, ThemeConfig>();
  for (const t of bundled) merged.set(t.id, t);
  for (const t of remote) merged.set(t.id, t);
  const result = Array.from(merged.values());
  for (const t of user) {
    if (!merged.has(t.id)) {
      result.push(t);
    }
  }
  return result;
}

/* ─── Plugin definition ──────────────────────────────────────────── */

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx) {
    currentContext = ctx;

    remoteThemes = await fetchRemoteThemes(ctx.logger);

    ctx.data.register(DATA_ENDPOINTS.activeTheme, async () => {
      return await readTheme(ctx);
    });

    ctx.data.register(DATA_ENDPOINTS.presets, async () => {
      const userThemes = await readUserThemes(ctx);
      return mergePresets(THEME_PRESETS, remoteThemes, userThemes);
    });

    ctx.actions.register(ACTION_NAMES.applyTheme, async (params) => {
      const incoming = params as Partial<ThemeConfig> & { id?: string };

      if (!incoming.id) {
        throw new Error("Theme id is required");
      }

      const allPresets = mergePresets(
        THEME_PRESETS,
        remoteThemes,
        await readUserThemes(ctx),
      );
      const preset = allPresets.find((p) => p.id === incoming.id);

      const theme: ThemeConfig = preset
        ? {
            ...preset,
            tokens: { ...preset.tokens, ...(incoming.tokens ?? {}) },
            radius: incoming.radius ?? preset.radius,
            updatedAt: new Date().toISOString(),
          }
        : {
            id: incoming.id,
            name: incoming.name ?? "Custom Theme",
            description: incoming.description ?? "",
            author: incoming.author ?? "User",
            isDark: incoming.isDark ?? true,
            tokens: incoming.tokens ?? {},
            radius: incoming.radius ?? "0",
            createdAt: incoming.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

      await writeTheme(ctx, theme);
      return theme;
    });

    ctx.actions.register(ACTION_NAMES.resetTheme, async () => {
      const allPresets = mergePresets(
        THEME_PRESETS,
        remoteThemes,
        await readUserThemes(ctx),
      );
      const defaultTheme = allPresets[0];
      if (!defaultTheme) {
        throw new Error("No default preset found");
      }
      await writeTheme(ctx, defaultTheme);
      return defaultTheme;
    });

    ctx.actions.register(ACTION_NAMES.importTheme, async (params) => {
      const incoming = params as unknown;
      if (!isValidTheme(incoming)) {
        throw new Error(
          "Invalid theme: must include id (string), name (string), tokens (object), isDark (boolean)",
        );
      }
      const theme: ThemeConfig = {
        id: incoming.id,
        name: incoming.name,
        description: incoming.description ?? "",
        author: incoming.author ?? "Community",
        isDark: incoming.isDark,
        tokens: incoming.tokens,
        radius: incoming.radius ?? "0",
        createdAt: incoming.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const existing = await readUserThemes(ctx);
      const filtered = existing.filter((t) => t.id !== theme.id);
      filtered.push(theme);
      await writeUserThemes(ctx, filtered);
      return theme;
    });

    ctx.actions.register(ACTION_NAMES.removeUserTheme, async (params) => {
      const { id } = params as { id?: string };
      if (!id) throw new Error("Theme id is required");
      const existing = await readUserThemes(ctx);
      const filtered = existing.filter((t) => t.id !== id);
      await writeUserThemes(ctx, filtered);
      return { removed: id };
    });
  },

  async onHealth(): Promise<PluginHealthDiagnostics> {
    const ctx = currentContext;
    const activeTheme = ctx ? await readTheme(ctx) : null;
    const userThemes = ctx ? await readUserThemes(ctx) : [];
    return {
      status: "ok",
      message: "Theme Customizer ready",
      details: {
        activePreset: activeTheme?.name ?? "Default (unset)",
        bundledPresets: THEME_PRESETS.length,
        remotePresets: remoteThemes.length,
        userImported: userThemes.length,
      },
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
