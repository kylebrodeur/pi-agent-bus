import { describe, it, expect, beforeEach } from '@jest/globals';
import { MessageBus, Message } from '../src/MessageBus';

describe('MessageBus', () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  it('should subscribe and publish messages', async () => {
    const messages: Message[] = [];
    bus.subscribe('test-topic', (msg) => messages.push(msg));
    
    await bus.publish('test-topic', 'sender-1', { data: 'hello' });
    
    expect(messages).toHaveLength(1);
    expect(messages[0].topic).toBe('test-topic');
    expect(messages[0].payload).toEqual({ data: 'hello' });
    expect(messages[0].senderId).toBe('sender-1');
  });

  it('should support multiple listeners on same topic', async () => {
    const messages1: Message[] = [];
    const messages2: Message[] = [];
    
    bus.subscribe('multi-topic', (msg) => messages1.push(msg));
    bus.subscribe('multi-topic', (msg) => messages2.push(msg));
    
    await bus.publish('multi-topic', 'sender-1', { data: 'multi' });
    
    expect(messages1).toHaveLength(1);
    expect(messages2).toHaveLength(1);
  });

  it('should unsubscribe correctly', async () => {
    const messages: Message[] = [];
    const handler = (msg: Message) => messages.push(msg);
    
    bus.subscribe('unsub-topic', handler);
    await bus.publish('unsub-topic', 'sender-1', { data: 'first' });
    
    bus.unsubscribe('unsub-topic', handler);
    await bus.publish('unsub-topic', 'sender-1', { data: 'second' });
    
    expect(messages).toHaveLength(1);
    expect(messages[0].payload.data).toBe('first');
  });

  it('should track message history', async () => {
    await bus.publish('topic-a', 'sender-1', { id: 1 });
    await bus.publish('topic-b', 'sender-2', { id: 2 });
    await bus.publish('topic-a', 'sender-3', { id: 3 });
    
    const allHistory = bus.getHistory();
    expect(allHistory).toHaveLength(3);
    
    const topicAHistory = bus.getHistory('topic-a');
    expect(topicAHistory).toHaveLength(2);
    
    const topicCHistory = bus.getHistory('topic-c');
    expect(topicCHistory).toHaveLength(0);
  });

  it('should handle async listeners', async () => {
    const delays: number[] = [];
    
    bus.subscribe('async-topic', async (msg) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      delays.push(msg.payload.delay);
    });
    
    await bus.publish('async-topic', 'sender-1', { delay: 1 });
    
    expect(delays).toHaveLength(1);
    expect(delays[0]).toBe(1);
  });

  it('should isolate topics', async () => {
    const messages: Message[] = [];
    bus.subscribe('topic-1', (msg) => messages.push(msg));
    
    await bus.publish('topic-2', 'sender-1', { data: 'wrong' });
    
    expect(messages).toHaveLength(0);
  });
});
