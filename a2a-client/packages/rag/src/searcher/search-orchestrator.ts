/**
 * Search Orchestrator - Coordinates search operations across multiple engines
 */

import { QueryUnderstandingEngine, INTENT_TYPES } from '../query-understanding.js';
import { CodeSimilarityEngine } from '../code-similarity.js';
import { BM25Scorer } from '../bm25.js';
import { SearchSuggestionsEngine } from '../suggestions.js';
import type { Chunk } from '../chunk-manager.js';
import type { SearchOptions, SearchResult, TFIDFResult } from './types.js';
import { IndexManager } from './index-manager.js';
import { analyzeQueryIntent, extractKeywords, calculateFileTypeBoost } from './query-planner.js';
import { scoreChunk, matchesFilters, getChunkId, createCandidateSet, findHighlights, isCandidateChunk } from './chunk-pipeline.js';
import { fuseResultsWithRRF, groupByFile, sortAndLimitResults, calculateTotalScore } from './ranking-pipeline.js';

export class SearchOrchestrator {
    private indexManager: IndexManager;
    private queryUnderstanding: QueryUnderstandingEngine;
    private codeSimilarity: CodeSimilarityEngine;
    private bm25: BM25Scorer | null;
    private suggestions: SearchSuggestionsEngine;

    constructor(
        indexManager: IndexManager,
        queryUnderstanding: QueryUnderstandingEngine,
        codeSimilarity: CodeSimilarityEngine,
        bm25: BM25Scorer | null,
        suggestions: SearchSuggestionsEngine
    ) {
        this.indexManager = indexManager;
        this.queryUnderstanding = queryUnderstanding;
        this.codeSimilarity = codeSimilarity;
        this.bm25 = bm25;
        this.suggestions = suggestions;
    }

    async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        const index = await this.indexManager.loadIndex();

        // Build all indexes once if not built yet
        await this.indexManager.ensureIndexesBuilt({ useBM25: options.useBM25, useCodeSimilarity: options.useCodeSimilarity });

        // Use query planner to analyze query
        const intent = analyzeQueryIntent(query, this.queryUnderstanding);
        const keywords = extractKeywords(query);

        // Get BM25 results first (fast - uses inverted index)
        let bm25Results: Map<string, number> = new Map();
        if (options.useBM25 === true && this.bm25 && this.indexManager.bm25Indexed) {
            const bm25 = this.bm25.search(query, { limit: 500 });
            for (const r of bm25) {
                bm25Results.set(r.docId, r.score);
            }
            console.log('[DEBUG] BM25 candidates:', bm25Results.size);
        }

        // Create candidate set from BM25 results
        const candidateIds = bm25Results.size > 0 ? createCandidateSet(bm25Results) : null;

        // Score chunks - use BM25 candidates as filter for expensive operations
        const results: SearchResult[] = [];

        console.log('[DEBUG] Scoring', index.chunks.length, 'chunks...');
        for (const chunk of index.chunks) {
            // Skip if not in BM25 candidates (only if BM25 is enabled)
            if (!isCandidateChunk(chunk, candidateIds)) {
                continue;
            }

            // Apply faceted filters
            if (options.filters && !matchesFilters(chunk, index, options.filters)) {
                continue;
            }

            // Score using ranking pipeline with multiple engines
            const score = this.scoreChunkWithEngines(chunk, keywords, query, intent, options, bm25Results);
            if (score.totalScore > 0) {
                results.push({
                    chunk,
                    score: score.totalScore,
                    highlights: findHighlights(chunk.content, keywords),
                });
            }
        }

        // Group results by file and keep only the best chunk per file
        const fileGrouped = groupByFile(results);

        // Sort by score and take top N unique files
        const uniqueFileResults = sortAndLimitResults(Array.from(fileGrouped.values()), options.limit ?? 10);

        console.log(`[DEBUG] Found ${results.length} chunks, ${fileGrouped.size} unique files, returning top ${uniqueFileResults.length}`);
        return uniqueFileResults;
    }

    async searchHybrid(query: string, options: SearchOptions = {}): Promise<Array<SearchResult & {
        details: Record<string, number | null>
    }>> {
        const limit = options.limit ?? 10;
        const keywordWeight = 0.5;
        const tfidfWeight = 0.5;

        const [keywordResults, tfidfResults] = await Promise.all([
            this.search(query, { limit: limit * 2 }),
            this.indexManager.searchTFIDF(query, limit * 2),
        ]);

        // Use ranking pipeline for RRF fusion
        return fuseResultsWithRRF(
            keywordResults,
            tfidfResults.map(r => ({ id: r.id, score: r.score, chunk: r.chunk })),
            keywordWeight,
            tfidfWeight,
            limit
        );
    }

    /**
     * Analyze query intent using QueryUnderstandingEngine
     */
    analyzeQuery(query: string) {
        return this.queryUnderstanding.analyze(query);
    }

    /**
     * Get query understanding results
     */
    getQueryIntent(query: string) {
        return this.queryUnderstanding.analyze(query);
    }



    /**
     * Comprehensive scoring using all integrated engines with file type filtering
     * Uses ranking pipeline for score calculation
     */
    private scoreChunkWithEngines(
        chunk: Chunk,
        keywords: any,
        originalQuery: string,
        intent: ReturnType<QueryUnderstandingEngine['analyze']>,
        options: SearchOptions,
        bm25Results?: Map<string, number>
    ): { keywordScore: number; bm25Score: number; similarityScore: number; totalScore: number } {
        let keywordScore = 0;
        let bm25Score = 0;
        let similarityScore = 0;

        // 1. Base keyword scoring - use chunk pipeline
        keywordScore = scoreChunk(chunk, keywords, originalQuery);

        // 2. BM25 scoring - use pre-computed results
        if (options.useBM25 === true && bm25Results) {
            const chunkId = getChunkId(chunk);
            const bm25 = bm25Results.get(chunkId);
            bm25Score = bm25 ? bm25 * 10 : 0;
        }

        // 3. Code similarity scoring - skip if too many chunks (expensive)
        if (options.useCodeSimilarity === true && this.indexManager.similarityIndexed) {
            const similarResults = this.codeSimilarity.findSimilar(originalQuery, { limit: 50, method: 'jaccard' });
            const chunkId = getChunkId(chunk);
            const similarResult = similarResults.find(r => getChunkId(r.chunk) === chunkId);
            similarityScore = similarResult ? similarResult.similarity * 20 : 0;
        }

        // 4. Use query planner for intent-based boosting
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

        // 5. Use query planner for file type boost calculation
        const fileTypeBoost = calculateFileTypeBoost(chunk.filePath, intent);

        // 6. File-level relevance boost (archives, backups, storage, etc.)
        let relevanceBoost = 1.0;
        const index = this.indexManager.index;
        if (index) {
            const fileRelevance = this.indexManager.getFileRelevanceCache().get(chunk.filePath);
            if (typeof fileRelevance === 'number') {
                relevanceBoost = fileRelevance;
            }
        }

        // Use ranking pipeline for total score calculation
        const totalScore = calculateTotalScore(
            keywordScore,
            bm25Score,
            similarityScore,
            { keyword: 1.0, bm25: 0.8, similarity: 0.5 },
            intentBoost,
            fileTypeBoost,
            relevanceBoost
        );

        return { keywordScore, bm25Score, similarityScore, totalScore };
    }
}