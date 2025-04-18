import express from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AgentType, ChatMessage, ImageDisplayTarget, ImageMessage, MapState, MapToken } from './agents';
import { Campaign } from './state/campaign';
import dotenv from 'dotenv';

const env_path = path.resolve(process.cwd(), '.env');
console.log(`loading config from: ${env_path}`)
dotenv.config({ path: env_path });

// Use process.cwd() instead of __dirname
const rootDir = process.cwd();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(express.static(path.resolve(rootDir, 'dist/ui')));

// Get campaign ID from environment variable
const campaignId = process.env.DM_THIS_CAMPAIGN || '';
if (!campaignId) {
  throw new Error('DM_THIS_CAMPAIGN environment variable is not defined');
}

// Initialize campaign
let campaign: Campaign;

// In-memory state
let currentMapState: MapState = {
  backgroundUrl: '',
  tokens: []
};

let recentRuleInterpretations: string[] = [];

// Initialize the server
async function initializeServer() {
  try {
    console.log('Initializing campaign...');
    campaign = await Campaign.loadById(campaignId);
    console.log('Campaign initialized successfully');
  } catch (error) {
    console.error('Error initializing campaign:', error);
    throw error;
  }
}

// API routes
app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'DM-This API is running',
    version: '0.2.0',
    features: ['master-agent', 'rule-agent', 'character-agents', 'map-display']
  });
});

// Get available characters
app.get('/api/characters', async (_req, res) => {
  try {
    const characterAgents = campaign.getAllCharacterAgents();
    const characters = characterAgents.map((agent) => agent.character.name);    
    res.json({ characters });
  } catch (error) {
    console.error('Error getting characters:', error);
    res.status(500).json({ error: 'Failed to get characters' });
  }
});

// Send a message to an agent
app.post('/api/message', async (req, res) => {
  try {
    const { content, agentType, agentName, visibility } = req.body;
    
    if (!content || !agentType) {
      return res.status(400).json({ error: 'Message content and agent type are required' });
    }
    
    // Create chat message
    const chatMessage: ChatMessage = {
      id: uuidv4(),
      sender: {
        type: 'player',
        name: 'Player'
      },
      content,
      timestamp: new Date(),
      visibility: visibility || {
        master: true,
        rule: agentType === AgentType.RULE,
        characters: [],
        players: []
      }
    };
    
    // Get the appropriate agent
    const agent = campaign.getAgent(agentType as AgentType, agentName);
    
    // Process the message
    const additionalContext: any = {};
    
    // Add map state to context for master agent
    if (agentType === AgentType.MASTER) {
      additionalContext.mapState = currentMapState;
      additionalContext.recentRuleInterpretations = recentRuleInterpretations.join('\n\n');
    }
    
    const response = await agent.processMessage(chatMessage, additionalContext);
    
    // If this is a rule agent response, add it to recent interpretations
    if (agentType === AgentType.RULE) {
      recentRuleInterpretations.push(response.content);
      if (recentRuleInterpretations.length > 5) {
        recentRuleInterpretations.shift();
      }
    }
    
    res.json({ message: response });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Update map state
app.post('/api/map', async (req, res) => {
  try {
    const { backgroundUrl, tokens } = req.body;
    
    if (backgroundUrl) {
      currentMapState.backgroundUrl = backgroundUrl;
    }
    
    if (tokens) {
      currentMapState.tokens = tokens;
    }
    
    res.json({ mapState: currentMapState });
  } catch (error) {
    console.error('Error updating map state:', error);
    res.status(500).json({ error: 'Failed to update map state' });
  }
});

// Add a token to the map
app.post('/api/map/token', async (req, res) => {
  try {
    const { name, imageUrl, x, y, scale, controlledBy } = req.body;
    
    if (!name || !imageUrl || x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Token name, image URL, x, and y are required' });
    }
    
    const token: MapToken = {
      id: uuidv4(),
      name,
      imageUrl,
      x,
      y,
      scale: scale || 1,
      controlledBy
    };
    
    currentMapState.tokens.push(token);
    
    res.json({ token });
  } catch (error) {
    console.error('Error adding token:', error);
    res.status(500).json({ error: 'Failed to add token' });
  }
});

// Update a token on the map
app.put('/api/map/token/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y, scale } = req.body;
    
    const tokenIndex = currentMapState.tokens.findIndex(token => token.id === id);
    
    if (tokenIndex === -1) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    if (x !== undefined) {
      currentMapState.tokens[tokenIndex].x = x;
    }
    
    if (y !== undefined) {
      currentMapState.tokens[tokenIndex].y = y;
    }
    
    if (scale !== undefined) {
      currentMapState.tokens[tokenIndex].scale = scale;
    }
    
    res.json({ token: currentMapState.tokens[tokenIndex] });
  } catch (error) {
    console.error('Error updating token:', error);
    res.status(500).json({ error: 'Failed to update token' });
  }
});

// Remove a token from the map
app.delete('/api/map/token/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tokenIndex = currentMapState.tokens.findIndex(token => token.id === id);
    
    if (tokenIndex === -1) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    const removedToken = currentMapState.tokens.splice(tokenIndex, 1)[0];
    
    res.json({ token: removedToken });
  } catch (error) {
    console.error('Error removing token:', error);
    res.status(500).json({ error: 'Failed to remove token' });
  }
});

// Upload an image
app.post('/api/image', async (req, res) => {
  try {
    const { imageUrl, caption, displayTarget, visibility } = req.body;
    
    if (!imageUrl || !displayTarget) {
      return res.status(400).json({ error: 'Image URL and display target are required' });
    }
    
    const imageMessage: ImageMessage = {
      id: uuidv4(),
      sender: {
        type: 'player',
        name: 'Player'
      },
      imageUrl,
      caption,
      displayTarget: displayTarget as ImageDisplayTarget,
      timestamp: new Date(),
      visibility: visibility || {
        master: true,
        rule: false,
        characters: [],
        players: []
      }
    };
    
    // If this is a map image, update the map state
    if (displayTarget === ImageDisplayTarget.MAP) {
      currentMapState.backgroundUrl = imageUrl;
    }
    
    res.json({ image: imageMessage });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// All other GET requests not handled before will return the React app
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(rootDir, 'dist/ui/index.html'));
});

// Initialize the server and start listening
initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
