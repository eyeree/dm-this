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
  private journal: string = '';
  
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
    this.journal = this.character.getJournal();
  }
  
  async updateJournal(entry: string): Promise<void> {
    if (!this.character) {
      throw new Error('Character not initialized');
    }
    
    // Use the character object to update the journal
    await this.character.updateJournal(entry);
    
    // Update journal property
    this.journal = this.character.getJournal();
  }
  
  getCharacterStats(): CharacterStats {
    return this.character.getStats();
  }
  
  protected getContext(additionalContext?: any): string {
    let context = '';
    const characterStats = this.getCharacterStats();
    
    context += 'Character Stats:';
    context += `\nName: ${characterStats.name}`;
    context += `\nBackstory: ${characterStats.backstory}`;
    
    context += '\n\nAttributes:';
    for (const [stat, value] of Object.entries(characterStats.stats)) {
      context += `\n- ${stat}: ${value}`;
    }
    
    context += '\n\nEquipped:';
    characterStats.equipped.forEach(item => {
      context += `\n- ${item}`;
    });
    
    context += '\n\nInventory:';
    characterStats.inventory.forEach(item => {
      context += `\n- ${item}`;
    });
    
    // Add journal
    if (this.journal) {
      context += `\n\nCharacter Journal:\n${this.journal}`;
    }
    
    // Note: Recent campaign events would typically come from additionalContext
    // but we're removing that dependency as per requirements
    // TODO: If needed, implement a way to get recent campaign events from campaign object
    
    return context;
  }
}
