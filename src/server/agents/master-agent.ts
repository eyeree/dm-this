import { BaseAgent } from './base-agent.js';
import { AgentType, MasterAgent } from './types.js';
import { Campaign } from '../state/campaign.js';

/**
 * Master agent implementation
 */
export class MasterAgentImpl extends BaseAgent implements MasterAgent {
  private journal: string;
  
  constructor(campaign: Campaign) {
    const systemPrompt = `You are the Game Master for a tabletop role-playing game. 
    Your role is to narrate the story, describe environments, control NPCs, and adjudicate rules.
    Be descriptive and engaging, creating a vivid world for the players.
    Respond to player actions appropriately, maintaining game balance and narrative flow.
    When appropriate, summarize key events for the campaign journal.`;
    
    super("Game Master", AgentType.MASTER, systemPrompt, campaign);

    // Store journal directly instead of in context
    this.journal = this.campaign.getJournal();
  }

  async updateJournal(entry: string): Promise<void> {
    if (!this.campaign) {
      throw new Error('Campaign not initialized');
    }
    
    // Use the campaign object to update the journal
    await this.campaign.updateJournal(entry);
    
    // Update journal property
    this.journal = this.campaign.getJournal();
  }

  protected getContext(additionalContext?: any): string {
    let context = '';
    
    // Add journal context
    if (this.journal) {
      context += `Campaign Journal:\n${this.journal}`;
    }
    
    // Note: The following information would typically come from additionalContext
    // but we're removing that dependency as per requirements
    
    // TODO: If needed, implement a way to get player characters from campaign object
    // For example: this.campaign.getPlayerCharacters()
    
    // TODO: If needed, implement a way to get recent rule interpretations from campaign object
    // For example: this.campaign.getRecentRuleInterpretations()
    
    // TODO: If needed, implement a way to get map state from campaign object
    // For example: this.campaign.getMapState()
    
    return context;
  }
}
