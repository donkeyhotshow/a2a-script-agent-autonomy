/**
 * Result Ranker
 * Handles ranking and scoring of search results
 */
import type { SearchResult, ExtractedKeywords } from './types.js';
import type { Chunk } from '../chunk-manager.js';
/**
 * Ranking configuration options
 */
export interface RankingOptions {
    /** Weight for keyword match score */
    keywordWeight?: number;
    /** Weight for BM25 score */
    bm25Weight?: number;
    /** Weight for similarity score */
    similarityWeight?: number;
    /** Boost for exact file type match */
    fileTypeBoost?: number;
    /** Boost for hierarchy depth */
    hierarchyBoost?: number;
}
/**
 * Result Ranker class
 * Handles scoring and ranking of search results
 */
export declare class ResultRanker {
    private options;
    constructor(options?: RankingOptions);
    /**
     * Rank search results by score
     */
    rank(results: SearchResult[]): SearchResult[];
    /**
     * Rank results by file, keeping only the best chunk per file
     */
    rankByFile(results: SearchResult[], limit?: number): SearchResult[];
    /**
     * Apply keyword boosting based on extracted keywords
     */
    applyKeywordBoost(chunk: Chunk, keywords: ExtractedKeywords): number;
    /**
     * Apply hierarchy boost - files closer to root get higher boost
     */
    applyHierarchyBoost(filePath: string, baseScore: number): number;
    /**
     * Apply type-specific boosts
     */
    applyTypeBoost(chunk: Chunk, baseScore: number): number;
    /**
     * Calculate combined score with all factors
     */
    calculateScore(keywordScore: number, bm25Score: number, similarityScore: number, typeBoost: number, hierarchyBoost: number): number;
    /**
     * Normalize scores to 0-1 range
     */
    normalizeScores(results: SearchResult[]): SearchResult[];
    /**
     * Apply length normalization for very long documents
     */
    applyLengthNormalization(chunk: Chunk, baseScore: number): number;
}
