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
import { toRagSearchResult } from '../protocol-rag-search.js';
import type { RAGIndexData, IndexFileInfo } from '../indexer.js';
import type { Chunk } from '../chunk-manager.js';
import type { SuggestionItem } from '../suggestions.js';
import type {
    RAGSearcherConfig,
    SearchOptions,
    HybridSearchOptions,
    SearchResult,
    TFIDFResult,
    ExtractedKeywords
} from './types.js';

// Import new classes
import { IndexManager } from './index-manager.js';
import { SearchOrchestrator } from './search-orchestrator.js';
import { FileService } from './file-service.js';
import { FeedbackHandler } from './feedback-handler.js';

// Import pipeline modules for deprecated methods
import { extractKeywords } from './query-planner.js';
import { findHighlights, matchPattern, scoreChunk, matchesFilters, getFileExtension } from './chunk-pipeline.js';
import { shapeOutput } from './output-shaping.js';

export { RAGSearcherConfig, SearchOptions, HybridSearchOptions, SearchResult, TFIDFResult };
export { INTENT_TYPES };

export class RAGSearcher {
    projectPath: string;
    private indexManager: IndexManager;
    private searchOrchestrator: SearchOrchestrator;
    private fileService: FileService;
    private feedbackHandler: FeedbackHandler;
    // Cached components for backward compatibility
    queryUnderstanding: QueryUnderstandingEngine;
    tfidf: TFIDFService | null;
    bm25: BM25Scorer | null;
    codeSimilarity: CodeSimilarityEngine;
    suggestions: SearchSuggestionsEngine;
    queryExpander: QueryExpander;
    private queryCache: Map<string, { data: SearchResult[]; timestamp: number; ttl: number }>;
    private defaultCacheTTL: number;

    constructor(config: RAGSearcherConfig = {}) {
        this.projectPath = config.projectPath ?? process.cwd();
        // Initialize engines
        this.tfidf = config.useTFIDF !== false ? new TFIDFService() : null;
        this.queryUnderstanding = new QueryUnderstandingEngine();
        this.codeSimilarity = new CodeSimilarityEngine();
        this.bm25 = new BM25Scorer();
        this.suggestions = new SearchSuggestionsEngine({ maxSuggestions: 10 });
        this.queryExpander = new QueryExpander();

        // Initialize new classes
        this.indexManager = new IndexManager(config, this.tfidf, this.bm25, this.codeSimilarity, this.suggestions);
        this.searchOrchestrator = new SearchOrchestrator(
            this.indexManager,
            this.queryUnderstanding,
            this.codeSimilarity,
            this.bm25,
            this.suggestions
        );
        this.fileService = new FileService(this.projectPath);
        this.feedbackHandler = new FeedbackHandler(
            this.suggestions,
            this.queryExpander,
            config.relevanceFeedback !== false
        );

        this.queryCache = new Map();
        this.defaultCacheTTL = config.queryCacheTTL ?? 5 * 60 * 1000; // 5 minutes default
    }

    /**
     * Save search indexes to cache for fast loading
     */
    async saveIndexCache(): Promise<void> {
        return this.indexManager.saveIndexCache();
    }

    /**
     * Load search indexes from cache
     */
    async loadIndexCache(): Promise<boolean> {
        return this.indexManager.loadIndexCache();
    }

    /**
     * Check if cache exists and is valid
     */
    async hasValidCache(): Promise<boolean> {
        return this.indexManager.hasValidCache();
    }

    /**
     * Pre-build all indexes for faster future searches
     * Call this after indexing or at startup
     */
    async prebuildIndexes(): Promise<void> {
        return this.indexManager.prebuildIndexes();
    }

    async loadIndex(): Promise<RAGIndexData> {
        return this.indexManager.loadIndex();
    }

    indexDocument(id: string, content: string): void {
        this.indexManager.indexDocument(id, content);
    }

    indexDocuments(documents: Array<{ id: string; content: string }>): void {
        this.indexManager.indexDocuments(documents);
    }

    async buildTFIDFIndex(): Promise<void> {
        return this.indexManager.buildTFIDFIndex();
    }

    async searchTFIDF(query: string, topK = 10): Promise<Array<TFIDFResult>> {
        return this.indexManager.searchTFIDF(query, topK);
    }

    async searchHybrid(query: string, options: HybridSearchOptions = {}): Promise<Array<SearchResult & {
        details: Record<string, number | null>
    }>> {
        return this.searchOrchestrator.searchHybrid(query, options);
    }

    getTFIDFStats() {
        return this.indexManager.getTFIDFStats();
    }

    /**
     * Analyze query intent using QueryUnderstandingEngine
     */
    analyzeQuery(query: string) {
        return this.searchOrchestrator.analyzeQuery(query);
    }

    /**
     * Get query understanding results
     */
    getQueryIntent(query: string) {
        return this.searchOrchestrator.getQueryIntent(query);
    }

    clearTFIDFIndex(): void {
        this.indexManager.clearTFIDFIndex();
    }

