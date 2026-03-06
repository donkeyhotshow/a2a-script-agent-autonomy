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
import type { Chunk } from '../chunk-manager.js';
/**
 * BM25 Search Strategy
 * Uses BM25 algorithm for keyword-based search
 */
export declare class BM25SearchStrategy {
    private scorer;
    private indexed;
    constructor();
    index(chunks: Chunk[]): void;
    search(query: string, limit?: number): Array<{
        docId: string;
        score: number;
    }>;
    serialize(): unknown;
    deserialize(data: unknown): void;
}
/**
 * TF-IDF Search Strategy
 * Uses TF-IDF algorithm for term frequency-based search
 */
export declare class TFIDFSearchStrategy {
    private service;
    constructor();
    index(chunks: Chunk[]): void;
    search(query: string, limit?: number): Array<{
        id: string;
        score: number;
    }>;
    clear(): void;
    getStats(): ReturnType<TFIDFService['getStats']>;
}
/**
 * Code Similarity Search Strategy
 * Uses code similarity algorithms for semantic search
 */
export declare class CodeSimilaritySearchStrategy {
    private engine;
    constructor();
    index(chunks: Chunk[]): void;
    findSimilar(query: string, options?: {
        limit?: number;
        method?: 'jaccard' | 'cosine';
    }): Array<{
        chunk: Chunk;
        similarity: number;
    }>;
}
/**
 * Query Understanding Strategy
 * Analyzes query intent to improve search results
 */
export declare class QueryStrategy {
    private engine;
    constructor();
    analyze(query: string): ReturnType<QueryUnderstandingEngine['analyze']>;
    getIntentTypes(): typeof INTENT_TYPES;
}
/**
 * Search Strategies Container
 * Provides access to all available search strategies
 */
export declare class SearchStrategies {
    bm25: BM25SearchStrategy;
    tfidf: TFIDFSearchStrategy;
    codeSimilarity: CodeSimilaritySearchStrategy;
    queryUnderstanding: QueryStrategy;
    constructor();
    indexAll(chunks: Chunk[]): void;
    clear(): void;
}
export { BM25Scorer, TFIDFService, CodeSimilarityEngine, QueryUnderstandingEngine, INTENT_TYPES };
