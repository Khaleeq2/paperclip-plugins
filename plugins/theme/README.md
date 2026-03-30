# @blazo/paperclip-theme

In-app theme customizer for [Paperclip](https://github.com/paperclipai/paperclip) with live preview, curated presets, and shareable configurations.

## Features

- **Live Preview** — Changes apply instantly via CSS custom property injection. No rebuild, no refresh.
- **Curated Presets** — Ship with 6 carefully designed themes (dark + light variants).
- **Token Editor** — Fine-tune individual design tokens with color pickers grouped by role.
- **Border Radius** — Adjust global corner rounding with a visual slider.
- **Persistent** — Theme choices are saved server-side and restored on page load.
- **Shareable** — Export/import theme configs as JSON (coming soon).

## Presets

| Preset | Mode | Description |
|--------|------|-------------|
| Paperclip Dark | Dark | The stock Paperclip dark theme |
| Paperclip Light | Light | The stock Paperclip light theme |
| Midnight Blue | Dark | Deep navy surfaces with electric blue accents |
| Emerald Noir | Dark | Elegant dark with rich green highlights |
| Warm Sand | Light | Soft warm light theme with earthy tones |
| Rosé Twilight | Dark | Dusky pink-tinted dark theme with warm accents |

## Installation

```bash
# From the monorepo root
pnpm install
pnpm build

# Install into your Paperclip instance
paperclipai plugin install ./plugins/theme
```

## Usage

After installation, navigate to **Settings** in Paperclip. You'll find a new **Theme** section where you can:

1. Click a preset to instantly preview it
2. Fine-tune any token with the color picker
3. Adjust border radius with the slider
4. Click **Save Theme** to persist your choice

## License

MIT
