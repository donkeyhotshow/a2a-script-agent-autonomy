/**
 * Protocol Integration for @a2a/rag
 * 
 * Integrates RAG package features with A2A protocol format
 */

import {createRAG, RAGWatchManager, createWatchManager, type SearchFilters} from './index.js';
import type {RAGInstance} from './index.js';
import type {RagSearchProtocolResult} from './protocol-rag-search.js';

export interface ProtocolRAGConfig {
    projectPath: string;
    includePatterns?: string[];
    excludePatterns?: string[];
    enableWatch?: boolean;
    queryCacheTTL?: number;
    useAST?: boolean;
    useBM25?: boolean;
}

export interface ProtocolSearchInput {
    query: string;
    projectId?: string;
    limit?: number;
    fileTypes?: string[];
    folders?: string[];
    modifiedAfter?: string;
    useSemantic?: boolean;
    semanticWeight?: number;
    useCache?: boolean;
    cacheTTL?: number;
}

export interface ProtocolSearchOutput {
    success: boolean;
    results: RagSearchProtocolResult;
    suggestions?: Array<{
        text: string;
        type: string;
        filePath: string;
    }>;
    expandedQuery?: string[];
    error?: string;
}

export interface ProtocolIndexOutput {
    success: boolean;
    fileCount?: number;
    chunkCount?: number;
    indexed?: boolean;
    error?: string;
}

export interface ProtocolHealthOutput {
    success: boolean;
    coverage?: number;
    staleFiles?: string[];
    orphanedChunks?: number;
    totalFiles?: number;
    totalChunks?: number;
    error?: string;
}

/**
 * RAG Client Service - Protocol Integration Layer
 * 
 * Wraps @a2a/rag package for use with A2A protocol
 */
export class RAGClientService {
    private rag: RAGInstance;
    private watcher: RAGWatchManager | null = null;
    private projectPath: string;
    private config: ProtocolRAGConfig;

    constructor(config: ProtocolRAGConfig) {
        this.config = config;
        this.projectPath = config.projectPath;
        this.rag = createRAG({
            projectPath: config.projectPath,
            includePatterns: config.includePatterns,
            excludePatterns: config.excludePatterns,
            useBM25: config.useBM25 ?? true,
            useAST: config.useAST ?? true,
            queryCacheTTL: config.queryCacheTTL,
        });
    }

    /**
     * Initialize indexing (parallel by default for speed)
     */
    async initialize(batchSize = 10): Promise<ProtocolIndexOutput> {
        try {
            const index = await this.rag.indexer.indexProjectParallel(batchSize);
            
            // Start file watching if enabled
            if (this.config.enableWatch) {
                this.startWatching();
            }

            return {
                success: true,
                fileCount: index.files.length,
                chunkCount: index.chunks.length,
                indexed: true,
            };
        } catch (error) {
            return {
                success: false,
                error: String(error),
            };
        }
    }

    /**
     * Search with full protocol support
     */
    async search(input: ProtocolSearchInput): Promise<ProtocolSearchOutput> {
        try {
            // Convert fileTypes to extensions filter
            const filters: SearchFilters = {};
            if (input.fileTypes) {
                filters.extensions = input.fileTypes.map(t => t.startsWith('.') ? t : `.${t}`);
            }
            if (input.folders) {
                filters.folders = input.folders;
            }
            if (input.modifiedAfter) {
                filters.modifiedAfter = input.modifiedAfter;
            }

            // Get suggestions
            const suggestions = this.rag.searcher.getSuggestions(input.query, { limit: 5 });

            // Get expanded query
            const expandedQuery = this.rag.searcher.expandQuery(input.query);

            // Perform search (with cache if requested)
            let results;
            if (input.useCache) {
                results = await this.rag.searcher.searchWithProtocol(
                    input.query,
                    {
                        limit: input.limit ?? 10,
                        useSemantic: input.useSemantic,
                        semanticWeight: input.semanticWeight ?? 0.4,
                        filters: Object.keys(filters).length > 0 ? filters : undefined,
                    }
                );
            } else {
                results = await this.rag.searcher.searchWithProtocol(
                    input.query,
                    {
                        limit: input.limit ?? 10,
                        useSemantic: input.useSemantic,
                        semanticWeight: input.semanticWeight ?? 0.4,
                        filters: Object.keys(filters).length > 0 ? filters : undefined,
                    }
                );
            }

            return {
                success: true,
                results,
                suggestions: suggestions.map(s => ({
                    text: s.text,
                    type: s.type,
                    filePath: s.filePath,
                })),
                expandedQuery,
            };
        } catch (error) {
            return {
                success: false,
                results: {
                    results: [],
                    files: [],
                    query: input.query,
                },
                error: String(error),
            };
        }
    }

    /**
     * Report relevance feedback
     */
    reportRelevance(query: string, clickedResult: string): void {
        this.rag.searcher.reportClick(query, clickedResult);
    }

    /**
     * Get index health
     */
    async getHealth(): Promise<ProtocolHealthOutput> {
        try {
            const health = await this.rag.indexer.health();
            return {
                success: true,
                coverage: health.coverage,
                staleFiles: health.staleFiles,
                orphanedChunks: health.orphanedChunks,
                totalFiles: health.totalFiles,
                totalChunks: health.totalChunks,
            };
        } catch (error) {
            return {
                success: false,
                error: String(error),
            };
        }
    }

    /**
     * Start watching for file changes
     */
    startWatching(): void {
        if (this.watcher) return;

        this.watcher = createWatchManager(this.rag.indexer, {
            debounceMs: 1000,
            onChange: (file) => console.log(`[RAG Watch] Changed: ${file}`),
            onIndexed: (file) => console.log(`[RAG Watch] Reindexed: ${file}`),
        });

        this.watcher.watch(this.projectPath);
    }

    /**
     * Stop watching
     */
    stopWatching(): void {
        if (this.watcher) {
            this.watcher.stop();
            this.watcher = null;
        }
    }

    /**
     * Clear all caches
     */
    clearCaches(): void {
        this.rag.searcher.clearQueryCache();
        this.rag.searcher.clearTFIDFIndex();
    }

    /**
     * Dispose all resources
     */
    dispose(): void {
        this.stopWatching();
        this.rag.searcher.dispose();
        this.rag.indexer.dispose();
    }
}

/**
 * Create RAG client service instance
 */
export function createRAGClientService(config: ProtocolRAGConfig): RAGClientService {
    return new RAGClientService(config);
}
