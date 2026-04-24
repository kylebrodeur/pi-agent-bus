import { MessageBus, Message } from 'pi-agent-bus-node';
import { BridgeAgentManager } from './AgentManager';
import { AuditTool } from './AuditTool';
import {
  createBashTool,
  createEditTool,
  createFindTool,
  createGrepTool,
  createLsTool,
  createReadTool,
  createWriteTool,
  type ExtensionAPI
} from '@mariozechner/pi-coding-agent';
import * as path from 'path';
import * as fs from 'fs';

// Helper to create built-in tools
const toolCache = new Map<string, ReturnType<typeof createBuiltInTools>>();

function createBuiltInTools(cwd: string) {
  return {
    read: createReadTool(cwd),
    bash: createBashTool(cwd),
    edit: createEditTool(cwd),
    write: createWriteTool(cwd),
    find: createFindTool(cwd),
    grep: createGrepTool(cwd),
    ls: createLsTool(cwd),
  };
}

function getBuiltInTools(cwd: string) {
  let tools = toolCache.get(cwd);
  if (!tools) {
    tools = createBuiltInTools(cwd);
    toolCache.set(cwd, tools);
  }
  return tools;
}

// Configuration interface
interface BridgeConfig {
  exposedPiTools: string[];
  piLinkEventMappings: {
    slashCommand: string;
    busTopic: string;
    description: string;
    payloadMap?: Record<string, string>;
  }[];
  busToPiLinkMappings: {
    busTopic: string;
    piLinkTarget?: string;
    messageBuilder?: (payload: any) => string;
  }[];
}

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

