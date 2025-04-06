import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentType, ChatMessage } from './types';
import { LLMMessage, sendMessage } from '../llm';
import { Campaign } from '../state/campaign';

/**
 * Base agent implementation
 */
export abstract class BaseAgent implements Agent {
  protected name: string;
  protected type: AgentType;
  protected systemPrompt: string;
  protected campaign: Campaign;

  constructor(name: string, type: AgentType, systemPrompt: string, campaign: Campaign) {
    this.name = name;
    this.type = type;
    this.systemPrompt = systemPrompt;
    this.campaign = campaign;
  }

  getType(): AgentType {
    return this.type;
  }

  getName(): string {
    return this.name;
  }

  /**
   * Convert chat messages to LLM messages
   * @param messages Chat messages to convert
   * @returns LLM messages
   */
  protected convertToLLMMessages(messages: ChatMessage[]): LLMMessage[] {
    return messages.map(msg => ({
      role: msg.sender.type === 'player' ? 'user' : 'assistant',
      content: msg.content
    }));
  }

  /**
   * Process a message and generate a response
   * @param message The message to process
   */
  async processMessage(message: ChatMessage): Promise<ChatMessage> {
    // Create LLM messages from the message
    const llmMessages: LLMMessage[] = [
      {
        role: message.sender.type === 'player' ? 'user' : 'assistant',
        content: message.content
      }
    ];
    
    // Get context string and combine with system prompt
    const contextString = this.getContext();
    const fullSystemPrompt = this.systemPrompt + (contextString ? '\n\n' + contextString : '');
    
    // Get response from LLM
    const response = await sendMessage(llmMessages, fullSystemPrompt);
    
    // Create chat message from response
    return {
      id: uuidv4(),
      sender: {
        type: 'agent',
        name: this.name
      },
      content: response.message.content,
      timestamp: new Date(),
      visibility: message.visibility // Use same visibility as the original message
    };
  }

  /**
   * Get the context string to append to the system prompt
   * @returns Context string to append to the system prompt
   */
  protected abstract getContext(): string;
}
