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

import fs from 'fs/promises';
import path from 'path';
import {TFIDFService} from '../tfidf.js';
import {QueryUnderstandingEngine, INTENT_TYPES} from '../query-understanding.js';
import {CodeSimilarityEngine} from '../code-similarity.js';
import {SearchSuggestionsEngine, SuggestionItem, QueryExpander} from '../suggestions.js';
import {BM25Scorer} from '../bm25.js';
import {scoreFileRelevance} from '../file-relevance.js';
import {toRagSearchResult} from '../protocol-rag-search.js';
import type {Chunk} from '../chunk-manager.js';
import type {RAGIndexData, IndexFileInfo} from '../indexer.js';
import type {FileRelevanceModel} from '../file-relevance.js';
import type { 
    RAGSearcherConfig, 
    SearchOptions, 
    HybridSearchOptions, 
    SearchResult, 
    TFIDFResult,
    RRFEntry,
    ExtractedKeywords 
} from './types.js';

// Import pipeline modules
import { 
    extractKeywords,
    analyzeQueryIntent,
    planSearchStrategy,
    calculateFileTypeBoost
} from './query-planner.js';

import {
    matchesFilters,
    scoreChunk as scoreChunkBase,
    getChunkId,
    createCandidateSet,
    findHighlights,
    getFileExtension,
    matchPattern,
    isCandidateChunk
} from './chunk-pipeline.js';

import {
    calculateRRFScore,
    fuseResultsWithRRF,
    groupByFile,
    sortAndLimitResults,
    calculateTotalScore
} from './ranking-pipeline.js';

import { shapeOutput } from './output-shaping.js';

export { RAGSearcherConfig, SearchOptions, HybridSearchOptions, SearchResult, TFIDFResult };
export { INTENT_TYPES };

export class RAGSearcher {
    projectPath: string;
    private indexPath: string;
    private cachePath: string;
    index: RAGIndexData | null = null;
    useTFIDF: boolean;
    tfidf: TFIDFService | null;
    private tfidfIndexed = false;
    // Integrated engines
    queryUnderstanding: QueryUnderstandingEngine;
    codeSimilarity: CodeSimilarityEngine;
    bm25: BM25Scorer | null;
    private bm25Indexed = false;
    private similarityIndexed = false;
    suggestions: SearchSuggestionsEngine;
    private suggestionsIndexed = false;
    queryExpander: QueryExpander;
    private relevanceFeedbackEnabled: boolean;
    private fileRelevanceModel?: FileRelevanceModel;
    private fileRelevanceCache: Map<string, number>;
    private queryCache: Map<string, { data: SearchResult[]; timestamp: number; ttl: number }>;
    private defaultCacheTTL: number;

    constructor(config: RAGSearcherConfig = {}) {
        this.projectPath = config.projectPath ?? process.cwd();
        this.indexPath = path.join(this.projectPath, '.a2a', 'index');
        this.cachePath = path.join(this.projectPath, '.a2a', 'cache');
        this.useTFIDF = config.useTFIDF !== false;
        this.tfidf = this.useTFIDF ? new TFIDFService() : null;
        // Initialize integrated engines
        this.queryUnderstanding = new QueryUnderstandingEngine();
        this.codeSimilarity = new CodeSimilarityEngine();
        this.bm25 = new BM25Scorer();
        this.fileRelevanceModel = config.fileRelevanceModel;
        this.fileRelevanceCache = new Map();
        this.queryCache = new Map();
        this.defaultCacheTTL = config.queryCacheTTL ?? 5 * 60 * 1000; // 5 minutes default
        this.suggestions = new SearchSuggestionsEngine({ maxSuggestions: 10 });
        this.queryExpander = new QueryExpander();
        this.relevanceFeedbackEnabled = config.relevanceFeedback !== false;
    }

    /**
     * Save search indexes to cache for fast loading
     */
    async saveIndexCache(): Promise<void> {
        await fs.mkdir(this.cachePath, { recursive: true });
        
        // Save BM25 index
        if (this.bm25 && this.bm25Indexed) {
            const bm25Data = this.bm25.serialize();
            await fs.writeFile(
                path.join(this.cachePath, 'bm25-cache.json'),
                JSON.stringify(bm25Data)
            );
            console.log('[RAG] BM25 cache saved');
        }
        
        console.log('[RAG] Index cache saved');
    }

