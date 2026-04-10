/**
 * Search Strategies
 * 
 * This module provides search strategy implementations.
 * Currently integrated within RAGSearcher for better performance.
 */

import { BM25Scorer } from '../bm25.js';
import { TFIDFService } from '../tfidf.js';
import { CodeSimilarityEngine } from '../code-similarity.js';
import { QueryUnderstandingEngine, INTENT_TYPES } from '../query-understanding.js';
import type { ExtractedKeywords } from './types.js';
import type { Chunk } from '../chunk-manager.js';

/**
 * BM25 Search Strategy
 * Uses BM25 algorithm for keyword-based search
 */
export class BM25SearchStrategy {
    private scorer: BM25Scorer;
    private indexed = false;

    constructor() {
        this.scorer = new BM25Scorer();
    }

    index(chunks: Chunk[]): void {
        for (const chunk of chunks) {
            const chunkId = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
            this.scorer.addDocument(chunkId, chunk.content);
        }
        this.indexed = true;
    }

    search(query: string, limit = 10): Array<{ docId: string; score: number }> {
        if (!this.indexed) return [];
        return this.scorer.search(query, { limit });
    }

    serialize(): unknown {
        return this.scorer.serialize();
    }

    deserialize(data: unknown): void {
        this.scorer.deserialize(data);
        this.indexed = true;
    }
}

/**
 * TF-IDF Search Strategy
 * Uses TF-IDF algorithm for term frequency-based search
 */
export class TFIDFSearchStrategy {
    private service: TFIDFService;

    constructor() {
        this.service = new TFIDFService();
    }

    index(chunks: Chunk[]): void {
        this.service.clear();
        for (const chunk of chunks) {
            const chunkId = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
            this.service.addDocument(chunkId, chunk.content);
        }
    }

    search(query: string, limit = 10): Array<{ id: string; score: number }> {
        return this.service.search(query, limit);
    }

    clear(): void {
        this.service.clear();
    }

    getStats(): ReturnType<TFIDFService['getStats']> {
        return this.service.getStats();
    }
}

/**
 * Code Similarity Search Strategy
 * Uses code similarity algorithms for semantic search
 */
export class CodeSimilaritySearchStrategy {
    private engine: CodeSimilarityEngine;

    constructor() {
        this.engine = new CodeSimilarityEngine();
    }

    index(chunks: Chunk[]): void {
        this.engine.index(chunks);
    }

    findSimilar(query: string, options: { limit?: number; method?: 'jaccard' | 'cosine' } = {}): Array<{
        chunk: Chunk;
        similarity: number;
    }> {
        return this.engine.findSimilar(query, options);
    }
}

/**
 * Query Understanding Strategy
 * Analyzes query intent to improve search results
 */
export class QueryStrategy {
    private engine: QueryUnderstandingEngine;

    constructor() {
        this.engine = QueryUnderstandingEngine ? new QueryUnderstandingEngine() : null as unknown as QueryUnderstandingEngine;
    }

    analyze(query: string): ReturnType<QueryUnderstandingEngine['analyze']> {
        return this.engine.analyze(query);
    }

    getIntentTypes(): typeof INTENT_TYPES {
        return INTENT_TYPES;
    }
}

/**
 * Search Strategies Container
 * Provides access to all available search strategies
 */
export class SearchStrategies {
    bm25: BM25SearchStrategy;
    tfidf: TFIDFSearchStrategy;
    codeSimilarity: CodeSimilaritySearchStrategy;
    queryUnderstanding: QueryStrategy;

    constructor() {
        this.bm25 = new BM25SearchStrategy();
        this.tfidf = new TFIDFSearchStrategy();
        this.codeSimilarity = new CodeSimilaritySearchStrategy();
        this.queryUnderstanding = new QueryStrategy();
    }

    indexAll(chunks: Chunk[]): void {
        this.bm25.index(chunks);
        this.tfidf.index(chunks);
        this.codeSimilarity.index(chunks);
    }

    clear(): void {
        this.tfidf.clear();
    }
}

export { BM25Scorer, TFIDFService, CodeSimilarityEngine, QueryUnderstandingEngine, INTENT_TYPES };
