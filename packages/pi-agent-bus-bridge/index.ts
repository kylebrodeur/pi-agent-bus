/// <reference path="types/pi.d.ts" />
import { MessageBus, Message } from 'pi-agent-bus-node';

// This is the singleton MessageBus instance that all pi-agent-bus-node agents will use.
// It needs to be consistently instantiated and shared. For a Pi extension,
// this implies careful management (e.g., using a global context or ensuring
// the MessageBus constructor handles singletons implicitly).
// For now, we'll assume a shared instance.
const bus = new MessageBus(); // This needs to connect to the actual bus instance where agents publish.

interface BridgeConfig {
  exposedPiTools: string[]; // List of pi.tools allowed to be invoked by agents
  piLinkEventMappings: {
    slashCommand: string;      // Pi slash command (e.g., /start-workflow)
    busTopic: string;          // MessageBus topic to publish to
    description: string;       // Description for help text
    payloadMap?: Record<string, string>; // Optional: maps pi-link args to bus payload
  }[];
  busToPiLinkMappings: {
    busTopic: string;          // MessageBus topic to monitor
    piLinkTarget?: string;     // Target terminal, defaults to '*' for broadcast
    messageBuilder?: (payload: any) => string; // Function to format bus payload into pi-link message
  }[];
}

// Default presets for configuration
const PRESETS = {
  essential: [
    'append_ledger', 'query_ledger', 'describe_ledger', 'ledger_stats',
    'route_model',
    'context_tag', 'context_log', 'context_checksum',
    'link_send', 'link_prompt', 'link_list',
    'op_get_secret', 'op_load_env',
    'read', 'bash', 'write', 'edit'
  ],
  secure: [
    'append_ledger', 'query_ledger', 'describe_ledger',
    'context_tag', 'context_log',
    'link_send',
    'read'
  ]
};

// --- Default Configuration (starts empty; use config.json or commands to populate) ---
const config: BridgeConfig = {
  exposedPiTools: [],
  piLinkEventMappings: [],
  busToPiLinkMappings: []
};

// --- Pi Tool Bridging: Inbound requests from pi-agent-bus-node agents ---
bus.subscribe('pi_tool_bridge_requests', async (message: Message) => {
  const { requestId, agentId, toolName, args, responseTopic } = message.payload;

  let result: any;
  let error: string | undefined;

  // Basic validation and security check for exposed tools
  if (!pi.tools[toolName]) {
    error = `Pi environment or tool '${toolName}' not found.`;
  } else if (!config.exposedPiTools.includes(toolName)) {
    error = `Tool '${toolName}' is not configured to be exposed by the bridge for security/control.`;
  } else {
    try {
      pi.tools[toolName](args);
      pi.log.info(`[PiBridge] Agent ${agentId} invoking pi.tools.${toolName}`);
    } catch (e: any) {
      error = e.message;
      pi.log.error(`[PiBridge] Error invoking pi.tools.${toolName} for agent ${agentId}: ${error}`);
    }
  }

  // Publish response back to the requesting agent
  await bus.publish(responseTopic, 'pi-tool-bridge', { requestId, result, error });
});

// --- pi-link Integration (Inbound: Pi-link command -> MessageBus event) ---
// Register Pi slash commands that translate to MessageBus events
config.piLinkEventMappings.forEach(mapping => {
  pi.onSlashCommand(mapping.slashCommand, async (args: string[], rawMessage: string, senderId: string) => {
    const payload: any = {};
    if (mapping.payloadMap) {
      Object.entries(mapping.payloadMap).forEach(([source, target]) => {
        if (source.startsWith('args.')) {
          const index = parseInt(source.split('.')[1]);
          if (args[index] !== undefined) {
            payload[target] = args[index];
          }
        }
      });
    }

    await bus.publish(mapping.busTopic, 'pi-link-command-executor', {
      command: mapping.slashCommand,
      originalArgs: args,
      payload: payload,
      sourceTerminalId: senderId || pi.terminal.id
    });
    pi.log.info(`[PiBridge] '/${mapping.slashCommand}' translated to MessageBus topic '${mapping.busTopic}'`);
    return `Agent workflow triggered on MessageBus topic '${mapping.busTopic}' with payload: ${JSON.stringify(payload)}`;
  }, mapping.description);
});

