/**
 * Common message format for LLM interactions
 */
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | LLMMessageContent[];
}

/**
 * Content type for LLM messages with mixed text and images
 */
export interface LLMMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

/**
 * Response format for LLM interactions
 */
export interface LLMResponse {
  message: {
    role: 'assistant';
    content: string;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Configuration options for LLM providers
 */
export interface LLMProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Interface for LLM providers
 */
export interface LLMProvider {
  /**
   * Send a message to the LLM and get a response
   * @param messages - Array of messages in the conversation
   * @param systemPrompt - Optional system prompt to guide the LLM's behavior
   * @returns Promise with the LLM's response
   */
  sendMessage(
    messages: LLMMessage[],
    systemPrompt?: string
  ): Promise<LLMResponse>;
  
  /**
   * Get the name of the provider
   * @returns The provider name
   */
  getProviderName(): string;
  
  /**
   * Get the current model being used
   * @returns The model name
   */
  getModelName(): string;
  
  /**
   * Check if the provider supports image inputs
   * @returns Boolean indicating if images are supported
   */
  supportsImages(): boolean;
}
