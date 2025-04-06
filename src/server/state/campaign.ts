import fs from 'fs';
import path from 'path';
import { AgentFactory, AgentType } from '../agents';
import { CharacterStats } from '../agents/types';
import { Module } from './module';
import { Rules } from './rules';

export interface CampaignConfig {
  module: string;
  rules: string;
  characters: Array<{
    name: string;
  }>;
}

export interface CampaignState {
  'player-characters': any[];
  'non-player-characters': any[];
  [key: string]: any;
}

/**
 * Campaign class that encapsulates campaign configuration and state management.
 * Provides a central interface for all campaign-related data and operations.
 */
export class Campaign {
  private config: CampaignConfig;
  private state: CampaignState = {
    'player-characters': [],
    'non-player-characters': []
  };
  private campaignPath: string;
  private agentFactory: AgentFactory;
  private statePath: string;
  private journalPath: string;
  private _rules: Rules | null = null;
  private _module: Module | null = null;

  /**
   * Creates a new Campaign instance.
   * @param campaignId The campaign subdirectory name
   */
  constructor(campaignId: string) {
    // Validate environment variables
    const campaignsBasePath = process.env.DM_THIS_CAMPAIGNS;
    const modulesBasePath = process.env.DM_THIS_MODULES;
    const rulesBasePath = process.env.DM_THIS_RULES;

    if (!campaignsBasePath) {
      throw new Error('DM_THIS_CAMPAIGNS environment variable is not defined');
    }

    if (!modulesBasePath) {
      throw new Error('DM_THIS_MODULES environment variable is not defined');
    }

    if (!rulesBasePath) {
      throw new Error('DM_THIS_RULES environment variable is not defined');
    }

    // Set campaign path
    this.campaignPath = path.join(campaignsBasePath, campaignId);

    // Set paths
    const configPath = path.join(this.campaignPath, 'campaign.json');
    this.statePath = path.join(this.campaignPath, 'campaign-state.json');
    this.journalPath = path.join(this.campaignPath, 'campaign-journal.md');

    // Load campaign configuration
    if (!fs.existsSync(configPath)) {
      throw new Error(`Campaign configuration not found at ${configPath}`);
    }

    try {
      this.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
      throw new Error(`Failed to parse campaign configuration: ${error}`);
    }

    // Load campaign state
    this.loadCampaignState();


    // Get agent factory instance
    this.agentFactory = AgentFactory.getInstance();
  }


  /**
   * Loads the campaign state from the JSON file.
   * If the file doesn't exist, initializes with default state.
   */
  private loadCampaignState(): void {
    try {
      if (fs.existsSync(this.statePath)) {
        this.state = JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
      } else {
        // Initialize with default state
        this.state = {
          'player-characters': [],
          'non-player-characters': []
        };
        // Save the default state
        this.saveCampaignState();
      }
    } catch (error) {
      console.error('Error loading campaign state:', error);
      // Initialize with default state on error
      this.state = {
        'player-characters': [],
        'non-player-characters': []
      };
    }
  }

  /**
   * Saves the current campaign state to the JSON file.
   */
  saveCampaignState(): void {
    try {
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving campaign state:', error);
    }
  }

  /**
   * Gets the campaign state.
   */
  getCampaignState(): CampaignState {
    return { ...this.state };
  }

  /**
   * Updates the campaign state.
   * @param newState The new state to merge with the current state
   */
  updateCampaignState(newState: Partial<CampaignState>): void {
    this.state = { ...this.state, ...newState };
    this.saveCampaignState();
  }

  /**
   * Gets the campaign journal content.
   */
  getJournal(): string {
    if (fs.existsSync(this.journalPath)) {
      return fs.readFileSync(this.journalPath, 'utf-8');
    }
    return '';
  }

  /**
   * Updates the campaign journal with a new entry.
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
   * Gets a character's stats.
   * @param characterName The character name
   */
  getCharacterStats(characterName: string): CharacterStats | null {
    const statsPath = path.join(this.campaignPath, `character-stats-${characterName}.md`);
    if (fs.existsSync(statsPath)) {
      return this.parseCharacterStats(statsPath, characterName);
    }
    return null;
  }

  /**
   * Gets a character's journal content.
   * @param characterName The character name
   */
  getCharacterJournal(characterName: string): string {
    const journalPath = path.join(this.campaignPath, `character-journal-${characterName}.md`);
    if (fs.existsSync(journalPath)) {
      return fs.readFileSync(journalPath, 'utf-8');
    }
    return '';
  }

  /**
   * Updates a character's journal with a new entry.
   * @param characterName The character name
   * @param entry The new journal entry to append
   */
  async updateCharacterJournal(characterName: string, entry: string): Promise<void> {
    const journalPath = path.join(this.campaignPath, `character-journal-${characterName}.md`);
    
    // Get current journal content
    let journalContent = '';
    if (fs.existsSync(journalPath)) {
      journalContent = fs.readFileSync(journalPath, 'utf-8');
    }
    
    // Append new entry
    const updatedContent = journalContent + '\n\n' + entry;
    
    // Write updated journal
    await fs.promises.writeFile(journalPath, updatedContent, 'utf-8');
  }

  /**
   * Parses a character stats file.
   * @param statsPath Path to the character stats file
   * @param characterName The character name
   */
  private parseCharacterStats(statsPath: string, characterName: string): CharacterStats {
    const content = fs.readFileSync(statsPath, 'utf-8');
    
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
      name: characterName,
      backstory,
      stats,
      equipped,
      inventory
    };
  }


  /**
   * Initializes the campaign by setting up the AgentFactory and loading the rules and module.
   */
  async initialize(): Promise<void> {
    try {
      // Load the rules
      this._rules = await Rules.loadById(this.config.rules);
      
      // Load the module
      this._module = await Module.loadById(this.config.module);
      
      // Initialize the agent factory
      await this.agentFactory.initialize({
        campaign: this
      });
      
      console.log('Campaign initialized successfully');
    } catch (error) {
      console.error('Error initializing campaign:', error);
      throw error;
    }
  }
  
  /**
   * Gets the rules for this campaign.
   */
  get rules(): Rules {
    if (!this._rules) {
      throw new Error('Campaign rules not initialized. Call initialize() first.');
    }
    return this._rules;
  }

  /**
   * Gets the module for this campaign.
   */
  get module(): Module {
    if (!this._module) {
      throw new Error('Campaign module not initialized. Call initialize() first.');
    }
    return this._module;
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
    return this.agentFactory.getAgent(AgentType.CHARACTER, name);
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
