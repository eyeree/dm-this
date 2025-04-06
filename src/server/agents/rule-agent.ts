import { BaseAgent } from './base-agent.js';
import { AgentType, RuleAgent } from './types.js';
import { Campaign } from '../state/campaign.js';

/**
 * Rule agent implementation
 */
export class RuleAgentImpl extends BaseAgent implements RuleAgent {
  constructor(campaign: Campaign) {
    const systemPrompt = `You are an expert at analyzing role playing game rules and answering player questions.
    Answer questions based on the provided rule context.
    If you don't know the answer or it's not in the context, say so - don't make up information.
    When guiding character creation, follow the rules strictly while helping players create
    characters that match their concept within the allowed constraints.`;
    
    super('Rule Lawyer', AgentType.RULE, systemPrompt, campaign);
  }

  protected getContext(): string {
    let context = '';
    
    // Get rule file paths from campaign
    const ruleFilePaths = this.campaign.rules.getRuleFilePaths();
    if (ruleFilePaths && ruleFilePaths.length > 0) {
      context += 'Rule Files:';
      ruleFilePaths.forEach((path: string) => {
        context += `\n- ${path}`;
      });
    }
    
    // Note: The following information would typically come from additionalContext
    // but we're removing that dependency as per requirements
    
    // TODO: If needed, implement a way to get rule context from campaign object
    // For example: this.campaign.rules.getRuleContext()
    
    // TODO: If needed, implement a way to get character creation constraints from campaign object
    // For example: this.campaign.rules.getCharacterCreationConstraints()
    
    return context;
  }

}
