/**
 * Code Similarity Detection - Jaccard, cosine, edit distance
 */
import type { Chunk } from './chunk-manager.js';
export interface CodeSimilarityConfig {
    minSimilarity?: number;
}
export interface SimilarChunkResult {
    chunk: Chunk;
    similarity: number;
    sharedTokens: number;
}
export interface DuplicateGroup {
    chunks: Chunk[];
    avgSimilarity: number;
}
export declare class CodeSimilarityEngine {
    private config;
    chunks: Chunk[];
    private tokenIndex;
    private minSimilarity;
    constructor(config?: CodeSimilarityConfig);
    index(chunks: Chunk[]): void;
    private _tokenize;
    findSimilar(query: string | Chunk, options?: {
        limit?: number;
        method?: 'jaccard' | 'cosine' | 'overlap' | 'dice';
        threshold?: number;
    }): SimilarChunkResult[];
    private _jaccardSimilarity;
    private _cosineSimilarity;
    private _overlapCoefficient;
    private _diceCoefficient;
    findDuplicates(options?: {
        threshold?: number;
    }): DuplicateGroup[];
    private _calculateGroupSimilarity;
    getStats(): {
        totalChunks: number;
        uniqueTokens: number;
        minSimilarity: number;
    };
}
export declare function createSimilarityEngine(config?: CodeSimilarityConfig): CodeSimilarityEngine;
