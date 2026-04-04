/**
 * RAG Searcher - Core Implementation
 * Integrates: TFIDF, QueryUnderstanding, CodeSimilarity, BM25
 *
 * Decomposed into:
 * - query-planner.ts - query planning and analysis
 * - chunk-pipeline.ts - chunk processing and scoring
 * - ranking-pipeline.ts - result ranking and fusion
 * - output-shaping.ts - output formatting
 */
import { TFIDFService } from '../tfidf.js';
import { QueryUnderstandingEngine, INTENT_TYPES } from '../query-understanding.js';
import { CodeSimilarityEngine } from '../code-similarity.js';
import { SearchSuggestionsEngine, QueryExpander } from '../suggestions.js';
import { BM25Scorer } from '../bm25.js';
import type { RAGIndexData, IndexFileInfo } from '../indexer.js';
import type { Chunk } from '../chunk-manager.js';
import type { SuggestionItem } from '../suggestions.js';
import type { RAGSearcherConfig, SearchOptions, HybridSearchOptions, SearchResult, TFIDFResult, ExtractedKeywords } from './types.js';
export { RAGSearcherConfig, SearchOptions, HybridSearchOptions, SearchResult, TFIDFResult };
export { INTENT_TYPES };
export declare class RAGSearcher {
    projectPath: string;
    private indexManager;
    private searchOrchestrator;
    private fileService;
    private feedbackHandler;
    queryUnderstanding: QueryUnderstandingEngine;
    tfidf: TFIDFService | null;
    bm25: BM25Scorer | null;
    codeSimilarity: CodeSimilarityEngine;
    suggestions: SearchSuggestionsEngine;
    queryExpander: QueryExpander;
    private queryCache;
    private defaultCacheTTL;
    constructor(config?: RAGSearcherConfig);
    /**
     * Save search indexes to cache for fast loading
     */
    saveIndexCache(): Promise<void>;
    /**
     * Load search indexes from cache
     */
    loadIndexCache(): Promise<boolean>;
    /**
     * Check if cache exists and is valid
     */
    hasValidCache(): Promise<boolean>;
    /**
     * Pre-build all indexes for faster future searches
     * Call this after indexing or at startup
     */
    prebuildIndexes(): Promise<void>;
    loadIndex(): Promise<RAGIndexData>;
    indexDocument(id: string, content: string): void;
    indexDocuments(documents: Array<{
        id: string;
        content: string;
    }>): void;
    buildTFIDFIndex(): Promise<void>;
    searchTFIDF(query: string, topK?: number): Promise<Array<TFIDFResult>>;
    searchHybrid(query: string, options?: HybridSearchOptions): Promise<Array<SearchResult & {
        details: Record<string, number | null>;
    }>>;
    getTFIDFStats(): {
        documentCount: number;
        vocabularySize: number;
        avgDocLength: number;
    } | null;
    /**
     * Analyze query intent using QueryUnderstandingEngine
     */
    analyzeQuery(query: string): import("../query-understanding.js").IntentResult;
    /**
     * Get query understanding results
     */
    getQueryIntent(query: string): import("../query-understanding.js").IntentResult;
    clearTFIDFIndex(): void;
    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Search with result caching (TTL in milliseconds)
     * Cache key includes query and options to ensure cache validity
     */
    searchWithCache(query: string, options?: SearchOptions, ttl?: number): Promise<SearchResult[]>;
    /**
     * Clear query cache
     */
    clearQueryCache(): void;
    /**
     * Get query cache statistics
     */
    getQueryCacheStats(): {
        size: number;
        maxTTL: number;
    };
    private createCacheKey;
    searchFiles(pattern: string): Promise<IndexFileInfo[]>;
    getFileContent(relativePath: string): Promise<string>;
    getFileChunks(relativePath: string): Promise<Chunk[]>;
    /**
     * @deprecated Use extractKeywords from query-planner module instead
     */
    extractKeywords(query: string): ExtractedKeywords;
    /**
     * @deprecated Use scoreChunk from chunk-pipeline module instead
     */
    scoreChunk(chunk: Chunk, keywords: ExtractedKeywords, originalQuery: string): number;
    /**
     * @deprecated Use findHighlights from chunk-pipeline module instead
     */
    findHighlights(content: string, keywords: ExtractedKeywords): string[];
    /**
     * @deprecated Use matchesFilters from chunk-pipeline module instead
     */
    private matchesFilters;
    /**
     * @deprecated Use matchPattern from chunk-pipeline module instead
     */
    matchPattern(filePath: string, pattern: string): boolean;
    /**
     * @deprecated Use getFileExtension from chunk-pipeline module instead
     */
    private getFileExtension;
    /**
     * Get search suggestions for autocomplete
     */
    getSuggestions(query: string, options?: {
        limit?: number;
    }): SuggestionItem[];
    /**
     * Report click feedback to improve future ranking
     * Call this when user clicks/selects a search result
     * @param query The original search query
     * @param resultId The ID of the clicked result (file path or chunk ID)
     */
    reportClick(query: string, resultId: string): void;
    /**
     * Get expanded query terms based on learned relevance
     */
    expandQuery(query: string): string[];
    /**
     * Enable/disable relevance feedback learning
     */
    setRelevanceFeedback(enabled: boolean): void;
    /**
     * Get suggestions by type (function, class, method, etc.)
     */
    getSuggestionsByType(type: string, limit?: number): SuggestionItem[];
    dispose(): void;
    /**
     * Search with protocol result transformation
     * Uses output-shaping module for format transformation
     */
    searchWithProtocol(query: string, options?: SearchOptions & {
        maxFiles?: number;
        allowedDirs?: string[];
        allowedExtensions?: string[];
        maxResults?: number;
        snippetConfig?: import('../searcher/snippet-generator.js').SnippetConfig;
        page?: number;
        pageSize?: number;
    }): Promise<import('../protocol-rag-search.js').RagSearchProtocolResult>;
}
