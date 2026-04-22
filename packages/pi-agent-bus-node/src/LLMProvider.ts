export interface LLMConfig {
  model: string;
  baseUrl?: string;
  temperature?: number;
}

export interface PromptOptions {
  systemPrompt?: string;
  jsonMode?: boolean;
}

/**
 * LLMProvider
 * 
 * Interface for talking to the intelligence layer.
 * A concrete implementation would hit an Ollama endpoint or external API.
 */
export abstract class LLMProvider {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract prompt(text: string, options?: PromptOptions): Promise<string>;
}

/**
 * Dummy Local Implementation
 * Normally you'd implement an OllamaProvider using `fetch` or native SDK here.
 */
export class DummyLLMProvider extends LLMProvider {
  async prompt(text: string, options?: PromptOptions): Promise<string> {
    // In a real implementation this sends a REST request to `http://localhost:11434/api/generate`
    if (options?.jsonMode) {
      return JSON.stringify({ response: "Dummy response to: " + text.substring(0, 20) + "..." });
    }
    return "Dummy response to: " + text.substring(0, 20) + "...";
  }
}
