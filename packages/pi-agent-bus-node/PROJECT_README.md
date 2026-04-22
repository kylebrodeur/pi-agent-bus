# pi-agent-node-bus

[![npm version](https://badge.fury.io/js/%40microfactory%2Fagent-node-bus.svg)](https://badge.fury.io/js/%40microfactory%2Fagent-node-bus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Lightweight, agnostic, event-driven Agent Runtime for Stigmergic coordination.

## What is this?

This package provides a minimal set of classes for building agent-based systems using **stigmergy** (environment-mediated coordination) instead of explicit consensus. It's domain-agnostic - you can use it for manufacturing simulations, AI coding assistants, or any agent-based application.

## Core Concept: Stigmergy

Instead of having agents talk directly to each other (O(n²) complexity), they communicate through an environment:

1. **Agent A** drops a message (pheromone) onto the `MessageBus`
2. **Agent B** sniffs the environment and finds the message
3. **Agent B** decides to act on the message independently

This creates O(n) scaling instead of O(n²) - critical for large-scale simulations.

## Quick Start

```bash
npm install pi-agent-node-bus
```

```typescript
import { MessageBus, Agent } from 'pi-agent-node-bus';

// Create the "environment"
const bus = new MessageBus();

// Create an agent that lives in that environment
class MyAgent extends Agent {
  async tick() {
    // Drop a pheromone
    await this.broadcast('I_AM_HERE', { nodeId: this.config.id });
  }
}

const agent = new MyAgent({ 
  id: 'agent-1', 
  role: 'worker', 
  capabilities: [] 
}, bus);

// Agents can listen for messages
bus.subscribe('I_AM HERE', (message) => {
  console.log(`${message.senderId} is alive`);
});
```

## Installation

```bash
npm install pi-agent-node-bus
pnpm add pi-agent-node-bus
yarn add pi-agent-node-bus
```

## API Reference

### MessageBus

The central nervous system of the system. Agents communicate through it.

```typescript
const bus = new MessageBus();

// Subscribe to a topic
bus.subscribe('JOB_PHEROMONE', (message) => {
  console.log(message.payload);
});

// Publish to a topic
await bus.publish('JOB_PHEROMONE', 'sender-id', { job: 'print_part' });

// Get history
const history = bus.getHistory('JOB_PHEROMONE');
```

### Agent

The base class for all agents. Extend this to create your own agents.

```typescript
import { Agent, MessageBus } from 'pi-agent-node-bus';

class CustomAgent extends Agent {
  protected async handleMessage(message: Message): Promise<void> {
    // Process messages
  }
  
  async tick(): Promise<void> {
    // Your agent logic
  }
}

const bus = new MessageBus();
const agent = new CustomAgent({ 
  id: 'agent-1', 
  role: 'worker', 
  capabilities: ['print'] 
}, bus);
```

### LLMProvider

Abstract interface for connecting LLMs to agents.

```typescript
import { LLMProvider } from 'pi-agent-node-bus';

class OllamaProvider extends LLMProvider {
  async prompt(text: string): Promise<string> {
    // Call your Ollama instance
  }
}

const llm = new OllamaProvider({ model: 'gemma4:e4b' });
```

### TaskQueue

Generic task management for work items.

```typescript
const queue = new TaskQueue();
const taskId = queue.add('print_job', { model: 'gear.stl' });
queue.claim(taskId, 'agent-1');
queue.complete(taskId, 'agent-1', { result: 'done' });
```

## Testing

Run the test suite:

```bash
npm test
```

The package includes a simulation test that demonstrates the stigmergy pattern in action.

## Project Status

This package is currently in beta. APIs may change before v1.0.

## License

MIT