    /**
     * Load search indexes from cache
     */
    async loadIndexCache(): Promise<boolean> {
        try {
            const cacheFile = path.join(this.cachePath, 'bm25-cache.json');
            const content = await fs.readFile(cacheFile, 'utf-8');
            const data = JSON.parse(content);
            
            if (this.bm25) {
                this.bm25.deserialize(data);
                this.bm25Indexed = true;
                console.log('[RAG] BM25 cache loaded');
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if cache exists and is valid
     */
    async hasValidCache(): Promise<boolean> {
        try {
            const stats = await fs.stat(path.join(this.cachePath, 'bm25-cache.json'));
            const indexStats = await fs.stat(path.join(this.indexPath, 'rag-files.json'));
            // Cache is valid if it's newer than index
            return stats.mtime >= indexStats.mtime;
        } catch {
            return false;
        }
    }

    /**
     * Pre-build all indexes for faster future searches
     * Call this after indexing or at startup
     */
    async prebuildIndexes(): Promise<void> {
        const index = await this.loadIndex();
        
        console.log('[RAG] Pre-building BM25 index...');
        if (this.bm25) {
            this.bm25.clear();
            for (const chunk of index.chunks) {
                const chunkId = getChunkId(chunk);
                this.bm25.addDocument(chunkId, chunk.content);
            }
            this.bm25Indexed = true;
        }
        
        console.log('[RAG] Pre-building similarity index...');
        this.codeSimilarity.index(index.chunks);
        this.similarityIndexed = true;
        
        // Save to cache
        await this.saveIndexCache();
        console.log('[RAG] All indexes pre-built and cached');
    }

    async loadIndex(): Promise<RAGIndexData> {
        if (this.index) return this.index;
        try {
            const indexPath = path.join(this.indexPath, 'rag-files.json');
            const content = await fs.readFile(indexPath, 'utf-8');
            this.index = JSON.parse(content) as RAGIndexData;

            // Build per-file relevance cache (blend stored value with current model/heuristics)
            this.fileRelevanceCache.clear();
            for (const file of this.index.files) {
                const relevance = scoreFileRelevance(
                    {
                        relativePath: file.path,
                        ext: file.ext,
                        size: file.size,
                    },
                    this.fileRelevanceModel
                );
                file.relevanceScore = relevance.relevance;
                file.relevanceLabel = relevance.label;
                file.relevanceReasons = relevance.reasons;
                this.fileRelevanceCache.set(file.path, relevance.relevance);
            }
            return this.index;
        } catch {
            this.index = {version: '1.0', timestamp: '', projectPath: this.projectPath, files: [], chunks: []};
            return this.index;
        }
    }

    indexDocument(id: string, content: string): void {
        this.tfidf?.addDocument(id, content);
    }

    indexDocuments(documents: Array<{ id: string; content: string }>): void {
        if (this.tfidf) {
            this.tfidf.addDocuments(documents.map((doc) => ({id: doc.id, text: doc.content})));
        }
    }

    async buildTFIDFIndex(): Promise<void> {
        if (!this.tfidf) throw new Error('TF-IDF not enabled');
        const index = await this.loadIndex();
        this.tfidf.clear();
        for (const chunk of index.chunks) {
            this.tfidf.addDocument(getChunkId(chunk), chunk.content);
        }
        this.tfidfIndexed = true;
    }

    async searchTFIDF(query: string, topK = 10): Promise<Array<TFIDFResult>> {
        if (!this.tfidf) throw new Error('TF-IDF not enabled');
        if (!this.tfidfIndexed) await this.buildTFIDFIndex();
        const results = this.tfidf.search(query, topK);
        const index = await this.loadIndex();
        const chunkMap = new Map<string, Chunk>();
        for (const chunk of index.chunks) {
            const key = getChunkId(chunk);
            chunkMap.set(key, chunk);
        }
        return results.map((r) => ({...r, chunk: chunkMap.get(r.id)}));
    }

    async searchHybrid(query: string, options: HybridSearchOptions = {}): Promise<Array<SearchResult & {
        details: Record<string, number | null>
    }>> {
        const limit = options.limit ?? 10;
        const keywordWeight = options.keywordWeight ?? 0.5;
        const tfidfWeight = options.tfidfWeight ?? 0.5;
        
        const [keywordResults, tfidfResults] = await Promise.all([
            this.search(query, {limit: limit * 2}),
            this.tfidf ? this.searchTFIDF(query, limit * 2) : Promise.resolve([]),
        ]);
        
        // Use ranking pipeline for RRF fusion
        return fuseResultsWithRRF(
            keywordResults,
            tfidfResults.map(r => ({ id: r.id, score: r.score, chunk: r.chunk })),
            keywordWeight,
            tfidfWeight,
            limit
        );
    }

    getTFIDFStats(): ReturnType<TFIDFService['getStats']> | null {
        return this.tfidf ? this.tfidf.getStats() : null;
    }

    /**
     * Analyze query intent using QueryUnderstandingEngine
     */
    analyzeQuery(query: string): ReturnType<QueryUnderstandingEngine['analyze']> {
        return this.queryUnderstanding.analyze(query);
    }

    /**
     * Get query understanding results
     */
    getQueryIntent(query: string) {
        return this.queryUnderstanding.analyze(query);
    }

    clearTFIDFIndex(): void {
        if (this.tfidf) {
            this.tfidf.clear();
            this.tfidfIndexed = false;
        }
    }

    async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        const index = await this.loadIndex();
        
        // Build all indexes once if not built yet
        await this.ensureIndexesBuilt(index, options);
        
        // Use query planner to analyze query
        const intent = analyzeQueryIntent(query, this.queryUnderstanding);
        const keywords = extractKeywords(query);
        
        // Get BM25 results first (fast - uses inverted index)
        let bm25Results: Map<string, number> = new Map();
        if (options.useBM25 === true && this.bm25 && this.bm25Indexed) {
            const bm25 = this.bm25.search(query, { limit: 500 });
            for (const r of bm25) {
                bm25Results.set(r.docId, r.score);
            }
            console.log('[DEBUG] BM25 candidates:', bm25Results.size);
        }
        
        // Create candidate set from BM25 results
        const candidateIds = bm25Results.size > 0 ? createCandidateSet(bm25Results) : null;
        
        // Score chunks - use BM25 candidates as filter for expensive operations
        const results: SearchResult[] = [];
        
        console.log('[DEBUG] Scoring', index.chunks.length, 'chunks...');
        for (const chunk of index.chunks) {
            // Skip if not in BM25 candidates (only if BM25 is enabled)
            if (!isCandidateChunk(chunk, candidateIds)) {
                continue;
            }
            
            // Apply faceted filters
            if (options.filters && !matchesFilters(chunk, index, options.filters)) {
                continue;
            }
            
            // Score using ranking pipeline with multiple engines
            const score = this.scoreChunkWithEngines(chunk, keywords, query, intent, options, bm25Results);
            if (score.totalScore > 0) {
                results.push({
                    chunk,
                    score: score.totalScore,
                    highlights: findHighlights(chunk.content, keywords),
                });
            }
        }

        // Group results by file and keep only the best chunk per file
        const fileGrouped = groupByFile(results);

        // Sort by score and take top N unique files
        const uniqueFileResults = sortAndLimitResults(Array.from(fileGrouped.values()), options.limit ?? 10);

        console.log(`[DEBUG] Found ${results.length} chunks, ${fileGrouped.size} unique files, returning top ${uniqueFileResults.length}`);
        return uniqueFileResults;
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

    /**
     * Build all search indexes once, using cache if available
     */
    private async ensureIndexesBuilt(index: RAGIndexData, options: SearchOptions): Promise<void> {
        console.log('[DEBUG] ensureIndexesBuilt called, useBM25=', options.useBM25, 'bm25Indexed=', this.bm25Indexed);
        
        // Only build if explicitly enabled - these are expensive operations
        
        // Try to load BM25 from cache first
        if (options.useBM25 === true && !this.bm25Indexed && this.bm25) {
            console.log('[DEBUG] Trying to load BM25 cache...');
            const loaded = await this.loadIndexCache();
            console.log('[DEBUG] Cache load result:', loaded);
            if (!loaded) {
                // Cache not available, build from scratch
                console.log('[RAG] Building BM25 index (no cache)...');
                for (const chunk of index.chunks) {
                    const chunkId = getChunkId(chunk);
                    this.bm25.addDocument(chunkId, chunk.content);
                }
                this.bm25Indexed = true;
            }
        }
        
        // Build similarity index (no cache available)
        if (options.useCodeSimilarity === true && !this.similarityIndexed) {
            console.log('[DEBUG] Building similarity index...');
            this.codeSimilarity.index(index.chunks);
            this.similarityIndexed = true;
            console.log('  [Indexed similarity for', index.chunks.length, 'chunks]');
        }
        
        // Build suggestions index
        if (!this.suggestionsIndexed) {
            this.suggestions.indexSymbols(index.chunks);
            this.suggestionsIndexed = true;
        }
        
        console.log('[DEBUG] ensureIndexesBuilt done, bm25Indexed=', this.bm25Indexed);
    }

    /**
     * Comprehensive scoring using all integrated engines with file type filtering
     * Uses ranking pipeline for score calculation
     */
    private scoreChunkWithEngines(
        chunk: Chunk,
        keywords: ExtractedKeywords,
        originalQuery: string,
        intent: ReturnType<QueryUnderstandingEngine['analyze']>,
        options: SearchOptions,
        bm25Results?: Map<string, number>
    ): { keywordScore: number; bm25Score: number; similarityScore: number; totalScore: number } {
        let keywordScore = 0;
        let bm25Score = 0;
        let similarityScore = 0;
        
        // 1. Base keyword scoring - use chunk pipeline
        keywordScore = scoreChunkBase(chunk, keywords, originalQuery);
        
        // 2. BM25 scoring - use pre-computed results
        if (options.useBM25 === true && bm25Results) {
            const chunkId = getChunkId(chunk);
            const bm25 = bm25Results.get(chunkId);
            bm25Score = bm25 ? bm25 * 10 : 0;
        }
        
        // 3. Code similarity scoring - skip if too many chunks (expensive)
        if (options.useCodeSimilarity === true && this.similarityIndexed) {
            const similarResults = this.codeSimilarity.findSimilar(originalQuery, { limit: 50, method: 'jaccard' });
            const chunkId = getChunkId(chunk);
            const similarResult = similarResults.find(r => getChunkId(r.chunk) === chunkId);
            similarityScore = similarResult ? similarResult.similarity * 20 : 0;
        }
        
        // 4. Use query planner for intent-based boosting
        let intentBoost = 1.0;
        if (intent.type === INTENT_TYPES.EXACT_NAME && intent.confidence > 0.7) {
            if (chunk.name && intent.entities.symbols.some((s: string) => chunk.name!.toLowerCase().includes(s.toLowerCase()))) {
                intentBoost = 2.0;
            }
        } else if (intent.type === INTENT_TYPES.SYMBOL) {
            if (chunk.type === 'class' || chunk.type === 'method' || chunk.type === 'function') {
                intentBoost = 1.5;
            }
        } else if (intent.type === INTENT_TYPES.DOCUMENTATION) {
            if (chunk.type === 'comment' || chunk.content.includes('/**') || chunk.content.includes('///')) {
                intentBoost = 1.5;
            }
        }

        // 5. Use query planner for file type boost calculation
        const fileTypeBoost = calculateFileTypeBoost(chunk.filePath, intent);

        // 6. File-level relevance boost (archives, backups, storage, etc.)
        let relevanceBoost = 1.0;
        if (this.index) {
            const fileRelevance = this.fileRelevanceCache.get(chunk.filePath);
            if (typeof fileRelevance === 'number') {
                relevanceBoost = fileRelevance;
            }
        }
        
        // Use ranking pipeline for total score calculation
        const totalScore = calculateTotalScore(
            keywordScore,
            bm25Score,
            similarityScore,
            { keyword: 1.0, bm25: 0.8, similarity: 0.5 },
            intentBoost,
            fileTypeBoost,
            relevanceBoost
        );
        
        return { keywordScore, bm25Score, similarityScore, totalScore };
    }

    async searchFiles(pattern: string): Promise<IndexFileInfo[]> {
        const index = await this.loadIndex();
        return index.files.filter((file) => matchPattern(file.path, pattern));
    }

    async getFileContent(relativePath: string): Promise<string> {
        const fullPath = path.join(this.projectPath, relativePath);
        return fs.readFile(fullPath, 'utf-8');
    }

    async getFileChunks(relativePath: string): Promise<Chunk[]> {
        const index = await this.loadIndex();
        return index.chunks.filter((c) => c.filePath === relativePath);
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
        return scoreChunkBase(chunk, keywords, originalQuery);
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
        return this.suggestions.getSuggestions(query, options);
    }

    /**
     * Report click feedback to improve future ranking
     * Call this when user clicks/selects a search result
     * @param query The original search query
     * @param resultId The ID of the clicked result (file path or chunk ID)
     */
    reportClick(query: string, resultId: string): void {
        if (!this.relevanceFeedbackEnabled) return;
        
        // Learn from this interaction - strengthens relationship between query terms and result
        this.queryExpander.learn(query, resultId);
        
        console.log(`[RAG] Feedback recorded: "${query.substring(0, 50)}" -> ${resultId}`);
    }

    /**
     * Get expanded query terms based on learned relevance
     */
    expandQuery(query: string): string[] {
        return this.queryExpander.expand(query);
    }

    /**
     * Enable/disable relevance feedback learning
     */
    setRelevanceFeedback(enabled: boolean): void {
        this.relevanceFeedbackEnabled = enabled;
    }

    /**
     * Get suggestions by type (function, class, method, etc.)
     */
    getSuggestionsByType(type: string, limit = 10): SuggestionItem[] {
        return this.suggestions.getByType(type, limit);
    }

    dispose(): void {
        this.index = null;
        this.clearTFIDFIndex();
        this.clearQueryCache();
        this.suggestions.clear();
        this.suggestionsIndexed = false;
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