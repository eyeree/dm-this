import React, { useState, useRef, useEffect, DragEvent } from 'react';
import './styles/App.css';
import { AgentType, ChatMessage, CharacterStats, ImageDisplayTarget, MapToken } from './services/agents/types';

// Component interfaces
interface MessageProps {
  message: ChatMessage;
  currentCharacter: string | null;
}

interface MapProps {
  backgroundUrl: string;
  tokens: MapToken[];
  onTokenMove: (id: string, x: number, y: number) => void;
  onTokenSelect: (token: MapToken | null) => void;
}

interface TokenProps {
  token: MapToken;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (token: MapToken) => void;
  isSelected: boolean;
}

interface CharacterSelectorProps {
  characters: CharacterStats[];
  selectedCharacter: string | null;
  onSelectCharacter: (name: string | null) => void;
  onCreateCharacter: () => void;
}

interface VisibilityControlsProps {
  visibility: {
    master: boolean;
    rule: boolean;
    characters: string[];
    players: string[];
  };
  characters: CharacterStats[];
  onVisibilityChange: (visibility: any) => void;
}

// Token component for map display
const Token: React.FC<TokenProps> = ({ token, onMove, onSelect, isSelected }) => {
  const tokenRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: token.x, y: token.y });
  
  useEffect(() => {
    setPosition({ x: token.x, y: token.y });
  }, [token.x, token.y]);
  
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    setIsDragging(true);
    onSelect(token);
    
    // Set drag image
    if (e.dataTransfer && tokenRef.current) {
      e.dataTransfer.setDragImage(tokenRef.current, 0, 0);
    }
    
    // Set data
    e.dataTransfer.setData('token-id', token.id);
  };
  
  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    setIsDragging(false);
    
    // Get drop position
    const x = e.clientX;
    const y = e.clientY;
    
    // Update token position
    onMove(token.id, x, y);
  };
  
  return (
    <div
      ref={tokenRef}
      className={`map-token ${isSelected ? 'selected' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${50 * token.scale}px`,
        height: `${50 * token.scale}px`,
        backgroundImage: `url(${token.imageUrl})`,
        cursor: 'move'
      }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onSelect(token)}
    >
      <div className="token-name">{token.name}</div>
    </div>
  );
};

// Map component
const Map: React.FC<MapProps> = ({ backgroundUrl, tokens, onTokenMove, onTokenSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedToken, setSelectedToken] = useState<MapToken | null>(null);
  
  const handleTokenMove = (id: string, x: number, y: number) => {
    // Adjust position relative to map
    if (mapRef.current) {
      const mapRect = mapRef.current.getBoundingClientRect();
      const relativeX = x - mapRect.left;
      const relativeY = y - mapRect.top;
      
      // Ensure token stays within map bounds
      const boundedX = Math.max(0, Math.min(relativeX, mapRect.width));
      const boundedY = Math.max(0, Math.min(relativeY, mapRect.height));
      
      onTokenMove(id, boundedX, boundedY);
    }
  };
  
  const handleTokenSelect = (token: MapToken) => {
    setSelectedToken(token);
    onTokenSelect(token);
  };
  
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Deselect token if clicking on map background
    if (e.target === mapRef.current) {
      setSelectedToken(null);
      onTokenSelect(null);
    }
  };
  
  return (
    <div 
      ref={mapRef}
      className="map-container"
      style={{ backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none' }}
      onClick={handleMapClick}
    >
      {!backgroundUrl && (
        <div className="map-placeholder">
          <p>No map loaded. Upload a map image to display here.</p>
        </div>
      )}
      
      {tokens.map(token => (
        <Token
          key={token.id}
          token={token}
          onMove={handleTokenMove}
          onSelect={handleTokenSelect}
          isSelected={selectedToken?.id === token.id}
        />
      ))}
    </div>
  );
};

// Message component
const Message: React.FC<MessageProps> = ({ message, currentCharacter }) => {
  // Determine if this message should be visible to the current character
  const isVisible = 
    (message.visibility.master && currentCharacter === null) ||
    (message.visibility.rule && currentCharacter === 'Rule Lawyer') ||
    (currentCharacter && message.visibility.characters.includes(currentCharacter)) ||
    (message.sender.type === 'player' && message.sender.name === currentCharacter);
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div className={`message ${message.sender.type}`}>
      <div className="message-header">
        <span className="message-sender">{message.sender.name}</span>
        <span className="message-time">{new Date(message.timestamp).toLocaleTimeString()}</span>
      </div>
      <div className="message-content">{message.content}</div>
    </div>
  );
};

