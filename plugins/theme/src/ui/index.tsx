import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  usePluginData,
  usePluginAction,
} from "@paperclipai/plugin-sdk/ui";

/* ─── Types ──────────────────────────────────────────────────────── */

interface ThemeConfig {
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

/* ─── CSS injection engine ───────────────────────────────────────── */

const STYLE_ELEMENT_ID = "blazo-theme-overrides";

function injectThemeCSS(theme: ThemeConfig): void {
  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ELEMENT_ID;
    document.head.appendChild(el);
  }

  const entries = Object.entries(theme.tokens);
  const radiusEntry = theme.radius ? `  --radius: ${theme.radius};` : "";

  const lines = entries.map(([key, value]) => `  ${key}: ${value};`);
  if (radiusEntry) lines.push(radiusEntry);

  const darkToggle = theme.isDark ? "dark" : "light";
  el.textContent = `:root { ${lines.join(" ")} }\n`;

  const htmlEl = document.documentElement;
  htmlEl.classList.toggle("dark", theme.isDark);
  htmlEl.classList.toggle("light", !theme.isDark);
  htmlEl.style.colorScheme = darkToggle;
}

function clearThemeCSS(): void {
  const el = document.getElementById(STYLE_ELEMENT_ID);
  if (el) el.remove();
}

/* ─── Token groups for the editor ────────────────────────────────── */

interface TokenGroup {
  label: string;
  description: string;
  tokens: string[];
}

const TOKEN_GROUPS: TokenGroup[] = [
  {
    label: "Surfaces",
    description: "Background and card colors",
    tokens: ["--background", "--card", "--muted", "--accent"],
  },
  {
    label: "Text",
    description: "Foreground and label colors",
    tokens: ["--foreground", "--card-foreground", "--muted-foreground", "--accent-foreground"],
  },
  {
    label: "Interactive",
    description: "Buttons, links, and primary actions",
    tokens: ["--primary", "--primary-foreground"],
  },
  {
    label: "Feedback",
    description: "Errors and destructive actions",
    tokens: ["--destructive", "--destructive-foreground"],
  },
  {
    label: "Structure",
    description: "Borders and focus rings",
    tokens: ["--border", "--input", "--ring"],
  },
  {
    label: "Charts",
    description: "Dashboard visualization colors",
    tokens: ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"],
  },
];

/* ─── Helpers ────────────────────────────────────────────────────── */

