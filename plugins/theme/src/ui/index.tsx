import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

/* ─── Constants ──────────────────────────────────────────────────── */

const MAX_VISIBLE_PRESETS = 8;
const CARD_WIDTH = 192;
const CARD_GAP = 10;
const SWATCH_TOKENS = ["--background", "--primary", "--accent", "--chart-1", "--destructive"];

const FONT_OPTIONS_SANS = [
  { label: "System Default", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Geist", value: "'Geist', sans-serif" },
  { label: "DM Sans", value: "'DM Sans', sans-serif" },
  { label: "Manrope", value: "'Manrope', sans-serif" },
  { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif" },
  { label: "IBM Plex Sans", value: "'IBM Plex Sans', sans-serif" },
  { label: "Nunito", value: "'Nunito', sans-serif" },
  { label: "Custom", value: "__custom__" },
];

const FONT_OPTIONS_MONO = [
  { label: "System Default", value: "'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace" },
  { label: "Geist Mono", value: "'Geist Mono', monospace" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
  { label: "Fira Code", value: "'Fira Code', monospace" },
  { label: "IBM Plex Mono", value: "'IBM Plex Mono', monospace" },
  { label: "Cascadia Code", value: "'Cascadia Code', monospace" },
  { label: "Custom", value: "__custom__" },
];

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

/* ─── Style definitions ──────────────────────────────────────────── */

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
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    margin: 0,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: "var(--muted-foreground)",
    margin: 0,
  },
  seeAllBtn: {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--primary)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px 0",
    outline: "none",
    transition: "opacity 150ms ease",
  },
  presetsScroller: {
    overflowX: "auto" as const,
    overflowY: "hidden" as const,
    WebkitOverflowScrolling: "touch" as const,
    scrollbarWidth: "thin" as const,
    paddingBottom: 4,
  },
  presetsTrack: {
    display: "grid",
    gridTemplateRows: "1fr 1fr",
    gridAutoFlow: "column" as const,
    gridAutoColumns: `${CARD_WIDTH}px`,
    gap: CARD_GAP,
  },
  presetCard: (isActive: boolean) => ({
    position: "relative" as const,
    width: CARD_WIDTH,
    padding: "12px 14px",
    borderRadius: 8,
    border: `1.5px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
    background: isActive ? "var(--accent)" : "transparent",
    cursor: "pointer",
    transition: "all 150ms ease",
    display: "flex",
    flexDirection: "column" as const,
    gap: 5,
    outline: "none",
    boxSizing: "border-box" as const,
    textAlign: "left" as const,
  }),
  presetName: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--foreground)",
    margin: 0,
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  },
  presetDesc: {
    fontSize: 11,
    color: "var(--muted-foreground)",
    margin: 0,
    lineHeight: 1.35,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden" as const,
  },
  presetMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  presetColors: {
    display: "flex",
    gap: 3,
  },
  presetSwatch: (color: string) => ({
    width: 14,
    height: 14,
    borderRadius: 3,
    background: color,
    border: "1px solid rgba(128,128,128,0.25)",
    flexShrink: 0,
  }),
  presetModeBadge: (isDark: boolean) => ({
    fontSize: 9,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "var(--muted-foreground)",
    background: "var(--muted)",
    padding: "1px 5px",
    borderRadius: 3,
    lineHeight: "16px",
  }),
  activeBadge: {
    position: "absolute" as const,
    top: 7,
    right: 8,
    fontSize: 9,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "var(--primary-foreground)",
    background: "var(--primary)",
    padding: "1px 6px",
    borderRadius: 999,
    lineHeight: "16px",
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
  stickyBar: {
    position: "sticky" as const,
    top: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 16px",
    background: "var(--card)",
    borderBottom: "1px solid var(--border)",
    borderRadius: 8,
    marginBottom: -8,
  },
  stickyThemeInfo: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 1,
    minWidth: 0,
  },
  stickyThemeName: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--foreground)",
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  },
  stickyStatus: {
    fontSize: 11,
    color: "var(--muted-foreground)",
  },
  stickyBtns: {
    display: "flex",
    gap: 8,
    flexShrink: 0,
  },
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
  fontRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    padding: "6px 0",
  },
  fontLabel: {
    fontSize: 13,
    fontWeight: 400,
    color: "var(--foreground)",
  },
  fontSelect: {
    padding: "7px 10px",
    borderRadius: 6,
    border: "1.5px solid var(--border)",
    background: "var(--muted)",
    color: "var(--foreground)",
    fontSize: 13,
    cursor: "pointer",
    outline: "none",
    width: "100%",
  },
  fontCustomInput: {
    marginTop: 6,
    padding: "7px 10px",
    borderRadius: 6,
    border: "1.5px solid var(--border)",
    background: "var(--muted)",
    color: "var(--foreground)",
    fontSize: 12,
    fontFamily: "var(--font-mono, monospace)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    width: "min(640px, calc(100vw - 48px))",
    maxHeight: "min(560px, calc(100vh - 80px))",
    display: "flex",
    flexDirection: "column" as const,
    boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
    overflow: "hidden" as const,
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px 0 20px",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
    color: "var(--foreground)",
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    color: "var(--muted-foreground)",
    fontSize: 18,
    lineHeight: 1,
    outline: "none",
    transition: "background 150ms ease",
  },
  modalSearch: {
    margin: "12px 20px",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1.5px solid var(--border)",
    background: "var(--muted)",
    color: "var(--foreground)",
    fontSize: 13,
    outline: "none",
    width: "calc(100% - 40px)",
    boxSizing: "border-box" as const,
    transition: "border-color 150ms ease",
  },
  modalCount: {
    fontSize: 11,
    color: "var(--muted-foreground)",
    padding: "0 20px 8px 20px",
    margin: 0,
  },
  modalGrid: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "0 20px 20px 20px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 10,
    alignContent: "start",
  },
};

/* ─── Preset Card ────────────────────────────────────────────────── */

function PresetCard({
  preset,
  isActive,
  onSelect,
  compact,
}: {
  preset: ThemeConfig;
  isActive: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const cardStyle = compact
    ? {
        ...styles.presetCard(isActive),
        width: "auto" as const,
      }
    : styles.presetCard(isActive);

  return (
    <button
      type="button"
      style={cardStyle}
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
      <div style={styles.presetMeta}>
        <div style={styles.presetColors}>
          {SWATCH_TOKENS.map((t) => (
            <div key={t} style={styles.presetSwatch(preset.tokens[t] ?? "#333")} />
          ))}
        </div>
        <span style={styles.presetModeBadge(preset.isDark)}>
          {preset.isDark ? "Dark" : "Light"}
        </span>
      </div>
    </button>
  );
}

/* ─── "See All" Modal ────────────────────────────────────────────── */

function PresetModal({
  presets,
  activeId,
  onSelect,
  onClose,
}: {
  presets: ThemeConfig[];
  activeId: string | undefined;
  onSelect: (preset: ThemeConfig) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!search.trim()) return presets;
    const q = search.toLowerCase().trim();
    return presets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        (p.isDark ? "dark" : "light").includes(q),
    );
  }, [presets, search]);

  return (
    <div
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>All Themes</h3>
          <button
            type="button"
            style={styles.modalCloseBtn}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
            }}
          >
            &#x2715;
          </button>
        </div>
        <input
          ref={searchRef}
          type="text"
          placeholder="Search themes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.modalSearch}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        />
        <p style={styles.modalCount}>
          {filtered.length} of {presets.length} themes
        </p>
        <div style={styles.modalGrid}>
          {filtered.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isActive={activeId === preset.id}
              onSelect={() => {
                onSelect(preset);
                onClose();
              }}
              compact
            />
          ))}
          {filtered.length === 0 && (
            <p style={{ ...styles.subtitle, gridColumn: "1 / -1", textAlign: "center" as const, padding: "32px 0" }}>
              No themes match your search.
            </p>
          )}
        </div>
      </div>
    </div>
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

/* ─── Font Row ───────────────────────────────────────────────────── */

function FontRow({
  label,
  token,
  value,
  options,
  onChange,
}: {
  label: string;
  token: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (token: string, value: string) => void;
}) {
  const knownOption = options.find((o) => o.value !== "__custom__" && o.value === value);
  const isCustom = !knownOption && value !== "";
  const selectValue = isCustom ? "__custom__" : (value || options[0]!.value);
  const [showCustom, setShowCustom] = useState(isCustom);

  return (
    <div style={styles.fontRow}>
      <span style={styles.fontLabel}>{label}</span>
      <select
        style={styles.fontSelect}
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === "__custom__") {
            setShowCustom(true);
          } else {
            setShowCustom(false);
            onChange(token, e.target.value);
          }
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {showCustom && (
        <input
          type="text"
          placeholder="e.g. 'Roboto', sans-serif"
          defaultValue={isCustom ? value : ""}
          style={styles.fontCustomInput}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v) onChange(token, v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value.trim();
              if (v) onChange(token, v);
            }
          }}
        />
      )}
    </div>
  );
}

/* ─── Main Settings Page Component ───────────────────────────────── */

export function ThemeSettingsPage() {
  const activeThemeResult = usePluginData<ThemeConfig | null>("active-theme");
  const presetsResult = usePluginData<ThemeConfig[]>("presets");
  const applyTheme = usePluginAction("apply-theme");
  const resetTheme = usePluginAction("reset-theme");
  const importThemeAction = usePluginAction("import-theme");

  const [localTheme, setLocalTheme] = useState<ThemeConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets: ThemeConfig[] = presetsResult.data ?? [];
  const serverTheme: ThemeConfig | null = activeThemeResult.data ?? null;

  const visiblePresets = presets.slice(0, MAX_VISIBLE_PRESETS);
  const hasMore = presets.length > MAX_VISIBLE_PRESETS;

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

  const handleExport = useCallback(() => {
    if (!localTheme) return;
    const payload = JSON.stringify(localTheme, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${localTheme.id}.theme.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [localTheme]);

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setImportError(null);
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed: unknown = JSON.parse(text);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          typeof (parsed as Record<string, unknown>).id !== "string" ||
          typeof (parsed as Record<string, unknown>).name !== "string" ||
          typeof (parsed as Record<string, unknown>).tokens !== "object" ||
          typeof (parsed as Record<string, unknown>).isDark !== "boolean"
        ) {
          setImportError("Invalid theme file: must contain id, name, tokens, and isDark fields.");
          return;
        }
        const result = await importThemeAction(parsed);
        const imported = result as unknown as ThemeConfig;
        setLocalTheme(imported);
        injectThemeCSS(imported);
        setHasUnsaved(true);
        setSavedAt(null);
      } catch (err) {
        setImportError(`Import failed: ${String(err)}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [importThemeAction],
  );

  const radiusNum = parseFloat(localTheme?.radius ?? "0") || 0;

  return (
    <div style={styles.root}>
      {/* Sticky Save Bar */}
      <div style={styles.stickyBar}>
        <div style={styles.stickyThemeInfo}>
          <span style={styles.stickyThemeName}>
            {localTheme ? localTheme.name : "No theme selected"}
          </span>
          <span style={styles.stickyStatus}>
            {saving
              ? "Saving\u2026"
              : savedAt
              ? `Saved at ${savedAt}`
              : hasUnsaved
              ? "Unsaved changes"
              : "Saved"}
          </span>
        </div>
        <div style={styles.stickyBtns}>
          <button
            type="button"
            style={{
              ...styles.btnSecondary,
              padding: "7px 14px",
              fontSize: 12,
            }}
            onClick={handleReset}
            disabled={saving}
          >
            Reset
          </button>
          <button
            type="button"
            style={{
              ...styles.btnPrimary,
              padding: "7px 14px",
              fontSize: 12,
              opacity: saving || !hasUnsaved ? 0.45 : 1,
              pointerEvents: saving || !hasUnsaved ? "none" : "auto",
            }}
            onClick={handleSave}
            disabled={saving || !hasUnsaved}
          >
            Save Theme
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Theme</h2>
        <p style={styles.subtitle}>
          Choose a preset or fine-tune individual design tokens. Changes preview instantly.
        </p>
      </div>

      {/* Presets — 2-row horizontal scroll */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.sectionLabel}>Presets</p>
          {hasMore && (
            <button
              type="button"
              style={styles.seeAllBtn}
              onClick={() => setShowModal(true)}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              See all {presets.length} themes
            </button>
          )}
        </div>
        <div style={styles.presetsScroller}>
          <div style={styles.presetsTrack}>
            {visiblePresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                isActive={localTheme?.id === preset.id}
                onSelect={() => selectPreset(preset)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* "See All" modal */}
      {showModal && (
        <PresetModal
          presets={presets}
          activeId={localTheme?.id}
          onSelect={selectPreset}
          onClose={() => setShowModal(false)}
        />
      )}

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

      {/* Typography */}
      {localTheme && (
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Typography</p>
          <p style={{ ...styles.subtitle, marginTop: -8 }}>
            Choose fonts for the UI. Select a preset or enter a custom CSS font stack.
          </p>
          <FontRow
            label="Sans-serif (UI font)"
            token="--font-sans"
            value={localTheme.tokens["--font-sans"] ?? ""}
            options={FONT_OPTIONS_SANS}
            onChange={updateToken}
          />
          <FontRow
            label="Monospace (code font)"
            token="--font-mono"
            value={localTheme.tokens["--font-mono"] ?? ""}
            options={FONT_OPTIONS_MONO}
            onChange={updateToken}
          />
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

      {/* Import / Export */}
      <div style={styles.section}>
        <p style={styles.sectionLabel}>Share</p>
        <p style={{ ...styles.subtitle, marginTop: -8 }}>
          Export your current theme as a JSON file to share with others, or import a community theme.
        </p>
        <div style={styles.actions}>
          <button
            type="button"
            style={{
              ...styles.btnSecondary,
              opacity: localTheme ? 1 : 0.5,
              pointerEvents: localTheme ? "auto" : "none",
            }}
            onClick={handleExport}
            disabled={!localTheme}
          >
            Export Theme
          </button>
          <button
            type="button"
            style={styles.btnSecondary}
            onClick={() => fileInputRef.current?.click()}
          >
            Import Theme
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
        </div>
        {importError && (
          <p style={{ fontSize: 12, color: "var(--destructive)", margin: 0 }}>
            {importError}
          </p>
        )}
      </div>
    </div>
  );
}
