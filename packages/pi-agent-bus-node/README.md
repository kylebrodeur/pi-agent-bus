# `pi-agent-bus-node`

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, agnostic, event-driven Agent Runtime designed for the **Pi coding agent ecosystem**. This package provides foundational tools for building and orchestrating agents that communicate through a central message bus, enabling scalable and modular multi-agent workflows.

> 📦 Part of the [`pi-agent-bus` monorepo](https://github.com/kylebrodeur/pi-agent-bus). For the Pi extension that bridges this library to the Pi environment, see [`pi-agent-bus` (bridge)](https://github.com/kylebrodeur/pi-agent-bus/tree/main/packages/pi-agent-bus-bridge).

## Why this exists

Many agent frameworks tightly couple the LLM prompt structure to specific domains (e.g., coding, web browsing). This package isolates the **coordination mechanism** from the domain logic.

It is used in two ways within the Microfactory project:
1. **Simulation Engine (`packages/engine`)**: Simulates 3D printers and CNC machines running on a 100ms tick loop with a 15W energy limit.
2. **AI Coding Assistants**: Powers the `ant-colony` and `subagent` tools for our background codebase manipulation, detached from buggy generic Pi extensions.

## Core Concepts

### 1. MessageBus (Event-Driven Communication)
Instead of explicit O(n²) consensus (where every node talks directly to every other node), agents communicate by publishing messages to topics and subscribing to topics on a central `MessageBus`. This creates O(n) environment-mediated coordination, ideal for decentralized systems.

```typescript
import { MessageBus } from 'pi-agent-bus-node';

const bus = new MessageBus();
// An agent publishes a message to a topic
bus.publish('resource_request', 'agent_alpha', { resource: 'PETG', quantity: 50 });

// Another agent subscribes to that topic
bus.subscribe('resource_request', (msg) => {
  console.log(`${msg.senderId} requested ${msg.payload.resource}`);
});
```

### 2. Agnostic LLM Provider
Use `LLMProvider` to abstract away specific LLM implementations. This allows agents to make intelligent decisions without being tied to a particular model or service.

```typescript
import { LLMProvider } from 'pi-agent-bus-node';

class OllamaProvider extends LLMProvider {
  async prompt(text: string) {
    // Call your local Ollama instance (e.g., gemma4:e4b)
  }
}
```

## Installation

```bash
# For Pi terminal users (recommended)
pi install npm:pi-agent-bus-node

# For Node.js projects
npm install pi-agent-bus-node
# or
pnpm add pi-agent-bus-node
```

## Usage

### 1. The MessageBus (Agent Communication Hub)

```typescript
import { MessageBus } from 'pi-agent-bus-node';

// Create the bus (the "environment" where agents interact)
const bus = new MessageBus();

// Subscribe to topics (agents "listen" to the environment)
bus.subscribe('JOB_REQUEST', (message) => {
  console.log(`Received job: ${message.payload.jobName} from ${message.senderId}`);
});

// Publish messages (agents "broadcast" into the environment)
await bus.publish('JOB_REQUEST', 'scheduler_agent', { jobName: 'print_part', priority: 1 });

// Retrieve message history for a topic (e.g., for debugging or audit)
const jobs = bus.getHistory('JOB_REQUEST');
```

### 2. The Agent Base Class

The `Agent` class provides a common structure for all your agents, handling bus subscriptions and LLM interactions.

```typescript
import { Agent, MessageBus, Message } from 'pi-agent-bus-node';

class CustomAgent extends Agent {
  constructor(bus: MessageBus) {
    super({
      id: 'agent-1',
      role: 'custom_executor',
      capabilities: ['process_data']
    }, bus);
    
    // Agents can subscribe to specific topics or direct messages
    this.bus.subscribe(`direct:${this.config.id}`, this.handleMessage.bind(this));
    this.bus.subscribe('GLOBAL_ALERT', this.handleMessage.bind(this));
  }

  protected async handleMessage(message: Message): Promise<void> {
    // Process incoming messages and react
    if (message.topic === 'GLOBAL_ALERT') {
      console.log(`Agent ${this.config.id} received alert: ${message.payload.alertMessage}`);
    }
  }

  async tick(): Promise<void> {
    // This method is called repeatedly (e.g., every simulation tick)
    // Perform periodic tasks, check for new messages, or make decisions.
    await this.broadcast('STATUS_UPDATE', { status: 'idle', agentId: this.config.id });
  }
}
```

### 3. TaskQueue for Work Management

The `TaskQueue` helps manage discrete units of work, tracking their status and assignment.

```typescript
import { TaskQueue } from 'pi-agent-bus-node';

const queue = new TaskQueue();

// Add a new task to the queue
const taskId = queue.add('code_review', { file: 'src/index.ts', severity: 'high' });

// An agent claims a pending task
queue.claim(taskId, 'reviewer_agent');

// An agent completes or fails a task
queue.complete(taskId, 'reviewer_agent', { reviewStatus: 'approved' });
// or
queue.fail(taskId, 'reviewer_agent', 'Failed to review: file missing');
```

### 4. LLMProvider Integration

The `LLMProvider` enables agents to use LLMs for complex decision-making, planning, or content generation.

```typescript
import { LLMProvider } from 'pi-agent-bus-node';

// Example: A dummy LLM provider (in a real scenario, this connects to an actual LLM API)
class DummyLLMProvider extends LLMProvider {
  async prompt(text: string, options?: PromptOptions): Promise<string> {
    // Simulate LLM response
    return `LLM processed: ${text.substring(0, 50)}...`;
  }
}

// Instantiate with a specific model
const llm = new DummyLLMProvider({ model: 'your_preferred_model' });

// An agent using the LLM for decision making
const agent = new Agent({ id: 'decider', role: 'planner', capabilities: [] }, bus, llm);
const decision = await agent.askLLM<{ plan: string }>('What is the best plan for task X?');
// decision is fully typed as { plan: string } | null
```

## Pi Extension Integration

`pi-agent-bus-node` is designed to be highly compatible with the Pi ecosystem. Because its core is isolated from the Pi global object, it is 100% safe to run inside `worker_threads` or child processes (like those spawned by `subagent`), preventing "pi is not defined" errors.

### Using with `pi-qmd-ledger` and `ucl-provenance`

Agents orchestrated by `pi-agent-bus-node` can contribute directly to the `Universal Citation Ledger` (UCL) via `pi-qmd-ledger`.

```typescript
// Example within a Pi-aware adapter or custom skill
if (typeof pi !== 'undefined' && pi.tools.append_ledger) {
  const bus = new MessageBus(); // Assuming bus instance is accessible
  bus.subscribe('fact_verified', async (msg) => {
    await pi.tools.append_ledger({
      ledger: 'UCL_LEDGER',
      mode: 'autopilot', // or 'gated' for human review
      entry: msg.payload // msg.payload should contain { fact: "...", source: "...", ... }
    });
  });
}
```

### Using with `pi-model-router`

Dynamically route LLM calls from `pi-agent-bus-node` agents based on complexity, cost, or specific model capabilities.

```typescript
// Example: Custom LLMProvider that uses pi-model-router
import { LLMProvider, PromptOptions } from 'pi-agent-bus-node';

class PiModelRouterLLMProvider extends LLMProvider {
  async prompt(text: string, options?: PromptOptions): Promise<string> {
    if (typeof pi !== 'undefined' && pi.tools.route_model) {
      // Assuming pi-model-router provides a 'route_model' tool
      const modelToUse = await pi.tools.route_model({ prompt: text, options: options });
      // Then use the selected model for the actual prompt
      // This part would involve calling the LLM through Pi's model provider
      // For simplicity, we'll just return a placeholder
      return `Routed via ${modelToUse}: ${text}`;
    }
    // Fallback if pi-model-router is not available
    return `Default LLM processed: ${text}`;
  }
}
```

## Local Development & Testing

```bash
# Clone the monorepo
git clone https://github.com/kylebrodeur/pi-agent-bus.git
cd pi-agent-bus/packages/pi-agent-bus-node

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## Detailed Workflow Examples

For more in-depth examples demonstrating how to build complete multi-agent workflows leveraging `pi-agent-bus-node` with other Pi skills and extensions, please refer to the `WORKFLOW_EXAMPLES.md` document in the monorepo's top-level `docs/` directory.

## License

`pi-agent-bus-node` is [MIT licensed](LICENSE).

---
## Links

- [GitHub Repository (Monorepo)](https://github.com/kylebrodeur/pi-agent-bus)
- [NPM Package](https://www.npmjs.com/package/pi-agent-bus-node)
- [Documentation (Workflow Examples)](./docs/WORKFLOW_EXAMPLES.md)
