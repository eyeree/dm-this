import OpenAI from 'openai';
import { LLMMessage, LLMProvider, LLMResponse } from './types';

/**
 * OpenAI LLM provider implementation
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;
  
  /**
   * Create a new OpenAI provider
   */
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    this.client = new OpenAI({
      apiKey,
    });
    
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    this.maxTokens = 4096;
  }
  
  /**
   * Send a message to OpenAI and get a response
   * @param messages - Array of messages in the conversation
   * @param systemPrompt - Optional system prompt to guide OpenAI's behavior
   * @returns Promise with OpenAI's response
   */
  async sendMessage(
    messages: LLMMessage[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    try {
      // Format messages for OpenAI API
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      
      // Add system message if provided
      if (systemPrompt) {
        formattedMessages.unshift({
          role: 'system',
          content: systemPrompt,
        });
      }
      
      // Call OpenAI API
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: formattedMessages,
        max_tokens: this.maxTokens,
      });
      
      // Extract content from response
      const content = response.choices[0]?.message?.content || '';
      
      return {
        message: {
          role: 'assistant',
          content,
        },
        usage: {
          input_tokens: response.usage?.prompt_tokens || 0,
          output_tokens: response.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }
  
  /**
   * Get the name of the provider
   * @returns The provider name
   */
  getProviderName(): string {
    return 'OpenAI';
  }
  
  /**
   * Get the current model being used
   * @returns The model name
   */
  getModelName(): string {
    return this.model;
  }
}
