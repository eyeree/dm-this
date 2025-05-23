/**
 * Types for the agent system
 */

import { Character } from "../state/character";

/**
 * Agent types
 */
export enum AgentType {
  MASTER = 'master',
  RULE = 'rule',
  CHARACTER = 'character'
}

/**
 * Message visibility options
 */
export interface MessageVisibility {
  master: boolean;
  rule: boolean;
  characters: string[]; // Character names that can see the message
  players: string[]; // Player names that can see the message
}

/**
 * Chat message with visibility controls
 */
export interface ChatMessage {
  id: string;
  sender: {
    type: 'player' | 'agent';
    name: string;
  };
  content: string;
  timestamp: Date;
  visibility: MessageVisibility;
}

/**
 * Image display options
 */
export enum ImageDisplayTarget {
  CHAT = 'chat',
  MAP = 'map'
}

/**
 * Image message
 */
export interface ImageMessage {
  id: string;
  sender: {
    type: 'player' | 'agent';
    name: string;
  };
  imageUrl: string;
  caption?: string;
  displayTarget: ImageDisplayTarget;
  timestamp: Date;
  visibility: MessageVisibility;
}

/**
 * Token for map display
 */
export interface MapToken {
  id: string;
  name: string;
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  controlledBy?: string; // Player name if controlled by a player
}

/**
 * Map state
 */
export interface MapState {
  backgroundUrl: string;
  tokens: MapToken[];
}

/**
 * Agent interface
 */
export interface Agent {
  /**
   * Get the agent type
   */
  getType(): AgentType;
  
  /**
   * Get the agent name
   */
  getName(): string;
  
  /**
   * Process a message and generate a response
   * @param message The message to process
   * @param context Additional context for the agent
   */
  processMessage(message: ChatMessage, context?: any): Promise<ChatMessage>;
}

/**
 * Master agent interface
 */
export interface MasterAgent extends Agent {
  /**
   * Update the campaign journal
   * @param entry The entry to add to the journal
   */
  updateJournal(entry: string): Promise<void>;
  
}

/**
 * Rule agent interface
 */
export interface RulesAgent extends Agent {

  
}

/**
 * Character agent interface
 */
export interface CharacterAgent extends Agent {

  readonly character:Character

}
