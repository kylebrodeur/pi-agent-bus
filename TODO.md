# TODO: `pi-agent-bus` Monorepo - Next Steps

This document outlines the current state and immediate next steps for the `pi-agent-bus` monorepo.

---

## ✅ Phase 1: Core Infrastructure & Testing (COMPLETED)

1.  **Monorepo Setup**: `pnpm` workspaces configured, dependencies linked.
2.  **Core Library (`pi-agent-bus-node`)**:
    *   `MessageBus`, `TaskQueue`, `Agent` base class, `LLMProvider` interface implemented.
    *   100% test coverage (31/31 tests passing).
    *   Proper TypeScript compilation and barrel exports (`dist/src/index.js`).
3.  **Bridge Extension (`pi-agent-bus-bridge`)**:
    *   Tool routing logic, `pi-link` integration, and runtime configuration (`/pi-agent-bus tools ...`) implemented.
    *   Integration tests passing, verifying the bridge can correctly route `invokePiTool` calls from agents.
    *   `tsup` bundling configured. The `pi-agent-bus-node` dependency is moved to `devDependencies` to ensure clean npm publishing of a standalone extension bundle.

## ✅ Phase 2: Agent Management & Onboarding (COMPLETED)

1.  **Markdown-Based Agent Definitions**:
    *   Agents can now be defined using YAML frontmatter in `.agent.md` files (e.g., in `.agents/`).
    *   `AgentRegistry` and `AgentLoader` map these definitions to concrete TypeScript classes at runtime.
2.  **Demo Library & Installation**:
    *   A library of example agents (`tester`, `auditor`) is available in `packages/pi-agent-bus-node/demos`.
    *   Users can list and install them via `/pi-agent-bus agent demos` and `/pi-agent-bus agent install <id>`.
3.  **Agent Creation Wizard**:
    *   `/pi-agent-bus agent create <id> <role> [capabilities]` allows quick, deterministic generation of agent templates.
4.  **Collaborative Discovery Mode**:
    *   `/pi-agent-bus analyze` utilizes the new `AuditTool` to perform a low-token-cost scan of the project. It generates a `CapabilityReport` (listing active agents, registered types, and TODOs) so an AI consultant can propose new agents without reading the entire codebase.

---

## ✅ Phase 3: Production Readiness & Polish (COMPLETED)

### 1. Final Live Verification
*   [x] **Manual Pi Session Test**: Load the extension into a live Pi coding session and manually test the `/pi-agent-bus tools` and `/pi-agent-bus agent` slash commands.
*   [x] **Verify `pi-context` Tool Access**: Confirm whether `context_tag`, `context_log`, `context_checkout` are directly exposed via `pi.tools` in the live Pi session. If not, the bridge config presets may need adjustment.

### 2. Documentation
*   [x] **API Documentation**: Generate or write clear API docs for `MessageBus` and `Agent` public methods so developers know how to write custom agent classes.
*   [x] **Workflow Examples**: Create a `WORKFLOW_EXAMPLES.md` showing how to combine `pi-agent-bus`, `pi-qmd-ledger`, and `pi-link` in a real scenario.
*   [x] **Troubleshooting Guide**: Add a section in the bridge README for common installation/configuration issues.

### 3. Publishing
*   [ ] **Bundle from root**: This monorepo is published as a **single bundled package** from the project root, not as separate packages. The root `package.json` should define the published artifact (`files`, `main`, `types`, etc.). Remove `"private": true` from root `package.json` before publishing.
*   [ ] **Ensure clean bundle**: Verify `workspace:*` references are resolved and no dev tooling leaks into the published tarball.
*   [ ] **Manual publish**: Maintainer will run the publish command from root when ready.

---

## 🚀 Phase 4: Bundle, Publish & Verify (NEXT STEPS)

> **Note**: This monorepo is published as a **single bundled package** from the project root. The two sub-packages (`pi-agent-bus-node` and `pi-agent-bus-bridge`) are not published separately.

### 1. Pre-Publish Checklist
*   [ ] **Clean builds**: Run `pnpm -r build` and verify no errors in both packages.
*   [ ] **Test passes**: Run `pnpm -r test` and ensure all tests pass (31/31 in node, bridge integration tests).
*   [ ] **Version bump**: Update the version in **root** `package.json`. Keep sub-package versions in sync for clarity.
*   [ ] **Remove `"private"`**: Ensure root `package.json` does **not** have `"private": true`.
*   [ ] **Bundle script**: Confirm or add a `bundle` / `prepack` script in root `package.json` that produces the publishable artifact (e.g., using `tsup` or `pnpm pack` with `publishConfig.directory`).
*   [ ] **Changelog**: Generate or update `CHANGELOG.md` with release notes.

### 2. Publish from Root
*   [ ] **Build**: `pnpm -r build`
*   [ ] **Verify tarball**: `pnpm pack` (dry-run) and inspect the contents — ensure `workspace:*` is resolved and no dev tools leak in.
*   [ ] **Publish**: Run `pnpm publish --access public` from the **project root**.
*   [ ] **Verify package**: Check [npmjs.com/package/pi-agent-bus-monorepo](https://www.npmjs.com) (or whatever the root `name` is).

### 3. Post-Publish Verification
*   [ ] **Install via Pi CLI**: `pi install npm:pi-agent-bus` and verify `/pi-agent-bus tools list` works.
*   [ ] **Standalone test**: Install in a fresh Node.js project and verify `require('pi-agent-bus-node')` works.
*   [ ] **GitHub release**: Create a GitHub release tag (`v0.1.0`) with release notes.

---

## 🚀 Phase 5: Post-Launch & Downstream Integration (FUTURE)

### 1. Migrate Downstream Projects
*   [ ] **Migrate `microfactory`**: Update the `microfactory` project to consume these newly published monorepo packages instead of ad-hoc scripts. Validate the event-driven approach in a real-world scenario.
*   [ ] **Feedback Loop**: Gather feedback from the `microfactory` integration to identify any missing features in the `pi-agent-bus-node` core or the `pi-agent-bus` bridge.

### 2. Community & Ecosystem
*   [ ] **Agent Marketplace**: Publish additional demo agents to the `.agents/` ecosystem.
*   [ ] **Documentation Site**: Consider a GitHub Pages site or dedicated docs for API reference.
*   [ ] **CI/CD**: Add GitHub Actions for automated testing, building, and publishing on tag push.

---

## 📊 Feature Comparison: `pi-agent-bus` vs `pi-subagents` (Archived)

*`pi-subagents` was archived as too generalized and inflexible. `pi-agent-bus` replaces it with a robust, event-driven architecture.*

| Capability | `pi-subagents` (Archived) | `pi-agent-bus` (Current) | Improvement |
|------------|----------------------------|--------------------------|-------------|
| **Agent Communication** | Direct subagent spawning | MessageBus pub/sub | Decouples agents; no O(n²) spawning overhead |
| **Tool Exposure** | All or nothing | Configurable whitelist | Security boundary; runtime config without restart |
| **Inter-Agent Messaging** | None | Direct topics + broadcast | Real-time coordination between agents |
| **Message History** | None | Configurable history limits | Audit trail, replay, learning from past runs |
| **Task Queue** | No built-in mgmt | `TaskQueue` with lifecycle | Prevents double-work; clear ownership |
| **Configuration** | Static skill files only | Runtime slash commands | Dynamic without restart |
| **LLM Provider** | Not abstracted | `LLMProvider` interface | Swappable backends |
| **Agent Onboarding** | Manual | `.agent.md` & `AgentLoader` | Data-driven agent generation and discovery |
