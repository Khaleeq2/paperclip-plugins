# Paperclip Plugins

Community plugins for [Paperclip](https://github.com/paperclipai/paperclip) — the open-source AI agent orchestrator.

## Plugins

| Plugin | Description | Status |
|--------|-------------|--------|
| [`@blazo/paperclip-theme`](./plugins/theme) | In-app theme customizer with live preview, presets, and shareable configs | ✅ Ready |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9.15+
- A running Paperclip instance

### Install a plugin

```bash
# Build the plugin
pnpm install
pnpm build

# Install into your Paperclip instance
paperclipai plugin install ./plugins/theme
```

### Development

```bash
pnpm install
pnpm build          # Build all plugins
pnpm clean          # Clean all dist/
pnpm typecheck      # Type-check all plugins
```

## Contributing

1. Create a new directory under `plugins/`
2. Follow the [Paperclip Plugin SDK](https://github.com/paperclipai/paperclip/tree/master/packages/plugins/sdk) conventions
3. Add your plugin to the table above

## License

MIT
