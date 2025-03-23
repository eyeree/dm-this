export * from './types';
export * from './openai';
export * from './claude';
export * from './factory';

import { LLMFactory } from './factory';
// Re-export common functions for convenience
import { LLMMessage, LLMProvider, LLMResponse } from './types';

// Initialize the LLM provider based on environment variable
let provider: LLMProvider = LLMFactory.getDefaultProvider();

console.log(`Using LLM provider: ${provider.getProviderName()}`);

/**
 * Send a message to the configured LLM provider
 * @param messages - Array of messages in the conversation
 * @param systemPrompt - Optional system prompt to guide the LLM's behavior
 * @returns Promise with the LLM's response
 */
export async function sendMessage(
  messages: LLMMessage[],
  systemPrompt?: string
): Promise<LLMResponse> {
  return provider.sendMessage(messages, systemPrompt);
}
