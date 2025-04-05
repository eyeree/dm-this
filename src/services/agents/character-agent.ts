import * as fs from 'fs';
import * as path from 'path';
import { BaseAgent } from './base-agent';
import { AgentType, CharacterAgent, CharacterStats } from './types';

/**
 * Character agent implementation
 */
export class CharacterAgentImpl extends BaseAgent implements CharacterAgent {
  private campaignDirectory: string = '';
  private characterName: string = '';
  private characterStats: CharacterStats | null = null;
  private journalPath: string = '';
  
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
    
    this.campaignDirectory = context.campaignDirectory;
    this.characterName = context.characterName || this.name;
    this.journalPath = path.join(this.campaignDirectory, `character-journal-${this.characterName}.md`);
    
    // Load character stats
    const statsPath = path.join(this.campaignDirectory, `character-stats-${this.characterName}.md`);
    if (fs.existsSync(statsPath)) {
      this.characterStats = await this.parseCharacterStats(statsPath);
    }
    
    // Load journal if it exists
    if (fs.existsSync(this.journalPath)) {
      this.context.journal = await fs.promises.readFile(this.journalPath, 'utf-8');
    } else {
      this.context.journal = '';
    }
  }
  
  async updateJournal(entry: string): Promise<void> {
    // Get current journal content
    let journalContent = '';
    if (fs.existsSync(this.journalPath)) {
      journalContent = await fs.promises.readFile(this.journalPath, 'utf-8');
    }
    
    // Append new entry
    const updatedContent = journalContent + '\n\n' + entry;
    
    // Write updated journal
    await fs.promises.writeFile(this.journalPath, updatedContent, 'utf-8');
    
    // Update context
    this.context.journal = updatedContent;
  }
  
  getCharacterStats(): CharacterStats {
    if (!this.characterStats) {
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
  
  private async parseCharacterStats(statsPath: string): Promise<CharacterStats> {
    // In a real implementation, this would parse the markdown file
    // For this example, we'll return a simplified character
    const content = await fs.promises.readFile(statsPath, 'utf-8');
    
    // Very basic parsing of the markdown file
    const sections = content.split('# ').filter(Boolean);
    
    const stats: Record<string, number> = {};
    const equipped: string[] = [];
    const inventory: string[] = [];
    let backstory = '';
    
    for (const section of sections) {
      const lines = section.split('\n');
      const sectionName = lines[0].trim();
      
      if (sectionName === 'Stats') {
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const [statName, statValue] = line.split(':').map(s => s.trim());
            stats[statName] = parseInt(statValue, 10);
          }
        }
      } else if (sectionName === 'Equipped') {
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            equipped.push(line);
          }
        }
      } else if (sectionName === 'Inventory') {
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            inventory.push(line);
          }
        }
      } else if (sectionName === 'Backstory') {
        backstory = lines.slice(1).join('\n').trim();
      }
    }
    
    return {
      name: this.characterName,
      backstory,
      stats,
      equipped,
      inventory
    };
  }
}
