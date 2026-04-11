/**
 * Action Registry - Service for loading actions from MD files
 *
 * Simulation mode - supports only MD format
 */

import * as path from 'path';
import {access} from 'node:fs/promises';
import {ActionDefinition, ActionMatch} from './types.ts';
import {parseAllActionsFromDirectory} from './action-parser.ts';
import {logger} from '../../lib/logger.ts';
import {BaseRegistry} from './base/base-registry.ts';
import {handleError} from './utils/error-handler.ts';
import {createSingleton} from './utils/singleton.ts';
import {normalizeForMatching} from './utils/string-utils.ts';

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
export class ActionRegistry extends BaseRegistry<string, ActionDefinition> {
    private defaultDirectory: string;
    private readonly allowedRoot: string;

    /**
     * Create a new ActionRegistry
     */
    constructor(directoryPath?: string) {
        super('ActionRegistry');
        // CWE-22/23: lock allowed root to cwd at construction time
        this.allowedRoot = path.resolve(process.cwd());
        const resolved = path.resolve(directoryPath ?? path.join(process.cwd(), 'packages/actions/src/definitions'));
        this.assertContained(resolved);
        this.defaultDirectory = resolved;
        logger.info('[ActionRegistry] Initialized with directory', {directory: this.defaultDirectory});
    }

    private assertContained(dirPath: string): void {
        const resolved = path.resolve(dirPath);
        if (!resolved.startsWith(this.allowedRoot + path.sep) && resolved !== this.allowedRoot) {
            throw new Error(`Path traversal detected: ${dirPath}`);
        }
    }

    async loadFromDirectory(dirPath?: string): Promise<void> {
        const directoryPath = dirPath ? path.resolve(dirPath) : this.defaultDirectory;
        // CWE-22/23: validate any caller-supplied dirPath
        this.assertContained(directoryPath);
        const policy = getBootstrapPolicy();
        logger.info('[ActionRegistry] Loading actions from', {directory: directoryPath});
        try {
            this.storage.clear();
            if (policy === 'fail-fast') {
                await access(directoryPath);
            }
            const mdActions = await parseAllActionsFromDirectory(directoryPath);
            for (const action of mdActions) this.storage.set(action.id, action);
            logger.info('[ActionRegistry] Loaded actions', {count: this.storage.size});
        } catch (error) {
            handleError({
                logger,
                component: 'ActionRegistry',
                message: 'Error loading actions',
                error,
                policy,
                onLenient: () => {
                    // Lenient mode: keep registry empty and allow server to continue working
                    this.storage.clear();
                    logger.warn(
                        '[ActionRegistry] Bootstrap in lenient mode - continuing with 0 actions (A2A_ACTION_REGISTRY_BOOTSTRAP_MODE!=fail-fast)'
                    );
                }
            });
        }
    }

    /**
     * Get an action by its ID
     */
    getAction(id: string): ActionDefinition | null {
        return this.getOrNull(id);
    }

    /**
     * Get all loaded actions
     */
    getAllActions(): ActionDefinition[] {
        return this.getAll();
    }

    /**
     * Find actions matching a task description
     */
    findAction(taskDescription: string): ActionMatch[] {
        const matches: ActionMatch[] = [];
        const taskWords = normalizeForMatching(taskDescription);

        for (const action of this.getAll()) {
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
        logger.info('[ActionRegistry] Reloading');
        await this.loadFromDirectory();
    }
}

/**
 * Get the singleton ActionRegistry instance
 */
export const getActionRegistry = createSingleton(ActionRegistry);

// Export singleton directly
export const actionRegistry = getActionRegistry();
