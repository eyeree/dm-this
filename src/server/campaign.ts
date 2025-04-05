import fs from 'fs';
import path from 'path';
import { AgentFactory, AgentType } from '../services/agents';

interface CampaignConfig {
  module: string;
  rules: string;
  characters: Array<{
    name: string;
  }>;
}

/**
 * Campaign class that encapsulates campaign configuration and agent management.
 * Reads configuration from campaign.json and initializes the AgentFactory.
 */
export class Campaign {
  private config: CampaignConfig;
  private campaignPath: string;
  private modulePath: string;
  private rulesPath: string;
  private agentFactory: AgentFactory;

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

    // Load campaign configuration
    const configPath = path.join(this.campaignPath, 'campaign.json');
    if (!fs.existsSync(configPath)) {
      throw new Error(`Campaign configuration not found at ${configPath}`);
    }

    try {
      this.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
      throw new Error(`Failed to parse campaign configuration: ${error}`);
    }

    // Set module and rules paths
    this.modulePath = path.join(modulesBasePath, this.config.module);
    this.rulesPath = path.join(rulesBasePath, this.config.rules);

    // Get agent factory instance
    this.agentFactory = AgentFactory.getInstance();
  }

  /**
   * Initializes the campaign by setting up the AgentFactory.
   */
  async initialize(): Promise<void> {
    try {
      await this.agentFactory.initialize({
        campaignDirectory: this.campaignPath,
        moduleDirectory: this.modulePath,
        rulesDirectory: this.rulesPath
      });
      console.log('Campaign initialized successfully');
    } catch (error) {
      console.error('Error initializing campaign:', error);
      throw error;
    }
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

  /**
   * Gets the campaign configuration.
   */
  getConfig(): CampaignConfig {
    return { ...this.config };
  }

  /**
   * Gets the campaign path.
   */
  getCampaignPath(): string {
    return this.campaignPath;
  }

  /**
   * Gets the module path.
   */
  getModulePath(): string {
    return this.modulePath;
  }

  /**
   * Gets the rules path.
   */
  getRulesPath(): string {
    return this.rulesPath;
  }
}
