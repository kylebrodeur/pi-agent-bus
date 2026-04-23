import { Agent, AgentConfig } from './Agent';
import { MessageBus } from './MessageBus';
import { LLMProvider } from './LLMProvider';

/**
 * ToolTestingAgent is a specialized agent used to verify the Tool Bridge integration.
 * It doesn't need an LLM for basic integration tests; it just triggers tool calls.
 */
export class ToolTestingAgent extends Agent {
  constructor(config: AgentConfig, bus: MessageBus, llm?: LLMProvider) {
    super(config, bus, llm);
  }

  async tick(): Promise<void> {
    // Base tick does nothing
  }

  /**
   * Explicitly triggers a tool call for testing purposes.
   */
  async testToolCall(toolName: string, args: any): Promise<any> {
    return await this.invokePiTool(toolName, args);
  }
}
