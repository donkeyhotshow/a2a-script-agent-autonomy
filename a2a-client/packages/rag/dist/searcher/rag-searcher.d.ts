/**
 * RAG Searcher - Core Implementation
 * Integrates: TFIDF, QueryUnderstanding, CodeSimilarity, BM25
 */
import { TFIDFService } from '../tfidf.js';
import { QueryUnderstandingEngine } from '../query-understanding.js';
import { CodeSimilarityEngine } from '../code-similarity.js';
import { SearchSuggestionsEngine, SuggestionItem, QueryExpander } from '../suggestions.js';
import { BM25Scorer } from '../bm25.js';
import type { Chunk } from '../chunk-manager.js';
import type { RAGIndexData, IndexFileInfo } from '../indexer.js';
import type { RAGSearcherConfig, SearchOptions, HybridSearchOptions, SearchResult, TFIDFResult, ExtractedKeywords } from './types.js';
export { RAGSearcherConfig, SearchOptions, HybridSearchOptions, SearchResult, TFIDFResult };
export declare class RAGSearcher {
    projectPath: string;
    private indexPath;
    private cachePath;
    index: RAGIndexData | null;
    useTFIDF: boolean;
    tfidf: TFIDFService | null;
    private tfidfIndexed;
    queryUnderstanding: QueryUnderstandingEngine;
    codeSimilarity: CodeSimilarityEngine;
    bm25: BM25Scorer | null;
    private bm25Indexed;
    private similarityIndexed;
    suggestions: SearchSuggestionsEngine;
    private suggestionsIndexed;
    queryExpander: QueryExpander;
    private relevanceFeedbackEnabled;
    private fileRelevanceModel?;
    private fileRelevanceCache;
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
    getTFIDFStats(): ReturnType<TFIDFService['getStats']> | null;
    /**
     * Analyze query intent using QueryUnderstandingEngine
     */
    analyzeQuery(query: string): ReturnType<QueryUnderstandingEngine['analyze']>;
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
    /**
     * Build all search indexes once, using cache if available
     */
    private ensureIndexesBuilt;
    /**
     * Comprehensive scoring using all integrated engines with file type filtering
     * OPTIMIZED: uses pre-computed bm25Results Map instead of re-running search
     */
    private scoreChunkWithEngines;
    /**
     * Extract file extension from path
     */
    private getFileExtension;
    searchFiles(pattern: string): Promise<IndexFileInfo[]>;
    getFileContent(relativePath: string): Promise<string>;
    getFileChunks(relativePath: string): Promise<Chunk[]>;
    extractKeywords(query: string): ExtractedKeywords;
    scoreChunk(chunk: Chunk, keywords: ExtractedKeywords, _originalQuery: string): number;
    findHighlights(content: string, keywords: ExtractedKeywords): string[];
    /**
     * Check if a chunk matches the faceted search filters
     */
    private matchesFilters;
    matchPattern(filePath: string, pattern: string): boolean;
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
     * Integrates policy limits and transforms results to protocol format
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
