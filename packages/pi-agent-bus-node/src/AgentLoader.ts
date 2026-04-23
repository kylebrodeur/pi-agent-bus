import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { 
  Agent,
  AgentConfig, 
  AgentRegistry, 
  MessageBus, 
  LLMProvider 
} from './index'; // Need to import Agent correctly, or from index

export interface AgentFileDefinition {
  type: string;
  role: string;
  capabilities: string[];
  llm_provider: string;
  llm_model: string;
  [key: string]: any;
}

export interface AgentLoaderConfig {
  agentsDirectory: string;
  bus: MessageBus;
  llmProviderFactory: (providerName: string, model: string) => Promise<LLMProvider | null>;
}

/**
 * AgentLoader reads Markdown files with YAML frontmatter from a directory
 * and instantiates agents using the AgentRegistry.
 */
export class AgentLoader {
  constructor(private config: AgentLoaderConfig) {}

  /**
   * Loads all agents defined in the .agents/ directory.
   */
  async loadAgents(): Promise<Agent[]> {
    const { agentsDirectory, bus, llmProviderFactory } = this.config;
    const agents: Agent[] = [];

    try {
      if (!fs.existsSync(agentsDirectory)) {
        // We use console.warn if pi is undefined (e.g. running outside bridge)
        const warn = typeof (globalThis as any).pi !== 'undefined' ? (globalThis as any).pi.log.warn : console.warn;
        warn(`[AgentLoader] Agents directory ${agentsDirectory} not found. Skipping.`);
        return [];
      }

      const files = fs.readdirSync(agentsDirectory);
      for (const file of files) {
        if (file.endsWith('.agent.md')) {
          const absolutePath = path.join(agentsDirectory, file);
          const content = fs.readFileSync(absolutePath, 'utf8');
          
          const { frontmatter } = this.parseMarkdownWithFrontmatter(content);
          
          if (!frontmatter || !frontmatter.type) {
            const error = typeof (globalThis as any).pi !== 'undefined' ? (globalThis as any).pi.log.error : console.error;
            error(`[AgentLoader] Agent file ${file} is missing 'type' in frontmatter. Skipping.`);
            continue;
          }

          const agentType = frontmatter.type;
          const Constructor = AgentRegistry.get(agentType);
          if (!Constructor) {
            const error = typeof (globalThis as any).pi !== 'undefined' ? (globalThis as any).pi.log.error : console.error;
            error(`[AgentLoader] Agent file ${file} specifies type '${agentType}', but no such agent type is registered. Skipping.`);
            continue;
          }

          const agentConfig: AgentConfig = {
            id: path.basename(file, '.agent.md'),
            role: frontmatter.role || 'General Purpose',
            capabilities: frontmatter.capabilities || [],
          };

          // Create LLM Provider if specified
          let llm: LLMProvider | null = null;
          if (frontmatter.llm_provider && frontmatter.llm_model) {
            llm = await llmProviderFactory(frontmatter.llm_provider, frontmatter.llm_model);
          }

          // Instantiate the agent
          const agent = new Constructor(agentConfig, bus, llm);
          agents.push(agent);
          
          const info = typeof (globalThis as any).pi !== 'undefined' ? (globalThis as any).pi.log.info : console.log;
          info(`[AgentLoader] Loaded agent: ${agentConfig.id} (type: ${agentType})`);
        }
      }
      return agents;
    } catch (e: any) {
      const error = typeof (globalThis as any).pi !== 'undefined' ? (globalThis as any).pi.log.error : console.error;
      error(`[AgentLoader] Failed to load agents from ${agentsDirectory}: ${e.message}`);
      return [];
    }
  }

  private parseMarkdownWithFrontmatter(content: string): { frontmatter: any, body: string } {
    const match = content.match(/^---([\s\S]*?)---([\s\S]*)$/);
    if (!match) return { frontmatter: null, body: content };
    
    const yamlContent = match[1];
    const body = match[2];
    
    try {
      return {
        frontmatter: yaml.load(yamlContent) as any,
        body: body.trim()
      };
    } catch (e: any) {
      const error = typeof (globalThis as any).pi !== 'undefined' ? (globalThis as any).pi.log.error : console.error;
      error(`[AgentLoader] YAML frontmatter error in agent file: ${e.message}`);
      return { frontmatter: null, body: content };
    }
  }
}
