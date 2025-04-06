import { BaseAgent } from './base-agent';
import { AgentType, CharacterAgent, CharacterStats } from './types';
import { Campaign } from '../state/campaign';
import { Character } from '../state/character';

/**
 * Character agent implementation
 */
export class CharacterAgentImpl extends BaseAgent implements CharacterAgent {
  private campaign: Campaign | null = null;
  private characterName: string = '';
  private characterStats: CharacterStats | null = null;
  private character: Character | null = null;
  
  constructor(name: string) {
    const systemPrompt = `You are roleplaying a character in a tabletop role-playing game.
    Stay in character at all times, responding as your character would based on their personality,
    background, and current goals.
    Consider your character's stats, equipment, and abilities when deciding actions.
    Your character's journal reflects their thoughts, experiences, and goals - use this to inform
    your roleplaying.`;
    
    super(name, AgentType.CHARACTER, systemPrompt);
    this.characterName = name;
  }
  
  async initialize(context: any): Promise<void> {
    await super.initialize(context);
    
    // Store the campaign object
    this.campaign = context.campaign;
    
    if (!this.campaign) {
      throw new Error('Campaign object is required for CharacterAgent initialization');
    }
    
    this.characterName = context.characterName || this.name;
    
    // Get character from campaign
    this.character = this.campaign.getCharacter(this.characterName);
    
    // Load character stats
    this.characterStats = this.character.getStats();
    
    if (!this.characterStats) {
      throw new Error(`Character stats not found for ${this.characterName}`);
    }
    
    // Load journal
    this.context.journal = this.character.getJournal();
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
    if (!this.character || !this.characterStats) {
      throw new Error(`Character stats not loaded for ${this.characterName}`);
    }
    return this.characterStats;
  }
  
  protected getSystemPrompt(context: any): string {
    // Enhance the base system prompt with context
    let enhancedPrompt = this.systemPrompt;
    
    // Add character stats if available
    if (this.characterStats) {
      enhancedPrompt += '\n\nCharacter Stats:';
      enhancedPrompt += `\nName: ${this.characterStats.name}`;
      enhancedPrompt += `\nBackstory: ${this.characterStats.backstory}`;
      
      enhancedPrompt += '\n\nAttributes:';
      for (const [stat, value] of Object.entries(this.characterStats.stats)) {
        enhancedPrompt += `\n- ${stat}: ${value}`;
      }
      
      enhancedPrompt += '\n\nEquipped:';
      this.characterStats.equipped.forEach(item => {
        enhancedPrompt += `\n- ${item}`;
      });
      
      enhancedPrompt += '\n\nInventory:';
      this.characterStats.inventory.forEach(item => {
        enhancedPrompt += `\n- ${item}`;
      });
    }
    
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
