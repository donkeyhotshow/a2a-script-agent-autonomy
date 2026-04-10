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
 * Default ranking options
 */
const DEFAULT_RANKING_OPTIONS: RankingOptions = {
    keywordWeight: 1.0,
    bm25Weight: 0.8,
    similarityWeight: 0.5,
    fileTypeBoost: 1.5,
    hierarchyBoost: 0.1,
};

/**
 * Result Ranker class
 * Handles scoring and ranking of search results
 */
export class ResultRanker {
    private options: RankingOptions;

    constructor(options: RankingOptions = DEFAULT_RANKING_OPTIONS) {
        this.options = { ...DEFAULT_RANKING_OPTIONS, ...options };
    }

    /**
     * Rank search results by score
     */
    rank(results: SearchResult[]): SearchResult[] {
        return [...results].sort((a, b) => b.score - a.score);
    }

    /**
     * Rank results by file, keeping only the best chunk per file
     */
    rankByFile(results: SearchResult[], limit = 10): SearchResult[] {
        const fileGrouped = new Map<string, SearchResult>();
        
        for (const result of results) {
            const filePath = result.chunk.filePath;
            const existing = fileGrouped.get(filePath);
            if (!existing || result.score > existing.score) {
                fileGrouped.set(filePath, result);
            }
        }

        return Array.from(fileGrouped.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Apply keyword boosting based on extracted keywords
     */
    applyKeywordBoost(chunk: Chunk, keywords: ExtractedKeywords): number {
        let boost = 0;
        const content = chunk.content.toLowerCase();

        for (const word of keywords.words) {
            const matches = content.match(new RegExp(word, 'gi'));
            if (matches) {
                boost += matches.length * 2;
            }
        }

        for (const term of keywords.techTerms) {
            if (content.includes(term.toLowerCase())) {
                boost += 10;
            }
        }

        for (const method of keywords.methodNames) {
            if (content.includes(method)) {
                boost += 15;
            }
        }

        return boost;
    }

    /**
     * Apply hierarchy boost - files closer to root get higher boost
     */
    applyHierarchyBoost(filePath: string, baseScore: number): number {
        const depth = (filePath.match(/\//g) || []).length;
        const hierarchyBoost = Math.max(0.5, 1.0 - (depth * this.options.hierarchyBoost!));
        return baseScore * hierarchyBoost;
    }

    /**
     * Apply type-specific boosts
     */
    applyTypeBoost(chunk: Chunk, baseScore: number): number {
        let score = baseScore;

        // Boost for class/method definitions
        if (chunk.type === 'class' || chunk.type === 'method') {
            score *= 1.3;
        }
        if (chunk.type === 'function') {
            score *= 1.2;
        }

        return score;
    }

    /**
     * Calculate combined score with all factors
     */
    calculateScore(
        keywordScore: number,
        bm25Score: number,
        similarityScore: number,
        typeBoost: number,
        hierarchyBoost: number
    ): number {
        return (
            (keywordScore * this.options.keywordWeight!) +
            (bm25Score * this.options.bm25Weight!) +
            (similarityScore * this.options.similarityWeight!)
        ) * typeBoost * hierarchyBoost;
    }

    /**
     * Normalize scores to 0-1 range
     */
    normalizeScores(results: SearchResult[]): SearchResult[] {
        if (results.length === 0) return results;

        const maxScore = Math.max(...results.map(r => r.score));
        if (maxScore === 0) return results;

        return results.map(r => ({
            ...r,
            score: r.score / maxScore,
        }));
    }

    /**
     * Apply length normalization for very long documents
     */
    applyLengthNormalization(chunk: Chunk, baseScore: number): number {
        const docLength = chunk.content.split(/\s+/).length;
        if (docLength > 500) {
            return baseScore * (500 / docLength);
        }
        return baseScore;
    }
}
