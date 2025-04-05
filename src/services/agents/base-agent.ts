import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentType, ChatMessage } from './types';
import { LLMMessage, sendMessage } from '../llm';

/**
 * Base agent implementation
 */
export abstract class BaseAgent implements Agent {
  protected name: string;
  protected type: AgentType;
  protected systemPrompt: string;
  protected context: any;

  constructor(name: string, type: AgentType, systemPrompt: string) {
    this.name = name;
    this.type = type;
    this.systemPrompt = systemPrompt;
    this.context = {};
  }

  getType(): AgentType {
    return this.type;
  }

  getName(): string {
    return this.name;
  }

  async initialize(context: any): Promise<void> {
    this.context = context;
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
   * @param context Additional context for the agent
   */
  async processMessage(message: ChatMessage, context?: any): Promise<ChatMessage> {
    // Combine existing context with additional context
    const combinedContext = {
      ...this.context,
      ...context
    };
    
    // Create LLM messages from the message and context
    const llmMessages: LLMMessage[] = [
      {
        role: message.sender.type === 'player' ? 'user' : 'assistant',
        content: message.content
      }
    ];
    
    // Get response from LLM
    const response = await sendMessage(llmMessages, this.getSystemPrompt(combinedContext));
    
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
   * Get the system prompt with context
   * @param context Context to include in the prompt
   * @returns System prompt with context
   */
  protected abstract getSystemPrompt(context: any): string;
}