// Character selector component
const CharacterSelector: React.FC<CharacterSelectorProps> = ({ 
  characters, 
  selectedCharacter, 
  onSelectCharacter,
  onCreateCharacter
}) => {
  return (
    <div className="character-selector">
      <h3>Select Character</h3>
      <div className="character-list">
        <div 
          className={`character-item ${selectedCharacter === null ? 'selected' : ''}`}
          onClick={() => onSelectCharacter(null)}
        >
          Game Master
        </div>
        <div 
          className={`character-item ${selectedCharacter === 'Rule Lawyer' ? 'selected' : ''}`}
          onClick={() => onSelectCharacter('Rule Lawyer')}
        >
          Rule Lawyer
        </div>
        {characters.map(character => (
          <div 
            key={character.name}
            className={`character-item ${selectedCharacter === character.name ? 'selected' : ''}`}
            onClick={() => onSelectCharacter(character.name)}
          >
            {character.name}
          </div>
        ))}
      </div>
      <button className="create-character-button" onClick={onCreateCharacter}>
        Create New Character
      </button>
    </div>
  );
};

// Visibility controls component
const VisibilityControls: React.FC<VisibilityControlsProps> = ({ 
  visibility, 
  characters,
  onVisibilityChange 
}) => {
  const handleMasterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVisibilityChange({
      ...visibility,
      master: e.target.checked
    });
  };
  
  const handleRuleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVisibilityChange({
      ...visibility,
      rule: e.target.checked
    });
  };
  
  const handleCharacterChange = (name: string, checked: boolean) => {
    const updatedCharacters = checked
      ? [...visibility.characters, name]
      : visibility.characters.filter(char => char !== name);
    
    onVisibilityChange({
      ...visibility,
      characters: updatedCharacters
    });
  };
  
  return (
    <div className="visibility-controls">
      <h4>Message Visibility</h4>
      <div className="visibility-option">
        <input
          type="checkbox"
          id="master-visibility"
          checked={visibility.master}
          onChange={handleMasterChange}
        />
        <label htmlFor="master-visibility">Game Master</label>
      </div>
      <div className="visibility-option">
        <input
          type="checkbox"
          id="rule-visibility"
          checked={visibility.rule}
          onChange={handleRuleChange}
        />
        <label htmlFor="rule-visibility">Rule Lawyer</label>
      </div>
      <h5>Characters</h5>
      {characters.map(character => (
        <div key={character.name} className="visibility-option">
          <input
            type="checkbox"
            id={`character-${character.name}`}
            checked={visibility.characters.includes(character.name)}
            onChange={(e) => handleCharacterChange(character.name, e.target.checked)}
          />
          <label htmlFor={`character-${character.name}`}>{character.name}</label>
        </div>
      ))}
    </div>
  );
};

