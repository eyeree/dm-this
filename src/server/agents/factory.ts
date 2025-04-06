import { Agent, AgentType, CharacterAgent, MasterAgent, RuleAgent } from './types';
import { MasterAgentImpl } from './master-agent';
import { RuleAgentImpl } from './rule-agent';
import { CharacterAgentImpl } from './character-agent';
import { Campaign } from '../state/campaign';

/**
 * Factory for creating and managing agents
 */
export class AgentFactory {
  private static instance: AgentFactory;
  private masterAgent: MasterAgent | null = null;
  private ruleAgent: RuleAgent | null = null;
  private characterAgents: Map<string, CharacterAgent> = new Map();
  private campaign: Campaign | null = null;
  
  private constructor() {}
  
  /**
   * Get the singleton instance of the agent factory
   */
  public static getInstance(): AgentFactory {
    if (!AgentFactory.instance) {
      AgentFactory.instance = new AgentFactory();
    }
    return AgentFactory.instance;
  }
  
  /**
   * Initialize the agent factory with a campaign
   * @param config Configuration containing the campaign
   */
  public initialize(config: {
    campaign: Campaign;
  }): void {
    this.campaign = config.campaign;
    
    // Initialize master agent
    this.masterAgent = new MasterAgentImpl(this.campaign);
    
    // Initialize rule agent
    this.ruleAgent = new RuleAgentImpl(this.campaign);
    
    // Character agents will be created on demand
  }
  
  /**
   * Get the master agent
   */
  public getMasterAgent(): MasterAgent {
    if (!this.masterAgent) {
      throw new Error('Master agent not initialized');
    }
    return this.masterAgent;
  }
  
  /**
   * Get the rule agent
   */
  public getRuleAgent(): RuleAgent {
    if (!this.ruleAgent) {
      throw new Error('Rule agent not initialized');
    }
    return this.ruleAgent;
  }
  
  /**
   * Get a character agent by name
   * @param name Name of the character
   */
  public getCharacterAgent(name: string): CharacterAgent {
    const agent = this.characterAgents.get(name);
    if (!agent) {
      throw new Error(`Character agent not found: ${name}`);
    }
    return agent;
  }
  
  /**
   * Get all character agents
   */
  public getAllCharacterAgents(): CharacterAgent[] {
    return Array.from(this.characterAgents.values());
  }
  
  /**
   * Create a new character agent
   * @param name Name of the character
   * @param player Name of the player (optional)
   */
  public createCharacterAgent(name: string): CharacterAgent {
    if (this.characterAgents.has(name)) {
      throw new Error(`Character agent already exists: ${name}`);
    }
    
    if (!this.campaign) {
      throw new Error('Campaign not initialized');
    }
    
    const agent = new CharacterAgentImpl(this.campaign, name);
    
    // Player information is stored in the agent
    // In a real implementation, we would need to add a method to Character class
    // to update the character stats with player information
    
    this.characterAgents.set(name, agent);
    return agent;
  }
  
  /**
   * Get an agent by type and name
   * @param type Type of the agent
   * @param name Name of the agent (only required for character agents)
   */
  public getAgent(type: AgentType, name?: string): Agent {
    switch (type) {
      case AgentType.MASTER:
        return this.getMasterAgent();
      case AgentType.RULE:
        return this.getRuleAgent();
      case AgentType.CHARACTER:
        if (!name) {
          throw new Error('Name is required for character agents');
        }
        return this.getCharacterAgent(name);
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }
}
