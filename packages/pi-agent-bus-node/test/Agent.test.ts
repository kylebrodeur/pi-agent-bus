import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MessageBus } from '../src/MessageBus';
import { DummyLLMProvider } from '../src/LLMProvider';
import { Agent, AgentConfig } from '../src/Agent';

// Create a concrete agent for testing by extending the base Agent class
class TestAgent extends Agent {
  public receivedMessages: any[] = [];
  public tickCount = 0;

  constructor(config: AgentConfig, bus: MessageBus, llm?: any) {
    super(config, bus, llm);
    // In the base class, we already subscribe to direct:id and broadcast.
    // We override handleMessage to capture messages for testing.
  }

  protected async handleMessage(message: any): Promise<void> {
    this.receivedMessages.push(message);
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
    
    // Subscribe to the specific topic for the test
    bus.subscribe('test-topic', (msg) => {
      if (msg.senderId === 'sender') {
        listener.receivedMessages.push(msg);
      }
    });
    
    await sender.broadcast('test-topic', { data: 'test-data' });
    
    // Give time for async (MessageBus.publish is async)
    await new Promise(resolve => setTimeout(resolve, 10));
    
    assert.strictEqual(listener.receivedMessages.length, 1);
    assert.deepStrictEqual(listener.receivedMessages[0].payload, { data: 'test-data' });
  });

  it('should send direct messages to other agents', async () => {
    const agent1 = new TestAgent({ id: 'agent-1', role: 'sender', capabilities: [] }, bus);
    const agent2 = new TestAgent({ id: 'agent-2', role: 'receiver', capabilities: [] }, bus);
    
    await agent1.sendDirect('agent-2', { text: 'private message' });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    assert.strictEqual(agent2.receivedMessages.length, 1);
    assert.strictEqual(agent2.receivedMessages[0].payload.text, 'private message');
    assert.strictEqual(agent2.receivedMessages[0].senderId, 'agent-1');
  });

  it('should implement tick', async () => {
    const agent = new TestAgent({ id: 'agent-1', role: 'tester', capabilities: [] }, bus);
    await agent.tick();
    
    assert.strictEqual(agent.tickCount, 1);
  });

  it('should work with LLM provider', async () => {
    const llm = new DummyLLMProvider({ model: 'test' });
    const agent = new TestAgent({ id: 'agent-1', role: 'tester', capabilities: [] }, bus, llm);
    
    // We need to expose askLLM for testing since it is protected
    const result = await (agent as any).askLLM('Hello AI');
    assert.ok(result);
  });

  it('should invoke Pi tool via bridge', async () => {
    const agent = new TestAgent({ id: 'agent-1', role: 'tester', capabilities: [] }, bus);
    
    // Mock the bridge response
    bus.subscribe('pi_tool_bridge_requests', async (message: any) => {
      const { requestId, responseTopic } = message.payload;
      await bus.publish(responseTopic, 'pi-tool-bridge', { 
        requestId, 
        result: 'mocked-tool-result' 
      });
    });
    
    const result = await (agent as any).invokePiTool('test_tool', { arg1: 'val1' });
    assert.strictEqual(result, 'mocked-tool-result');
  });

  it('should handle Pi tool invocation timeout', async () => {
    const agent = new TestAgent({ id: 'agent-1', role: 'tester', capabilities: [] }, bus);
    
    // Do NOT mock the bridge response to trigger timeout
    try {
      await (agent as any).invokePiTool('slow_tool', {}, 50); // 50ms timeout
      assert.fail('Should have timed out');
    } catch (e: any) {
      assert.ok(e.message.includes('timed out'));
    }
  });

  it('should handle Pi tool invocation error', async () => {
    const agent = new TestAgent({ id: 'agent-1', role: 'tester', capabilities: [] }, bus);
    
    // Mock the bridge to return an error
    bus.subscribe('pi_tool_bridge_requests', async (message: any) => {
      const { requestId, responseTopic } = message.payload;
      await bus.publish(responseTopic, 'pi-tool-bridge', { 
        requestId, 
        error: 'Tool execution failed' 
      });
    });
    
    try {
      await (agent as any).invokePiTool('error_tool', {});
      assert.fail('Should have thrown error');
    } catch (e: any) {
      assert.strictEqual(e.message, 'Tool execution failed');
    }
  });
});
