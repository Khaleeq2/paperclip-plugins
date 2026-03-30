import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import {
  PLUGIN_ID,
  PLUGIN_VERSION,
  SLOT_IDS,
  EXPORT_NAMES,
} from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Theme Customizer",
  description:
    "In-app theme editor with live preview, curated presets, and shareable configurations. Override colors, radius, and design tokens without rebuilding.",
  author: "Khaleeq Fisher",
  categories: ["ui"],
  capabilities: [
    "plugin.state.read",
    "plugin.state.write",
    "instance.settings.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "settingsPage",
        id: SLOT_IDS.settingsPage,
        displayName: "Theme",
        exportName: EXPORT_NAMES.settingsPage,
      },
    ],
  },
};

export default manifest;
