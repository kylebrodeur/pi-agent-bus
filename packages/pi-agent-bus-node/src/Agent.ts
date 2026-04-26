import { MessageBus, Message } from './MessageBus';
import { LLMProvider } from './LLMProvider';
import { TaskQueue, Task } from './TaskQueue';

export interface AgentConfig {
  id: string;
  role: string;
  capabilities: string[];
}

/**
 * Base Agent
 * 
 * Agnostic agent that sits on the MessageBus.
 * Can be extended for Coding Tasks or Physical Manufacturing Tasks.
 */
export abstract class Agent {
  public config: AgentConfig;
  protected bus: MessageBus;
  protected llm?: LLMProvider;

  constructor(config: AgentConfig, bus: MessageBus, llm?: LLMProvider) {
    this.config = config;
    this.bus = bus;
    this.llm = llm;
    
    // Subscribe to direct messages and broadcasts
    this.bus.subscribe(`direct:${this.config.id}`, this.handleMessage.bind(this));
    this.bus.subscribe('broadcast', this.handleMessage.bind(this));
  }

  /**
   * Broadcast a message to the environment
   */
  async broadcast(topic: string, payload: any): Promise<void> {
    await this.bus.publish(topic, this.config.id, payload);
  }

  /**
   * Direct message another agent
   */
  async sendDirect(targetAgentId: string, payload: any): Promise<void> {
    await this.bus.publish(`direct:${targetAgentId}`, this.config.id, payload);
  }

  /**
   * Hook for handling incoming messages. To be overridden by implementations.
   */
  protected async handleMessage(message: Message): Promise<void> {
    // Default: Do nothing
  }

  /**
   * Perform an LLM-driven decision
   */
  protected async askLLM<T = unknown>(promptText: string, jsonMode = true): Promise<T | string | null> {
    if (!this.llm) {
      throw new Error(`Agent ${this.config.id} has no LLM provider attached.`);
    }

    const response = await this.llm.prompt(promptText, { jsonMode });
    
    if (jsonMode) {
      try {
        return JSON.parse(response) as T;
      } catch (e) {
        console.error(`Agent ${this.config.id} failed to parse JSON from LLM:`, response);
        return null;
      }
    }

    return response;
  }

  /**
   * The main tick or tick-equivalent.
   * If running in an event loop (e.g. manufacturing), override this.
   */
  abstract tick(): Promise<void>;

  /**
   * Helper to invoke a Pi tool via the Pi Tool Bridge.
   * Agent publishes a request and awaits a response on a unique topic.
   * @param toolName The name of the pi.tool to invoke (e.g., 'append_ledger').
   * @param args The arguments to pass to the pi.tool.
   * @param timeoutMs Maximum time to wait for a response from the bridge.
   */
  protected async invokePiTool(toolName: string, args: any, timeoutMs: number = 30000): Promise<any> {
    const requestId = crypto.randomUUID();
    const requestTopic = 'pi_tool_bridge_requests'; // Standard topic for bridge requests
    const responseTopic = `pi_tool_bridge_responses:${this.config.id}:${requestId}`;

    return new Promise(async (resolve, reject) => {
      let timeout: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(timeout);
        this.bus.unsubscribe(responseTopic, handler); // Clean up listener
      };

      const handler = (message: Message) => {
        if (message.payload.requestId === requestId) {
          cleanup();
          if (message.payload.error) {
            reject(new Error(message.payload.error));
          } else {
            resolve(message.payload.result);
          }
        }
      };
      this.bus.subscribe(responseTopic, handler); // Listen for this specific response

      // Set a timeout for the promise
      timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Pi tool invocation timed out for tool: '${toolName}', requestId: ${requestId}`));
      }, timeoutMs);

      // Publish the request to the bridge
      await this.broadcast(requestTopic, {
        requestId,
        agentId: this.config.id,
        toolName,
        args,
        responseTopic // Bridge needs to know where to send the reply
      });
    });
  }
}
