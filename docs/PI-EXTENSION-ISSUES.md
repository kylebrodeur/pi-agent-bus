# Pi Extension Issues Log
**Repo:** `pi-agent-bus` · Package: `packages/pi-agent-bus-node`
**Discovered:** April 25, 2026 during Kaggle sprint scenarios build
**Audited against:** installed bundle at `.pi/npm/node_modules/pi-agent-bus/` (v0.1.0 → v0.1.1)
**v0.1.1 status:** Bumped April 25, 2026. None of the four issues below were addressed.

These issues were found while using `pi-agent-bus-node` directly as a workspace package
in the microfactory monorepo (i.e. not via the bridge bundle entry point).
They are in the upstream pi extension — not in microfactory code.
Each issue includes a workaround applied locally to unblock the sprint.

**Architecture note:** `pi install npm:pi-agent-bus` installs the bridge bundle as the
entry point (`packages/pi-agent-bus-bridge/dist/index.js`, 11MB, inlines everything via
tsup `noExternal`). `packages/pi-agent-bus-node/dist/src/` ships separately as plain
tsc-compiled CJS files intended for direct Node.js consumers. These issues affect
the `pi-agent-bus-node` standalone path only.

---

## Issue 1 — `packages/pi-agent-bus-node/package.json` excluded from published `files`

**File:** Root `package.json` → `"files"` array

**Problem:**
The root `package.json` `"files"` array includes `"packages/pi-agent-bus-node/dist/src"`
but NOT `"packages/pi-agent-bus-node/package.json"`. The sub-library `package.json`
exists in source but does not ship. This means consumers using `pi-agent-bus-node`
directly (not via the bridge) cannot:
- Declare it as a workspace or npm package with proper metadata
- Have transitive runtime dependencies (e.g. `js-yaml`) resolved automatically

**Fix needed in source:**
Add `"packages/pi-agent-bus-node/package.json"` to the root `"files"` array, and
ensure `packages/pi-agent-bus-node/package.json` declares all runtime deps:
```json
{
  "name": "pi-agent-bus-node",
  "version": "0.1.0",
  "main": "dist/src/index.js",
  "types": "dist/src/index.d.ts",
  "dependencies": { "js-yaml": "^4.1.0" }
}
```

**Local workaround applied:**
Created `packages/pi-agent-bus-node/package.json` at
`.pi/npm/node_modules/pi-agent-bus/packages/pi-agent-bus-node/package.json`
and added the directory to `pnpm-workspace.yaml` so pnpm treats it as a
workspace package. Run `pnpm install --force` after.

> ⚠️ **Fragile:** `pi install npm:pi-agent-bus` wipes the installed directory on every
> reinstall. The workaround `package.json` must be recreated each time until Issue 1
> is fixed upstream.

---

## Issue 2 — `js-yaml` undeclared in `pi-agent-bus-node` source deps (masked by bundler)

**File:** `packages/pi-agent-bus-node/src/AgentLoader.ts` (source) / `dist/src/AgentLoader.js` line 39

**Problem:**
`AgentLoader.ts` imports `js-yaml` but `packages/pi-agent-bus-node/package.json`
declares `"dependencies": {}` (empty). The bug exists in source and is masked at
build time because tsup bundles `js-yaml` inline when building the bridge bundle.
For direct consumers of the `pi-agent-bus-node` CJS files (not the bridge bundle),
`js-yaml` is not available and the runtime crashes.

`index.js` eagerly re-exports `AgentLoader` via
`__exportStar(require("./AgentLoader"), exports)`, so **any**
`import { MessageBus } from 'pi-agent-bus-node'` triggers the require —
even if `AgentLoader` is never used by the consumer.

**Observed error at runtime:**
```
Error: Cannot find module 'js-yaml'
  requireStack: [.../AgentLoader.js]
```

**Fix needed in source:**
1. Add `"js-yaml": "^4.1.0"` to `packages/pi-agent-bus-node/package.json` dependencies
2. Ensure that `package.json` is included in the root `files` array (see Issue 1)
3. Optional: lazy-load `AgentLoader` in `index.ts` to avoid forcing the dep on all consumers:
   ```ts
   // lazy getter instead of direct re-export:
   export const AgentLoader = () => require('./AgentLoader').AgentLoader;
   ```

