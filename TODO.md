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

## 🚀 Phase 3: Production Readiness & Polish (NEXT STEPS)

### 1. Final Live Verification
*   [ ] **Manual Pi Session Test**: Load the extension into a live Pi coding session and manually test the `/pi-agent-bus tools` and `/pi-agent-bus agent` slash commands.
*   [ ] **Verify `pi-context` Tool Access**: Confirm whether `context_tag`, `context_log`, `context_checkout` are directly exposed via `pi.tools` in the live Pi session. If not, the bridge config presets may need adjustment.

### 2. Documentation
*   [ ] **API Documentation**: Generate or write clear API docs for `MessageBus` and `Agent` public methods so developers know how to write custom agent classes.
*   [ ] **Workflow Examples**: Create a `WORKFLOW_EXAMPLES.md` showing how to combine `pi-agent-bus`, `pi-qmd-ledger`, and `pi-link` in a real scenario.
*   [ ] **Troubleshooting Guide**: Add a section in the bridge README for common installation/configuration issues.

### 3. Publishing
*   [ ] **Publish `pi-agent-bus-node`**: Publish the core library to npm so users building external agents can depend on it.
*   [ ] **Publish `pi-agent-bus-bridge`**: Publish the bundled Pi extension. Ensure the `package.json` is completely clean of `workspace:*` references in the published tarball.

### 4. Downstream Integration
*   [ ] **Migrate `microfactory`**: Update the `microfactory` project to consume these newly published (or locally linked) monorepo packages instead of ad-hoc scripts.

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
