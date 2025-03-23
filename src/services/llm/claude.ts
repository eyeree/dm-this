import Anthropic from '@anthropic-ai/sdk';
import { LLMMessage, LLMProvider, LLMResponse } from './types';

/**
 * Claude LLM provider implementation
 */
export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  
  /**
   * Create a new Claude provider
   */
  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    
    this.client = new Anthropic({
      apiKey,
    });
    
    this.model = process.env.CLAUDE_MODEL || 'claude-3-opus-20240229';
    this.maxTokens = 4096;
  }
  
  /**
   * Send a message to Claude and get a response
   * @param messages - Array of messages in the conversation
   * @param systemPrompt - Optional system prompt to guide Claude's behavior
   * @returns Promise with Claude's response
   */
  async sendMessage(
    messages: LLMMessage[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    try {
      // Format messages for Claude API - filter out system messages as Claude handles them separately
      const formattedMessages = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => {
          // Handle string content
          if (typeof msg.content === 'string') {
            return {
              role: msg.role as 'user' | 'assistant', // Type assertion since we've filtered out 'system'
              content: msg.content,
            };
          }
          
          // Handle array content (text and images)
          // Convert to Claude's content block format
          return {
            role: msg.role as 'user' | 'assistant',
            content: msg.content.map(content => {
              if (content.type === 'text') {
                return { type: 'text', text: content.text || '' };
              } else if (content.type === 'image_url' && content.image_url) {
                // Claude uses 'image' type instead of 'image_url'
                return {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: this.getMediaTypeFromUrl(content.image_url.url),
                    data: this.extractBase64FromDataUrl(content.image_url.url),
                  }
                };
              }
              return { type: 'text', text: '' }; // Fallback
            }),
          };
        });
      
      // Extract system message from the messages array if present and no systemPrompt was provided
      if (!systemPrompt) {
        const systemMessage = messages.find(msg => msg.role === 'system');
        if (systemMessage) {
          systemPrompt = typeof systemMessage.content === 'string' 
            ? systemMessage.content 
            : systemMessage.content.find(c => c.type === 'text')?.text || '';
        }
      }
      
      // Call Claude API
      const response = await this.client.messages.create({
        model: this.model,
        system: systemPrompt,
        messages: formattedMessages as any, // Type assertion to handle complex message format
        max_tokens: this.maxTokens,
      });
      
      // Handle different content block types
      let content = '';
      if (response.content[0].type === 'text') {
        content = response.content[0].text;
      }
      
      return {
        message: {
          role: 'assistant',
          content,
        },
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  }
  
  /**
   * Get the name of the provider
   * @returns The provider name
   */
  getProviderName(): string {
    return 'Claude';
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
    // Claude 3 models support images
    return this.model.includes('claude-3');
  }
  
  /**
   * Extract base64 data from a data URL
   * @param dataUrl - Data URL string
   * @returns Base64 encoded data without the prefix
   */
  private extractBase64FromDataUrl(dataUrl: string): string {
    // Handle both regular URLs and data URLs
    if (!dataUrl.startsWith('data:')) {
      throw new Error('URL must be a data URL for Claude image processing');
    }
    
    // Extract the base64 part from data:image/jpeg;base64,/9j/4AAQ...
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid data URL format');
    }
    
    return base64Data;
  }
  
  /**
   * Get the media type from a data URL
   * @param dataUrl - Data URL string
   * @returns Media type string (e.g., 'image/jpeg')
   */
  private getMediaTypeFromUrl(dataUrl: string): string {
    if (!dataUrl.startsWith('data:')) {
      throw new Error('URL must be a data URL for Claude image processing');
    }
    
    // Extract the media type from data:image/jpeg;base64,/9j/4AAQ...
    const mediaType = dataUrl.split(';')[0].split(':')[1];
    if (!mediaType) {
      return 'image/jpeg'; // Default to JPEG if not specified
    }
    
    return mediaType;
  }
}
