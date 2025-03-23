import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  message: ClaudeMessage;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Send a message to Claude and get a response
 * @param messages - Array of messages in the conversation
 * @param systemPrompt - Optional system prompt to guide Claude's behavior
 * @param model - Claude model to use (defaults to claude-3-opus-20240229)
 * @returns Promise with Claude's response
 */
export async function sendMessageToClaude(
  messages: ClaudeMessage[],
  systemPrompt?: string,
  model: string = 'claude-3-opus-20240229'
): Promise<ClaudeResponse> {
  try {
    // Get the API key from environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    
    console.log('Sending request to Claude API with API key:', apiKey ? 'API key is set' : 'API key is not set');
    
    // Initialize the Anthropic client with the API key
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });
    
    const response = await anthropic.messages.create({
      model,
      system: systemPrompt,
      messages: messages,
      max_tokens: 4096,
    });

    // Handle different content block types
    let content = '';
    if (response.content[0].type === 'text') {
      content = response.content[0].text;
    }
    
    return {
      message: {
        role: 'assistant',
        content: content,
      },
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

/**
 * Generate a D&D scene description using Claude
 * @param context - Context about the campaign, characters, and current situation
 * @returns Promise with Claude's generated scene description
 */
export async function generateSceneDescription(context: string): Promise<string> {
  const systemPrompt = `You are an expert Dungeon Master for a D&D game. 
  Create vivid, engaging scene descriptions that help players visualize the environment, 
  NPCs, and situation they're in. Include sensory details and atmosphere.`;

  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: `Please generate a detailed scene description for the following D&D scenario:\n\n${context}`,
    },
  ];

  const response = await sendMessageToClaude(messages, systemPrompt);
  return response.message.content;
}

/**
 * Generate NPC dialogue using Claude
 * @param npcInfo - Information about the NPC including personality, goals, and knowledge
 * @param situation - Current situation and context for the dialogue
 * @returns Promise with Claude's generated NPC dialogue
 */
export async function generateNPCDialogue(npcInfo: string, situation: string): Promise<string> {
  const systemPrompt = `You are an expert at roleplaying diverse D&D characters.
  Create authentic dialogue that reflects each character's personality, background, knowledge, and goals.
  Maintain consistent character voice and include appropriate mannerisms or speech patterns.`;

  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: `Generate dialogue for the following NPC in this situation:\n\nNPC INFO: ${npcInfo}\n\nSITUATION: ${situation}`,
    },
  ];

  const response = await sendMessageToClaude(messages, systemPrompt);
  return response.message.content;
}

/**
 * Generate a D&D combat narration using Claude
 * @param combatState - Current state of combat including positions, actions, and results
 * @returns Promise with Claude's generated combat narration
 */
export async function generateCombatNarration(combatState: string): Promise<string> {
  const systemPrompt = `You are an expert Dungeon Master narrating D&D combat.
  Create exciting, dynamic descriptions of combat actions and their results.
  Focus on making combat feel cinematic and consequential while clearly communicating what happens.`;

  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: `Please narrate the following combat situation in an engaging way:\n\n${combatState}`,
    },
  ];

  const response = await sendMessageToClaude(messages, systemPrompt);
  return response.message.content;
}
