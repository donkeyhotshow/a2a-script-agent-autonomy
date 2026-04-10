"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGSearcher = exports.INTENT_TYPES = void 0;
const tfidf_js_1 = require("../tfidf.js");
const query_understanding_js_1 = require("../query-understanding.js");
Object.defineProperty(exports, "INTENT_TYPES", { enumerable: true, get: function () { return query_understanding_js_1.INTENT_TYPES; } });
const code_similarity_js_1 = require("../code-similarity.js");
const suggestions_js_1 = require("../suggestions.js");
const bm25_js_1 = require("../bm25.js");
// Import new classes
const index_manager_js_1 = require("./index-manager.js");
const search_orchestrator_js_1 = require("./search-orchestrator.js");
const file_service_js_1 = require("./file-service.js");
const feedback_handler_js_1 = require("./feedback-handler.js");
// Import pipeline modules for deprecated methods
const query_planner_js_1 = require("./query-planner.js");
const chunk_pipeline_js_1 = require("./chunk-pipeline.js");
const output_shaping_js_1 = require("./output-shaping.js");
class RAGSearcher {
    constructor(config = {}) {
        this.projectPath = config.projectPath ?? process.cwd();
        // Initialize engines
        this.tfidf = config.useTFIDF !== false ? new tfidf_js_1.TFIDFService() : null;
        this.queryUnderstanding = new query_understanding_js_1.QueryUnderstandingEngine();
        this.codeSimilarity = new code_similarity_js_1.CodeSimilarityEngine();
        this.bm25 = new bm25_js_1.BM25Scorer();
        this.suggestions = new suggestions_js_1.SearchSuggestionsEngine({ maxSuggestions: 10 });
        this.queryExpander = new suggestions_js_1.QueryExpander();
        // Initialize new classes
        this.indexManager = new index_manager_js_1.IndexManager(config, this.tfidf, this.bm25, this.codeSimilarity, this.suggestions);
        this.searchOrchestrator = new search_orchestrator_js_1.SearchOrchestrator(this.indexManager, this.queryUnderstanding, this.codeSimilarity, this.bm25, this.suggestions);
        this.fileService = new file_service_js_1.FileService(this.projectPath);
        this.feedbackHandler = new feedback_handler_js_1.FeedbackHandler(this.suggestions, this.queryExpander, config.relevanceFeedback !== false);
        this.queryCache = new Map();
        this.defaultCacheTTL = config.queryCacheTTL ?? 5 * 60 * 1000; // 5 minutes default
    }
    /**
     * Save search indexes to cache for fast loading
     */
    async saveIndexCache() {
        return this.indexManager.saveIndexCache();
    }
    /**
     * Load search indexes from cache
     */
    async loadIndexCache() {
        return this.indexManager.loadIndexCache();
    }
    /**
     * Check if cache exists and is valid
     */
    async hasValidCache() {
        return this.indexManager.hasValidCache();
    }
    /**
     * Pre-build all indexes for faster future searches
     * Call this after indexing or at startup
     */
    async prebuildIndexes() {
        return this.indexManager.prebuildIndexes();
    }
    async loadIndex() {
        return this.indexManager.loadIndex();
    }
    indexDocument(id, content) {
        this.indexManager.indexDocument(id, content);
    }
    indexDocuments(documents) {
        this.indexManager.indexDocuments(documents);
    }
    async buildTFIDFIndex() {
        return this.indexManager.buildTFIDFIndex();
    }
    async searchTFIDF(query, topK = 10) {
        return this.indexManager.searchTFIDF(query, topK);
    }
    async searchHybrid(query, options = {}) {
        return this.searchOrchestrator.searchHybrid(query, options);
    }
    getTFIDFStats() {
        return this.indexManager.getTFIDFStats();
    }
    /**
     * Analyze query intent using QueryUnderstandingEngine
     */
    analyzeQuery(query) {
        return this.searchOrchestrator.analyzeQuery(query);
    }
    /**
     * Get query understanding results
     */
    getQueryIntent(query) {
        return this.searchOrchestrator.getQueryIntent(query);
    }
    clearTFIDFIndex() {
        this.indexManager.clearTFIDFIndex();
    }
    async search(query, options = {}) {
        return this.searchOrchestrator.search(query, options);
    }
    /**
     * Search with result caching (TTL in milliseconds)
     * Cache key includes query and options to ensure cache validity
     */
    async searchWithCache(query, options = {}, ttl) {
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
    clearQueryCache() {
        this.queryCache.clear();
    }
    /**
     * Get query cache statistics
     */
    getQueryCacheStats() {
        return {
            size: this.queryCache.size,
            maxTTL: this.defaultCacheTTL,
        };
    }
    createCacheKey(query, options) {
        const keyData = { query, options };
        return JSON.stringify(keyData);
    }
    async searchFiles(pattern) {
        const index = await this.loadIndex();
        return this.fileService.searchFiles(pattern, index);
    }
    async getFileContent(relativePath) {
        return this.fileService.getFileContent(relativePath);
    }
    async getFileChunks(relativePath) {
        const index = await this.loadIndex();
        return this.fileService.getFileChunks(relativePath, index);
    }
    /**
     * @deprecated Use extractKeywords from query-planner module instead
     */
    extractKeywords(query) {
        return (0, query_planner_js_1.extractKeywords)(query);
    }
    /**
     * @deprecated Use scoreChunk from chunk-pipeline module instead
     */
    scoreChunk(chunk, keywords, originalQuery) {
        return (0, chunk_pipeline_js_1.scoreChunk)(chunk, keywords, originalQuery);
    }
    /**
     * @deprecated Use findHighlights from chunk-pipeline module instead
     */
    findHighlights(content, keywords) {
        return (0, chunk_pipeline_js_1.findHighlights)(content, keywords);
    }
    /**
     * @deprecated Use matchesFilters from chunk-pipeline module instead
     */
    matchesFilters(chunk, index, filters) {
        return (0, chunk_pipeline_js_1.matchesFilters)(chunk, index, filters);
    }
    /**
     * @deprecated Use matchPattern from chunk-pipeline module instead
     */
    matchPattern(filePath, pattern) {
        return (0, chunk_pipeline_js_1.matchPattern)(filePath, pattern);
    }
    /**
     * @deprecated Use getFileExtension from chunk-pipeline module instead
     */
    getFileExtension(filePath) {
        return (0, chunk_pipeline_js_1.getFileExtension)(filePath);
    }
    /**
     * Get search suggestions for autocomplete
     */
    getSuggestions(query, options = {}) {
        return this.feedbackHandler.getSuggestions(query, options);
    }
    /**
     * Report click feedback to improve future ranking
     * Call this when user clicks/selects a search result
     * @param query The original search query
     * @param resultId The ID of the clicked result (file path or chunk ID)
     */
    reportClick(query, resultId) {
        this.feedbackHandler.reportClick(query, resultId);
    }
    /**
     * Get expanded query terms based on learned relevance
     */
    expandQuery(query) {
        return this.feedbackHandler.expandQuery(query);
    }
    /**
     * Enable/disable relevance feedback learning
     */
    setRelevanceFeedback(enabled) {
        this.feedbackHandler.setRelevanceFeedback(enabled);
    }
    /**
     * Get suggestions by type (function, class, method, etc.)
     */
    getSuggestionsByType(type, limit = 10) {
        return this.feedbackHandler.getSuggestionsByType(type, limit);
    }
    dispose() {
        this.indexManager.dispose();
        this.clearQueryCache();
    }
    /**
     * Search with protocol result transformation
     * Uses output-shaping module for format transformation
     */
    async searchWithProtocol(query, options = {}) {
        const searchResults = await this.search(query, options);
        // Transform raw search results to protocol format using output-shaping
        return (0, output_shaping_js_1.shapeOutput)(searchResults, {
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
exports.RAGSearcher = RAGSearcher;
