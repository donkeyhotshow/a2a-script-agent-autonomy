/**
 * Algorithm Registry - Service for managing Black Room algorithms
 *
 * Black Room mode - supports structured algorithm definitions for deterministic execution
 */

import * as path from 'path';
import {access} from 'node:fs/promises';
import {BLACK_ROOM_DEFAULT_LLM_MODEL} from './black-room-defaults.js';
import {AlgorithmDefinition} from './types.js';
import {logger} from '../../utils/logger.js';

export type AlgorithmRegistryBootstrapPolicy = 'fail-fast' | 'lenient';

function getBootstrapPolicy(): AlgorithmRegistryBootstrapPolicy {
    const mode = process.env.A2A_ALGORITHM_REGISTRY_BOOTSTRAP_MODE?.toLowerCase();
    return mode === 'fail-fast' ? 'fail-fast' : 'lenient';
}

/**
 * Algorithm Registry - manages loading and searching algorithms
 */
export class AlgorithmRegistry {
    private algorithms: Map<string, AlgorithmDefinition> = new Map();
    private defaultDirectory: string;

    /**
     * Create a new AlgorithmRegistry
     */
    constructor(directoryPath?: string) {
        this.defaultDirectory = directoryPath || path.resolve(process.cwd(), 'prompts/algorithms');
        logger.info(`[AlgorithmRegistry] Initialized with directory: ${this.defaultDirectory}`);
    }

    async loadFromDirectory(dirPath?: string): Promise<void> {
        const directoryPath = dirPath || this.defaultDirectory;
        const policy = getBootstrapPolicy();
        logger.info(`[AlgorithmRegistry] Loading algorithms from: ${directoryPath}`);
        try {
            this.algorithms.clear();
            if (policy === 'fail-fast') {
                await access(directoryPath);
            }

            await this.loadAlgorithmsFromDirectory(directoryPath);

            // Fallback to hardcoded algorithms if none loaded
            if (this.algorithms.size === 0) {
                logger.info(`[AlgorithmRegistry] No algorithms found in directory, loading defaults`);
                this.loadDefaultAlgorithms();
            }

            logger.info(`[AlgorithmRegistry] Loaded ${this.algorithms.size} algorithms`);
        } catch (error) {
            logger.error(`[AlgorithmRegistry] Error loading algorithms:`, error);
            if (policy === 'fail-fast') {
                throw error;
            } else {
                // Lenient mode: keep registry empty and allow server to continue working
                logger.warn(
                    `[AlgorithmRegistry] Bootstrap in lenient mode - continuing with 0 algorithms (A2A_ALGORITHM_REGISTRY_BOOTSTRAP_MODE!=fail-fast)`
                );
            }
        }
    }

    private async loadAlgorithmsFromDirectory(directoryPath: string): Promise<void> {
        const { readdir, readFile } = await import('node:fs/promises');
        const { join } = await import('path');

        try {
            const entries = await readdir(directoryPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const algorithmPath = join(directoryPath, entry.name);
                    const algorithmJsonPath = join(algorithmPath, 'algorithm.json');

                    try {
                        const content = await readFile(algorithmJsonPath, 'utf-8');
                        const algorithm: AlgorithmDefinition = JSON.parse(content);
                        this.algorithms.set(algorithm.id, algorithm);
                        logger.debug(`[AlgorithmRegistry] Loaded algorithm: ${algorithm.id}`);
                    } catch (err) {
                        logger.warn(`[AlgorithmRegistry] Failed to load algorithm from ${algorithmPath}:`, err);
                    }
                }
            }
        } catch (err) {
            // Directory doesn't exist or can't be read - this is OK
            logger.debug(`[AlgorithmRegistry] Could not read algorithms directory: ${err}`);
        }
    }

    private loadDefaultAlgorithms(): void {
        // ctx-gather-* algorithms
        this.algorithms.set('ctx-gather-v2', {
            id: 'ctx-gather-v2',
            version: '2.0',
            model: BLACK_ROOM_DEFAULT_LLM_MODEL,
            promptTemplate: 'ctx-gather-template',
            outputSchema: {
                type: 'object',
                properties: {
                    files: { type: 'array', items: { type: 'string' } },
                    imports: { type: 'array', items: { type: 'object' } },
                    patterns: { type: 'array', items: { type: 'string' } }
                },
                required: ['files']
            },
            contextRequirements: ['targetFiles'],
            maxTokens: 2000,
            temperature: 0.0
        });

        // edit-apply-* algorithms
        this.algorithms.set('edit-apply-ts-imports', {
            id: 'edit-apply-ts-imports',
            version: '1.0',
            model: BLACK_ROOM_DEFAULT_LLM_MODEL,
            promptTemplate: 'edit-apply-imports-template',
            outputSchema: {
                type: 'object',
                properties: {
                    edits: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                filePath: { type: 'string' },
                                operations: { type: 'array', items: { type: 'object' } }
                            }
                        }
                    }
                },
                required: ['edits']
            },
            contextRequirements: ['files', 'importMappings'],
            maxTokens: 3000,
            temperature: 0.0
        });

        // pattern-match-* algorithms
        this.algorithms.set('pattern-match-dead-code', {
            id: 'pattern-match-dead-code',
            version: '1.0',
            model: BLACK_ROOM_DEFAULT_LLM_MODEL,
            promptTemplate: 'pattern-match-template',
            outputSchema: {
                type: 'object',
                properties: {
                    deadExports: { type: 'array', items: { type: 'string' } },
                    unusedImports: { type: 'array', items: { type: 'string' } }
                },
                required: ['deadExports', 'unusedImports']
            },
            contextRequirements: ['sourceFiles'],
            maxTokens: 1500,
            temperature: 0.0
        });

        logger.info(`[AlgorithmRegistry] Loaded default algorithms: ${Array.from(this.algorithms.keys()).join(', ')}`);
    }

    /**
     * Get an algorithm by ID
     */
    getAlgorithm(id: string): AlgorithmDefinition | undefined {
        return this.algorithms.get(id);
    }

    /**
     * Check if an algorithm exists
     */
    hasAlgorithm(id: string): boolean {
        return this.algorithms.has(id);
    }

    /**
     * Get all algorithm IDs
     */
    getAlgorithmIds(): string[] {
        return Array.from(this.algorithms.keys());
    }

    /**
     * Get the count of loaded algorithms
     */
    count(): number {
        return this.algorithms.size;
    }

    /**
     * Reload algorithms from directory
     */
    async reload(): Promise<void> {
        logger.info(`[AlgorithmRegistry] Reloading`);
        await this.loadFromDirectory();
    }
}

let algorithmRegistryInstance: AlgorithmRegistry | null = null;

/**
 * Get the singleton AlgorithmRegistry instance
 */
export function getAlgorithmRegistry(directoryPath?: string): AlgorithmRegistry {
    if (!algorithmRegistryInstance) {
        algorithmRegistryInstance = new AlgorithmRegistry(directoryPath);
    }
    return algorithmRegistryInstance;
}

/**
 * Global algorithm registry instance
 */
export const algorithmRegistry = getAlgorithmRegistry();