import fs from 'fs';
import path from 'path';
import { AgentFactory, AgentType } from '../agents';
import { Module } from './module';
import { Rules } from './rules';
import { Character } from './character';

export type CampaignState = "Starting" | "Exploration" | "Encounter" | "Finished";

export interface CampaignConfig {
  state: CampaignState
  module: string;
  rules: string;
}

/**
 * Campaign class that encapsulates campaign configuration and state management.
 * Provides a central interface for all campaign-related data and operations.
 */
export class Campaign {

  public static async loadById(campaignId:string):Promise<Campaign> {
    const campaignsBasePath = process.env.DM_THIS_CAMPAIGNS;
    if (!campaignsBasePath) {
      throw new Error('DM_THIS_CAMPAIGNS environment variable is not defined');
    }

    const campaignPath = path.join(campaignsBasePath, campaignId)
    return await this.load(campaignPath)
  }

  private static async load(directoryPath:string):Promise<Campaign> {
    const configPath = path.join(directoryPath, 'campaign.json');
    const config = JSON.parse(await fs.promises.readFile(configPath, 'utf-8'));
    const rules = await Rules.loadById(config.rules);
    const module = await Module.loadById(config.module);
    const characters = await this.loadCharacters(directoryPath);
    const journalPath = path.join(directoryPath, 'campaign-journal.md');
    const journal = await this.loadJournal(journalPath);
    return new Campaign(directoryPath, configPath, config, rules, module, characters, journalPath, journal)
  }

  private static async loadJournal(journalPath:string) {
    if (fs.existsSync(journalPath)) {
      return await fs.promises.readFile(journalPath, 'utf-8');
    } else {
      return '';
    }
  }

  private static async loadCharacters(directoryPath:string):Promise<Map<string, Character>> {
    return new Map<string, Character>();
  }

  private agentFactory:AgentFactory

  /**
   * Creates a new Campaign instance.
   * @param campaignId The campaign subdirectory name
   */
  private constructor(
    private readonly campaignPath:string,
    private readonly configPath:string,
    private readonly config:CampaignConfig,
    public readonly rules:Rules,
    public readonly module:Module,
    public readonly characters:Map<string, Character>,
    private readonly journalPath:string,
    private journal:string
  ) {
    this.agentFactory = new AgentFactory(this);
  }

  /**
   * Saves the current campaign state to the JSON file.
   */
  private async saveConfig() {
    await fs.promises.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  getState():CampaignState {
    return this.config.state;
  }

  async setState(new_state:CampaignState) {
    this.config.state = new_state;
    await this.saveConfig()
  }

  /**
   * Gets the campaign journal content.
   */
  getJournal(): string {
    return this.journal;
  }

  /**
   * Updates the campaign journal with a new entry.
   * @param entry The new journal entry to append
   */
  async updateJournal(entry: string): Promise<void> {
    // TODO: add structure defined in README.md
    this.journal += entry
    await fs.promises.writeFile(this.journalPath, this.journal, 'utf-8')
  }

  /**
   * Gets a character by name
   * @param characterName The character name
   */
  async createCharacter(characterName: string): Promise<Character> {
    const character = this.characters.get(characterName);
    if (!character) {
      // Create the character if it doesn't exist
      const newCharacter = await Character.load(this.campaignPath, characterName);
      this.characters.set(characterName, newCharacter);
      return newCharacter;
    }
    return character;
  }

  getCharacter(characterName:string): Character {
    const character = this.characters.get(characterName);
    if (character == null) {
      throw new Error(`No such character ${characterName}`);
    }
    return character;
  }
  
  /**
   * Gets the master agent for the campaign.
   */
  getMasterAgent() {
    return this.agentFactory.getMasterAgent();
  }

  /**
   * Gets the rule agent for the campaign.
   */
  getRuleAgent() {
    return this.agentFactory.getRuleAgent();
  }

  /**
   * Gets a character agent by name.
   * @param name The character name
   */
  getCharacterAgent(name: string) {
    return this.agentFactory.getCharacterAgent(name);
  }

  /**
   * Gets all character agents for the campaign.
   */
  getAllCharacterAgents() {
    return this.agentFactory.getAllCharacterAgents();
  }

  /**
   * Gets an agent by type and optional name.
   * @param type The agent type
   * @param name The agent name (required for character agents)
   */
  getAgent(type: AgentType, name?: string) {
    return this.agentFactory.getAgent(type, name);
  }

}
