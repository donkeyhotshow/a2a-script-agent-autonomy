/**
 * Action Registry - Service for loading actions from MD files
 *
 * Simulation mode - supports only MD format
 */

import * as path from 'path';
import {access} from 'node:fs/promises';
import {ActionDefinition, ActionMatch} from './types.js';
import {parseAllActionsFromDirectory} from './action-parser.js';
import {logger} from '../utils/logger.js';

export type ActionRegistryBootstrapPolicy = 'fail-fast' | 'lenient';

function getBootstrapPolicy(): ActionRegistryBootstrapPolicy {
    const mode = process.env.A2A_ACTION_REGISTRY_BOOTSTRAP_MODE?.toLowerCase();
    return mode === 'fail-fast' ? 'fail-fast' : 'lenient';
}

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
        logger.info(`[ActionRegistry] Initialized with directory: ${this.defaultDirectory}`);
    }

    async loadFromDirectory(dirPath?: string): Promise<void> {
        const directoryPath = dirPath || this.defaultDirectory;
        const policy = getBootstrapPolicy();
        logger.info(`[ActionRegistry] Loading actions from: ${directoryPath}`);
        try {
            this.actions.clear();
            if (policy === 'fail-fast') {
                await access(directoryPath);
            }
            const mdActions = await parseAllActionsFromDirectory(directoryPath);
            for (const action of mdActions) this.actions.set(action.id, action);
            logger.info(`[ActionRegistry] Loaded ${this.actions.size} actions`);
        } catch (error) {
            logger.error(`[ActionRegistry] Error loading actions:`, error);

            if (policy === 'fail-fast') {
                throw error;
            }

            // Lenient mode: keep registry empty and allow server to continue working
            this.actions.clear();
            logger.warn(
                `[ActionRegistry] Bootstrap in lenient mode - continuing with 0 actions (A2A_ACTION_REGISTRY_BOOTSTRAP_MODE!=fail-fast)`
            );
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
        return matches;
    }

    async reload(): Promise<void> {
        logger.info(`[ActionRegistry] Reloading`);
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