    async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        return this.searchOrchestrator.search(query, options);
    }

    /**
     * Search with result caching (TTL in milliseconds)
     * Cache key includes query and options to ensure cache validity
     */
    async searchWithCache(
        query: string,
        options: SearchOptions = {},
        ttl?: number
    ): Promise<SearchResult[]> {
        const cacheTTL = ttl ?? this.defaultCacheTTL;
        const cacheKey = this.createCacheKey(query, options);

        // Check cache
        const cached = this.queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            console.log('[RAG] Cache hit for query:', query.substring(0, 50));
            return cached.data;
        }

        // Perform search
        const results = await this.search(query, options);

        // Cache results
        this.queryCache.set(cacheKey, {
            data: results,
            timestamp: Date.now(),
            ttl: cacheTTL,
        });

        return results;
    }

    /**
     * Clear query cache
     */
    clearQueryCache(): void {
        this.queryCache.clear();
    }

    /**
     * Get query cache statistics
     */
    getQueryCacheStats(): { size: number; maxTTL: number } {
        return {
            size: this.queryCache.size,
            maxTTL: this.defaultCacheTTL,
        };
    }

    private createCacheKey(query: string, options: SearchOptions): string {
        const keyData = { query, options };
        return JSON.stringify(keyData);
    }





    async searchFiles(pattern: string): Promise<IndexFileInfo[]> {
        const index = await this.loadIndex();
        return this.fileService.searchFiles(pattern, index);
    }

    async getFileContent(relativePath: string): Promise<string> {
        return this.fileService.getFileContent(relativePath);
    }

    async getFileChunks(relativePath: string): Promise<Chunk[]> {
        const index = await this.loadIndex();
        return this.fileService.getFileChunks(relativePath, index);
    }

    /**
     * @deprecated Use extractKeywords from query-planner module instead
     */
    extractKeywords(query: string): ExtractedKeywords {
        return extractKeywords(query);
    }

    /**
     * @deprecated Use scoreChunk from chunk-pipeline module instead
     */
    scoreChunk(chunk: Chunk, keywords: ExtractedKeywords, originalQuery: string): number {
        return scoreChunk(chunk, keywords, originalQuery);
    }

    /**
     * @deprecated Use findHighlights from chunk-pipeline module instead
     */
    findHighlights(content: string, keywords: ExtractedKeywords): string[] {
        return findHighlights(content, keywords);
    }

    /**
     * @deprecated Use matchesFilters from chunk-pipeline module instead
     */
    private matchesFilters(
        chunk: Chunk,
        index: RAGIndexData,
        filters: import('./types.js').SearchFilters
    ): boolean {
        return matchesFilters(chunk, index, filters);
    }

    /**
     * @deprecated Use matchPattern from chunk-pipeline module instead
     */
    matchPattern(filePath: string, pattern: string): boolean {
        return matchPattern(filePath, pattern);
    }

    /**
     * @deprecated Use getFileExtension from chunk-pipeline module instead
     */
    private getFileExtension(filePath: string): string | null {
        return getFileExtension(filePath);
    }

    /**
     * Get search suggestions for autocomplete
     */
    getSuggestions(query: string, options: { limit?: number } = {}): SuggestionItem[] {
        return this.feedbackHandler.getSuggestions(query, options);
    }

    /**
     * Report click feedback to improve future ranking
     * Call this when user clicks/selects a search result
     * @param query The original search query
     * @param resultId The ID of the clicked result (file path or chunk ID)
     */
    reportClick(query: string, resultId: string): void {
        this.feedbackHandler.reportClick(query, resultId);
    }

    /**
     * Get expanded query terms based on learned relevance
     */
    expandQuery(query: string): string[] {
        return this.feedbackHandler.expandQuery(query);
    }

    /**
     * Enable/disable relevance feedback learning
     */
    setRelevanceFeedback(enabled: boolean): void {
        this.feedbackHandler.setRelevanceFeedback(enabled);
    }

    /**
     * Get suggestions by type (function, class, method, etc.)
     */
    getSuggestionsByType(type: string, limit = 10): SuggestionItem[] {
        return this.feedbackHandler.getSuggestionsByType(type, limit);
    }

    dispose(): void {
        this.indexManager.dispose();
        this.clearQueryCache();
    }

    /**
     * Search with protocol result transformation
     * Uses output-shaping module for format transformation
     */
    async searchWithProtocol(
        query: string,
        options: SearchOptions & {
            maxFiles?: number;
            allowedDirs?: string[];
            allowedExtensions?: string[];
            maxResults?: number;
            snippetConfig?: import('../searcher/snippet-generator.js').SnippetConfig;
            page?: number;
            pageSize?: number;
        } = {}
    ): Promise<import('../protocol-rag-search.js').RagSearchProtocolResult> {
        const searchResults = await this.search(query, options);

        // Transform raw search results to protocol format using output-shaping
        return shapeOutput(searchResults, {
            query,
            maxFiles: options.maxFiles,
            allowedDirs: options.allowedDirs,
            allowedExtensions: options.allowedExtensions,
            maxResults: options.maxResults,
            page: options.page,
            pageSize: options.pageSize
        });
    }
}