/**
 * Action Registry - Service for loading actions from MD files
 *
 * Simulation mode - supports only MD format
 */

import * as path from 'path';
import {ActionDefinition, ActionMatch} from './types.js';
import {parseAllActionsFromDirectory} from './action-parser.js';

/**
 * Minimum match score threshold for action matching.
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
     */
    constructor(directoryPath?: string) {
        this.defaultDirectory = directoryPath || path.resolve(process.cwd(), 'src/actions/definitions');
        console.log(`[ActionRegistry] Initialized with directory: ${this.defaultDirectory}`);
    }

    /**
     * Load all actions from MD directory
     */
    async loadFromDirectory(dirPath?: string): Promise<void> {
        const directoryPath = dirPath || this.defaultDirectory;
        console.log(`[ActionRegistry] Loading actions from: ${directoryPath}`);

        try {
            this.actions.clear();
            const mdActions = await parseAllActionsFromDirectory(directoryPath);
            console.log(`[ActionRegistry] Loaded ${mdActions.length} actions from MD`);

            for (const action of mdActions) {
                this.actions.set(action.id, action);
            }

            console.log(`[ActionRegistry] Total loaded: ${this.actions.size} actions`);
        } catch (error) {
            console.error(`[ActionRegistry] Error loading actions:`, error);
            throw error;
        }
    }

    /**
     * Get an action by its ID
     */
    getAction(id: string): ActionDefinition | null {
        return this.actions.get(id) || null;
    }

    /**
     * Get all loaded actions
     */
    getAllActions(): ActionDefinition[] {
        return Array.from(this.actions.values());
    }

    /**
     * Find actions matching a task description
     */
    findAction(taskDescription: string): ActionMatch[] {
        const matches: ActionMatch[] = [];
        const taskLower = taskDescription.toLowerCase();
        const taskWords = taskLower.split(/\s+/).filter(w => w.length > 2);

        for (const action of Array.from(this.actions.values())) {
            let matchScore = 0;
            const descLower = action.description.toLowerCase();
            const titleLower = action.title.toLowerCase();
            const triggersLower = (action.triggers || []).map(t => t.toLowerCase());

            let keywordMatches = 0;

            for (const word of taskWords) {
                const triggerMatch = triggersLower.some(t => t.includes(word) || word.includes(t));
                if (triggerMatch) {
                    matchScore += 0.7;
                    keywordMatches++;
                } else if (descLower.includes(word) || titleLower.includes(word)) {
                    matchScore += 0.5;
                    keywordMatches++;
                } else if (word.length > 3) {
                    const actionWords = [...descLower.split(/\s+/), ...titleLower.split(/\s+/)];
                    const partialMatch = actionWords.some(w => w.length > 3 && w.includes(word));
                    if (partialMatch) {
                        matchScore += 0.3;
                        keywordMatches++;
                    }
                }
            }

            if (keywordMatches > 0 && action.priority > 0) {
                matchScore += 0.1 * (action.priority / 10);
            }

            if (matchScore >= MIN_MATCH_SCORE) {
                matches.push({action, matchScore});
            }
        }

        matches.sort((a, b) => b.matchScore - a.matchScore);
        console.log(`[ActionRegistry] Found ${matches.length} matching actions for: "${taskDescription.substring(0, 50)}..."`);
        return matches;
    }

    /**
     * Reload all actions
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
 */
export function getActionRegistry(directoryPath?: string): ActionRegistry {
    if (!actionRegistryInstance) {
        actionRegistryInstance = new ActionRegistry(directoryPath);
    }
    return actionRegistryInstance;
}

// Export singleton directly
export const actionRegistry = getActionRegistry();
