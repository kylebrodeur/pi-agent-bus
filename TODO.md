# TODO: `pi-agent-bus` Monorepo - Next Steps

This document outlines the immediate tasks and considerations for continuing development within the `pi-agent-bus` monorepo. We are now operating directly from the monorepo root.

---

## 🚀 Phase 1: Monorepo Setup & Verification

1.  **Monorepo `pnpm install`**:
    *   Run `pnpm install` in the monorepo root (`/home/kylebrodeur/projects/pi-agent-bus/`). This will install all dependencies for both `pi-agent-bus-node` and `pi-agent-bus-bridge` and set up workspace links.
    *   *Verification*: `ls -la packages/pi-agent-bus-node/node_modules` and `ls -la packages/pi-agent-bus-bridge/node_modules` should show symlinks/installed dependencies.

2.  **Build All Packages**:
    *   Run `pnpm -r build` in the monorepo root.
    *   *Verification*: Both `packages/pi-agent-bus-node/dist` and `packages/pi-agent-bus-bridge/dist` directories should exist and contain compiled JavaScript/TypeScript definition files.

3.  **Install `pi-agent-bus-bridge` Pi Extension**:
    *   Create a symlink from your Pi's extensions directory to the bridge package within this monorepo.
    *   **Command**: `ln -s $(pwd)/packages/pi-agent-bus-bridge /home/kylebrodeur/projects/microfactory/.pi/extensions/pi-agent-bus-bridge` (assuming Pi's project is at `/home/kylebrodeur/projects/microfactory`).
    *   *Verification*: Restart Pi and check `pi.extensions.list()` for `pi-agent-bus-bridge`.

4.  **Configure `pi-agent-bus-bridge`**:
    *   Create `packages/pi-agent-bus-bridge/config.json` based on the example provided in the monorepo's `README.md`.
    *   Customize `exposedPiTools`, `piLinkEventMappings`, and `busToPiLinkMappings` as needed.
    *   *Verification*: Bridge logs (`pi.log.info`) should show it loading tools and mappings.

3.  **Verify `pi-context` Tool Access**:
    *   Confirm whether `context_tag`, `context_log`, `context_checkout` are directly exposed via `pi.tools` in a live Pi session.
    *   If not, document how the bridge might need to specifically interact with the `pi-context` extension's API (if different from `pi.tools`).
    *   *Task*: Verify `pi-context` tool access and update bridge config/docs as needed.

## 🛠️ Phase 2: Testing & Development (From Monorepo Root)

1.  **Test `pi-agent-bus-node` Core Functionality**:
    *   Write unit/integration tests for `MessageBus`, `Agent` (with `invokePiTool`), `TaskQueue`, and `LLMProvider`.
    *   *Task*: Create `packages/pi-agent-bus-node/test/core.test.ts`.

2.  **Test `pi-agent-bus-bridge` Integration**:
    *   Verify `invokePiTool` works from an isolated agent (e.g., using `subagent` or a simple Node.js script) to call `pi.tools.read` or `pi.tools.append_ledger`.
    *   Verify `pi-link` inbound/outbound mappings work.
    *   *Task*: Create a small test agent in `packages/pi-agent-bus-node/examples` and a test script for the bridge.

3.  **Migrate `microfactory` to Monorepo Build**:
    *   Update `microfactory/package.json` to reference `pi-agent-bus-node` and `pi-agent-bus-bridge` using `workspace:*` (if `microfactory` is also part of this monorepo, or directly via `file:` protocol if they are separate repos but linked locally).
    *   Update `microfactory/packages/engine/src/sim.ts` and `microfactory/packages/agents/src/nodeAgent.ts` to reflect any final import path changes.
    *   *Task*: Adapt `microfactory` to use the monorepo's versions.

## 📝 Phase 3: Documentation & Polish

1.  **Monorepo `README.md`**: Review and enhance the root `README.md` (which was just created) for clarity.
2.  **Package `README.md`s**: Ensure `packages/pi-agent-bus-node/README.md` and `packages/pi-agent-bus-bridge/README.md` are up-to-date and point to the monorepo root for high-level info.
3.  **API Documentation**: Generate API docs (e.g., TypeDoc) for `pi-agent-bus-node`.

---

This `TODO.md` will serve as the immediate roadmap for development from the monorepo root.
