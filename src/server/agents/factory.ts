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
  public async initialize(config: {
    campaign: Campaign;
  }): Promise<void> {
    const campaign = config.campaign;
    
    // Initialize master agent
    this.masterAgent = new MasterAgentImpl();
    await this.masterAgent.initialize({
      campaign
    });
    
    // Initialize rule agent
    this.ruleAgent = new RuleAgentImpl();
    await this.ruleAgent.initialize({
      campaign
    });
    
    // Initialize character agents for all player characters and NPCs
    // This would typically be done by reading the campaign state
    // For this example, we'll just initialize a sample character
    // const sampleCharacter = new CharacterAgentImpl('Blageron');
    // await sampleCharacter.initialize({
    //   campaign,
    //   characterName: 'Blageron'
    // });
    // this.characterAgents.set('Blageron', sampleCharacter);
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
  public async createCharacterAgent(name: string, player?: string): Promise<CharacterAgent> {
    if (this.characterAgents.has(name)) {
      throw new Error(`Character agent already exists: ${name}`);
    }
    
    if (!this.masterAgent) {
      throw new Error('Master agent not initialized');
    }
    
    // Get the campaign from the master agent
    const masterAgentImpl = this.masterAgent as MasterAgentImpl;
    const campaign = (masterAgentImpl as any).campaign as Campaign;
    if (!campaign) {
      throw new Error('Campaign not initialized in master agent');
    }
    
    const agent = new CharacterAgentImpl(name);
    await agent.initialize({
      campaign,
      characterName: name,
      player
    });
    
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
