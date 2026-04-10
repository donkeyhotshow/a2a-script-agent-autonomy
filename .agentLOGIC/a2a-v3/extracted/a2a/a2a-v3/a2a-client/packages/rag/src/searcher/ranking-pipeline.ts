/**
 * Ranking Pipeline - Ранжирование результатов
 * Отвечает за комплексный скоринг, RRF, группировку по файлам и финальное упорядочивание
 */

import type { Chunk } from '../chunk-manager.js';
import type { SearchResult, RRFEntry } from './types.js';
import { getChunkId } from './chunk-pipeline.js';

/**
 * Вес компонентов для расчёта общего скора
 */
export interface ScoreWeights {
    keyword: number;
    bm25: number;
    similarity: number;
}

/**
 * Компоненты скора чанка
 */
export interface ChunkScoreComponents {
    keywordScore: number;
    bm25Score: number;
    similarityScore: number;
    totalScore: number;
}

/**
 * Расчёт RRF (Reciprocal Rank Fusion) скора
 */
export function calculateRRFScore(
    rank: number,
    k: number = 60,
    weight: number = 1.0
): number {
    return weight * (1 / (k + rank + 1));
}

/**
 * Объединение результатов разных поисков через RRF
 */
export function fuseResultsWithRRF(
    keywordResults: SearchResult[],
    tfidfResults: Array<{ id: string; score: number; chunk?: Chunk }>,
    keywordWeight: number = 0.5,
    tfidfWeight: number = 0.5,
    limit: number = 10
): Array<SearchResult & { details: Record<string, number | null> }> {
    const k = 60;
    const rrfScores = new Map<string, RRFEntry>();

    // Process keyword results
    for (let i = 0; i < keywordResults.length; i++) {
        const result = keywordResults[i];
        const id = getChunkId(result.chunk);
        const rrfContribution = calculateRRFScore(i, k, keywordWeight);
        
        if (rrfScores.has(id)) {
            const existing = rrfScores.get(id)!;
            existing.score += rrfContribution;
            existing.keywordRank = i + 1;
            existing.keywordScore = result.score;
            if (result.highlights?.length) {
                existing.highlights = [...new Set([...existing.highlights, ...result.highlights])];
            }
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

    // Process TF-IDF results
    for (let i = 0; i < tfidfResults.length; i++) {
        const result = tfidfResults[i];
        const rrfContribution = calculateRRFScore(i, k, tfidfWeight);
        
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

/**
 * Группировка результатов по файлам (один лучший чанк на файл)
 */
export function groupByFile(results: SearchResult[]): Map<string, SearchResult> {
    const fileGrouped = new Map<string, SearchResult>();
    
    for (const result of results) {
        const filePath = result.chunk.filePath;
        const existing = fileGrouped.get(filePath);
        if (!existing || result.score > existing.score) {
            fileGrouped.set(filePath, result);
        }
    }
    
    return fileGrouped;
}

/**
 * Сортировка и лимитирование результатов
 */
export function sortAndLimitResults(
    results: SearchResult[],
    limit: number
): SearchResult[] {
    return Array.from(results)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

/**
 * Применение boosts к финальному скору
 */
export function applyBoosts(
    baseScore: number,
    intentBoost: number,
    fileTypeBoost: number,
    relevanceBoost: number
): number {
    return baseScore * intentBoost * fileTypeBoost * relevanceBoost;
}

/**
 * Расчёт boost на основе типа запроса
 */
export function calculateIntentBoost(
    chunk: Chunk,
    intent: { type: string; confidence: number; entities: { symbols: string[] } }
): number {
    // Import INTENT_TYPES dynamically or accept as parameter
    const INTENT_TYPES = {
        EXACT_NAME: 'exact_name',
        SYMBOL: 'symbol',
        DOCUMENTATION: 'documentation',
        KEYWORD: 'keyword',
        DESCRIPTION: 'description',
    };
    
    if (intent.type === INTENT_TYPES.EXACT_NAME && intent.confidence > 0.7) {
        if (chunk.name && intent.entities.symbols.some((s: string) => chunk.name!.toLowerCase().includes(s.toLowerCase()))) {
            return 2.0;
        }
    } else if (intent.type === INTENT_TYPES.SYMBOL) {
        if (chunk.type === 'class' || chunk.type === 'method' || chunk.type === 'function') {
            return 1.5;
        }
    } else if (intent.type === INTENT_TYPES.DOCUMENTATION) {
        if (chunk.type === 'comment' || chunk.content.includes('/**') || chunk.content.includes('///')) {
            return 1.5;
        }
    }
    
    return 1.0;
}

/**
 * Расчёт relevance boost на основе файлового кэша
 */
export function calculateRelevanceBoost(
    chunk: Chunk,
    fileRelevanceCache: Map<string, number>
): number {
    const fileRelevance = fileRelevanceCache.get(chunk.filePath);
    return typeof fileRelevance === 'number' ? fileRelevance : 1.0;
}

/**
 * Расчёт полного скора чанка с использованием всех компонентов
 */
export function calculateTotalScore(
    keywordScore: number,
    bm25Score: number,
    similarityScore: number,
    weights: ScoreWeights = { keyword: 1.0, bm25: 0.8, similarity: 0.5 },
    intentBoost: number = 1.0,
    fileTypeBoost: number = 1.0,
    relevanceBoost: number = 1.0
): number {
    const baseScore = 
        (keywordScore * weights.keyword + 
         bm25Score * weights.bm25 + 
         similarityScore * weights.similarity);
    
    return baseScore * intentBoost * fileTypeBoost * relevanceBoost;
}