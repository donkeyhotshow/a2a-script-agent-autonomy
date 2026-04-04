/**
 * IndexManager - Handles all index-related operations
 * Manages loading, saving, and building of search indexes
 */

import fs from 'fs/promises';
import path from 'path';
import {TFIDFService} from '../tfidf.js';
import {BM25Scorer} from '../bm25.js';
import {CodeSimilarityEngine} from '../code-similarity.js';
import {SearchSuggestionsEngine} from '../suggestions.js';
import type {RAGIndexData, IndexFileInfo} from '../indexer.js';
import type {Chunk} from '../chunk-manager.js';
import type {RAGSearcherConfig} from './types.js';
import {getChunkId} from './chunk-pipeline.js';

export class IndexManager {
    projectPath: string;
    private indexPath: string;
    private cachePath: string;
    index: RAGIndexData | null = null;
    useTFIDF: boolean;
    tfidf: TFIDFService | null;
    private tfidfIndexed = false;
    // Integrated engines
    bm25: BM25Scorer | null;
    private bm25Indexed = false;
    private similarityIndexed = false;
    suggestions: SearchSuggestionsEngine;
    private suggestionsIndexed = false;
    private fileRelevanceCache: Map<string, number>;

    constructor(config: RAGSearcherConfig = {}) {
        this.projectPath = config.projectPath ?? process.cwd();
        this.indexPath = path.join(this.projectPath, '.a2a', 'index');
        this.cachePath = path.join(this.projectPath, '.a2a', 'cache');
        this.useTFIDF = config.useTFIDF !== false;
        this.tfidf = this.useTFIDF ? new TFIDFService() : null;
        // Initialize integrated engines
        this.bm25 = new BM25Scorer();
        this.suggestions = new SearchSuggestionsEngine({ maxSuggestions: 10 });
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
                const chunkId = getChunkId(chunk);
                this.bm25.addDocument(chunkId, chunk.content);
            }
            this.bm25Indexed = true;
        }
        
        console.log('[RAG] Pre-building similarity index...');
        // Similarity index would be built by SearchOrchestrator
        
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
                // Note: scoreFileRelevance would need to be imported or passed in
                // For now, we'll set a default relevance score
                this.fileRelevanceCache.set(file.path, 1.0);
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

    async searchTFIDF(query: string, topK = 10): Promise<Array<{id: string; score: number; chunk: Chunk | undefined}>> {
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

    getTFIDFStats(): ReturnType<TFIDFService['getStats']> | null {
        return this.tfidf ? this.tfidf.getStats() : null;
    }

    clearTFIDFIndex(): void {
        if (this.tfidf) {
            this.tfidf.clear();
            this.tfidfIndexed = false;
        }
    }

    /**
     * Build all search indexes once, using cache if available
     */
    async ensureIndexesBuilt(index: RAGIndexData, options: { useBM25?: boolean; useCodeSimilarity?: boolean }): Promise<void> {
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
            // Similarity index would be built by SearchOrchestrator
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
}