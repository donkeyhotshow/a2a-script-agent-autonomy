/**
 * Action Registry - Service for loading and searching actions from MD files
 */

import * as path from 'path';
import { ActionDefinition, ActionMatch } from './types.js';
import { parseAllActionsFromDirectory } from './action-parser.js';

/**
 * Minimum match score threshold for action matching.
 * Actions with matchScore below this threshold are considered weak matches and filtered out.
 * Value 0.5 corresponds to at least one exact keyword match.
 */
export const MIN_MATCH_SCORE = 0.5;

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

      let keywordMatches = 0;
      
      for (const word of taskWords) {
        // Exact keyword match in description or title
        if (descLower.includes(word) || titleLower.includes(word)) {
          matchScore += 0.5;
          keywordMatches++;
        } 
        // Partial match: action word contains the search term
        // Only match if action word is longer and contains the search term
        else if (word.length > 3) {
          const actionWords = [...descLower.split(/\s+/), ...titleLower.split(/\s+/)];
          const partialMatch = actionWords.some(w => w.length > 3 && w.includes(word));
          if (partialMatch) {
            matchScore += 0.3;
            keywordMatches++;
          }
        }
      }

      // Add priority score only if there are keyword matches
      // This prevents actions from matching based solely on priority
      // Priority is typically 1-100, lower = higher priority
      if (keywordMatches > 0 && action.priority > 0) {
        matchScore += 0.1 * (action.priority / 10);
      }

      // Only include matches above the minimum threshold
      if (matchScore >= MIN_MATCH_SCORE) {
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
