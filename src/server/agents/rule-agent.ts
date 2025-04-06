import * as fs from 'fs';
import * as path from 'path';
import { BaseAgent } from './base-agent.js';
import { AgentType, CharacterStats, RuleAgent } from './types.js';
import { getRuleSetContext } from '../state/rule-set.js';

/**
 * Rule agent implementation
 */
export class RuleAgentImpl extends BaseAgent implements RuleAgent {
  private rulesDirectory: string = '';
  
  constructor(name: string = 'Rule Lawyer') {
    const systemPrompt = `You are an expert at analyzing role playing game rules and answering player questions.
    Answer questions based on the provided rule context.
    If you don't know the answer or it's not in the context, say so - don't make up information.
    When guiding character creation, follow the rules strictly while helping players create
    characters that match their concept within the allowed constraints.`;
    
    super(name, AgentType.RULE, systemPrompt);
  }
  
  async initialize(context: any): Promise<void> {
    await super.initialize(context);
    
    this.rulesDirectory = context.rulesDirectory;
  }
  
  async getRuleInterpretation(query: string): Promise<string> {
    // Get rule context for the query
    const ruleContext = await getRuleSetContext(this.rulesDirectory, query);
    
    // Create LLM messages for the query
    const llmMessages = [
      {
        role: 'user',
        content: query
      }
    ];
    
    // Get response from LLM with rule context
    const response = await this.sendMessageToLLM(llmMessages, { ruleContext });
    
    return response.message.content;
  }
  
  async guideCharacterCreation(constraints: any, description: string): Promise<CharacterStats> {
    // Create LLM messages for character creation
    const llmMessages = [
      {
        role: 'user',
        content: `I want to create a character with the following description: ${description}`
      }
    ];
    
    // Get rule context for character creation
    const ruleContext = await getRuleSetContext(this.rulesDirectory, 'character creation');
    
    // Get response from LLM with rule context and constraints
    const response = await this.sendMessageToLLM(llmMessages, { 
      ruleContext,
      constraints
    });
    
    // In a real implementation, this would involve a multi-turn conversation
    // For this example, we'll just return a simplified character
    return {
      name: 'New Character',
      player: 'Player',
      backstory: description,
      stats: {
        'Strength': 10,
        'Dexterity': 10,
        'Constitution': 10,
        'Intelligence': 10,
        'Wisdom': 10,
        'Charisma': 10
      },
      equipped: [],
      inventory: []
    };
  }
  
  protected getSystemPrompt(context: any): string {
    // Enhance the base system prompt with context
    let enhancedPrompt = this.systemPrompt;
    
    // Add rule context if available
    if (context.ruleContext) {
      enhancedPrompt += `\n\nRule Context:\n${context.ruleContext}`;
    }
    
    // Add character creation constraints if available
    if (context.constraints) {
      enhancedPrompt += '\n\nCharacter Creation Constraints:';
      enhancedPrompt += `\n${context.constraints.description}`;
      
      if (context.constraints.allowedLevels) {
        enhancedPrompt += `\nAllowed Levels: ${context.constraints.allowedLevels.join(', ')}`;
      }
      
      if (context.constraints.allowedRaces) {
        enhancedPrompt += `\nAllowed Races: ${context.constraints.allowedRaces.join(', ')}`;
      }
      
      if (context.constraints.allowedClasses) {
        enhancedPrompt += `\nAllowed Classes: ${context.constraints.allowedClasses.join(', ')}`;
      }
    }
    
    return enhancedPrompt;
  }
  
  private async sendMessageToLLM(messages: any[], additionalContext: any = {}): Promise<any> {
    // Use the LLM service to send a message
    const { sendMessage } = await import('../llm/index.js');
    
    // Combine existing context with additional context
    const combinedContext = {
      ...this.context,
      ...additionalContext
    };
    
    return sendMessage(messages, this.getSystemPrompt(combinedContext));
  }
}
