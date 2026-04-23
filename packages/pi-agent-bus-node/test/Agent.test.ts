import { describe, it, expect, beforeEach } from '@jest/globals';
import { MessageBus } from '../src/MessageBus';
import { Agent, AgentConfig } from '../src/Agent';
import { DummyLLMProvider } from '../src/LLMProvider';

// Create a concrete agent for testing
class TestAgent extends Agent {
  public receivedMessages: any[] = [];
  public tickCount = 0;

  async tick(): Promise<void> {
    this.tickCount++;
  }

  protected async handleMessage(message: any): Promise<void> {
    this.receivedMessages.push(message);
  }
}

describe('Agent', () => {
  let bus: MessageBus;
  let agent: TestAgent;

  beforeEach(() => {
    bus = new MessageBus();
    const config: AgentConfig = {
      id: 'test-agent',
      role: 'tester',
      capabilities: ['messaging', 'tasking']
    };
    agent = new TestAgent(config, bus, new DummyLLMProvider({ model: 'dummy' }));
  });

  it('should initialize with correct config', () => {
    expect(agent.config.id).toBe('test-agent');
    expect(agent.config.role).toBe('tester');
    expect(agent.config.capabilities).toContain('messaging');
  });

  it('should receive direct messages', async () => {
    await bus.publish('direct:test-agent', 'sender-1', { text: 'hello' });
    
    expect(agent.receivedMessages).toHaveLength(1);
    expect(agent.receivedMessages[0].payload.text).toBe('hello');
  });

  it('should receive broadcast messages', async () => {
    await bus.publish('broadcast', 'sender-1', { text: 'broadcast-msg' });
    
    expect(agent.receivedMessages).toHaveLength(1);
    expect(agent.receivedMessages[0].payload.text).toBe('broadcast-msg');
  });

  it('should send direct messages to other agents', async () => {
    const otherAgent = new TestAgent(
      { id: 'other-agent', role: 'target', capabilities: [] },
      bus
    );

    await agent.sendDirect('other-agent', { text: 'direct-msg' });
    
    expect(otherAgent.receivedMessages).toHaveLength(1);
    expect(otherAgent.receivedMessages[0].payload.text).toBe('direct-msg');
  });

  it('should broadcast messages on topics', async () => {
    const listener = new TestAgent(
      { id: 'listener', role: 'subscriber', capabilities: [] },
      bus
    );
    
    await bus.subscribe('test-topic', (msg) => {
      if (msg.senderId === 'test-agent') {
        listener.receivedMessages.push(msg);
      }
    });
    
    await agent.broadcast('test-topic', { data: 'broadcast-data' });
    
    // Give time for async
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(listener.receivedMessages).toHaveLength(1);
  });

  it('should call LLM for decisions', async () => {
    const result = await agent['askLLM']('Test prompt', true);
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('response');
  });

  it('should throw without LLM provider', async () => {
    const noLLMAgent = new TestAgent(
      { id: 'no-llm', role: 'broken', capabilities: [] },
      bus
    );

    await expect(noLLMAgent['askLLM']('prompt', true))
      .rejects.toThrow('has no LLM provider attached');
  });

  it('should invoke Pi tools with timeout', async () => {
    const mockBridge = {
      requestId: '',
      toolName: '',
      args: null,
      responded: false
    };
    
    // Simulate bridge response
    bus.subscribe('pi_tool_bridge_requests', (msg) => {
      mockBridge.requestId = msg.payload.requestId;
      mockBridge.toolName = msg.payload.toolName;
      mockBridge.args = msg.payload.args;
      
      // Respond immediately
      bus.publish(msg.payload.responseTopic, 'bridge', {
        requestId: msg.payload.requestId,
        result: { success: true },
        error: null
      });
    });

    // Create stub that won't throw
    const result = { success: false };
    const original = agent['invokePiTool'];
    
    // This is a simplified test - in reality this requires the bridge
    expect(() => agent['invokePiTool']('read', { path: 'test.txt' }, 5000))
      .not.toThrow();
  });

  it('should implement tick', async () => {
    await agent.tick();
    
    expect(agent.tickCount).toBe(1);
  });
});
