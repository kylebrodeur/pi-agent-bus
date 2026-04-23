import { Agent, AgentConfig } from './Agent';

export type AgentConstructor = new (config: AgentConfig, bus: any, llm?: any) => Agent;

/**
 * AgentRegistry maintains a mapping of agent 'types' to their concrete class implementations.
 * This allows the AgentLoader to instantiate the correct class based on the YAML definition.
 */
export class AgentRegistry {
  private static registry: Map<string, AgentConstructor> = new Map();

  /**
   * Register an agent class for a given type name.
   */
  static register(type: string, constructor: AgentConstructor): void {
    this.registry.set(type, constructor);
  }

  /**
   * Get the constructor for a given agent type.
   */
  static get(type: string): AgentConstructor | undefined {
    return this.registry.get(type);
  }

  /**
   * List all registered agent types.
   */
  static list(): string[] {
    return Array.from(this.registry.keys());
  }
}
