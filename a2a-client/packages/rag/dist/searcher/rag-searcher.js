"use strict";
/**
 * RAG Searcher - Core Implementation
 * Integrates: TFIDF, QueryUnderstanding, CodeSimilarity, BM25
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGSearcher = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const tfidf_js_1 = require("../tfidf.js");
const query_understanding_js_1 = require("../query-understanding.js");
const code_similarity_js_1 = require("../code-similarity.js");
const suggestions_js_1 = require("../suggestions.js");
const bm25_js_1 = require("../bm25.js");
const file_relevance_js_1 = require("../file-relevance.js");
const protocol_rag_search_js_1 = require("../protocol-rag-search.js");
class RAGSearcher {
    constructor(config = {}) {
        this.index = null;
        this.tfidfIndexed = false;
        this.bm25Indexed = false;
        this.similarityIndexed = false;
        this.suggestionsIndexed = false;
        this.projectPath = config.projectPath ?? process.cwd();
        this.indexPath = path_1.default.join(this.projectPath, '.a2a', 'index');
        this.cachePath = path_1.default.join(this.projectPath, '.a2a', 'cache');
        this.useTFIDF = config.useTFIDF !== false;
        this.tfidf = this.useTFIDF ? new tfidf_js_1.TFIDFService() : null;
        // Initialize integrated engines
        this.queryUnderstanding = new query_understanding_js_1.QueryUnderstandingEngine();
        this.codeSimilarity = new code_similarity_js_1.CodeSimilarityEngine();
        this.bm25 = new bm25_js_1.BM25Scorer();
        this.fileRelevanceModel = config.fileRelevanceModel;
        this.fileRelevanceCache = new Map();
        this.queryCache = new Map();
        this.defaultCacheTTL = config.queryCacheTTL ?? 5 * 60 * 1000; // 5 minutes default
        this.suggestions = new suggestions_js_1.SearchSuggestionsEngine({ maxSuggestions: 10 });
    }
    /**
     * Save search indexes to cache for fast loading
     */
    async saveIndexCache() {
        await promises_1.default.mkdir(this.cachePath, { recursive: true });
        // Save BM25 index
        if (this.bm25 && this.bm25Indexed) {
            const bm25Data = this.bm25.serialize();
            await promises_1.default.writeFile(path_1.default.join(this.cachePath, 'bm25-cache.json'), JSON.stringify(bm25Data));
            console.log('[RAG] BM25 cache saved');
        }
        console.log('[RAG] Index cache saved');
    }
    /**
     * Load search indexes from cache
     */
    async loadIndexCache() {
        try {
            const cacheFile = path_1.default.join(this.cachePath, 'bm25-cache.json');
            const content = await promises_1.default.readFile(cacheFile, 'utf-8');
            const data = JSON.parse(content);
            if (this.bm25) {
                this.bm25.deserialize(data);
                this.bm25Indexed = true;
                console.log('[RAG] BM25 cache loaded');
            }
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Check if cache exists and is valid
     */
    async hasValidCache() {
        try {
            const stats = await promises_1.default.stat(path_1.default.join(this.cachePath, 'bm25-cache.json'));
            const indexStats = await promises_1.default.stat(path_1.default.join(this.indexPath, 'rag-files.json'));
            // Cache is valid if it's newer than index
            return stats.mtime >= indexStats.mtime;
        }
        catch {
            return false;
        }
    }
    /**
     * Pre-build all indexes for faster future searches
     * Call this after indexing or at startup
     */
    async prebuildIndexes() {
        const index = await this.loadIndex();
        console.log('[RAG] Pre-building BM25 index...');
        if (this.bm25) {
            this.bm25.clear();
            for (const chunk of index.chunks) {
                const chunkId = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
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
    async loadIndex() {
        if (this.index)
            return this.index;
        try {
            const indexPath = path_1.default.join(this.indexPath, 'rag-files.json');
            const content = await promises_1.default.readFile(indexPath, 'utf-8');
            this.index = JSON.parse(content);
            // Build per-file relevance cache (blend stored value with current model/heuristics)
            this.fileRelevanceCache.clear();
            for (const file of this.index.files) {
                const relevance = (0, file_relevance_js_1.scoreFileRelevance)({
                    relativePath: file.path,
                    ext: file.ext,
                    size: file.size,
                }, this.fileRelevanceModel);
                file.relevanceScore = relevance.relevance;
                file.relevanceLabel = relevance.label;
                file.relevanceReasons = relevance.reasons;
                this.fileRelevanceCache.set(file.path, relevance.relevance);
            }
            return this.index;
        }
        catch {
            this.index = { version: '1.0', timestamp: '', projectPath: this.projectPath, files: [], chunks: [] };
            return this.index;
        }
    }
    indexDocument(id, content) {
        this.tfidf?.addDocument(id, content);
    }
    indexDocuments(documents) {
        if (this.tfidf) {
            this.tfidf.addDocuments(documents.map((doc) => ({ id: doc.id, text: doc.content })));
        }
    }
    async buildTFIDFIndex() {
        if (!this.tfidf)
            throw new Error('TF-IDF not enabled');
        const index = await this.loadIndex();
        this.tfidf.clear();
        for (const chunk of index.chunks) {
            this.tfidf.addDocument(chunk.id ?? `${chunk.filePath}:${chunk.startLine}`, chunk.content);
        }
        this.tfidfIndexed = true;
    }
    async searchTFIDF(query, topK = 10) {
        if (!this.tfidf)
            throw new Error('TF-IDF not enabled');
        if (!this.tfidfIndexed)
            await this.buildTFIDFIndex();
        const results = this.tfidf.search(query, topK);
        const index = await this.loadIndex();
        const chunkMap = new Map();
        for (const chunk of index.chunks) {
            const key = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
            chunkMap.set(key, chunk);
        }
        return results.map((r) => ({ ...r, chunk: chunkMap.get(r.id) }));
    }
    async searchHybrid(query, options = {}) {
        const limit = options.limit ?? 10;
        const keywordWeight = options.keywordWeight ?? 0.5;
        const tfidfWeight = options.tfidfWeight ?? 0.5;
        const k = options.k ?? 60;
        const [keywordResults, tfidfResults] = await Promise.all([
            this.search(query, { limit: limit * 2 }),
            this.tfidf ? this.searchTFIDF(query, limit * 2) : Promise.resolve([]),
        ]);
        const rrfScores = new Map();
        for (let i = 0; i < keywordResults.length; i++) {
            const result = keywordResults[i];
            const id = result.chunk.id ?? `${result.chunk.filePath}:${result.chunk.startLine}`;
            const rrfContribution = keywordWeight * (1 / (k + i + 1));
            if (rrfScores.has(id)) {
                const existing = rrfScores.get(id);
                existing.score += rrfContribution;
                existing.keywordRank = i + 1;
                existing.keywordScore = result.score;
                if (result.highlights?.length)
                    existing.highlights = [...new Set([...existing.highlights, ...result.highlights])];
            }
            else {
                rrfScores.set(id, {
                    chunk: result.chunk,
                    score: rrfContribution,
                    highlights: result.highlights ?? [],
                    keywordRank: i + 1,
                    keywordScore: result.score,
                    tfidfRank: null,
                    tfidfScore: 0,
                });
            }
        }
        for (let i = 0; i < tfidfResults.length; i++) {
            const result = tfidfResults[i];
            const rrfContribution = tfidfWeight * (1 / (k + i + 1));
            if (rrfScores.has(result.id)) {
                const existing = rrfScores.get(result.id);
                existing.score += rrfContribution;
                existing.tfidfRank = i + 1;
                existing.tfidfScore = result.score;
            }
            else if (result.chunk) {
                rrfScores.set(result.id, {
                    chunk: result.chunk,
                    score: rrfContribution,
                    highlights: [],
                    keywordRank: null,
                    keywordScore: 0,
                    tfidfRank: i + 1,
                    tfidfScore: result.score,
                });
            }
        }
        return [...rrfScores.values()]
            .map((r) => ({
            chunk: r.chunk,
            score: r.score,
            highlights: r.highlights.slice(0, 5),
            details: {
                keywordRank: r.keywordRank,
                keywordScore: r.keywordScore,
                tfidfRank: r.tfidfRank,
                tfidfScore: r.tfidfScore
            },
        }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
    getTFIDFStats() {
        return this.tfidf ? this.tfidf.getStats() : null;
    }
    /**
     * Analyze query intent using QueryUnderstandingEngine
     */
    analyzeQuery(query) {
        return this.queryUnderstanding.analyze(query);
    }
    /**
     * Get query understanding results
     */
    getQueryIntent(query) {
        return this.queryUnderstanding.analyze(query);
    }
    clearTFIDFIndex() {
        if (this.tfidf) {
            this.tfidf.clear();
            this.tfidfIndexed = false;
        }
    }
    async search(query, options = {}) {
        const index = await this.loadIndex();
        // Build all indexes once if not built yet
        await this.ensureIndexesBuilt(index, options);
        // Analyze query with QueryUnderstandingEngine
        const intent = this.queryUnderstanding.analyze(query);
        const keywords = this.extractKeywords(query);
        // Get BM25 results first (fast - uses inverted index)
        let bm25Results = new Map();
        if (options.useBM25 === true && this.bm25 && this.bm25Indexed) {
            const bm25 = this.bm25.search(query, { limit: 500 });
            for (const r of bm25) {
                bm25Results.set(r.docId, r.score);
            }
            console.log('[DEBUG] BM25 candidates:', bm25Results.size);
        }
        // Score chunks - use BM25 candidates as filter for expensive operations
        const results = [];
        const candidateIds = bm25Results.size > 0 ? new Set(bm25Results.keys()) : null;
        console.log('[DEBUG] Scoring', index.chunks.length, 'chunks...');
        for (const chunk of index.chunks) {
            const chunkId = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
            // Skip if not in BM25 candidates (only if BM25 is enabled)
            if (candidateIds && !candidateIds.has(chunkId)) {
                continue;
            }
            // Apply faceted filters
            if (options.filters && !this.matchesFilters(chunk, index, options.filters)) {
                continue;
            }
            const score = this.scoreChunkWithEngines(chunk, keywords, query, intent, options, bm25Results);
            if (score.totalScore > 0) {
                results.push({
                    chunk,
                    score: score.totalScore,
                    highlights: this.findHighlights(chunk.content, keywords),
                });
            }
        }
        // Group results by file and keep only the best chunk per file
        const fileGrouped = new Map();
        for (const result of results) {
            const filePath = result.chunk.filePath;
            const existing = fileGrouped.get(filePath);
            if (!existing || result.score > existing.score) {
                fileGrouped.set(filePath, result);
            }
        }
        // Sort by score and take top N unique files
        const sortedByFile = Array.from(fileGrouped.values()).sort((a, b) => b.score - a.score);
        const limit = options.limit ?? 10;
        const uniqueFileResults = sortedByFile.slice(0, limit);
        console.log(`[DEBUG] Found ${results.length} chunks, ${fileGrouped.size} unique files, returning top ${limit}`);
        return uniqueFileResults;
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
    /**
     * Build all search indexes once, using cache if available
     */
    async ensureIndexesBuilt(index, options) {
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
                    const chunkId = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
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
     * OPTIMIZED: uses pre-computed bm25Results Map instead of re-running search
     */
    scoreChunkWithEngines(chunk, keywords, originalQuery, intent, options, bm25Results // Optional pre-computed BM25 results
    ) {
        let keywordScore = 0;
        let bm25Score = 0;
        let similarityScore = 0;
        // 1. Base keyword scoring (original algorithm) - FAST
        keywordScore = this.scoreChunk(chunk, keywords, originalQuery);
        // 2. BM25 scoring - use pre-computed results (passed from search method)
        // Note: BM25 search is already done ONCE in search() before this loop
        if (options.useBM25 === true && bm25Results) {
            const chunkId = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
            const bm25 = bm25Results.get(chunkId);
            bm25Score = bm25 ? bm25 * 10 : 0;
        }
        // 3. Code similarity scoring - skip if too many chunks (expensive)
        // Only run if similarity explicitly enabled AND index is small enough
        if (options.useCodeSimilarity === true && this.similarityIndexed) {
            const similarResults = this.codeSimilarity.findSimilar(originalQuery, { limit: 50, method: 'jaccard' });
            const chunkId = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
            const similarResult = similarResults.find(r => r.chunk.id === chunkId || `${r.chunk.filePath}:${r.chunk.startLine}` === chunkId);
            similarityScore = similarResult ? similarResult.similarity * 20 : 0;
        }
        // 4. Intent-based boosting
        let intentBoost = 1.0;
        if (intent.type === query_understanding_js_1.INTENT_TYPES.EXACT_NAME && intent.confidence > 0.7) {
            if (chunk.name && intent.entities.symbols.some((s) => chunk.name.toLowerCase().includes(s.toLowerCase()))) {
                intentBoost = 2.0;
            }
        }
        else if (intent.type === query_understanding_js_1.INTENT_TYPES.SYMBOL) {
            if (chunk.type === 'class' || chunk.type === 'method' || chunk.type === 'function') {
                intentBoost = 1.5;
            }
        }
        else if (intent.type === query_understanding_js_1.INTENT_TYPES.DOCUMENTATION) {
            if (chunk.type === 'comment' || chunk.content.includes('/**') || chunk.content.includes('///')) {
                intentBoost = 1.5;
            }
        }
        // 5. File type filtering based on query context
        let fileTypeBoost = 1.0;
        const preferredFileTypes = intent.entities.fileTypes;
        if (preferredFileTypes && preferredFileTypes.length > 0) {
            const ext = this.getFileExtension(chunk.filePath);
            // Check if this chunk's file type is preferred
            if (ext && preferredFileTypes.includes(ext)) {
                // Exact match - boost significantly
                fileTypeBoost = 1.5;
            }
            else if (ext && !preferredFileTypes.includes(ext)) {
                // Not in preferred list - slight penalty
                fileTypeBoost = 0.7;
            }
            else {
                // No extension detected - neutral
                fileTypeBoost = 0.8;
            }
            // For files without extension (e.g., Makefile, Dockerfile), check path
            if (!ext) {
                const fileName = path_1.default.basename(chunk.filePath).toLowerCase();
                for (const type of preferredFileTypes) {
                    if (fileName.includes(type) || fileName.startsWith(type)) {
                        fileTypeBoost = 1.5;
                        break;
                    }
                }
            }
        }
        // 6. File-level relevance boost / penalty (archives, backups, storage, etc.)
        let relevanceBoost = 1.0;
        if (this.index) {
            const fileRelevance = this.fileRelevanceCache.get(chunk.filePath);
            if (typeof fileRelevance === 'number') {
                relevanceBoost = fileRelevance;
            }
        }
        const totalScore = (keywordScore * 1.0 + bm25Score * 0.8 + similarityScore * 0.5) *
            intentBoost *
            fileTypeBoost *
            relevanceBoost;
        return { keywordScore, bm25Score, similarityScore, totalScore };
    }
    /**
     * Extract file extension from path
     */
    getFileExtension(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        if (ext) {
            // Remove leading dot and return
            return ext.slice(1);
        }
        return null;
    }
    async searchFiles(pattern) {
        const index = await this.loadIndex();
        return index.files.filter((file) => this.matchPattern(file.path, pattern));
    }
    async getFileContent(relativePath) {
        const fullPath = path_1.default.join(this.projectPath, relativePath);
        return promises_1.default.readFile(fullPath, 'utf-8');
    }
    async getFileChunks(relativePath) {
        const index = await this.loadIndex();
        return index.chunks.filter((c) => c.filePath === relativePath);
    }
    extractKeywords(query) {
        const stopWords = new Set([
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
            'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
            'добавь', 'создай', 'удали', 'измени', 'покажи', 'найди',
        ]);
        const words = query
            .toLowerCase()
            .replace(/[^\w\sа-яё]/gi, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 2 && !stopWords.has(w));
        const techTerms = query.match(/[A-Z][a-z]+[A-Z][a-z]+/g) ?? [];
        const classNames = query.match(/\b[A-Z][a-zA-Z]+\b/g) ?? [];
        const methodNames = (query.match(/\b[a-z][a-zA-Z]+\(\)/g) ?? []).map((m) => m.replace('()', ''));
        return { words, techTerms: [...techTerms, ...classNames], methodNames };
    }
    scoreChunk(chunk, keywords, _originalQuery) {
        let score = 0;
        const content = chunk.content.toLowerCase();
        // Very common programming words that should be heavily penalized
        const commonWords = new Set([
            'import', 'export', 'default', 'const', 'let', 'var',
            'function', 'return', 'if', 'else', 'for', 'while',
            'new', 'this', 'super', 'extends',
            'public', 'private', 'protected', 'static',
            'async', 'await', 'require', 'module',
            'true', 'false', 'null', 'undefined',
            'console', 'log', 'error', 'warn', 'info',
            'style', 'css', 'html', 'div', 'span', 'button'
        ]);
        for (const word of keywords.words) {
            const matches = content.match(new RegExp(word, 'gi'));
            if (matches) {
                // Apply small penalty for very common words
                let wordWeight = 1;
                if (commonWords.has(word)) {
                    wordWeight = 0.5;
                }
                score += matches.length * 2 * wordWeight;
            }
        }
        for (const term of keywords.techTerms) {
            if (content.includes(term.toLowerCase()))
                score += 10;
        }
        for (const method of keywords.methodNames) {
            if (content.includes(method))
                score += 15;
        }
        if (chunk.type === 'class' || chunk.type === 'method')
            score *= 1.3;
        if (chunk.type === 'function')
            score *= 1.2;
        if (chunk.name && keywords.techTerms.some((t) => chunk.name.toLowerCase().includes(t.toLowerCase())))
            score += 25;
        // Light length normalization only for very long documents
        const docLength = chunk.content.split(/\s+/).length;
        if (docLength > 500) {
            score = score * (500 / docLength);
        }
        // Hierarchy boost: files closer to root are more important
        // root = 1.0, /features/x = 0.9, /features/x/y = 0.8, etc.
        const depth = (chunk.filePath.match(/\//g) || []).length;
        const hierarchyBoost = Math.max(0.5, 1.0 - (depth * 0.1));
        score *= hierarchyBoost;
        return score;
    }
    findHighlights(content, keywords) {
        const allTerms = [...keywords.words, ...keywords.techTerms, ...keywords.methodNames];
        const highlights = [];
        for (const term of allTerms) {
            const regex = new RegExp(`.{0,50}${term}.{0,50}`, 'gi');
            const matches = content.match(regex);
            if (matches)
                highlights.push(...matches.slice(0, 2));
        }
        return [...new Set(highlights)].slice(0, 5);
    }
    /**
     * Check if a chunk matches the faceted search filters
     */
    matchesFilters(chunk, index, filters) {
        // Get file info for this chunk
        const fileInfo = index.files.find(f => f.path === chunk.filePath);
        if (!fileInfo)
            return true; // If file not found, allow through
        // Extension filter
        if (filters.extensions && filters.extensions.length > 0) {
            const ext = fileInfo.ext.toLowerCase();
            const normalizedExts = filters.extensions.map(e => e.toLowerCase());
            if (!normalizedExts.includes(ext) && !normalizedExts.includes(ext.replace('.', ''))) {
                return false;
            }
        }
        // Folder filter
        if (filters.folders && filters.folders.length > 0) {
            const inFolder = filters.folders.some(folder => chunk.filePath.startsWith(folder.replace(/^\//, '')));
            if (!inFolder)
                return false;
        }
        // Date filters
        if (filters.modifiedAfter) {
            const afterDate = new Date(filters.modifiedAfter).getTime();
            const fileDate = new Date(fileInfo.modified).getTime();
            if (fileDate < afterDate)
                return false;
        }
        if (filters.modifiedBefore) {
            const beforeDate = new Date(filters.modifiedBefore).getTime();
            const fileDate = new Date(fileInfo.modified).getTime();
            if (fileDate > beforeDate)
                return false;
        }
        // Type filter
        if (filters.type && filters.type.length > 0) {
            if (!filters.type.includes(chunk.type))
                return false;
        }
        // Size filters
        if (filters.minSize !== undefined && fileInfo.size < filters.minSize)
            return false;
        if (filters.maxSize !== undefined && fileInfo.size > filters.maxSize)
            return false;
        return true;
    }
    matchPattern(filePath, pattern) {
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '{{GLOBSTAR}}')
            .replace(/\*/g, '[^/]*')
            .replace(/{{GLOBSTAR}}/g, '.*');
        return new RegExp(regexPattern).test(filePath);
    }
    /**
     * Get search suggestions for autocomplete
     */
    getSuggestions(query, options = {}) {
        return this.suggestions.getSuggestions(query, options);
    }
    /**
     * Get suggestions by type (function, class, method, etc.)
     */
    getSuggestionsByType(type, limit = 10) {
        return this.suggestions.getByType(type, limit);
    }
    dispose() {
        this.index = null;
        this.clearTFIDFIndex();
        this.clearQueryCache();
        this.suggestions.clear();
        this.suggestionsIndexed = false;
    }
    /**
     * Search with protocol result transformation
     * Integrates policy limits and transforms results to protocol format
     */
    async searchWithProtocol(query, options = {}) {
        const searchResults = await this.search(query, options);
        // Transform raw search results to protocol format
        const rawResults = searchResults.map(result => ({
            chunk: {
                filePath: result.chunk.filePath,
                content: result.chunk.content,
                startLine: result.chunk.startLine,
                endLine: result.chunk.endLine
            },
            score: result.score,
            highlights: result.highlights
        }));
        return (0, protocol_rag_search_js_1.toRagSearchResult)(rawResults, {
            query,
            maxFiles: options.maxFiles,
            allowedDirs: options.allowedDirs,
            allowedExtensions: options.allowedExtensions,
            maxResults: options.maxResults,
            snippetConfig: options.snippetConfig
        });
    }
}
exports.RAGSearcher = RAGSearcher;
