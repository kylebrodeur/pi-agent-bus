import { describe, it, expect, beforeEach } from '@jest/globals';
import { LLMProvider, DummyLLMProvider } from '../src/LLMProvider';

describe('DummyLLMProvider', () => {
  let provider: DummyLLMProvider;

  beforeEach(() => {
    provider = new DummyLLMProvider({ model: 'test-model' });
  });

  it('should return a dummy response', async () => {
    const response = await provider.prompt('Hello world');
    
    expect(response).toContain('Dummy response to:');
    expect(response).toContain('Hello world');
  });

  it('should return JSON in jsonMode', async () => {
    const response = await provider.prompt('Test prompt', { jsonMode: true });
    
    const parsed = JSON.parse(response);
    expect(parsed).toHaveProperty('response');
    expect(parsed.response).toContain('Dummy response to:');
  });

  it('should store config', () => {
    expect(provider['config'].model).toBe('test-model');
  });
});

describe('LLMProvider Interface', () => {
  it('should require prompt implementation', () => {
    class TestProvider extends LLMProvider {
      async prompt(text: string): Promise<string> {
        return text;
      }
    }
    
    const provider = new TestProvider({ model: 'test' });
    expect(provider).toBeDefined();
    expect(typeof provider.prompt).toBe('function');
  });
});
