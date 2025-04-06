import { BaseAgent } from './base-agent.js';
import { AgentType, MasterAgent } from './types.js';
import { Campaign } from '../state/campaign.js';

/**
 * Master agent implementation
 */
export class MasterAgentImpl extends BaseAgent implements MasterAgent {
  private campaign: Campaign | null = null;

  constructor(name: string = 'Game Master') {
    const systemPrompt = `You are the Game Master for a tabletop role-playing game. 
    Your role is to narrate the story, describe environments, control NPCs, and adjudicate rules.
    Be descriptive and engaging, creating a vivid world for the players.
    Respond to player actions appropriately, maintaining game balance and narrative flow.
    When appropriate, summarize key events for the campaign journal.`;
    
    super(name, AgentType.MASTER, systemPrompt);
  }

  async initialize(context: any): Promise<void> {
    await super.initialize(context);
    
    // Store the campaign object
    this.campaign = context.campaign;
    
    if (!this.campaign) {
      throw new Error('Campaign object is required for MasterAgent initialization');
    }
    
    // Set up context with campaign state
    this.context.campaignState = this.campaign.getCampaignState();
    this.context.moduleFilePaths = this.campaign.module.getModuleFilePaths();
    this.context.journal = this.campaign.getJournal();
  }

  async updateJournal(entry: string): Promise<void> {
    if (!this.campaign) {
      throw new Error('Campaign not initialized');
    }
    
    // Use the campaign object to update the journal
    await this.campaign.updateJournal(entry);
    
    // Update context
    this.context.journal = this.campaign.getJournal();
  }

  protected getSystemPrompt(context: any): string {
    // Enhance the base system prompt with context
    let enhancedPrompt = this.systemPrompt;
    
    // Add journal context
    if (context.journal) {
      enhancedPrompt += `\n\nCampaign Journal:\n${context.journal}`;
    }
    
    // Add player character information
    if (context.playerCharacters && context.playerCharacters.length > 0) {
      enhancedPrompt += '\n\nPlayer Characters:';
      context.playerCharacters.forEach((pc: any) => {
        enhancedPrompt += `\n- ${pc.name}`;
      });
    }
    
    // Add recent rule interpretations if available
    if (context.recentRuleInterpretations) {
      enhancedPrompt += '\n\nRecent Rule Interpretations:';
      enhancedPrompt += context.recentRuleInterpretations;
    }
    
    // Add map state if available
    if (context.mapState) {
      enhancedPrompt += '\n\nCurrent Map State:';
      enhancedPrompt += `\n- Background: ${context.mapState.backgroundUrl}`;
      enhancedPrompt += '\n- Tokens:';
      context.mapState.tokens.forEach((token: any) => {
        enhancedPrompt += `\n  - ${token.name} at position (${token.x}, ${token.y})`;
      });
    }
    
    return enhancedPrompt;
  }

  // This method was removed as it's no longer needed with the Campaign object handling state
}
