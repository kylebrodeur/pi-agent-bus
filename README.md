# `pi-agent-bus` Monorepo

This monorepo contains the core `pi-agent-bus` components for building and orchestrating Pi coding agents.

## Packages

| Package                  | Description                                                                                                                                                                                                                                                                                                      |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pi-agent-bus-node`      | The core library (`npm install pi-agent-bus-node`). Provides the `MessageBus`, `Agent` base class (with `invokePiTool`), `TaskQueue`, and `LLMProvider`. Designed to be isolated and reusable in any Node.js/TypeScript project.                                                                                     |
| `pi-agent-bus` (Bridge)  | A Pi extension (published as `pi-agent-bus` to NPM). This is the **"Pi Integration Layer"** that bridges isolated `pi-agent-bus-node` agents with the `pi` global object and `pi.tools`. It also handles `pi-link` inbound/outbound message translation. This extension *must* run in a Pi terminal's context.                                                |

## Getting Started

### Quick Install (For Users)

If you simply want to use the agent bus inside your Pi coding environment, install the extension using the `pi` CLI:

```bash
pi install npm:pi-agent-bus
```

*Note: Once installed, use the `/pi-agent-bus tools` slash commands to configure the available tools.*

---

### Development (For Contributors)

The steps below are for developing within the monorepo.

#### 1. Clone the Monorepo

```bash
git clone https://github.com/kylebrodeur/pi-agent-bus.git
cd pi-agent-bus
```

#### 2. Install Monorepo Dependencies

This will install dependencies for all packages within the monorepo and set up workspace links.

```bash
pnpm install
```

#### 3. Install the Local Extension

For Pi to discover and load the `pi-agent-bus-bridge` extension, you need to create a symlink from your Pi's extensions directory to the bridge package within this monorepo.

```bash
# Assuming your Pi project is located at /home/kylebrodeur/projects/microfactory
# And this monorepo is at /home/kylebrodeur/projects/pi-agent-bus

# Create the extensions directory if it doesn't exist
mkdir -p /home/kylebrodeur/projects/microfactory/.pi/extensions/

# Create a symlink to the bridge extension
ln -s $(pwd)/packages/pi-agent-bus-bridge /home/kylebrodeur/projects/microfactory/.pi/extensions/pi-agent-bus-bridge
```

After creating the symlink, restart your Pi terminal for the new extension to be loaded.

### 4. Configure `pi-agent-bus-bridge`

The `pi-agent-bus-bridge` extension reads its configuration from a `config.json` file placed next to its `index.ts`. This configuration defines which `pi.tools` are exposed to agents and how `pi-link` messages are mapped to `MessageBus` events.

#### Quick Start (Interactive Configuration)

Upon initial setup, no tools will be exposed to agents. You can interactively configure tools using Pi slash commands:

```bash
# List current tools
/pi-agent-bus tools list

# Add essential tools
/pi-agent-bus tools default

# Or add tools individually
/pi-agent-bus tools add append_ledger
/pi-agent-bus tools add query_ledger

# Review and adjust
/pi-agent-bus tools list

# Remove tools if needed
/pi-agent-bus tools remove read

