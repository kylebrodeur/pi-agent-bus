# `pi-agent-bus-node` API Documentation

## `MessageBus`

The `MessageBus` provides an event-driven stigmergic environment for agents to broadcast and subscribe to topics.

### `subscribe(topic: string, handler: MessageHandler): void`
Subscribes to a specific topic. The `handler` is called whenever a message is published to that topic.

### `unsubscribe(topic: string, handler: MessageHandler): void`
Removes a previously registered handler from a topic.

### `publish(topic: string, senderId: string, payload: any): Promise<void>`
Broadcasts a payload to all listeners of a specific topic. Internally creates a `Message` object with a generated `id` and timestamp.

### `getHistory(topic?: string): Message[]`
Returns the array of past messages. If `topic` is provided, filters the history to that topic.

### `getHistoryLimit(): number`
Returns the maximum number of messages stored.

### `setHistoryLimit(limit: number): void`
Sets the history limit. Automatically trims older messages if the current history exceeds this limit. Set to `0` for unlimited.

---

## `Agent`

The `Agent` abstract class provides the foundation for building specialized agents that interact via the `MessageBus`.

### `constructor(config: AgentConfig, bus: MessageBus, llm?: LLMProvider)`
Initializes the agent, subscribes to `broadcast` and `direct:${this.config.id}` topics by default.

### `broadcast(topic: string, payload: any): Promise<void>`
Helper to publish a message to the environment using the agent's ID as the sender.

### `sendDirect(targetAgentId: string, payload: any): Promise<void>`
Helper to send a direct message to a specific agent using the `direct:<id>` topic pattern.

### `protected handleMessage(message: Message): Promise<void>`
Hook intended to be overridden by subclasses to handle incoming subscribed messages.

### `protected askLLM(promptText: string, jsonMode = true): Promise<any>`
Helper to request a decision or response from the attached `LLMProvider`. Returns parsed JSON if `jsonMode` is true.

### `abstract tick(): Promise<void>`
The main execution loop or trigger method for the agent. Subclasses must implement this.

### `protected invokePiTool(toolName: string, args: any, timeoutMs: number = 30000): Promise<any>`
Sends a request to the Pi Tool Bridge to execute a `pi.tools` method on behalf of the agent. Awaits the response via the `pi_tool_bridge_responses` topic, rejecting if the bridge times out.
