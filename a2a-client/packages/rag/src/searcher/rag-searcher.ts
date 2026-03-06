/**
 * RAG Searcher - Core Implementation
 * Integrates: TFIDF, QueryUnderstanding, CodeSimilarity, BM25
 */

import fs from 'fs/promises';
import path from 'path';
import {TFIDFService} from '../tfidf.js';
import {QueryUnderstandingEngine, INTENT_TYPES} from '../query-understanding.js';
import {CodeSimilarityEngine} from '../code-similarity.js';
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

export { RAGSearcherConfig, SearchOptions, HybridSearchOptions, SearchResult, TFIDFResult };

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
    private fileRelevanceModel?: FileRelevanceModel;
    private fileRelevanceCache: Map<string, number>;

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
            this.tfidf.addDocument(chunk.id ?? `${chunk.filePath}:${chunk.startLine}`, chunk.content);
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
            const key = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
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
        const k = options.k ?? 60;
        const [keywordResults, tfidfResults] = await Promise.all([
            this.search(query, {limit: limit * 2}),
            this.tfidf ? this.searchTFIDF(query, limit * 2) : Promise.resolve([]),
        ]);
        const rrfScores = new Map<string, RRFEntry>();

        for (let i = 0; i < keywordResults.length; i++) {
            const result = keywordResults[i];
            const id = result.chunk.id ?? `${result.chunk.filePath}:${result.chunk.startLine}`;
            const rrfContribution = keywordWeight * (1 / (k + i + 1));
            if (rrfScores.has(id)) {
                const existing = rrfScores.get(id)!;
                existing.score += rrfContribution;
                existing.keywordRank = i + 1;
                existing.keywordScore = result.score;
                if (result.highlights?.length) existing.highlights = [...new Set([...existing.highlights, ...result.highlights])];
            } else {
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
                const existing = rrfScores.get(result.id)!;
                existing.score += rrfContribution;
                existing.tfidfRank = i + 1;
                existing.tfidfScore = result.score;
            } else if (result.chunk) {
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
        
        // Analyze query with QueryUnderstandingEngine
        const intent = this.queryUnderstanding.analyze(query);
        const keywords = this.extractKeywords(query);
        
        // Get BM25 results first (fast - uses inverted index)
        let bm25Results: Map<string, number> = new Map();
        if (options.useBM25 === true && this.bm25 && this.bm25Indexed) {
            const bm25 = this.bm25.search(query, { limit: 500 });
            for (const r of bm25) {
                bm25Results.set(r.docId, r.score);
            }
            console.log('[DEBUG] BM25 candidates:', bm25Results.size);
        }
        
        // Score chunks - use BM25 candidates as filter for expensive operations
        const results: SearchResult[] = [];
        const candidateIds = bm25Results.size > 0 ? new Set(bm25Results.keys()) : null;
        
        console.log('[DEBUG] Scoring', index.chunks.length, 'chunks...');
        for (const chunk of index.chunks) {
            const chunkId = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
            
            // Skip if not in BM25 candidates (only if BM25 is enabled)
            if (candidateIds && !candidateIds.has(chunkId)) {
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
        const fileGrouped = new Map<string, SearchResult>();
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
        
        console.log('[DEBUG] ensureIndexesBuilt done, bm25Indexed=', this.bm25Indexed);
    }

    /**
     * Comprehensive scoring using all integrated engines with file type filtering
     * OPTIMIZED: uses pre-computed bm25Results Map instead of re-running search
     */
    private scoreChunkWithEngines(
        chunk: Chunk,
        keywords: ExtractedKeywords,
        originalQuery: string,
        intent: ReturnType<QueryUnderstandingEngine['analyze']>,
        options: SearchOptions,
        bm25Results?: Map<string, number>  // Optional pre-computed BM25 results
    ): { keywordScore: number; bm25Score: number; similarityScore: number; totalScore: number } {
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

        // 5. File type filtering based on query context
        let fileTypeBoost = 1.0;
        const preferredFileTypes = intent.entities.fileTypes;
        if (preferredFileTypes && preferredFileTypes.length > 0) {
            const ext = this.getFileExtension(chunk.filePath);
            
            // Check if this chunk's file type is preferred
            if (ext && preferredFileTypes.includes(ext)) {
                // Exact match - boost significantly
                fileTypeBoost = 1.5;
            } else if (ext && !preferredFileTypes.includes(ext)) {
                // Not in preferred list - slight penalty
                fileTypeBoost = 0.7;
            } else {
                // No extension detected - neutral
                fileTypeBoost = 0.8;
            }
            
            // For files without extension (e.g., Makefile, Dockerfile), check path
            if (!ext) {
                const fileName = path.basename(chunk.filePath).toLowerCase();
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
        
        const totalScore =
            (keywordScore * 1.0 + bm25Score * 0.8 + similarityScore * 0.5) *
            intentBoost *
            fileTypeBoost *
            relevanceBoost;
        
        return { keywordScore, bm25Score, similarityScore, totalScore };
    }

    /**
     * Extract file extension from path
     */
    private getFileExtension(filePath: string): string | null {
        const ext = path.extname(filePath).toLowerCase();
        if (ext) {
            // Remove leading dot and return
            return ext.slice(1);
        }
        return null;
    }

    async searchFiles(pattern: string): Promise<IndexFileInfo[]> {
        const index = await this.loadIndex();
        return index.files.filter((file) => this.matchPattern(file.path, pattern));
    }

    async getFileContent(relativePath: string): Promise<string> {
        const fullPath = path.join(this.projectPath, relativePath);
        return fs.readFile(fullPath, 'utf-8');
    }

    async getFileChunks(relativePath: string): Promise<Chunk[]> {
        const index = await this.loadIndex();
        return index.chunks.filter((c) => c.filePath === relativePath);
    }

    extractKeywords(query: string): ExtractedKeywords {
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
        return {words, techTerms: [...techTerms, ...classNames], methodNames};
    }

    scoreChunk(chunk: Chunk, keywords: ExtractedKeywords, _originalQuery: string): number {
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
            if (content.includes(term.toLowerCase())) score += 10;
        }
        for (const method of keywords.methodNames) {
            if (content.includes(method)) score += 15;
        }
        if (chunk.type === 'class' || chunk.type === 'method') score *= 1.3;
        if (chunk.type === 'function') score *= 1.2;
        if (chunk.name && keywords.techTerms.some((t) => chunk.name!.toLowerCase().includes(t.toLowerCase()))) score += 25;
        
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

    findHighlights(content: string, keywords: ExtractedKeywords): string[] {
        const allTerms = [...keywords.words, ...keywords.techTerms, ...keywords.methodNames];
        const highlights: string[] = [];
        for (const term of allTerms) {
            const regex = new RegExp(`.{0,50}${term}.{0,50}`, 'gi');
            const matches = content.match(regex);
            if (matches) highlights.push(...matches.slice(0, 2));
        }
        return [...new Set(highlights)].slice(0, 5);
    }

    matchPattern(filePath: string, pattern: string): boolean {
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '{{GLOBSTAR}}')
            .replace(/\*/g, '[^/]*')
            .replace(/{{GLOBSTAR}}/g, '.*');
        return new RegExp(regexPattern).test(filePath);
    }

    dispose(): void {
        this.index = null;
        this.clearTFIDFIndex();
    }

    /**
     * Search with protocol result transformation
     * Integrates policy limits and transforms results to protocol format
     */
    async searchWithProtocol(
        query: string,
        options: SearchOptions & {
            maxFiles?: number;
            allowedDirs?: string[];
            allowedExtensions?: string[];
            maxResults?: number;
            snippetConfig?: import('../searcher/snippet-generator.js').SnippetConfig;
        } = {}
    ): Promise<import('../protocol-rag-search.js').RagSearchProtocolResult> {
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

        return toRagSearchResult(rawResults, {
            query,
            maxFiles: options.maxFiles,
            allowedDirs: options.allowedDirs,
            allowedExtensions: options.allowedExtensions,
            maxResults: options.maxResults,
            snippetConfig: options.snippetConfig
        });
    }
}
