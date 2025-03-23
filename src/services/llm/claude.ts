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
        .map(msg => ({
          role: msg.role as 'user' | 'assistant', // Type assertion since we've filtered out 'system'
          content: msg.content,
        }));
      
      // Extract system message from the messages array if present and no systemPrompt was provided
      if (!systemPrompt) {
        const systemMessage = messages.find(msg => msg.role === 'system');
        if (systemMessage) {
          systemPrompt = systemMessage.content;
        }
      }
      
      // Call Claude API
      const response = await this.client.messages.create({
        model: this.model,
        system: systemPrompt,
        messages: formattedMessages,
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
}
