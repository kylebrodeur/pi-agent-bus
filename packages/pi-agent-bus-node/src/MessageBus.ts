export interface Message {
  id: string;
  topic: string;
  payload: any;
  senderId: string;
  timestamp: number;
}

export type MessageHandler = (message: Message) => void | Promise<void>;

/**
 * MessageBus
 * 
 * An event-driven stigmergic environment for agents to drop messages (pheromones).
 * Instead of explicitly addressing one another, agents broadcast onto topics,
 * simulating environment-mediated coordination (Stigmergy) dropping O(n²) scaling.
 */
export class MessageBus {
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private history: Message[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 10000) {
    this.maxHistorySize = Math.max(0, maxHistorySize);
  }

  /**
   * Subscribe to a topic
   */
  subscribe(topic: string, handler: MessageHandler): void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(handler);
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string, handler: MessageHandler): void {
    const topicListeners = this.listeners.get(topic);
    if (topicListeners) {
      topicListeners.delete(handler);
    }
  }

  /**
   * Broadcast a message to a topic
   */
  async publish(topic: string, senderId: string, payload: any): Promise<void> {
    const message: Message = {
      id: crypto.randomUUID(),
      topic,
      payload,
      senderId,
      timestamp: Date.now(),
    };

    this.history.push(message);
    this._trimHistory();

    const topicListeners = this.listeners.get(topic);
    if (topicListeners) {
      const promises = Array.from(topicListeners).map(handler => handler(message));
      await Promise.allSettled(promises);
    }
  }

  /**
   * Get max history size
   */
  getHistoryLimit(): number {
    return this.maxHistorySize;
  }

  /**
   * Set max history size (0 = unlimited)
   */
  setHistoryLimit(limit: number): void {
    this.maxHistorySize = Math.max(0, limit);
    this._trimHistory();
  }

  /** Trim history if over limit */
  private _trimHistory(): void {
    if (this.maxHistorySize > 0 && this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get all messages for a given topic
   */
  getHistory(topic?: string): Message[] {
    if (topic) {
      return this.history.filter(m => m.topic === topic);
    }
    return [...this.history];
  }
}
