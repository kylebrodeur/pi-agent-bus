import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MessageBus } from '../src/MessageBus';

describe('MessageBus', () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  it('should subscribe and publish messages', async () => {
    const messages: any[] = [];
    bus.subscribe('test-topic', (msg) => { messages.push(msg); });
    
    await bus.publish('test-topic', 'sender-1', { data: 'hello' });
    
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].topic, 'test-topic');
    assert.deepStrictEqual(messages[0].payload, { data: 'hello' });
    assert.strictEqual(messages[0].senderId, 'sender-1');
  });

  it('should support multiple listeners on same topic', async () => {
    const messages1: any[] = [];
    const messages2: any[] = [];
    
    bus.subscribe('multi-topic', (msg) => { messages1.push(msg); });
    bus.subscribe('multi-topic', (msg) => { messages2.push(msg); });
    
    await bus.publish('multi-topic', 'sender-1', { data: 'multi' });
    
    assert.strictEqual(messages1.length, 1);
    assert.strictEqual(messages2.length, 1);
  });

  it('should unsubscribe correctly', async () => {
    const messages: any[] = [];
    const handler = (msg: any) => { messages.push(msg); };
    
    bus.subscribe('unsub-topic', handler);
    await bus.publish('unsub-topic', 'sender-1', { data: 'first' });
    
    bus.unsubscribe('unsub-topic', handler);
    await bus.publish('unsub-topic', 'sender-1', { data: 'second' });
    
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].payload.data, 'first');
  });

  it('should track message history', async () => {
    await bus.publish('topic-a', 'sender-1', { id: 1 });
    await bus.publish('topic-b', 'sender-2', { id: 2 });
    await bus.publish('topic-a', 'sender-3', { id: 3 });
    
    const allHistory = bus.getHistory();
    assert.strictEqual(allHistory.length, 3);
    
    const topicAHistory = bus.getHistory('topic-a');
    assert.strictEqual(topicAHistory.length, 2);
    
    const topicCHistory = bus.getHistory('topic-c');
    assert.strictEqual(topicCHistory.length, 0);
  });

  it('should isolate topics', async () => {
    const messages: any[] = [];
    bus.subscribe('topic-1', (msg) => { messages.push(msg); });
    
    await bus.publish('topic-2', 'sender-1', { data: 'wrong' });
    
    assert.strictEqual(messages.length, 0);
  });
});
