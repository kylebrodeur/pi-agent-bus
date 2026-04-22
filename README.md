# `pi-agent-bus` Monorepo

This monorepo contains the core `pi-agent-bus` components for building and orchestrating Pi coding agents.

## Packages

| Package                  | Description                                                                                                                                                                                                                                                                                                      |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pi-agent-bus-node`      | The core library (`npm install pi-agent-bus-node`). Provides the `MessageBus`, `Agent` base class (with `invokePiTool`), `TaskQueue`, and `LLMProvider`. Designed to be isolated and reusable in any Node.js/TypeScript project.                                                                                     |
| `pi-agent-bus-bridge`    | A Pi extension. This is the **"Pi Integration Layer"** that bridges isolated `pi-agent-bus-node` agents with the `pi` global object and `pi.tools`. It also handles `pi-link` inbound/outbound message translation. This extension *must* run in a Pi terminal's context.                                                |

## Getting Started

### 1. Clone the Monorepo

```bash
git clone https://github.com/kylebrodeur/pi-agent-bus.git # Assuming a GitHub repo for the monorepo
cd pi-agent-bus
```

### 2. Install Monorepo Dependencies

This will install dependencies for all packages within the monorepo and set up workspace links.

```bash
pnpm install
# or npm install (if using npm workspaces)
```

### 3. Install the `pi-agent-bus-bridge` Pi Extension

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

**Create `packages/pi-agent-bus-bridge/config.json`:**

```json
{
  "exposedPiTools": [
    "append_ledger", "query_ledger", "describe_ledger", "ledger_stats",
    "route_model",
    "context_tag", "context_log", "context_checkout",
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
    *   **`pi-context`**: (`context_tag`, `context_log`, `context_checkout`) - Agents can mark progress or retrieve context from the main Pi environment.
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

### Building Packages

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
