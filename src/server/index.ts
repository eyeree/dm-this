import '../util/config/load';
import express from 'express';
import path from 'path';
import { LLMMessage, sendMessage } from '../services/llm';
import { getRuleSetContext } from '../util/rule-set';

// Use process.cwd() instead of __dirname
const rootDir = process.cwd();

const app = express();
const PORT = process.env.PORT || 3002;

const rule_set_directory = process.env.DM_THIS_RULE_SET || 'content/rules/SRD3_5'

// Middleware
app.use(express.json());
app.use(express.static(path.resolve(rootDir, 'dist')));

// API routes
app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'DM-This API is running',
    version: '0.1.0',
    features: ['llm']
  });
});

function getContextContent(messages: LLMMessage[]): string {
  return messages.slice(-4).map(msg => msg.content).join('\n');
}

// LLM API endpoints
app.post('/api/llm/message', async (req, res) => {
  try {
    console.log('Received request to /api/llm/message:', req.body);
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      console.log('Invalid request: messages array is required');
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    console.log('Sending request to LLM API...');
    
    // Convert messages to LLMMessage format
    const llmMessages: LLMMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const context_content = getContextContent(llmMessages)
    const rules_context = await getRuleSetContext(rule_set_directory, context_content);

    console.log('Rule set context:', rules_context);
    
    const systemPrompt = `You are an expert Dungeon Master for a D&D game. 
    Create vivid, engaging scene descriptions that help players visualize the environment, 
    NPCs, and situation they're in. Include sensory details and atmosphere.
    Answer player questions and determine the outcome of actions using the provided game system rule context.
    If you don't know the answer or it's not in the context, say so - don't make up information.
    If you need to role dice, use the following format: "Roll 1d20" or "Roll 2d6". You will see the 
    result in the response.

    Rules Context:
    ${rules_context}
    `;

    const response = await sendMessage(llmMessages, systemPrompt);
    
    console.log('Received response from LLM API:', response);
    res.json(response);
  } catch (error) {
    console.error('Error in LLM message endpoint:', error);
    res.status(500).json({ error: 'Failed to get response from LLM' });
  }
});

app.post('/api/llm/scene', async (req, res) => {
  try {
    const { context } = req.body;
    
    if (!context) {
      return res.status(400).json({ error: 'Context is required' });
    }
    
    const systemPrompt = `You are an expert Dungeon Master for a D&D game. 
    Create vivid, engaging scene descriptions that help players visualize the environment, 
    NPCs, and situation they're in. Include sensory details and atmosphere.`;

    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: `Please generate a detailed scene description for the following D&D scenario:\n\n${context}`,
      },
    ];

    const response = await sendMessage(messages, systemPrompt);
    
    res.json({ description: response.message.content });
  } catch (error) {
    console.error('Error generating scene description:', error);
    res.status(500).json({ error: 'Failed to generate scene description' });
  }
});

app.post('/api/llm/npc-dialogue', async (req, res) => {
  try {
    const { npcInfo, situation } = req.body;
    
    if (!npcInfo || !situation) {
      return res.status(400).json({ error: 'NPC info and situation are required' });
    }
    
    const systemPrompt = `You are an expert at roleplaying diverse D&D characters.
    Create authentic dialogue that reflects each character's personality, background, knowledge, and goals.
    Maintain consistent character voice and include appropriate mannerisms or speech patterns.`;

    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: `Generate dialogue for the following NPC in this situation:\n\nNPC INFO: ${npcInfo}\n\nSITUATION: ${situation}`,
      },
    ];

    const response = await sendMessage(messages, systemPrompt);
    
    res.json({ dialogue: response.message.content });
  } catch (error) {
    console.error('Error generating NPC dialogue:', error);
    res.status(500).json({ error: 'Failed to generate NPC dialogue' });
  }
});

app.post('/api/llm/combat', async (req, res) => {
  try {
    const { combatState } = req.body;
    
    if (!combatState) {
      return res.status(400).json({ error: 'Combat state is required' });
    }
    
    const systemPrompt = `You are an expert Dungeon Master narrating D&D combat.
    Create exciting, dynamic descriptions of combat actions and their results.
    Focus on making combat feel cinematic and consequential while clearly communicating what happens.`;

    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: `Please narrate the following combat situation in an engaging way:\n\n${combatState}`,
      },
    ];

    const response = await sendMessage(messages, systemPrompt);
    
    res.json({ narration: response.message.content });
  } catch (error) {
    console.error('Error generating combat narration:', error);
    res.status(500).json({ error: 'Failed to generate combat narration' });
  }
});

// All other GET requests not handled before will return the React app
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(rootDir, 'dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
