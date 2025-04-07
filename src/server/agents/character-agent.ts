import { BaseAgent } from './base-agent';
import { AgentType, CharacterAgent } from './types';
import { Campaign } from '../state/campaign';
import { Character } from '../state/character';

/**
 * Character agent implementation
 */
export class CharacterAgentImpl extends BaseAgent implements CharacterAgent {
  public readonly characterName: string;
  public readonly character: Character;

  // TODO: monitor game chat channel and respond
  
  constructor(campaign: Campaign, characterName: string) {
    const systemPrompt = `
      You are roleplaying a character in a tabletop role-playing game. Stay in character at all times, responding as 
      your character would based on their personality, background, and current goals. Consider your character's stats, 
      equipment, and abilities when deciding actions. Your character's journal reflects their thoughts, experiences, and
      goals - use this to inform your roleplaying.
    `;
    
    super(`${characterName} Character`, AgentType.CHARACTER, systemPrompt, campaign);
    this.characterName = characterName;    
    this.character = this.campaign.getCharacter(this.characterName);
  }
  
  protected getContext(): string {
    let context = '';

    // Add campaign journal
    context += '\n<CampaignJournal>\n'
    context += this.campaign.getJournal()
    context += '\n</CampaignJournal>\n'

    // Add stats
    context += '\n<CharacterStats>\n'
    context += this.character.getStats()
    context += '\n</CharacterStats>\n'
    
    // Add character journal
    context += '\n<CharacterJournal>\n'
    context += this.character.getJournal()
    context += '\n</CharacterJournal>\n'

    return context;
  }

}
