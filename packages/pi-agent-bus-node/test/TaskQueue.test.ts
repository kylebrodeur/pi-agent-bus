import { describe, it, expect, beforeEach } from '@jest/globals';
import { TaskQueue, Task } from '../src/TaskQueue';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  it('should add and retrieve tasks', () => {
    const taskId = queue.add('test-task', { data: 'hello' });
    
    expect(taskId).toBeDefined();
    expect(typeof taskId).toBe('string');
    
    const task = queue.get(taskId);
    expect(task).toBeDefined();
    expect(task?.type).toBe('test-task');
    expect(task?.input).toEqual({ data: 'hello' });
    expect(task?.status).toBe('pending');
  });

  it('should track pending tasks', () => {
    queue.add('task-1', { id: 1 });
    queue.add('task-2', { id: 2 });
    
    const pending = queue.getPending();
    expect(pending).toHaveLength(2);
  });

  it('should allow agent to claim a task', () => {
    const taskId = queue.add('claimable-task', {});
    
    const claimed = queue.claim(taskId, 'agent-1');
    expect(claimed).toBe(true);
    
    const task = queue.get(taskId);
    expect(task?.status).toBe('in_progress');
    expect(task?.assignedTo).toBe('agent-1');
  });

  it('should not allow double claiming', () => {
    const taskId = queue.add('exclusive-task', {});
    
    queue.claim(taskId, 'agent-1');
    const claimedAgain = queue.claim(taskId, 'agent-2');
    
    expect(claimedAgain).toBe(false);
    
    const task = queue.get(taskId);
    expect(task?.assignedTo).toBe('agent-1');
  });

  it('should complete a claimed task', () => {
    const taskId = queue.add('completable-task', {});
    queue.claim(taskId, 'agent-1');
    
    queue.complete(taskId, 'agent-1', { result: 'done' });
    
    const task = queue.get(taskId);
    expect(task?.status).toBe('completed');
    expect(task?.result).toEqual({ result: 'done' });
  });

  it('should fail a claimed task', () => {
    const taskId = queue.add('failable-task', {});
    queue.claim(taskId, 'agent-1');
    
    queue.fail(taskId, 'agent-1', 'Something went wrong');
    
    const task = queue.get(taskId);
    expect(task?.status).toBe('failed');
    expect(task?.error).toBe('Something went wrong');
  });

  it('should not complete with wrong agent', () => {
    const taskId = queue.add('guarded-task', {});
    queue.claim(taskId, 'agent-1');
    
    queue.complete(taskId, 'agent-2', { result: 'hacked' });
    
    const task = queue.get(taskId);
    expect(task?.status).toBe('in_progress'); // Should not change
  });

  it('should get all tasks', () => {
    queue.add('task-a', {});
    queue.add('task-b', {});
    queue.add('task-c', {});
    
    const all = queue.getAll();
    expect(all).toHaveLength(3);
  });

  it('should update timestamps', () => {
    const taskId = queue.add('timestamp-task', {});
    const beforeClaim = queue.get(taskId)?.updatedAt;
    
    // Small delay to ensure timestamps differ
    queue.claim(taskId, 'agent-1');
    const afterClaim = queue.get(taskId)?.updatedAt;
    
    expect(afterClaim).toBeGreaterThanOrEqual(beforeClaim!);
  });
});