**Local workaround applied:**
Added `"js-yaml": "^4.1.0"` to the workaround `package.json` from Issue 1.
Run `pnpm install --force` in the microfactory root to pick it up.

---

## Issue 3 — `packages/pi-agent-bus-node/package.json` missing `"type": "commonjs"`

**File:** `packages/pi-agent-bus-node/package.json` (source and installed workaround)

**Problem:**
All dist files use CommonJS syntax (`"use strict"`, `exports`, `require()`), which is
correct for CJS. The `package.json` has no `"type"` field. Node.js 22 defaults to CJS
when `"type"` is absent, so this is non-breaking today. However, making the intent
explicit avoids future ambiguity if the parent project ever sets `"type": "module"`.

**Fix needed in source:**
Add `"type": "commonjs"` to `packages/pi-agent-bus-node/package.json`.

**Local workaround applied:**
None needed — Node.js 22 handles it correctly without the field.

---

## Issue 4 — `Agent.d.ts` — `askLLM` return type is `any`

**File:** `packages/pi-agent-bus-node/dist/src/Agent.d.ts` (if present) / `Agent.js`

**Problem:**
`askLLM(promptText, jsonMode = true)` returns `JSON.parse(response)` in JSON mode,
which is untyped. Callers (e.g., `GemmaAgent.decide()`) must cast or narrow manually.
Not a crash, but creates type-unsafety at every call site.

**Fix needed in source:**
```ts
async askLLM<T = unknown>(promptText: string, jsonMode?: true): Promise<T>;
async askLLM(promptText: string, jsonMode?: false): Promise<string>;
```
A generic overload would let callers write:
```ts
const result = await this.askLLM<RoutingDecision>(prompt, true);
```

**Local workaround applied:**
Cast results after `askLLM` in `GemmaAgent` with a type assertion.

---

## Summary

| # | Issue | Severity | Sprint Impact | Fix Location |
|---|-------|----------|--------------|-------------|
| 1 | Missing `package.json` | High | Blocked scenarios build | Add `package.json` to source |
| 2 | `js-yaml` undeclared dep (crashes on import) | High | Runtime crash | Add to `package.json` deps |
| 3 | Missing `"type": "commonjs"` field | Low | None currently | Add to `package.json` |
| 4 | `askLLM` untyped return | Low | Type casts needed | Add generic overload to `Agent.ts` |

Issues 1 and 2 are the blockers. The local workarounds in microfactory unblock the sprint.
The upstream fixes should go into `pi-agent-bus` before any other project tries to `pi install` and use `pi-agent-bus-node` directly.

---

## Exact Upstream Changes Required

Two files need to change in the `pi-agent-bus` source repo.

### 1. `packages/pi-agent-bus-node/package.json` — ensure this exists in source with full content

```json
{
  "name": "pi-agent-bus-node",
  "version": "0.1.1",
  "description": "Node.js runtime for pi-agent-bus — MessageBus, Agent base class, LLMProvider, TaskQueue",
  "main": "dist/src/index.js",
  "types": "dist/src/index.d.ts",
  "type": "commonjs",
  "license": "MIT",
  "dependencies": {
    "js-yaml": "^4.1.0"
  }
}
```

This also fixes Issues 2 and 3 — `js-yaml` is declared, and `"type": "commonjs"` is explicit.

### 2. Root `package.json` → `"files"` array — add the sub-package `package.json`

```json
"files": [
  "packages/pi-agent-bus-bridge/dist",
  "packages/pi-agent-bus-bridge/config.*.json",
  "packages/pi-agent-bus-node/dist/src",
  "packages/pi-agent-bus-node/package.json",
  "README.md",
  "LICENSE"
]
```

Without this line, `npm publish` strips `packages/pi-agent-bus-node/package.json` from the
tarball regardless of what the file contains — which is why the workaround is wiped on every
`pi install`.

### Verification

After publishing, run:
```bash
tar -tzf $(npm pack --dry-run 2>/dev/null | tail -1) | grep pi-agent-bus-node/package.json
# Should print: packages/pi-agent-bus-node/package.json
```

Or inspect the published tarball:
```bash
npm pack
tar -tzf pi-agent-bus-*.tgz | grep package.json
```