// Main App component
const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'main' | 'rules' | 'character'>('main');
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ruleMessages, setRuleMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterStats[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [characterDescription, setCharacterDescription] = useState('');
  const [mapState, setMapState] = useState<{
    backgroundUrl: string;
    tokens: MapToken[];
    selectedToken: MapToken | null;
  }>({
    backgroundUrl: '',
    tokens: [],
    selectedToken: null
  });
  const [messageVisibility, setMessageVisibility] = useState({
    master: true,
    rule: false,
    characters: [] as string[],
    players: [] as string[]
  });
  const [imageGallery, setImageGallery] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  
  // Refs
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch characters on mount
  useEffect(() => {
    fetchCharacters();
  }, []);
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ruleMessages]);
  
  // Focus input when tab changes
  useEffect(() => {
    if (activeTab === 'main' || activeTab === 'rules') {
      chatInputRef.current?.focus();
    }
  }, [activeTab]);
  
  // Fetch characters from API
  const fetchCharacters = async () => {
    try {
      const response = await fetch('/api/characters');
      if (!response.ok) {
        throw new Error('Failed to fetch characters');
      }
      
      const data = await response.json();
      setCharacters(data.characters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };
  
  // Send message to agent
  const sendMessage = async (content: string, agentType: AgentType, agentName?: string) => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          agentType,
          agentName,
          visibility: messageVisibility
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      // Add user message and response to appropriate message list
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: {
          type: 'player',
          name: selectedCharacter || 'Player'
        },
        content,
        timestamp: new Date(),
        visibility: messageVisibility
      };
      
      if (agentType === AgentType.RULE) {
        setRuleMessages([...ruleMessages, userMessage, data.message]);
      } else {
        setMessages([...messages, userMessage, data.message]);
      }
      
      setUserInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'rules') {
      await sendMessage(userInput, AgentType.RULE);
    } else {
      // Determine agent type and name based on selected character
      let agentType = AgentType.MASTER;
      let agentName: string | undefined;
      
      if (selectedCharacter === 'Rule Lawyer') {
        agentType = AgentType.RULE;
      } else if (selectedCharacter) {
        agentType = AgentType.CHARACTER;
        agentName = selectedCharacter;
      }
      
      await sendMessage(userInput, agentType, agentName);
    }
  };
  
  // Handle token movement
  const handleTokenMove = async (id: string, x: number, y: number) => {
    try {
      const response = await fetch(`/api/map/token/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update token position');
      }
      
      const data = await response.json();
      
      // Update local state
      setMapState(prev => ({
        ...prev,
        tokens: prev.tokens.map(token => 
          token.id === id ? { ...token, x, y } : token
        )
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };
  
  // Handle token selection
  const handleTokenSelect = (token: MapToken | null) => {
    setMapState(prev => ({
      ...prev,
      selectedToken: token
    }));
  };
  
  // Handle character creation
  const handleCreateCharacter = async () => {
    if (!characterDescription.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/character-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: characterDescription
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create character');
      }
      
      const data = await response.json();
      
      // Add new character to list
      setCharacters([...characters, data.character]);
      
      // Select the new character
      setSelectedCharacter(data.character.name);
      
      // Reset character creation form
      setCharacterDescription('');
      setShowCharacterCreation(false);
      
      // Fetch updated character list
      fetchCharacters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // In a real app, you would upload the file to a server
    // For this example, we'll create a local URL
    const imageUrl = URL.createObjectURL(file);
    
    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          displayTarget: ImageDisplayTarget.MAP,
          visibility: messageVisibility
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      // Update map state with new background
      setMapState(prev => ({
        ...prev,
        backgroundUrl: imageUrl
      }));
      
      // Add to image gallery
      setImageGallery([...imageGallery, imageUrl]);
      setSelectedImage(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };
  
  // Handle adding a token
  const handleAddToken = async () => {
    if (!selectedCharacter) return;
    
    try {
      const response = await fetch('/api/map/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selectedCharacter,
          imageUrl: '/placeholder-token.png', // In a real app, you would use a proper token image
          x: 100,
          y: 100,
          scale: 1,
          controlledBy: 'Player'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add token');
      }
      
      const data = await response.json();
      
      // Update local state
      setMapState(prev => ({
        ...prev,
        tokens: [...prev.tokens, data.token]
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };
  
  // Handle removing a token
  const handleRemoveToken = async () => {
    if (!mapState.selectedToken) return;
    
    try {
      const response = await fetch(`/api/map/token/${mapState.selectedToken.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove token');
      }
      
      // Update local state
      setMapState(prev => ({
        ...prev,
        tokens: prev.tokens.filter(token => token.id !== prev.selectedToken?.id),
        selectedToken: null
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };
  
  // Handle selecting an image from the gallery
  const handleSelectImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    
    // Update map state with selected image
    setMapState(prev => ({
      ...prev,
      backgroundUrl: imageUrl
    }));
  };
  
  // Render character creation form
  const renderCharacterCreation = () => (
    <div className="character-creation">
      <h2>Create New Character</h2>
      <form onSubmit={(e) => { e.preventDefault(); handleCreateCharacter(); }}>
        <div className="form-group">
          <label htmlFor="character-description">Character Description:</label>
          <textarea
            id="character-description"
            value={characterDescription}
            onChange={(e) => setCharacterDescription(e.target.value)}
            placeholder="Describe your character's race, class, background, personality, etc..."
            disabled={isLoading}
            rows={5}
          />
        </div>
        <div className="form-actions">
          <button type="button" onClick={() => setShowCharacterCreation(false)}>
            Cancel
          </button>
          <button type="submit" disabled={isLoading || !characterDescription.trim()}>
            Create Character
          </button>
        </div>
      </form>
    </div>
  );
  
  // Render main chat interface
  const renderChatInterface = () => (
    <div className="chat-interface">
      <div className="messages-container">
        {activeTab === 'main' ? (
          <div className="messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>Start a conversation with the Game Master or your character.</p>
              </div>
            ) : (
              messages.map(msg => (
                <Message 
                  key={msg.id} 
                  message={msg} 
                  currentCharacter={selectedCharacter} 
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="messages">
            {ruleMessages.length === 0 ? (
              <div className="empty-state">
                <p>Ask the Rule Lawyer about game rules and mechanics.</p>
              </div>
            ) : (
              ruleMessages.map(msg => (
                <Message 
                  key={msg.id} 
                  message={msg} 
                  currentCharacter={selectedCharacter} 
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <form onSubmit={handleSendMessage} className="input-form">
        <VisibilityControls 
          visibility={messageVisibility}
          characters={characters}
          onVisibilityChange={setMessageVisibility}
        />
        <div className="input-container">
          <textarea
            ref={chatInputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={`Type your message as ${selectedCharacter || 'Game Master'}...`}
            disabled={isLoading}
          />
          <div className="input-actions">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              title="Upload Image"
            >
              📷
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleImageUpload}
            />
            <button type="submit" disabled={isLoading || !userInput.trim()}>
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  );
  
  return (
    <div className="app">
      <header className="app-header">
        <h1>DM-This</h1>
        <p>AI-powered D&D adventure gaming experience</p>
        
        <div className="tabs">
          <button 
            className={activeTab === 'main' ? 'active' : ''} 
            onClick={() => setActiveTab('main')}
          >
            Main Chat
          </button>
          <button 
            className={activeTab === 'rules' ? 'active' : ''} 
            onClick={() => setActiveTab('rules')}
          >
            Rules Chat
          </button>
          <button 
            className={activeTab === 'character' ? 'active' : ''} 
            onClick={() => setActiveTab('character')}
          >
            Character
          </button>
        </div>
      </header>
      
      <main className="app-main">
        {error && <div className="error-message">{error}</div>}
        
        <div className="app-layout">
          <aside className="app-sidebar">
            <CharacterSelector 
              characters={characters}
              selectedCharacter={selectedCharacter}
              onSelectCharacter={setSelectedCharacter}
              onCreateCharacter={() => setShowCharacterCreation(true)}
            />
            
            <div className="map-controls">
              <h3>Map Controls</h3>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedCharacter}
              >
                Upload Map
              </button>
              <button 
                onClick={handleAddToken}
                disabled={!selectedCharacter || !mapState.backgroundUrl}
              >
                Add Token
              </button>
              <button 
                onClick={handleRemoveToken}
                disabled={!mapState.selectedToken}
              >
                Remove Token
              </button>
            </div>
            
            {imageGallery.length > 0 && (
              <div className="image-gallery">
                <h3>Image Gallery</h3>
                <div className="gallery-thumbnails">
                  {imageGallery.map((imageUrl, index) => (
                    <div 
                      key={index}
                      className={`gallery-thumbnail ${selectedImage === imageUrl ? 'selected' : ''}`}
                      style={{ backgroundImage: `url(${imageUrl})` }}
                      onClick={() => handleSelectImage(imageUrl)}
                    />
                  ))}
                </div>
              </div>
            )}
          </aside>
          
          <div className="app-content">
            {activeTab === 'character' ? (
              showCharacterCreation ? (
                renderCharacterCreation()
              ) : (
                <div className="character-view">
                  <h2>Character Management</h2>
                  <p>Select a character from the sidebar or create a new one.</p>
                  <button onClick={() => setShowCharacterCreation(true)}>
                    Create New Character
                  </button>
                </div>
              )
            ) : (
              renderChatInterface()
            )}
          </div>
          
          <aside className="app-map">
            <Map 
              backgroundUrl={mapState.backgroundUrl}
              tokens={mapState.tokens}
              onTokenMove={handleTokenMove}
              onTokenSelect={handleTokenSelect}
            />
          </aside>
        </div>
      </main>
    </div>
  );
};

export default App;
