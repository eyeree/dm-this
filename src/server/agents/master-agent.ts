import * as fs from 'fs';
import * as path from 'path';
import { BaseAgent } from './base-agent.js';
import { AgentType, CharacterStats, MasterAgent } from './types.js';

/**
 * Master agent implementation
 */
export class MasterAgentImpl extends BaseAgent implements MasterAgent {
  private campaignDirectory: string = '';
  private moduleDirectory: string = '';
  private journalPath: string = '';
  // @ts-ignore
  private campaignData: any = {};

  constructor(name: string = 'Game Master') {
    const systemPrompt = `You are the Game Master for a tabletop role-playing game. 
    Your role is to narrate the story, describe environments, control NPCs, and adjudicate rules.
    Be descriptive and engaging, creating a vivid world for the players.
    Respond to player actions appropriately, maintaining game balance and narrative flow.
    When appropriate, summarize key events for the campaign journal.`;
    
    super(name, AgentType.MASTER, systemPrompt);
  }

  async initialize(context: any): Promise<void> {
    await super.initialize(context);
    
    this.campaignDirectory = context.campaignDirectory;
    this.moduleDirectory = context.moduleDirectory;
    this.journalPath = path.join(this.campaignDirectory, 'campaign-journal.md');
    
    // Load campaign data
    const campaignPath = path.join(this.campaignDirectory, 'campaign.yaml');
    if (fs.existsSync(campaignPath)) {
      this.campaignData = await this.loadYamlFile(campaignPath);
    } else {
      this.campaignData = { 
        'player-characters': [],
        'non-player-characters': []
      };
    }
    
    // Load module content
    if (fs.existsSync(this.moduleDirectory)) {
      const moduleFiles = fs.readdirSync(this.moduleDirectory)
        .filter(file => file.endsWith('.pdf'));
      
      this.context.moduleFiles = moduleFiles;
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

  async getCharacterCreationConstraints(): Promise<any> {
    // Create LLM messages to get character creation constraints
    const llmMessages = [
      {
        role: 'user',
        content: 'What are the constraints for creating a new character in this campaign?'
      }
    ];
    
    // Get response from LLM
    const response = await this.sendMessageToLLM(llmMessages);
    
    // Parse constraints from response
    // This is a simplified implementation - in a real system, you might want to
    // structure this more formally
    return {
      description: response.message.content,
      allowedLevels: [1, 2, 3], // Example constraint
      allowedRaces: ['Human', 'Elf', 'Dwarf', 'Halfling'], // Example constraint
      allowedClasses: ['Fighter', 'Wizard', 'Cleric', 'Rogue'] // Example constraint
    };
  }

  async getPrecreatedCharacters(): Promise<CharacterStats[]> {
    // This would typically extract character information from the module PDFs
    // For this implementation, we'll return a simplified example
    return [
      {
        name: 'Thorgrim',
        backstory: 'A dwarf fighter from the mountains, seeking glory and gold.',
        stats: {
          'Strength': 16,
          'Dexterity': 12,
          'Constitution': 18,
          'Intelligence': 10,
          'Wisdom': 14,
          'Charisma': 8
        },
        equipped: ['Chain Mail', 'Battle Axe', 'Shield'],
        inventory: ['Backpack', 'Bedroll', 'Rations x5', 'Waterskin', 'Torch x3']
      },
      {
        name: 'Elindra',
        backstory: 'An elven wizard with a thirst for arcane knowledge.',
        stats: {
          'Strength': 8,
          'Dexterity': 16,
          'Constitution': 12,
          'Intelligence': 18,
          'Wisdom': 14,
          'Charisma': 10
        },
        equipped: ['Robes', 'Staff', 'Spellbook'],
        inventory: ['Backpack', 'Component Pouch', 'Scroll Case', 'Ink and Quill', 'Parchment x10']
      }
    ];
  }

  protected getSystemPrompt(context: any): string {
    // Enhance the base system prompt with context
    let enhancedPrompt = this.systemPrompt;
    
    // Add journal context
    if (context.journal) {
      enhancedPrompt += `\n\nCampaign Journal:\n${context.journal}`;
    }
    
    // Add player character information
    if (context.playerCharacters && context.playerCharacters.length > 0) {
      enhancedPrompt += '\n\nPlayer Characters:';
      context.playerCharacters.forEach((pc: any) => {
        enhancedPrompt += `\n- ${pc.name}`;
      });
    }
    
    // Add recent rule interpretations if available
    if (context.recentRuleInterpretations) {
      enhancedPrompt += '\n\nRecent Rule Interpretations:';
      enhancedPrompt += context.recentRuleInterpretations;
    }
    
    // Add map state if available
    if (context.mapState) {
      enhancedPrompt += '\n\nCurrent Map State:';
      enhancedPrompt += `\n- Background: ${context.mapState.backgroundUrl}`;
      enhancedPrompt += '\n- Tokens:';
      context.mapState.tokens.forEach((token: any) => {
        enhancedPrompt += `\n  - ${token.name} at position (${token.x}, ${token.y})`;
      });
    }
    
    return enhancedPrompt;
  }

  private async loadYamlFile(filePath: string): Promise<any> {
    // In a real implementation, you would use a YAML parser
    // For this example, we'll just return a placeholder
    return { 
      'player-characters': [],
      'non-player-characters': []
    };
  }

  private async sendMessageToLLM(messages: any[]): Promise<any> {
    // Use the LLM service to send a message
    const { sendMessage } = await import('../llm/index.js');
    return sendMessage(messages, this.getSystemPrompt(this.context));
  }
}