function tokenDisplayName(token: string): string {
  return token
    .replace(/^--/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function oklchToHex(oklchStr: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) return "#000000";
  ctx2d.fillStyle = oklchStr;
  ctx2d.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx2d.getImageData(0, 0, 1, 1).data;
  return `#${(r ?? 0).toString(16).padStart(2, "0")}${(g ?? 0).toString(16).padStart(2, "0")}${(b ?? 0).toString(16).padStart(2, "0")}`;
}

function hexToOklch(hex: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) return "oklch(0% 0 0)";
  ctx2d.fillStyle = hex;
  ctx2d.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx2d.getImageData(0, 0, 1, 1).data;
  const rLin = srgbToLinear((r ?? 0) / 255);
  const gLin = srgbToLinear((g ?? 0) / 255);
  const bLin = srgbToLinear((b ?? 0) / 255);
  const l = 0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin;
  const m = 0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin;
  const s = 0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin;
  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);
  const L = 0.2104542553 * lRoot + 0.7936177850 * mRoot - 0.0040720468 * sRoot;
  const a = 1.9779984951 * lRoot - 2.4285922050 * mRoot + 0.4505937099 * sRoot;
  const bOklab = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.8086757660 * sRoot;
  const C = Math.sqrt(a * a + bOklab * bOklab);
  let H = (Math.atan2(bOklab, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(1)})`;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/* ─── Sub-components ─────────────────────────────────────────────── */

const styles = {
  root: {
    fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)",
    color: "var(--foreground)",
    maxWidth: 720,
    display: "flex",
    flexDirection: "column" as const,
    gap: 32,
  },
  header: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    margin: 0,
    color: "var(--foreground)",
  },
  subtitle: {
    fontSize: 13,
    color: "var(--muted-foreground)",
    margin: 0,
    lineHeight: 1.5,
  },
  section: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: "var(--muted-foreground)",
    margin: 0,
  },
  presetsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 10,
  },
  presetCard: (isActive: boolean) => ({
    position: "relative" as const,
    padding: "14px 16px",
    borderRadius: 8,
    border: `1.5px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
    background: isActive ? "var(--accent)" : "transparent",
    cursor: "pointer",
    transition: "all 150ms ease",
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    outline: "none",
  }),
  presetName: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--foreground)",
    margin: 0,
  },
  presetDesc: {
    fontSize: 12,
    color: "var(--muted-foreground)",
    margin: 0,
    lineHeight: 1.4,
  },
  presetColors: {
    display: "flex",
    gap: 4,
    marginTop: 4,
  },
  presetSwatch: (color: string) => ({
    width: 16,
    height: 16,
    borderRadius: 4,
    background: color,
    border: "1px solid rgba(128,128,128,0.25)",
    flexShrink: 0,
  }),
  activeBadge: {
    position: "absolute" as const,
    top: 8,
    right: 10,
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "var(--primary-foreground)",
    background: "var(--primary)",
    padding: "2px 8px",
    borderRadius: 999,
  },
  tokenGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    padding: "16px 0",
    borderBottom: "1px solid var(--border)",
  },
  tokenGroupHeader: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },
  tokenGroupLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--foreground)",
    margin: 0,
  },
  tokenGroupDesc: {
    fontSize: 12,
    color: "var(--muted-foreground)",
    margin: 0,
  },
  tokenRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "4px 0",
  },
  colorInput: {
    width: 32,
    height: 32,
    border: "1.5px solid var(--border)",
    borderRadius: 6,
    padding: 0,
    cursor: "pointer",
    background: "none",
    flexShrink: 0,
    outline: "none",
  },
  tokenLabel: {
    fontSize: 13,
    fontWeight: 400,
    color: "var(--foreground)",
    flex: 1,
    minWidth: 0,
  },
  tokenValue: {
    fontSize: 11,
    fontFamily: "var(--font-mono, 'SF Mono', Consolas, monospace)",
    color: "var(--muted-foreground)",
    textAlign: "right" as const,
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    maxWidth: 180,
  },
  radiusSection: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "8px 0",
  },
  rangeInput: {
    flex: 1,
    accentColor: "var(--primary)",
    cursor: "pointer",
  },
  radiusValue: {
    fontSize: 13,
    fontFamily: "var(--font-mono, 'SF Mono', Consolas, monospace)",
    color: "var(--muted-foreground)",
    minWidth: 48,
    textAlign: "right" as const,
  },
  radiusPreview: (r: string) => ({
    width: 32,
    height: 32,
    borderRadius: r,
    border: "2px solid var(--primary)",
    background: "var(--accent)",
    flexShrink: 0,
  }),
  actions: {
    display: "flex",
    gap: 10,
    paddingTop: 8,
  },
  btnPrimary: {
    padding: "9px 20px",
    borderRadius: 6,
    border: "none",
    background: "var(--primary)",
    color: "var(--primary-foreground)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "opacity 150ms ease",
    outline: "none",
  },
  btnSecondary: {
    padding: "9px 20px",
    borderRadius: 6,
    border: "1.5px solid var(--border)",
    background: "transparent",
    color: "var(--foreground)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 150ms ease",
    outline: "none",
  },
  saved: {
    fontSize: 12,
    color: "var(--muted-foreground)",
    alignSelf: "center" as const,
    transition: "opacity 300ms ease",
  },
  spinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid var(--muted-foreground)",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 600ms linear infinite",
    verticalAlign: "middle",
    marginRight: 6,
  },
};

/* ─── Preset Card ────────────────────────────────────────────────── */

function PresetCard({
  preset,
  isActive,
  onSelect,
}: {
  preset: ThemeConfig;
  isActive: boolean;
  onSelect: () => void;
}) {
  const swatchTokens = ["--background", "--primary", "--accent", "--chart-1", "--destructive"];
  return (
    <button
      type="button"
      style={styles.presetCard(isActive)}
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget.style.borderColor = "var(--muted-foreground)");
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget.style.borderColor = "var(--border)");
      }}
    >
      {isActive && <span style={styles.activeBadge}>Active</span>}
      <p style={styles.presetName}>{preset.name}</p>
      <p style={styles.presetDesc}>{preset.description}</p>
      <div style={styles.presetColors}>
        {swatchTokens.map((t) => (
          <div key={t} style={styles.presetSwatch(preset.tokens[t] ?? "#333")} />
        ))}
      </div>
    </button>
  );
}

/* ─── Token Editor Row ───────────────────────────────────────────── */

function TokenRow({
  token,
  value,
  onChange,
}: {
  token: string;
  value: string;
  onChange: (token: string, value: string) => void;
}) {
  const hex = oklchToHex(value);
  return (
    <div style={styles.tokenRow}>
      <input
        type="color"
        style={styles.colorInput}
        value={hex}
        onChange={(e) => {
          const newOklch = hexToOklch(e.target.value);
          onChange(token, newOklch);
        }}
        title={tokenDisplayName(token)}
      />
      <span style={styles.tokenLabel}>{tokenDisplayName(token)}</span>
      <span style={styles.tokenValue}>{value}</span>
    </div>
  );
}

/* ─── Main Settings Page Component ───────────────────────────────── */

