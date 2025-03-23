import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { 
  sendMessageToClaude, 
  generateSceneDescription, 
  generateNPCDialogue, 
  generateCombatNarration
} from '../services/claude';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Verify environment variables are loaded
console.log('Environment variables loaded:');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'API key is set' : 'API key is not set');

// Use process.cwd() instead of __dirname
const rootDir = process.cwd();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(express.static(path.resolve(rootDir, 'dist')));

// API routes
app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'DM-This API is running',
    version: '0.1.0',
    features: ['claude']
  });
});

// Claude API endpoints
app.post('/api/claude/message', async (req, res) => {
  try {
    console.log('Received request to /api/claude/message:', req.body);
    const { messages, systemPrompt, model } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      console.log('Invalid request: messages array is required');
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    console.log('Sending request to Claude API...');
    const response = await sendMessageToClaude(messages, systemPrompt, model);
    console.log('Received response from Claude API:', response);
    res.json(response);
  } catch (error) {
    console.error('Error in Claude message endpoint:', error);
    res.status(500).json({ error: 'Failed to get response from Claude' });
  }
});

app.post('/api/claude/scene', async (req, res) => {
  try {
    const { context } = req.body;
    
    if (!context) {
      return res.status(400).json({ error: 'Context is required' });
    }
    
    const description = await generateSceneDescription(context);
    res.json({ description });
  } catch (error) {
    console.error('Error generating scene description:', error);
    res.status(500).json({ error: 'Failed to generate scene description' });
  }
});

app.post('/api/claude/npc-dialogue', async (req, res) => {
  try {
    const { npcInfo, situation } = req.body;
    
    if (!npcInfo || !situation) {
      return res.status(400).json({ error: 'NPC info and situation are required' });
    }
    
    const dialogue = await generateNPCDialogue(npcInfo, situation);
    res.json({ dialogue });
  } catch (error) {
    console.error('Error generating NPC dialogue:', error);
    res.status(500).json({ error: 'Failed to generate NPC dialogue' });
  }
});

app.post('/api/claude/combat', async (req, res) => {
  try {
    const { combatState } = req.body;
    
    if (!combatState) {
      return res.status(400).json({ error: 'Combat state is required' });
    }
    
    const narration = await generateCombatNarration(combatState);
    res.json({ narration });
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
  console.log(`Claude API integration is ${process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled'}`);
});
