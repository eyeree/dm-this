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
      const formattedMessages = messages.map(msg => {
        // Handle string content
        if (typeof msg.content === 'string') {
          return {
            role: msg.role,
            content: msg.content,
          };
        }
        
        // Handle array content (text and images)
        return {
          role: msg.role,
          content: msg.content.map(content => {
            if (content.type === 'text') {
              return { type: 'text', text: content.text };
            } else if (content.type === 'image_url') {
              return {
                type: 'image_url',
                image_url: content.image_url,
              };
            }
            return content;
          }),
        };
      });
      
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
        messages: formattedMessages as any, // Type assertion to handle complex message format
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
  
  /**
   * Check if the provider supports image inputs
   * @returns Boolean indicating if images are supported
   */
  supportsImages(): boolean {
    // Only GPT-4 Vision models support images
    return this.model.includes('gpt-4') || this.model.includes('gpt-4o');
  }
}