// --- pi-link Integration (Outbound: MessageBus event -> Pi-link message) ---
config.busToPiLinkMappings.forEach(mapping => {
  bus.subscribe(mapping.busTopic, async (message: Message) => {
    try {
      const messageContent = mapping.messageBuilder ? mapping.messageBuilder(message.payload) : JSON.stringify(message.payload);
      await pi.tools.link_send({
        to: mapping.piLinkTarget || '*',
        message: messageContent
      });
      pi.log.info(`[PiBridge] Message from '${mapping.busTopic}' sent via pi-link.`);
    } catch (e: any) {
      pi.log.error(`[PiBridge] Failed to send pi-link message from bus topic '${mapping.busTopic}': ${e.message}`);
    }
  });
});

pi.log.info('[pi-agent-bus-bridge] Initialized: Bridging pi-agent-bus-node with Pi tools and pi-link.');

// --- Configuration Management Commands ---
// Provide slash commands to modify the bridge configuration at runtime

// Helper function to validate config structure
function validateConfig(configData: any, source: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!configData || typeof configData !== 'object') {
    errors.push(`${source}: config must be an object`);
    return { valid: false, errors };
  }

  // Validate exposedPiTools
  if ('exposedPiTools' in configData) {
    if (!Array.isArray(configData.exposedPiTools)) {
      errors.push(`${source}: exposedPiTools must be an array`);
    } else {
      for (let i = 0; i < configData.exposedPiTools.length; i++) {
        if (typeof configData.exposedPiTools[i] !== 'string') {
          errors.push(`${source}: exposedPiTools[${i}] must be a string`);
        }
      }
    }
  }

  // Validate piLinkEventMappings
  if ('piLinkEventMappings' in configData) {
    if (!Array.isArray(configData.piLinkEventMappings)) {
      errors.push(`${source}: piLinkEventMappings must be an array`);
    } else {
      for (let i = 0; i < configData.piLinkEventMappings.length; i++) {
        const mapping = configData.piLinkEventMappings[i];
        if (!mapping || typeof mapping !== 'object') {
          errors.push(`${source}: piLinkEventMappings[${i}] must be an object`);
          continue;
        }
        if (typeof mapping.slashCommand !== 'string') {
          errors.push(`${source}: piLinkEventMappings[${i}].slashCommand must be a string`);
        }
        if (typeof mapping.busTopic !== 'string') {
          errors.push(`${source}: piLinkEventMappings[${i}].busTopic must be a string`);
        }
        if (typeof mapping.description !== 'string') {
          errors.push(`${source}: piLinkEventMappings[${i}].description must be a string`);
        }
        if (mapping.payloadMap !== undefined && typeof mapping.payloadMap !== 'object') {
          errors.push(`${source}: piLinkEventMappings[${i}].payloadMap must be an object`);
        }
      }
    }
  }

  // Validate busToPiLinkMappings
  if ('busToPiLinkMappings' in configData) {
    if (!Array.isArray(configData.busToPiLinkMappings)) {
      errors.push(`${source}: busToPiLinkMappings must be an array`);
    } else {
      for (let i = 0; i < configData.busToPiLinkMappings.length; i++) {
        const mapping = configData.busToPiLinkMappings[i];
        if (!mapping || typeof mapping !== 'object') {
          errors.push(`${source}: busToPiLinkMappings[${i}] must be an object`);
          continue;
        }
        if (typeof mapping.busTopic !== 'string') {
          errors.push(`${source}: busToPiLinkMappings[${i}].busTopic must be a string`);
        }
        if (mapping.messageBuilder !== undefined && typeof mapping.messageBuilder !== 'string') {
          errors.push(`${source}: busToPiLinkMappings[${i}].messageBuilder must be a string`);
        }
        if (mapping.piLinkTarget !== undefined && typeof mapping.piLinkTarget !== 'string') {
          errors.push(`${source}: busToPiLinkMappings[${i}].piLinkTarget must be a string`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// Helper function to reload config from file
function loadConfigFromFile(): BridgeConfig {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      const validation = validateConfig(configData, 'config.json');
      if (!validation.valid) {
        pi.log.error(`[PiBridge] Invalid config.json:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`);
        pi.log.warn('[PiBridge] Falling back to default config');
        return config;
      }

      return {
        exposedPiTools: configData.exposedPiTools || PRESETS.essential,
        piLinkEventMappings: configData.piLinkEventMappings || [],
        busToPiLinkMappings: configData.busToPiLinkMappings || []
      };
    }
  } catch (e: any) {
    pi.log.warn(`[PiBridge] Error loading config from file: ${e.message}`);
  }
  return config;
}

// Helper function to save config to file
function saveConfigToFile(newConfig: BridgeConfig): void {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    pi.log.info(`[PiBridge] Configuration saved to ${configPath}`);
  } catch (e: any) {
    pi.log.error(`[PiBridge] Error saving config to file: ${e.message}`);
  }
}

// Helper function to update config and notify bridge
function updateConfig(newConfig: BridgeConfig): void {
  Object.assign(config, newConfig);
  saveConfigToFile(config);
  pi.log.info(`[PiBridge] Configuration updated. Exposed tools: ${config.exposedPiTools.length}`);
}

// Register configuration management slash commands
pi.onSlashCommand('/pi-agent-bus tools list', async () => {
  const availableTools = Object.keys(pi.tools || {});
  const exposed = config.exposedPiTools;
  const unconfigured = availableTools.filter(t => !exposed.includes(t));
  return `Current Bridge Configuration:\n\nExposed tools (${exposed.length}):\n${exposed.map(t => `  ✓ ${t}`).join('\n')}\n\nAvailable but unconfigured (${unconfigured.length}):\n${unconfigured.map(t => `  ○ ${t}`).join('\n')}`;
}, 'List all tools currently exposed to agents via the bridge.');

pi.onSlashCommand('/pi-agent-bus tools add', async (args: string[]) => {
  if (args.length === 0) {
    return 'Usage: `/pi-agent-bus tools add <tool-name>`. Tool name required.';
  }
  const toolName = args[0];
  if (!config.exposedPiTools.includes(toolName)) {
    config.exposedPiTools.push(toolName);
    updateConfig(config);
    return `Tool '${toolName}' added to bridge configuration.`;
  }
  return `Tool '${toolName}' is already in the configuration.`;
}, 'Add a tool to the bridge configuration (e.g., `/pi-agent-bus tools add append_ledger`).');

pi.onSlashCommand('/pi-agent-bus tools remove', async (args: string[]) => {
  if (args.length === 0) {
    return 'Usage: `/pi-agent-bus tools remove <tool-name>`. Tool name required.';
  }
  const toolName = args[0];
  const index = config.exposedPiTools.indexOf(toolName);
  if (index > -1) {
    config.exposedPiTools.splice(index, 1);
    updateConfig(config);
    return `Tool '${toolName}' removed from bridge configuration.`;
  }
  return `Tool '${toolName}' is not in the configuration.`;
}, 'Remove a tool from the bridge configuration (e.g., `/pi-agent-bus tools remove read`).');

pi.onSlashCommand('/pi-agent-bus tools default', async () => {
  config.exposedPiTools = [...PRESETS.essential];
  updateConfig(config);
  return `Bridge configuration reset to 'essential' preset with ${config.exposedPiTools.length} tools.`;
}, 'Reset bridge configuration to essential tools preset.');

pi.onSlashCommand('/pi-agent-bus tools secure', async () => {
  config.exposedPiTools = [...PRESETS.secure];
  updateConfig(config);
  return `Bridge configuration reset to 'secure' preset with ${config.exposedPiTools.length} tools.`;
}, 'Reset bridge configuration to minimal secure preset.');

// Load initial config from file if it exists
const initialConfig = loadConfigFromFile();
if (initialConfig.exposedPiTools && initialConfig.exposedPiTools.length > 0) {
  config.exposedPiTools = initialConfig.exposedPiTools;
  config.piLinkEventMappings = initialConfig.piLinkEventMappings;
  config.busToPiLinkMappings = initialConfig.busToPiLinkMappings;
  pi.log.info(`[PiBridge] Loaded configuration from config.json: ${config.exposedPiTools.length} tools exposed`);
}

// --- IMPORTANT: Singleton MessageBus Management ---
// This is a conceptual bridge. In a real Pi setup, ensuring `bus` is the
// *same singleton instance* that `pi-agent-bus-node` agents connect to is critical.
// This might involve pi-agent-bus-node providing a way to inject a bus instance,
// or the Pi runtime managing a global singleton context for such shared resources.
// For now, assume this `bus` instance can receive messages from spawned agents.
// A concrete solution might involve a shared socket, named pipe, or a process-managed
// singleton for the MessageBus.
