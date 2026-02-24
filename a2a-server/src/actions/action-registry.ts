/**
 * Action Registry - Service for loading and searching actions from MD files
 */

import * as path from 'path';
import { ActionDefinition, ActionMatch } from './types.js';
import { parseAllActionsFromDirectory } from './action-parser.js';

/**
 * Action Registry - manages loading and searching actions from MD files
 */
export class ActionRegistry {
  private actions: Map<string, ActionDefinition> = new Map();
  private defaultDirectory: string;

  /**
   * Create a new ActionRegistry
   * @param directoryPath - Optional path to directory with MD files. Defaults to src/actions/
   */
  constructor(directoryPath?: string) {
    // Default directory is src/actions/definitions relative to project root
    // Using process.cwd() ensures we get the correct path in both dev and production
    this.defaultDirectory = directoryPath || path.resolve(process.cwd(), 'src/actions/definitions');
    console.log(`[ActionRegistry] Initialized with directory: ${this.defaultDirectory}`);
  }

  /**
   * Load all actions from a directory
   * @param dirPath - Optional path to directory. Uses default if not provided
   */
  async loadFromDirectory(dirPath?: string): Promise<void> {
    const directoryPath = dirPath || this.defaultDirectory;
    console.log(`[ActionRegistry] Loading actions from: ${directoryPath}`);

    try {
      const actions = await parseAllActionsFromDirectory(directoryPath);
      
      // Clear existing actions and load new ones
      this.actions.clear();
      
      for (const action of actions) {
        this.actions.set(action.id, action);
      }

      console.log(`[ActionRegistry] Successfully loaded ${actions.length} actions from ${directoryPath}`);
    } catch (error) {
      console.error(`[ActionRegistry] Error loading actions from directory:`, error);
      throw error;
    }
  }

  /**
   * Get an action by its ID
   * @param id - Action identifier
   * @returns ActionDefinition or null if not found
   */
  getAction(id: string): ActionDefinition | null {
    const action = this.actions.get(id);
    return action || null;
  }

  /**
   * Get all loaded actions
   * @returns Array of all ActionDefinitions
   */
  getAllActions(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  /**
   * Find actions matching a task description using keyword search
   * @param taskDescription - Description to search for
   * @returns Array of ActionMatch sorted by matchScore (highest first)
   */
  findAction(taskDescription: string): ActionMatch[] {
    const matches: ActionMatch[] = [];
    const taskLower = taskDescription.toLowerCase();
    const taskWords = taskLower.split(/\s+/).filter(w => w.length > 2);

    for (const action of Array.from(this.actions.values())) {
      let matchScore = 0;
      const descLower = action.description.toLowerCase();
      const titleLower = action.title.toLowerCase();

      for (const word of taskWords) {
        // Exact keyword match in description or title
        if (descLower.includes(word) || titleLower.includes(word)) {
          matchScore += 0.5;
        } 
        // Partial match (word contains the search term or vice versa)
        else if (word.length > 3) {
          const partialMatch = [...descLower.split(/\s+/), ...titleLower.split(/\s+/)]
            .some(w => w.includes(word) || word.includes(w));
          if (partialMatch) {
            matchScore += 0.3;
          }
        }
      }

      // Add priority score (higher priority = lower number, so we invert)
      // Priority is typically 1-100, lower = higher priority
      if (action.priority > 0) {
        matchScore += 0.1 * (action.priority / 10);
      }

      if (matchScore > 0) {
        matches.push({
          action,
          matchScore
        });
      }
    }

    // Sort by matchScore descending
    matches.sort((a, b) => b.matchScore - a.matchScore);

    console.log(`[ActionRegistry] Found ${matches.length} matching actions for: "${taskDescription.substring(0, 50)}..."`);
    return matches;
  }

  /**
   * Reload all actions from the default directory
   */
  async reload(): Promise<void> {
    console.log(`[ActionRegistry] Reloading actions from: ${this.defaultDirectory}`);
    await this.loadFromDirectory();
  }

  /**
   * Get the count of loaded actions
   */
  get count(): number {
    return this.actions.size;
  }
}

// Singleton instance
let actionRegistryInstance: ActionRegistry | null = null;

/**
 * Get the singleton ActionRegistry instance
 * @param directoryPath - Optional directory path for first initialization
 * @returns ActionRegistry singleton
 */
export function getActionRegistry(directoryPath?: string): ActionRegistry {
  if (!actionRegistryInstance) {
    actionRegistryInstance = new ActionRegistry(directoryPath);
  }
  return actionRegistryInstance;
}

// Export singleton directly
export const actionRegistry = getActionRegistry();
