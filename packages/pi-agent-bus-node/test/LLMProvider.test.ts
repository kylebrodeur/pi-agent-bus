import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DummyLLMProvider } from '../src/LLMProvider';

describe('DummyLLMProvider', () => {
  it('should return a dummy response', async () => {
    const provider = new DummyLLMProvider({ model: 'test-model' });
    const response = await provider.prompt('Hello world');
    
    assert.ok(response.includes('Dummy response to:'));
    assert.ok(response.includes('Hello world'));
  });

  it('should return JSON in jsonMode', async () => {
    const provider = new DummyLLMProvider({ model: 'test-model' });
    const response = await provider.prompt('Test prompt', { jsonMode: true });
    
    const parsed = JSON.parse(response);
    assert.ok(parsed.response);
    assert.ok(parsed.response.includes('Dummy response to:'));
  });

  it('should store config', () => {
    const provider = new DummyLLMProvider({ model: 'test-model' });
    assert.strictEqual(provider['config'].model, 'test-model');
  });
});
