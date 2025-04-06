import { BaseAgent } from './base-agent';
import { AgentType, CharacterAgent, CharacterStats } from './types';
import { Campaign } from '../state/campaign';
import { Character } from '../state/character';

/**
 * Character agent implementation
 */
export class CharacterAgentImpl extends BaseAgent implements CharacterAgent {
  private characterName: string;
  private character: Character;
  
  constructor(campaign: Campaign, characterName: string) {
    const systemPrompt = `You are roleplaying a character in a tabletop role-playing game.
    Stay in character at all times, responding as your character would based on their personality,
    background, and current goals.
    Consider your character's stats, equipment, and abilities when deciding actions.
    Your character's journal reflects their thoughts, experiences, and goals - use this to inform
    your roleplaying.`;
    
    super(`${characterName} Character`, AgentType.CHARACTER, systemPrompt, campaign);
    this.characterName = characterName;    
    this.character = this.campaign.getCharacter(this.characterName);
  }
  
  async updateJournal(entry: string): Promise<void> {
    if (!this.character) {
      throw new Error('Character not initialized');
    }
    
    // Use the character object to update the journal
    await this.character.updateJournal(entry);
    
    // Update context
    this.context.journal = this.character.getJournal();
  }
  
  getCharacterStats(): CharacterStats {
    return this.character.getStats();
  }
  
  protected getSystemPrompt(context: any): string {
    // Enhance the base system prompt with context
    let enhancedPrompt = this.systemPrompt;

    const characterStats = this.getCharacterStats()
    
    enhancedPrompt += '\n\nCharacter Stats:';
    enhancedPrompt += `\nName: ${characterStats.name}`;
    enhancedPrompt += `\nBackstory: ${characterStats.backstory}`;
    
    enhancedPrompt += '\n\nAttributes:';
    for (const [stat, value] of Object.entries(characterStats.stats)) {
      enhancedPrompt += `\n- ${stat}: ${value}`;
    }
    
    enhancedPrompt += '\n\nEquipped:';
    characterStats.equipped.forEach(item => {
      enhancedPrompt += `\n- ${item}`;
    });
    
    enhancedPrompt += '\n\nInventory:';
    characterStats.inventory.forEach(item => {
      enhancedPrompt += `\n- ${item}`;
    });
    
    // Add journal context
    if (context.journal) {
      enhancedPrompt += `\n\nCharacter Journal:\n${context.journal}`;
    }
    
    // Add recent campaign events if available
    if (context.recentCampaignEvents) {
      enhancedPrompt += `\n\nRecent Campaign Events:\n${context.recentCampaignEvents}`;
    }
    
    return enhancedPrompt;
  }
}
