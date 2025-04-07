import { BaseAgent } from './base-agent.js';
import { AgentType, RulesAgent } from './types.js';
import { Campaign } from '../state/campaign.js';

/**
 * Rule agent implementation
 */
export class RuleAgentImpl extends BaseAgent implements RulesAgent {
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
    
    context += 'Rule Files:';
    this.campaign.rules.ruleFilePaths.forEach((path: string) => {
      context += `\n- ${path}`;
    });
    
    return context;
  }

}