export default function (pi: ExtensionAPI) {
  const bus = new MessageBus();
  
  const config: BridgeConfig = {
    exposedPiTools: [],
    piLinkEventMappings: [],
    busToPiLinkMappings: []
  };

  const agentManager = new BridgeAgentManager(
    path.join(process.cwd(), '.agents'), 
    path.join(__dirname, '../pi-agent-bus-node/demos')
  );
  const auditTool = new AuditTool(
    path.join(process.cwd(), '.agents'),
    process.cwd()
  );

  function loadConfigFromFile(): BridgeConfig {
    try {
      const configPath = path.join(__dirname, 'config.json');
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return {
          exposedPiTools: configData.exposedPiTools || PRESETS.essential,
          piLinkEventMappings: configData.piLinkEventMappings || [],
          busToPiLinkMappings: configData.busToPiLinkMappings || []
        };
      }
    } catch (e: any) {
      console.warn(`[PiBridge] Error loading config from file: ${e.message}`);
    }
    return config;
  }

  function saveConfigToFile(newConfig: BridgeConfig): void {
    try {
      const configPath = path.join(__dirname, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    } catch (e: any) {
      console.error(`[PiBridge] Error saving config to file: ${e.message}`);
    }
  }

  function updateConfig(newConfig: Partial<BridgeConfig>): void {
    Object.assign(config, newConfig);
    saveConfigToFile(config);
  }

  // Load initial config
  const initialConfig = loadConfigFromFile();
  if (initialConfig.exposedPiTools && initialConfig.exposedPiTools.length > 0) {
    Object.assign(config, initialConfig);
  }

  // --- Pi Tool Bridging ---
  bus.subscribe('pi_tool_bridge_requests', async (message: Message) => {
    const { requestId, agentId, toolName, args, responseTopic } = message.payload;
    let result: any;
    let error: string | undefined;

    if (!config.exposedPiTools.includes(toolName)) {
      error = `Tool '${toolName}' is not configured to be exposed by the bridge.`;
    } else {
      try {
        const builtInTools = getBuiltInTools(process.cwd()) as any;
        const availableTools = { ...builtInTools }; 
        // Note: we can only safely execute built in tools programmatically using getBuiltInTools.
        // Other custom tools would require pi.getTools() or similar, which may not be exposed.
        if (availableTools[toolName]) {
          result = await availableTools[toolName].execute(
            `bridge_${requestId}`, 
            args, 
            new AbortController().signal, 
            () => {}
          );
        } else {
          // If it's a custom tool, try queuing a tool call via user message
          // This is a fallback and may not return result synchronously
          pi.sendUserMessage(`Please run tool ${toolName} with args: ${JSON.stringify(args)}`, { deliverAs: 'followUp' });
          result = { queued: true };
        }
      } catch (e: any) {
        error = e.message;
      }
    }
    await bus.publish(responseTopic, 'pi-tool-bridge', { requestId, result, error });
  });

  // --- pi-link Integration (Inbound) ---
  config.piLinkEventMappings.forEach(mapping => {
    // Strip leading slash if present for registerCommand
    const cmdName = mapping.slashCommand.replace(/^\//, '');
    pi.registerCommand(cmdName, {
      description: mapping.description,
      handler: async (argsStr: string, ctx) => {
        const args = argsStr.trim().split(/\s+/);
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
          command: cmdName,
          originalArgs: args,
          payload: payload,
          sourceTerminalId: '*'
        });
        ctx.ui.notify(`Agent workflow triggered on topic '${mapping.busTopic}'`, 'info');
      }
    });
  });

  // --- pi-link Integration (Outbound) ---
  config.busToPiLinkMappings.forEach(mapping => {
    bus.subscribe(mapping.busTopic, async (message: Message) => {
      try {
        const messageContent = mapping.messageBuilder ? mapping.messageBuilder(message.payload) : JSON.stringify(message.payload);
        const tools = getBuiltInTools(process.cwd()) as any;
        if (tools.link_send) {
           await tools.link_send.execute('bridge_send', {
              to: mapping.piLinkTarget || '*',
              message: messageContent
           }, new AbortController().signal, () => {});
        }
      } catch (e: any) {
        console.error(`[PiBridge] Failed to send pi-link message: ${e.message}`);
      }
    });
  });

  // --- Configuration Management Commands ---
  pi.registerCommand("pi-agent-bus", {
    description: "Manage bridge configuration",
    handler: async (argsStr: string, ctx) => {
      const args = argsStr.trim().split(/\s+/).filter(x => x);
      const subcmd = args[0];
      const action = args[1];

      if (subcmd === "tools" && action === "list") {
        const exposed = config.exposedPiTools;
        ctx.ui.notify(`Exposed tools: ${exposed.join(', ')}`, 'info');
      } 
      else if (subcmd === "tools" && action === "add") {
        const toolName = args[2];
        if (toolName && !config.exposedPiTools.includes(toolName)) {
          config.exposedPiTools.push(toolName);
          updateConfig({ exposedPiTools: config.exposedPiTools });
          ctx.ui.notify(`Added ${toolName}`, 'info');
        }
      }
      else if (subcmd === "tools" && action === "remove") {
        const toolName = args[2];
        const index = config.exposedPiTools.indexOf(toolName);
        if (index > -1) {
          config.exposedPiTools.splice(index, 1);
          updateConfig({ exposedPiTools: config.exposedPiTools });
          ctx.ui.notify(`Removed ${toolName}`, 'info');
        }
      }
      else if (subcmd === "agent" && action === "demos") {
        const demos = agentManager.listDemos();
        ctx.ui.notify(demos.length === 0 ? 'No demo agents' : `Demos: ${demos.join(', ')}`, 'info');
      }
      else if (subcmd === "agent" && action === "install") {
        const demoId = args[2];
        if (demoId) {
          try {
            const res = await agentManager.installDemoAgent(demoId);
            ctx.ui.notify(res, 'info');
          } catch (e: any) {
            ctx.ui.notify(`Error: ${e.message}`, 'error');
          }
        }
      }
      else if (subcmd === "analyze") {
        const report = await auditTool.generateReport();
        ctx.ui.notify(`Report generated`, 'info');
        console.log(JSON.stringify(report, null, 2));
      }
      else {
        ctx.ui.notify(`Unknown command: ${argsStr}`, 'error');
      }
    }
  });

  console.log('[pi-agent-bus-bridge] Initialized: Bridging pi-agent-bus-node with Pi tools and pi-link.');
}