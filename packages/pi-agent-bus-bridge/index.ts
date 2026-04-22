import { MessageBus, Message } from 'pi-agent-node-bus';

// This is the singleton MessageBus instance that all pi-agent-node-bus agents will use.
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

// --- Default Configuration (can be overridden via Pi settings) ---
const config: BridgeConfig = {
  exposedPiTools: [
    // pi-qmd-ledger (assuming these are available via pi.tools)
    'append_ledger', 'query_ledger', 'describe_ledger', 'ledger_stats',
    // pi-model-router (assuming these are available via pi.tools)
    'route_model',
    // pi-context (assuming these are available via pi.tools)
    'context_tag', 'context_log', 'context_checkout',
    // pi-link (for agents to send pi-link messages)
    'link_send', 'link_prompt', 'link_list',
    // 1password tools (if agents need secure access, assuming available via pi.tools)
    'op_get_secret', 'op_load_env',
    // General Pi tools that might be useful
    'read', 'bash', 'write', 'edit'
  ],
  piLinkEventMappings: [
    {
      slashCommand: '/start-agent-workflow',
      busTopic: 'orchestration_commands',
      description: 'Starts a complex agent workflow by sending command to MessageBus.',
      payloadMap: { 'args.0': 'workflowId', 'args.1': 'context' }
    },
    {
      slashCommand: '/agent-message',
      busTopic: 'agent_messages_from_user',
      description: 'Sends a direct message from the user to the MessageBus for agents.',
      payloadMap: { 'args.0': 'message' }
    }
  ],
  busToPiLinkMappings: [
    {
      busTopic: 'agent_workflow_updates', // Agents broadcast updates here
      messageBuilder: (payload: any) => `Agent Workflow Update [${payload.workflowId}]: ${payload.status}`
    },
    {
      busTopic: 'agent_alert_critical', // Agents broadcast critical alerts
      piLinkTarget: '*', // Broadcast to all terminals by default
      messageBuilder: (payload: any) => `CRITICAL AGENT ALERT from ${payload.agentId}: ${payload.message}`
    }
  ]
};

// --- Pi Tool Bridging: Inbound requests from pi-agent-node-bus agents ---
bus.subscribe('pi_tool_bridge_requests', async (message: Message) => {
  const { requestId, agentId, toolName, args, responseTopic } = message.payload;

  let result: any;
  let error: string | undefined;

  // Basic validation and security check for exposed tools
  if (!pi || !pi.tools || !pi.tools[toolName]) {
    error = `Pi environment or tool '${toolName}' not found.`;
  } else if (!config.exposedPiTools.includes(toolName)) {
    error = `Tool '${toolName}' is not configured to be exposed by the bridge for security/control.`;
  } else {
    try {
      pi.log.info(`[PiBridge] Agent ${agentId} invoking pi.tools.${toolName}(${JSON.stringify(args)})`);
      result = await pi.tools[toolName](args);
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
        } else {
            // Future: handle other message parts from rawMessage if needed
        }
      });
    }

    await bus.publish(mapping.busTopic, 'pi-link-command-executor', {
      command: mapping.slashCommand,
      originalArgs: args,
      payload: payload,
      sourceTerminalId: senderId || pi.terminal.id // Use senderId from pi-link if available
    });
    pi.log.info(`[PiBridge] '/${mapping.slashCommand}' translated to MessageBus topic '${mapping.busTopic}'`);
    return `Agent workflow triggered on MessageBus topic '${mapping.busTopic}' with payload: ${JSON.stringify(payload)}`;
  }, mapping.description); // Add description for Pi's help system
});

// --- pi-link Integration (Outbound: MessageBus event -> Pi-link message) ---
config.busToPiLinkMappings.forEach(mapping => {
  bus.subscribe(mapping.busTopic, async (message: Message) => {
    try {
      const messageContent = mapping.messageBuilder ? mapping.messageBuilder(message.payload) : JSON.stringify(message.payload);
      await pi.tools.link_send({
        to: mapping.piLinkTarget || '*', // Default to broadcast if no specific target
        message: messageContent
      });
      pi.log.info(`[PiBridge] Message from '${mapping.busTopic}' sent via pi-link.`);
    } catch (e: any) {
      pi.log.error(`[PiBridge] Failed to send pi-link message from bus topic '${mapping.busTopic}': ${e.message}`);
    }
  });
});

pi.log.info('[pi-agent-node-bus-bridge] Initialized: Bridging pi-agent-node-bus with Pi tools and pi-link.');

// --- IMPORTANT: Singleton MessageBus Management ---
// This is a conceptual bridge. In a real Pi setup, ensuring `bus` is the
// *same singleton instance* that `pi-agent-node-bus` agents connect to is critical.
// This might involve pi-agent-node-bus providing a way to inject a bus instance,
// or the Pi runtime managing a global singleton context for such shared resources.
// For now, assume this `bus` instance can receive messages from spawned agents.
// A concrete solution might involve a shared socket, named pipe, or a process-managed
// singleton for the MessageBus.
