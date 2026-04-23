import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MessageBus } from '../src/MessageBus';
import { DummyLLMProvider } from '../src/LLMProvider';

// Create a concrete agent for testing
class TestAgent {
  public config: any;
  public receivedMessages: any[] = [];
  public tickCount = 0;
  private bus: MessageBus;
  private llm?: any;

  constructor(config: any, bus: MessageBus, llm?: any) {
    this.config = config;
    this.bus = bus;
    this.llm = llm;
    this.bus.subscribe(`direct:${this.config.id}`, this.handleMessage.bind(this));
    this.bus.subscribe('broadcast', this.handleMessage.bind(this));
  }

  async handleMessage(message: any): Promise<void> {
    this.receivedMessages.push(message);
  }

  async broadcast(topic: string, payload: any): Promise<void> {
    await this.bus.publish(topic, this.config.id, payload);
  }

  async tick(): Promise<void> {
    this.tickCount++;
  }
}

describe('Agent', () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  it('should initialize with correct config', () => {
    const agent = new TestAgent({ id: 'test-agent', role: 'tester', capabilities: ['messaging'] }, bus);
    
    assert.strictEqual(agent.config.id, 'test-agent');
    assert.strictEqual(agent.config.role, 'tester');
    assert.ok(agent.config.capabilities.includes('messaging'));
  });

  it('should receive broadcast messages', async () => {
    const agent = new TestAgent({ id: 'agent-1', role: 'tester', capabilities: [] }, bus);
    
    await bus.publish('broadcast', 'sender-1', { text: 'broadcast-msg' });
    
    assert.strictEqual(agent.receivedMessages.length, 1);
    assert.strictEqual(agent.receivedMessages[0].payload.text, 'broadcast-msg');
  });

  it('should receive direct messages', async () => {
    const agent = new TestAgent({ id: 'agent-1', role: 'tester', capabilities: [] }, bus);
    
    await bus.publish('direct:agent-1', 'sender-1', { text: 'hello' });
    
    assert.strictEqual(agent.receivedMessages.length, 1);
    assert.strictEqual(agent.receivedMessages[0].payload.text, 'hello');
  });

  it('should not receive direct messages for other agents', async () => {
    const agent = new TestAgent({ id: 'agent-1', role: 'tester', capabilities: [] }, bus);
    
    await bus.publish('direct:agent-2', 'sender-1', { text: 'secret' });
    
    assert.strictEqual(agent.receivedMessages.length, 0);
  });

  it('should broadcast messages on topics', async () => {
    const listener = new TestAgent({ id: 'listener', role: 'subscriber', capabilities: [] }, bus);
    const sender = new TestAgent({ id: 'sender', role: 'publisher', capabilities: [] }, bus);
    
    bus.subscribe('test-topic', (msg) => {
      if (msg.senderId === 'sender') {
        listener.receivedMessages.push(msg);
      }
    });
    
    await sender.broadcast('test-topic', { data: 'test-data' });
    
    // Give time for async
    await new Promise(resolve => setTimeout(resolve, 10));
    
    assert.strictEqual(listener.receivedMessages.length, 1);
    assert.deepStrictEqual(listener.receivedMessages[0].payload, { data: 'test-data' });
  });

  it('should implement tick', async () => {
    const agent = new TestAgent({ id: 'agent-1', role: 'tester', capabilities: [] }, bus);
    await agent.tick();
    
    assert.strictEqual(agent.tickCount, 1);
  });

  it('should work with LLM provider', () => {
    const llm = new DummyLLMProvider({ model: 'test' });
    // Just verify construction with LLM doesn't throw
    const agent = new TestAgent({ id: 'agent-1', role: 'tester', capabilities: [] }, bus, llm);
    assert.ok(agent);
  });
});
