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
  type ThemeConfig,
} from "./constants.js";

let currentContext: PluginContext | null = null;

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

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx) {
    currentContext = ctx;

    ctx.data.register(DATA_ENDPOINTS.activeTheme, async () => {
      return await readTheme(ctx);
    });

    ctx.data.register(DATA_ENDPOINTS.presets, async () => {
      return THEME_PRESETS;
    });

    ctx.actions.register(ACTION_NAMES.applyTheme, async (params) => {
      const incoming = params as Partial<ThemeConfig> & { id?: string };

      if (!incoming.id) {
        throw new Error("Theme id is required");
      }

      const preset = THEME_PRESETS.find((p) => p.id === incoming.id);

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
      const defaultTheme = THEME_PRESETS[0];
      if (!defaultTheme) {
        throw new Error("No default preset found");
      }
      await writeTheme(ctx, defaultTheme);
      return defaultTheme;
    });
  },

  async onHealth(): Promise<PluginHealthDiagnostics> {
    const ctx = currentContext;
    const activeTheme = ctx ? await readTheme(ctx) : null;
    return {
      status: "ok",
      message: "Theme Customizer ready",
      details: {
        activePreset: activeTheme?.name ?? "Default (unset)",
        presetsAvailable: THEME_PRESETS.length,
      },
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
