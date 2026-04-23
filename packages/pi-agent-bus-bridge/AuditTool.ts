import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AgentRegistry } from 'pi-agent-bus-node';

export interface CapabilityReport {
  structural: {
    agents: string[];
    packages: string[];
    files: string[];
  };
  registeredTypes: string[];
  activeAgents: {
    id: string;
    type: string;
    role: string;
    capabilities: string[];
  }[];
  todoItems: string[];
}

export class AuditTool {
  constructor(private agentsDir: string, private rootDir: string) {}

  /**
   * Performs a low-cost scan of the project to generate a capability report.
   * This avoids reading full file contents and focuses on metadata.
   */
  async generateReport(): Promise<CapabilityReport> {
    const report: CapabilityReport = {
      structural: {
        agents: [],
        packages: [],
        files: []
      },
      registeredTypes: [],
      activeAgents: [],
      todoItems: []
    };

    // 1. Structural Inventory (Lowest cost)
    const packagesDir = path.join(this.rootDir, 'packages');
    if (fs.existsSync(packagesDir)) {
      report.structural.packages = fs.readdirSync(packagesDir);
    }

    // 2. Registered Agent Types
    report.registeredTypes = AgentRegistry.list();

    // 3. Active Agent Definitions (Frontmatter only)
    if (fs.existsSync(this.agentsDir)) {
      const agentFiles = fs.readdirSync(this.agentsDir).filter(f => f.endsWith('.agent.md'));
      report.structural.agents = agentFiles.map(f => path.basename(f, '.agent.md'));

      for (const file of agentFiles) {
        try {
          const content = fs.readFileSync(path.join(this.agentsDir, file), 'utf8');
          const match = content.match(/^---([\s\S]*?)---/);
          if (match) {
            const frontmatter = yaml.load(match[1]) as any;
            report.activeAgents.push({
              id: path.basename(file, '.agent.md'),
              type: frontmatter.type,
              role: frontmatter.role,
              capabilities: frontmatter.capabilities || []
            });
          }
        } catch (e) {
          // Skip malformed files
        }
      }
    }

    // 4. Project TODOs
    const todoPath = path.join(this.rootDir, 'TODO.md');
    if (fs.existsSync(todoPath)) {
      const todoContent = fs.readFileSync(todoPath, 'utf8');
      report.todoItems = todoContent.split('\n').filter(line => line.trim().startsWith('- [ ]'));
    }

    return report;
  }
}
