import fs from 'fs';
import path from 'path';
import { CharacterStats } from '../agents/types';

/**
 * Character class that encapsulates character-related functionality.
 * Provides an interface for character data and operations.
 */
export class Character {
  private characterName: string;
  private campaignPath: string;
  private statsPath: string;
  private journalPath: string;
  private stats: CharacterStats | null = null;

  /**
   * Creates a new Character instance.
   * @param characterName The character name
   * @param campaignPath The path to the campaign directory
   */
  constructor(characterName: string, campaignPath: string) {
    this.characterName = characterName;
    this.campaignPath = campaignPath;
    this.statsPath = path.join(this.campaignPath, `character-stats-${characterName}.md`);
    this.journalPath = path.join(this.campaignPath, `character-journal-${characterName}.md`);
  }

  /**
   * Gets the character's name.
   */
  getName(): string {
    return this.characterName;
  }

  /**
   * Gets the character's stats.
   */
  getStats(): CharacterStats | null {
    if (this.stats === null) {
      this.loadStats();
    }
    return this.stats;
  }

  /**
   * Loads the character's stats from the stats file.
   */
  private loadStats(): void {
    if (fs.existsSync(this.statsPath)) {
      this.stats = this.parseCharacterStats();
    }
  }

  /**
   * Gets the character's journal content.
   */
  getJournal(): string {
    if (fs.existsSync(this.journalPath)) {
      return fs.readFileSync(this.journalPath, 'utf-8');
    }
    return '';
  }

  /**
   * Updates the character's journal with a new entry.
   * @param entry The new journal entry to append
   */
  async updateJournal(entry: string): Promise<void> {
    // Get current journal content
    let journalContent = this.getJournal();
    
    // Append new entry
    const updatedContent = journalContent + '\n\n' + entry;
    
    // Write updated journal
    await fs.promises.writeFile(this.journalPath, updatedContent, 'utf-8');
  }

  /**
   * Parses the character stats file.
   */
  private parseCharacterStats(): CharacterStats {
    const content = fs.readFileSync(this.statsPath, 'utf-8');
    
    // Basic parsing of the markdown file
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