# Reset to secure defaults
/pi-agent-bus tools secure
```

**Note:** If no `config.json` is present, the bridge will initialize with an empty tool list, requiring you to add tools interactively or create a configuration file manually.

#### Manual Configuration (Advanced)

For more control, you can manually configure the bridge by creating a `packages/pi-agent-bus-bridge/config.json` file with your desired settings.

**Sample configurations are available:**
- `config.essential.json` — Recommended starting point with essential tools
- `config.secure.json` — Minimal secure configuration with most restrictive access

**Create `packages/pi-agent-bus-bridge/config.json`:**

```json
{
  "exposedPiTools": [
    "append_ledger", "query_ledger", "describe_ledger", "ledger_stats",
    "route_model",
    "context_tag", "context_log", "context_checksum",
    "link_send", "link_prompt", "link_list",
    "op_get_secret", "op_load_env",
    "read", "bash", "write", "edit", "ls", "grep", "find"
  ],
  "piLinkEventMappings": [
    {
      "slashCommand": "/start-agent-workflow",
      "busTopic": "orchestration_commands",
      "description": "Starts a complex agent workflow by sending command to MessageBus.",
      "payloadMap": {
        "args.0": "workflowId",
        "args.1": "context"
      }
    },
    {
      "slashCommand": "/agent-message",
      "busTopic": "agent_messages_from_user",
      "description": "Sends a direct message from the user to the MessageBus for agents.",
      "payloadMap": {
        "args.0": "message"
      }
    }
  ],
  "busToPiLinkMappings": [
    {
      "busTopic": "agent_workflow_updates",
      "messageBuilder": "Agent Workflow Update [${payload.workflowId}]: ${payload.status}"
    },
    {
      "busTopic": "agent_alert_critical",
      "piLinkTarget": "*",
      "messageBuilder": "CRITICAL AGENT ALERT from ${payload.agentId}: ${payload.message}"
    }
  ]
}
```

**Explanation of Configuration Fields:**

*   **`exposedPiTools`**: A whitelist of `pi.tools` functions that agents are allowed to invoke via the bridge. This acts as a security and control mechanism.
    *   **`pi-qmd-ledger`**: (`append_ledger`, `query_ledger`, etc.) - Directly expose these for agents to interact with the UCL.
    *   **`pi-model-router`**: (`route_model`) - Allows agents to dynamically select models.
    *   **`pi-context`**: (`context_tag`, `context_log`, `context_checksum`) - Agents can mark progress or retrieve context from the main Pi environment.
    *   **`pi-link`**: (`link_send`, `link_prompt`, `link_list`) - Agents can send/receive `pi-link` messages to/from other terminals.
    *   **`1password`**: (`op_get_secret`, `op_load_env`) - Securely access secrets.
    *   **General Pi tools**: (`read`, `bash`, `write`, `edit`, `ls`, `grep`, `find`) - Common file/shell operations.

*   **`piLinkEventMappings`**: Defines Pi slash commands that, when executed, trigger an event on the `MessageBus`.
    *   `slashCommand`: The Pi command (e.g., `/start-agent-workflow`).
    *   `busTopic`: The `MessageBus` topic where the event is published.
    *   `description`: Appears in Pi's help system (`/help`).
    *   `payloadMap`: (Optional) Maps arguments from the slash command into the payload of the `MessageBus` event. `args.0` refers to the first argument, `args.1` the second, etc.

*   **`busToPiLinkMappings`**: Defines `MessageBus` topics that, when a message is published to them, trigger a `pi-link` message to another terminal.
    *   `busTopic`: The `MessageBus` topic to monitor.
    *   `piLinkTarget`: (Optional) The target terminal (`*` for broadcast, or a specific terminal ID).
    *   `messageBuilder`: (Optional) A template string or function to build the `pi-link` message from the `MessageBus` payload. Uses basic template literal syntax `${payload.field}`.

## Development

### Progressive Enhancement Configs

The bridge supports starting empty and adding tools as you install extensions:

| Config File | Tools Exposed | Required Extensions |
|-------------|--------------|---------------------|
| `config.json` | None | None (safe to load with no extensions) |
| `config.ledger-only.json` | Ledger CRUD | `pi-qmd-ledger` |
| `config.with-link.json` | Ledger + pi-link | `pi-qmd-ledger`, `pi-link` |
| `config.with-model-router.json` | Ledger + link + routing | `pi-qmd-ledger`, `pi-link`, `pi-model-router` |
| `config.with-context.json` | Ledger + link + routing + context | Above + `pi-context` |
| `config.essential.json` | Full ecosystem | All core Pi extensions |
| `config.secure.json` | Minimal safe set | Any subset |

Copy the appropriate preset to `config.json`:
```bash
cp packages/pi-agent-bus-bridge/config.with-link.json packages/pi-agent-bus-bridge/config.json
```

Or use the slash commands after installation:
```
/pi-agent-bus tools discover    # See what's available
/pi-agent-bus tools default   # Load essential preset
/pi-agent-bus tools add append_ledger
```

### pi-subagents Migration

`pi-agent-bus` replaces the archived `pi-subagents` package. Key differences:
- **Pub/sub instead of spawning**: `MessageBus` topics replace `subagent()` process creation
- **Configurable security**: `exposedPiTools` whitelist instead of all-or-nothing skill injection
- **Persistent history**: Message history with configurable limits replaces ephemeral agents
- **Task ownership**: `TaskQueue.claim/complete` replaces unmanaged concurrent execution

See `TODO.md` for the full feature comparison and migration guide.ing Packages

```bash
pnpm build # Builds all packages in the monorepo
```

## Testing

```bash
pnpm test # Runs tests for all packages in the monorepo
```

## Contributing

Contributions are welcome! Please see the individual package `README.md` files for more details.

## License

This monorepo is released under the [MIT License](LICENSE).
