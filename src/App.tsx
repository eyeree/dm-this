import React, { useState, useRef, useEffect } from 'react';
import './styles/App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const App: React.FC = () => {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'scene' | 'npc' | 'combat'>('chat');
  
  // Create refs for the input fields in each tab
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const sceneInputRef = useRef<HTMLTextAreaElement>(null);
  const npcInfoInputRef = useRef<HTMLTextAreaElement>(null);
  const combatInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Focus the appropriate input field when the tab changes or component mounts
  useEffect(() => {
    if (activeTab === 'chat' && chatInputRef.current) {
      chatInputRef.current.focus();
    } else if (activeTab === 'scene' && sceneInputRef.current) {
      sceneInputRef.current.focus();
    } else if (activeTab === 'npc' && npcInfoInputRef.current) {
      npcInfoInputRef.current.focus();
    } else if (activeTab === 'combat' && combatInputRef.current) {
      combatInputRef.current.focus();
    }
  }, [activeTab]);
  
  // For scene generation
  const [sceneContext, setSceneContext] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  
  // For NPC dialogue
  const [npcInfo, setNpcInfo] = useState('');
  const [situation, setSituation] = useState('');
  const [npcDialogue, setNpcDialogue] = useState('');
  
  // For combat narration
  const [combatState, setCombatState] = useState('');
  const [combatNarration, setCombatNarration] = useState('');

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    const newMessage: Message = { role: 'user', content: userInput };
    setMessages([...messages, newMessage]);
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/claude/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, newMessage],
          systemPrompt: 'You are a helpful D&D Dungeon Master assistant.',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from Claude');
      }
      
      const data = await response.json();
      setMessages([...messages, newMessage, data.message]);
      setUserInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sceneContext.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/claude/scene', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: sceneContext,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate scene description');
      }
      
      const data = await response.json();
      setSceneDescription(data.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNPCDialogue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!npcInfo.trim() || !situation.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/claude/npc-dialogue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          npcInfo,
          situation,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate NPC dialogue');
      }
      
      const data = await response.json();
      setNpcDialogue(data.dialogue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCombatNarration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!combatState.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/claude/combat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          combatState,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate combat narration');
      }
      
      const data = await response.json();
      setCombatNarration(data.narration);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>DM-This</h1>
        <p>AI-powered D&D adventure gaming experience</p>
      </header>
      
      <div className="tabs">
        <button 
          className={activeTab === 'chat' ? 'active' : ''} 
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button 
          className={activeTab === 'scene' ? 'active' : ''} 
          onClick={() => setActiveTab('scene')}
        >
          Scene Generation
        </button>
        <button 
          className={activeTab === 'npc' ? 'active' : ''} 
          onClick={() => setActiveTab('npc')}
        >
          NPC Dialogue
        </button>
        <button 
          className={activeTab === 'combat' ? 'active' : ''} 
          onClick={() => setActiveTab('combat')}
        >
          Combat Narration
        </button>
      </div>
      
      <main className="app-main">
        {error && <div className="error-message">{error}</div>}
        
        {activeTab === 'chat' && (
          <div className="chat-container">
            <div className="messages">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <p>Start a conversation with Claude to test the API integration.</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.role}`}>
                    <div className="message-role">{msg.role === 'user' ? 'You' : 'Claude'}</div>
                    <div className="message-content">{msg.content}</div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="message assistant loading">
                  <div className="message-role">Claude</div>
                  <div className="message-content">Thinking...</div>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSendMessage} className="input-form">
              <textarea
                ref={chatInputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your message here..."
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !userInput.trim()}>
                Send
              </button>
            </form>
          </div>
        )}
        
        {activeTab === 'scene' && (
          <div className="feature-container">
            <h2>Scene Description Generator</h2>
            <form onSubmit={handleGenerateScene}>
              <div className="form-group">
                <label htmlFor="scene-context">Scene Context:</label>
                <textarea
                  id="scene-context"
                  ref={sceneInputRef}
                  value={sceneContext}
                  onChange={(e) => setSceneContext(e.target.value)}
                  placeholder="Describe the campaign context, location, and situation..."
                  disabled={isLoading}
                  rows={5}
                />
              </div>
              <button type="submit" disabled={isLoading || !sceneContext.trim()}>
                Generate Scene Description
              </button>
            </form>
            
            {sceneDescription && (
              <div className="result-container">
                <h3>Generated Scene Description:</h3>
                <div className="result-content">{sceneDescription}</div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'npc' && (
          <div className="feature-container">
            <h2>NPC Dialogue Generator</h2>
            <form onSubmit={handleGenerateNPCDialogue}>
              <div className="form-group">
                <label htmlFor="npc-info">NPC Information:</label>
                <textarea
                  id="npc-info"
                  ref={npcInfoInputRef}
                  value={npcInfo}
                  onChange={(e) => setNpcInfo(e.target.value)}
                  placeholder="Describe the NPC's personality, background, goals, etc..."
                  disabled={isLoading}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="situation">Current Situation:</label>
                <textarea
                  id="situation"
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="Describe the current situation and context for the dialogue..."
                  disabled={isLoading}
                  rows={3}
                />
              </div>
              <button type="submit" disabled={isLoading || !npcInfo.trim() || !situation.trim()}>
                Generate NPC Dialogue
              </button>
            </form>
            
            {npcDialogue && (
              <div className="result-container">
                <h3>Generated NPC Dialogue:</h3>
                <div className="result-content">{npcDialogue}</div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'combat' && (
          <div className="feature-container">
            <h2>Combat Narration Generator</h2>
            <form onSubmit={handleGenerateCombatNarration}>
              <div className="form-group">
                <label htmlFor="combat-state">Combat State:</label>
                <textarea
                  id="combat-state"
                  ref={combatInputRef}
                  value={combatState}
                  onChange={(e) => setCombatState(e.target.value)}
                  placeholder="Describe the current combat situation, actions taken, and results..."
                  disabled={isLoading}
                  rows={5}
                />
              </div>
              <button type="submit" disabled={isLoading || !combatState.trim()}>
                Generate Combat Narration
              </button>
            </form>
            
            {combatNarration && (
              <div className="result-container">
                <h3>Generated Combat Narration:</h3>
                <div className="result-content">{combatNarration}</div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
