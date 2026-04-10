/**
 * RAG Watch Manager - Auto-reindexing on file changes
 */

import type {RAGIndexer} from './indexer.js';
import type {FSWatcher} from 'chokidar';

export interface WatchConfig {
    /** Debounce time in milliseconds */
    debounceMs?: number;
    /** Callback when a file changes */
    onChange?: (filePath: string) => void;
    /** Callback when indexing completes */
    onIndexed?: (filePath: string) => void;
    /** Custom ignore patterns */
    ignored?: string[];
}

/**
 * Watch manager for auto-reindexing
 * Integrates with chokidar for file watching
 */
export class RAGWatchManager {
    private indexer: RAGIndexer;
    private watcher: FSWatcher | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private pendingChanges: Set<string> = new Set();
    private config: Required<WatchConfig>;
    private isIndexing = false;

    constructor(indexer: RAGIndexer, config: WatchConfig = {}) {
        this.indexer = indexer;
        this.config = {
            debounceMs: config.debounceMs ?? 1000,
            onChange: config.onChange ?? (() => {}),
            onIndexed: config.onIndexed ?? (() => {}),
            ignored: config.ignored ?? ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
        };
    }

    /**
     * Start watching a project directory
     */
    async watch(projectPath: string): Promise<void> {
        // Stop any existing watcher
        this.stop();

        // Dynamically import chokidar to avoid loading when not needed
        const {watch} = await import('chokidar');

        this.watcher = watch(projectPath, {
            ignored: this.config.ignored,
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 300,
                pollInterval: 100,
            },
        });

        this.watcher.on('add', (filePath) => this.handleChange(filePath, 'add'));
        this.watcher.on('change', (filePath) => this.handleChange(filePath, 'change'));
        this.watcher.on('unlink', (filePath) => this.handleChange(filePath, 'unlink'));

        console.log('[RAG Watch] Started watching:', projectPath);
    }

    /**
     * Stop watching
     */
    stop(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        this.pendingChanges.clear();
    }

    /**
     * Get current watch status
     */
    getStatus(): {
        isWatching: boolean;
        pendingChanges: number;
        isIndexing: boolean;
    } {
        return {
            isWatching: this.watcher !== null,
            pendingChanges: this.pendingChanges.size,
            isIndexing: this.isIndexing,
        };
    }

    private handleChange(filePath: string, type: 'add' | 'change' | 'unlink'): void {
        this.pendingChanges.add(filePath);
        this.config.onChange(filePath);

        // Debounce reindexing
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            void this.processPendingChanges();
        }, this.config.debounceMs);
    }

    private async processPendingChanges(): Promise<void> {
        if (this.isIndexing || this.pendingChanges.size === 0) return;

        this.isIndexing = true;
        const changes = Array.from(this.pendingChanges);
        this.pendingChanges.clear();

        try {
            for (const filePath of changes) {
                try {
                    await this.indexer.indexFile(filePath);
                    this.config.onIndexed(filePath);
                    console.log('[RAG Watch] Reindexed:', filePath);
                } catch {
                    // Remove from index if file was deleted
                    await this.indexer.removeFile(filePath);
                    console.log('[RAG Watch] Removed from index:', filePath);
                }
            }
        } finally {
            this.isIndexing = false;
        }
    }
}

/**
 * Create a watch manager instance
 */
export function createWatchManager(indexer: RAGIndexer, config?: WatchConfig): RAGWatchManager {
    return new RAGWatchManager(indexer, config);
}
