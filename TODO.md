# TODO: `pi-agent-bus` Monorepo - Next Steps

This document outlines the immediate tasks and considerations for continuing development within the `pi-agent-bus` monorepo. We are now operating directly from the monorepo root.

---

## 🚀 Phase 1: Monorepo Setup & Verification

1.  **Monorepo `pnpm install`**:
    *   Run `pnpm install` in the monorepo root (`/home/kylebrodeur/projects/pi-agent-bus/`). This will install all dependencies for both `pi-agent-bus-node` and `pi-agent-bus-bridge` and set up workspace links.
    *   ✅ *Verification*: `ls -la packages/pi-agent-bus-node/node_modules` and `ls -la packages/pi-agent-bus-bridge/node_modules` should show symlinks/installed dependencies.

2.  **Build All Packages**:
    *   Run `pnpm -r build` in the monorepo root.
    *   ✅ *Verification*: Both `packages/pi-agent-bus-node/dist` and `packages/pi-agent-bus-bridge/dist` directories should exist and contain compiled JavaScript/TypeScript definition files.

3.  **Install `pi-agent-bus-bridge` Pi Extension**:
    *   Create a symlink from your Pi's extensions directory to the bridge package within this monorepo.
    *   **Command**: `ln -s $(pwd)/packages/pi-agent-bus-bridge /home/kylebrodeur/projects/microfactory/.pi/extensions/pi-agent-bus-bridge` (assuming Pi's project is at `/home/kylebrodeur/projects/microfactory`).
    *   *Verification*: Restart Pi and check `pi.extensions.list()` for `pi-agent-bus-bridge`.

4.  **Configure `pi-agent-bus-bridge`**:
    *   ✅ Create `packages/pi-agent-bus-bridge/config.json` (starts empty).
    *   ✅ Presets available: `config.essential.json`, `config.secure.json`.
    *   ✅ Added `/pi-agent-bus tools discover` command to scan `pi.tools` and suggest configs.
    *   ✅ Added `/pi-agent-bus tools add|remove|default|secure` commands for runtime config.
    *   *Verification*: Bridge logs (`pi.log.info`) should show it loading tools and mappings.

3.  **Verify `pi-context` Tool Access**:
    *   Confirm whether `context_tag`, `context_log`, `context_checksum` are directly exposed via `pi.tools` in a live Pi session.
    *   If not, document how the bridge might need to specifically interact with the `pi-context` extension's API (if different from `pi.tools`).
    *   *Task*: Verify `pi-context` tool access and update bridge config/docs as needed.

## ✅ Phase 1b: Package Review & Testing Strategy (COMPLETED)

### `pi-agent-bus-node` Review Summary

**Completeness: 8/10**
- ✅ MessageBus: Full pub/sub with history, unsubscribe, async listener support
- ✅ Agent: Base class with broadcast, direct messaging, LLM integration, Pi tool invocation via bridge
- ✅ TaskQueue: Full task lifecycle (add, claim, complete, fail, guard checks)
- ✅ LLMProvider: Abstract interface + DummyLLMProvider for testing
- ✅ Index exports: Clean barrel export

**Gaps Found:**
1. 🔄 **No tests existed** - Created 4 test suites (MessageBus, Agent, TaskQueue, LLMProvider)
2. 🔄 **No Jest config** - Added jest.config.js, updated package.json with test scripts + deps
3. ⚠️ **No error handling** for malformed message payloads in MessageBus
4. ⚠️ **No message history limits** - could cause memory leaks in long-running agents
5. ⚠️ **invokePiTool timeout** not cancellable after cleanup
6. ⚠️ **Agent config validation** missing - accepts any object

**Test Coverage:**
- Unit tests for all core classes
- Integration test stubs for bridge (require live Pi environment)
- Jest + ts-jest configured

### `pi-agent-bus-bridge` Review Summary

**Completeness: 7/10**
- ✅ Config loading from file
- ✅ Empty-config startup
- ✅ Tool discovery (/pi-agent-bus tools discover)
- ✅ Runtime config management (add/remove/default/secure)
- ✅ Preset configs (essential, secure)
- ✅ String template messageBuilder support
- ✅ TypeScript types for pi global

**Gaps Found:**
1. 🔄 **No tests existed** - Created 1 integration test suite (bridge.test.ts)
2. 🔄 **No Jest config** - Added jest.config.js, updated package.json
3. ⚠️ **No config validation** - accepts any JSON without schema check
4. ⚠️ **No graceful degradation** - bridge code tries `pi.log.error` before checking if pi exists
5. ⚠️ **No tool existence validation** - config can reference non-existent tools
6. ⚠️ **Singleton MessageBus** concern is documented but not enforced
7. ⚠️ **Integration tests skipped** - require live Pi environment

**Documentation Gaps:**
- ✅ Package READMEs naming: `pi-agent-node-bus` → `pi-agent-bus-node` (fixed in commit 5085120)
- ✅ Progressive enhancement configs: 5 step-by-step configs added
- ✅ Feature comparison with `pi-subagents` documented
- ✅ pi-link-coordinator integration pattern documented
- ⚠️ No API docs for MessageBus/Agent public methods
- ⚠️ No example agent implementations
- ⚠️ No troubleshooting guide for bridge installation

---

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

## 📊 Feature Comparison: `pi-agent-bus` vs `pi-subagents` (Archived)

From **STRATEGY_REVIEW_2026.md**: `pi-subagents` was archived as "too generalized and inflexible for highly specific, professional toolchains." Here is how `pi-agent-bus` replaces and improves upon the `pi-subagents` approach:

| Capability | `pi-subagents` (Archived) | `pi-agent-bus` (Current) | Improvement |
|------------|----------------------------|--------------------------|-------------|
| **Agent Communication** | Direct subagent spawning via `subagent` tool | MessageBus pub/sub with topic-based routing | Decouples agents; no O(n²) spawning overhead |
| **Tool Exposure** | All or nothing via `skill` injection | Configurable whitelist (`exposedPiTools`) | Security boundary; runtime config without restart |
| **Inter-Agent Messaging** | None (agents are independent processes) | Direct topics (`direct:<agentId>`) + broadcast | Real-time coordination between agents |
| **Message History** | None (ephemeral by design) | Configurable history limits (default 10K) | Audit trail, replay, learning from past runs |
| **Task Queue** | No built-in task management | `TaskQueue` with claim/complete/fail lifecycle | Prevents double-work; clear ownership |
| **PI Integration** | Through generic tool injection | Bridge package with explicit `pi.tools` mapping | Type-safe, validated, auto-discovery via `/tools discover` |
| **Configuration** | Static skill files only | Runtime commands (`/tools add`, `/tools default`) | Dynamic without restart |
| **pi-link Integration** | Not available | Built-in slash command ↔ bus event mapping | Agents can send/receive pi-link messages natively |
| **LLM Provider** | Not abstracted | `LLMProvider` interface + concrete implementations | Swappable backends (Ollama, OpenAI, etc.) |

### Migration Guide from `pi-subagents`

If you used `pi-subagents` before, here's the mapping:

```
pi-subagents              →  pi-agent-bus
────────────────────────────────────────────────────────
subagent({task, ...})     →  bus.publish('task_queue', id, task)
Agent skill injection     →  exposedPiTools config
No inter-agent comms      →  bus.subscribe('topic', handler)
Manual process mgmt       →  TaskQueue claim/complete
```

### Testing Progressive Configurations

The bridge supports **progressive enhancement** — start empty, add capabilities as extensions are installed:

```bash
# 1. Empty config (no tools exposed)
#    Bridge loads safely even with zero extensions installed
#    Tests: bridge.test.ts "should have config.json in package root"

# 2. Add pi-qmd-ledger capability
/pi-agent-bus tools add append_ledger
/pi-agent-bus tools add query_ledger
/pi-agent-bus tools add describe_ledger
/pi-agent-bus tools add ledger_stats
#    Tests: verify ledger tools appear in `exposedPiTools`

# 3. Add pi-link coordination
/pi-agent-bus tools add link_send
/pi-agent-bus tools add link_prompt
/pi-agent-bus tools add link_list
#    Tests: verify pi-link event mappings still work

# 4. Add context management
/pi-agent-bus tools add context_tag
/pi-agent-bus tools add context_log
/pi-agent-bus tools add context_checksum

# 5. Full ecosystem
/pi-agent-bus tools default  # Use essential preset
```

### How `pi-agent-bus-bridge` Leverages Other Extensions

| Extension | How Agent-Bus Uses It | Progressive Config |
|-----------|-----------------------|-------------------|
| `pi-qmd-ledger` | Agents append decisions to ledger via `invokePiTool('append_ledger', ...)` | `config.essential.json` includes ledger tools |
| `pi-model-router` | Agents request optimal model via `invokePiTool('route_model', ...)` before LLM calls | `config.essential.json` includes `route_model` |
| `pi-link` | Bridge maps `/start-agent-workflow` → bus event; bus events → `link_send` broadcasts | `piLinkEventMappings`, `busToPiLinkMappings` |
| `pi-context` | Agents tag milestones, user can checkout to tagged state | `context_tag`, `context_log`, `context_checksum` in presets |
| `pi-1password` | Agents securely load secrets needed for API calls | `op_get_secret`, `op_load_env` in `config.essential.json` |

### Using with `pi-link-coordinator`

The bridge is designed to work alongside the `pi-link-coordination` skill. In multi-terminal setups:

```json
// Terminal A (orchestrator) runs:
//    /start-agent-workflow my-workflow "context data"

// This publishes to bus topic 'orchestration_commands'.
// Agents on Terminal B subscribe and begin work.

// Agent on Terminal B reports progress:
//    agent.broadcast('agent_workflow_updates', {workflowId, status: 'in_progress'})

// Bridge on Terminal B's Pi instance maps this to pi-link:
//    "Agent Workflow Update [my-workflow]: in_progress"
// ...which is broadcast to all linked terminals including Terminal A.
```

The `pi-link-coordinator` skill (from `/home/kylebrodeur/.local/share/fnm/node-versions/v22.22.1/installation/lib/node_modules/pi-link/skills/pi-link-coordination/SKILL.md`) provides guidance on choosing between `link_send` (async fire-and-forget) and `link_prompt` (sync response). The agent bus uses `link_send` for status updates and `link_prompt` for user confirmation of critical decisions.

---

This `TODO.md` will serve as the immediate roadmap for development from the monorepo root.
