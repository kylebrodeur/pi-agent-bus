import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TaskQueue } from '../src/TaskQueue';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  it('should add and retrieve tasks', () => {
    const taskId = queue.add('test-task', { data: 'hello' });
    
    assert.ok(taskId);
    assert.strictEqual(typeof taskId, 'string');
    
    const task = queue.get(taskId);
    assert.ok(task);
    assert.strictEqual(task?.type, 'test-task');
    assert.deepStrictEqual(task?.input, { data: 'hello' });
    assert.strictEqual(task?.status, 'pending');
  });

  it('should track pending tasks', () => {
    queue.add('task-1', { id: 1 });
    queue.add('task-2', { id: 2 });
    
    const pending = queue.getPending();
    assert.strictEqual(pending.length, 2);
  });

  it('should allow agent to claim a task', () => {
    const taskId = queue.add('claimable-task', {});
    
    const claimed = queue.claim(taskId, 'agent-1');
    assert.strictEqual(claimed, true);
    
    const task = queue.get(taskId);
    assert.strictEqual(task?.status, 'in_progress');
    assert.strictEqual(task?.assignedTo, 'agent-1');
  });

  it('should not allow double claiming', () => {
    const taskId = queue.add('exclusive-task', {});
    
    queue.claim(taskId, 'agent-1');
    const claimedAgain = queue.claim(taskId, 'agent-2');
    
    assert.strictEqual(claimedAgain, false);
    
    const task = queue.get(taskId);
    assert.strictEqual(task?.assignedTo, 'agent-1');
  });

  it('should complete a claimed task', () => {
    const taskId = queue.add('completable-task', {});
    queue.claim(taskId, 'agent-1');
    
    queue.complete(taskId, 'agent-1', { result: 'done' });
    
    const task = queue.get(taskId);
    assert.strictEqual(task?.status, 'completed');
    assert.deepStrictEqual(task?.result, { result: 'done' });
  });

  it('should fail a claimed task', () => {
    const taskId = queue.add('failable-task', {});
    queue.claim(taskId, 'agent-1');
    
    queue.fail(taskId, 'agent-1', 'Something went wrong');
    
    const task = queue.get(taskId);
    assert.strictEqual(task?.status, 'failed');
    assert.strictEqual(task?.error, 'Something went wrong');
  });

  it('should not complete with wrong agent', () => {
    const taskId = queue.add('guarded-task', {});
    queue.claim(taskId, 'agent-1');
    
    queue.complete(taskId, 'agent-2', { result: 'hacked' });
    
    const task = queue.get(taskId);
    assert.strictEqual(task?.status, 'in_progress');
  });

  it('should get all tasks', () => {
    queue.add('task-a', {});
    queue.add('task-b', {});
    queue.add('task-c', {});
    
    const all = queue.getAll();
    assert.strictEqual(all.length, 3);
  });
});
