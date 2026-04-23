# `pi-agent-bus` (Bridge Extension)

This package (internally known as `pi-agent-bus-bridge` in the monorepo) provides the Pi Extension bridge for the `pi-agent-bus` ecosystem. It connects isolated agent workflows running on `pi-agent-bus-node` to the main Pi execution environment via tools and messaging.

## Features

- **Tool Routing Logic:** Proxies `pi.tools` calls from the isolated agents to the main Pi process.
- **`pi-link` Integration:** Allows sending orchestration commands and listening for broadcast agent states.
- **Runtime Configuration:** Exposes interactive `/pi-agent-bus` slash commands to configure, onboard, and manage agents at runtime.

## Installation

### From NPM Registry
Install the extension directly using the `pi` CLI:
```bash
pi install npm:pi-agent-bus
```

### From Source
If working within the monorepo, symlink or copy the built `/dist` directory to your `.pi/extensions/` directory.

## Troubleshooting Guide

### Issue: The `/pi-agent-bus` slash commands are not appearing
* **Check the Extension Path**: Ensure the built extension is correctly linked or placed in `.pi/extensions/`.
* **Check the Extension Output**: Ensure `pnpm build` was run in the monorepo root to build `pi-agent-bus-bridge` using `tsup`.
* **Restart Pi**: Extension metadata is often loaded at startup. You might need to restart Pi.

### Issue: Agent tool calls are timing out
* **Check the Bridge Topic**: Ensure your agent is publishing to the correct topic (`pi_tool_bridge_requests`) when calling `invokePiTool`.
* **Verify Tool Permissions**: If an agent requests a tool that is not allowed in `config.essential.json` (or your active config), the bridge will reject it. Check the active configuration file in `packages/pi-agent-bus-bridge/`.

### Issue: Cannot find module `pi-agent-bus-node`
* **Dependency Bundling**: `pi-agent-bus-node` is bundled into the bridge extension via `tsup`. If you encounter module resolution errors, ensure `tsup.config.ts` has `noExternal: ["pi-agent-bus-node"]` configured and that the build succeeded.

## Configurations

The bridge provides several configuration presets in the root of the package:
- `config.essential.json`
- `config.with-context.json`
- `config.with-link.json`
- `config.with-model-router.json`

To switch configs, use:
`/pi-agent-bus tools load <preset>`
