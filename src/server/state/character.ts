import fs from 'fs';
import path from 'path';

/**
 * Character class that encapsulates character-related functionality.
 * Provides an interface for character data and operations.
 */
export class Character {

  static async load(campaignPath: string, characterName: string) {
    const statsPath = path.join(campaignPath, `character-stats-${characterName}.md`);
    const journalPath = path.join(campaignPath, `character-journal-${characterName}.md`);
    const portraitPath = path.join(campaignPath, `character-portrait-${characterName}.png`);
    const tokenPath = path.join(campaignPath, `character-token-${characterName}.png`);
    const stats = await fs.promises.readFile(statsPath, 'utf-8')
    const journal = await fs.promises.readFile(journalPath, 'utf-8')
    const result = new Character(characterName, statsPath, journalPath, portraitPath, tokenPath, stats, journal)
    return result;
  }
  
  private constructor(
    public readonly name: string,
    private readonly statsPath: string,
    private readonly journalPath: string,
    public readonly portraitPath: string,
    public readonly tokenPath:string,
    private stats: string,
    private journal: string
  ) {
  }

  /**
   * Gets the character's stats.
   */
  getStats(): string {
    return this.stats;
  }

  async setStats(stats:string) {
    this.stats = stats;
    await fs.promises.writeFile(this.statsPath, this.stats);
  }

  /**
   * Gets the character's journal content.
   */
  getJournal(): string {
    return this.journal;
  }

  /**
   * Updates the character's journal with a new entry.
   * @param entry The new journal entry to append
   */
  async updateJournal(entry: string): Promise<void> {
    // TODO use campaign state to provide structure as described in README.md
    this.journal += entry;
    await fs.promises.writeFile(this.journalPath, this.journal, 'utf-8');
  }

}
