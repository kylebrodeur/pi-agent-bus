import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MessageBus, ToolTestingAgent } from 'pi-agent-bus-node';

describe('ToolTestingAgent invokePiTool', () => {
  it('should successfully invoke a pi tool via a mock bridge subscriber', async () => {
    const bus = new MessageBus();
    const toolName = 'test_tool';
    const toolArgs = { foo: 'bar' };
    const expectedResult = { success: true, data: 'hello' };

    const agent = new ToolTestingAgent(
      { id: 'test-agent', role: 'tester', capabilities: [] },
      bus
    );

    // Mock the bridge behavior: listen for pi_tool_bridge_requests and
    // publish a response back on the response topic.
    bus.subscribe('pi_tool_bridge_requests', async (msg) => {
      const { requestId, responseTopic } = msg.payload;
      await bus.publish(responseTopic, 'bridge', {
        requestId,
        result: expectedResult,
      });
    });

    const result = await agent.testToolCall(toolName, toolArgs);
    assert.deepStrictEqual(result, expectedResult);
  });

  it('should reject when the bridge returns an error', async () => {
    const bus = new MessageBus();
    const toolName = 'fail_tool';
    const toolArgs = {};
    const expectedError = 'Tool execution failed';

    const agent = new ToolTestingAgent(
      { id: 'test-agent', role: 'tester', capabilities: [] },
      bus
    );

    bus.subscribe('pi_tool_bridge_requests', async (msg) => {
      const { requestId, responseTopic } = msg.payload;
      await bus.publish(responseTopic, 'bridge', {
        requestId,
        error: expectedError,
      });
    });

    // When the bridge returns an error, the agent should reject the promise.
    await assert.rejects(
      () => agent.testToolCall(toolName, toolArgs),
      { message: expectedError }
    );
  });
});
