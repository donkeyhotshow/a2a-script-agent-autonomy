/**
 * Storage Interface
 * 
 * This module defines the interface for storage backends.
 */

import type { SessionData } from './types.js';

/**
 * Storage Backend Interface
 * Defines the contract for different storage implementations
 */
export interface StorageBackend {
  /**
   * Initialize the storage
   */
  initialize(): Promise<void>;
  
  /**
   * Load session data by ID
   */
  load(sessionId: string): Promise<SessionData | null>;
  
  /**
   * Save session data
   */
  save(sessionId: string, data: SessionData): Promise<void>;
  
  /**
   * Delete session by ID
   */
  delete(sessionId: string): Promise<boolean>;
  
  /**
   * List all session IDs
   */
  list(): Promise<string[]>;
  
  /**
   * Check if session exists
   */
  exists(sessionId: string): Promise<boolean>;
}
