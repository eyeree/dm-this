import { LLMProvider } from './types';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';

/**
 * Factory for creating LLM providers
 */
export class LLMFactory {
  
  /**
   * Get the default LLM provider (OpenAI)
   * @param config - Configuration options
   * @returns Default LLM provider instance
   */
  static getDefaultProvider(): LLMProvider {

    // Get the provider type from environment variable (default to OpenAI)
    const providerType = process.env.DM_THIS_CHAT_LLM?.toLowerCase() || 'openai';

    // Initialize the provider
    if (providerType === 'claude') {
      return new ClaudeProvider();
    } else {
      // Default to OpenAI
      return new OpenAIProvider();
    }

  }
}
