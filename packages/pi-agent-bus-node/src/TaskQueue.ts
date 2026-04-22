export interface Task<TInput = any, TOutput = any> {
  id: string;
  type: string;
  input: TInput;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: TOutput;
  error?: string;
  assignedTo?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * TaskQueue
 * 
 * Simple abstraction for managing asynchronous units of work.
 * Could represent a coding file to parse, or a physical 3D print job.
 */
export class TaskQueue {
  private tasks: Map<string, Task> = new Map();

  add<TInput>(type: string, input: TInput): string {
    const id = crypto.randomUUID();
    this.tasks.set(id, {
      id,
      type,
      input,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return id;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  getPending(): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'pending');
  }

  claim(id: string, agentId: string): boolean {
    const task = this.tasks.get(id);
    if (task && task.status === 'pending') {
      task.status = 'in_progress';
      task.assignedTo = agentId;
      task.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  complete<TOutput>(id: string, agentId: string, result: TOutput): void {
    const task = this.tasks.get(id);
    if (task && task.assignedTo === agentId) {
      task.status = 'completed';
      task.result = result;
      task.updatedAt = Date.now();
    }
  }

  fail(id: string, agentId: string, error: string): void {
    const task = this.tasks.get(id);
    if (task && task.assignedTo === agentId) {
      task.status = 'failed';
      task.error = error;
      task.updatedAt = Date.now();
    }
  }
}