export function ThemeSettingsPage() {
  const activeThemeResult = usePluginData<ThemeConfig | null>("active-theme");
  const presetsResult = usePluginData<ThemeConfig[]>("presets");
  const applyTheme = usePluginAction("apply-theme");
  const resetTheme = usePluginAction("reset-theme");

  const [localTheme, setLocalTheme] = useState<ThemeConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const initialLoadDone = useRef(false);

  const presets: ThemeConfig[] = presetsResult.data ?? [];
  const serverTheme: ThemeConfig | null = activeThemeResult.data ?? null;

  useEffect(() => {
    if (initialLoadDone.current) return;
    if (serverTheme) {
      setLocalTheme(serverTheme);
      injectThemeCSS(serverTheme);
      initialLoadDone.current = true;
    } else if (presets.length > 0 && activeThemeResult.data === null) {
      initialLoadDone.current = true;
    }
  }, [serverTheme, presets, activeThemeResult.data]);

  const selectPreset = useCallback(
    (preset: ThemeConfig) => {
      const next = { ...preset, updatedAt: new Date().toISOString() };
      setLocalTheme(next);
      injectThemeCSS(next);
      setHasUnsaved(true);
      setSavedAt(null);
    },
    [],
  );

  const updateToken = useCallback(
    (token: string, value: string) => {
      setLocalTheme((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          tokens: { ...prev.tokens, [token]: value },
          updatedAt: new Date().toISOString(),
        };
        injectThemeCSS(next);
        return next;
      });
      setHasUnsaved(true);
      setSavedAt(null);
    },
    [],
  );

  const updateRadius = useCallback((value: string) => {
    setLocalTheme((prev) => {
      if (!prev) return prev;
      const next = { ...prev, radius: value, updatedAt: new Date().toISOString() };
      injectThemeCSS(next);
      return next;
    });
    setHasUnsaved(true);
    setSavedAt(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!localTheme) return;
    setSaving(true);
    try {
      await applyTheme(localTheme);
      setHasUnsaved(false);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to save theme:", err);
    } finally {
      setSaving(false);
    }
  }, [localTheme, applyTheme]);

  const handleReset = useCallback(async () => {
    setSaving(true);
    try {
      const result = await resetTheme({});
      const restored = result as unknown as ThemeConfig;
      setLocalTheme(restored);
      injectThemeCSS(restored);
      setHasUnsaved(false);
      setSavedAt(null);
    } catch (err) {
      console.error("Failed to reset theme:", err);
    } finally {
      setSaving(false);
    }
  }, [resetTheme]);

  const radiusNum = parseFloat(localTheme?.radius ?? "0") || 0;

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Theme</h2>
        <p style={styles.subtitle}>
          Choose a preset or fine-tune individual design tokens. Changes preview instantly.
        </p>
      </div>

      {/* Presets */}
      <div style={styles.section}>
        <p style={styles.sectionLabel}>Presets</p>
        <div style={styles.presetsGrid}>
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isActive={localTheme?.id === preset.id}
              onSelect={() => selectPreset(preset)}
            />
          ))}
        </div>
      </div>

      {/* Token Editor */}
      {localTheme && (
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Design Tokens</p>
          {TOKEN_GROUPS.map((group) => (
            <div key={group.label} style={styles.tokenGroup}>
              <div style={styles.tokenGroupHeader}>
                <p style={styles.tokenGroupLabel}>{group.label}</p>
                <p style={styles.tokenGroupDesc}>{group.description}</p>
              </div>
              {group.tokens.map((token) => (
                <TokenRow
                  key={token}
                  token={token}
                  value={localTheme.tokens[token] ?? ""}
                  onChange={updateToken}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Radius */}
      {localTheme && (
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Border Radius</p>
          <div style={styles.radiusSection}>
            <div style={styles.radiusPreview(localTheme.radius || "0")} />
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.125"
              value={radiusNum}
              onChange={(e) => updateRadius(`${e.target.value}rem`)}
              style={styles.rangeInput}
            />
            <span style={styles.radiusValue}>{localTheme.radius || "0"}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button
          type="button"
          style={{
            ...styles.btnPrimary,
            opacity: saving || !hasUnsaved ? 0.5 : 1,
            pointerEvents: saving || !hasUnsaved ? "none" : "auto",
          }}
          onClick={handleSave}
          disabled={saving || !hasUnsaved}
        >
          {saving ? "Saving\u2026" : "Save Theme"}
        </button>
        <button
          type="button"
          style={styles.btnSecondary}
          onClick={handleReset}
          disabled={saving}
        >
          Reset to Default
        </button>
        {savedAt && (
          <span style={styles.saved}>Saved at {savedAt}</span>
        )}
        {hasUnsaved && !savedAt && (
          <span style={{ ...styles.saved, color: "var(--chart-1)" }}>Unsaved changes</span>
        )}
      </div>
    </div>
  );
}
