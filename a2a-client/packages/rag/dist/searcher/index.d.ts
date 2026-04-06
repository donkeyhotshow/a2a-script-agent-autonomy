/**
 * RAG Searcher - Main Entry Point
 * Integrates: TFIDF, QueryUnderstanding, CodeSimilarity, BM25
 *
 * Modules:
 * - rag-searcher.ts - main searcher class
 * - query-planner.ts - query planning and analysis
 * - chunk-pipeline.ts - chunk processing and scoring
 * - ranking-pipeline.ts - result ranking and fusion
 * - output-shaping.ts - output formatting
 */
export * from './types.js';
export { RAGSearcher } from './rag-searcher.js';
export { SearchStrategies } from './search-strategies.js';
export { ResultRanker } from './result-ranker.js';
export { SearchCache } from './caching.js';
export * from './snippet-generator.js';
export type { SuggestionItem } from '../suggestions.js';
export { extractKeywords, analyzeQueryIntent, planSearchStrategy, calculateFileTypeBoost, INTENT_TYPES } from './query-planner.js';
export { matchesFilters, scoreChunk, getChunkId, createCandidateSet, findHighlights, getFileExtension, matchPattern, isCandidateChunk } from './chunk-pipeline.js';
export { calculateRRFScore, fuseResultsWithRRF, groupByFile, sortAndLimitResults, calculateTotalScore } from './ranking-pipeline.js';
export { shapeOutput, paginateResults, filterByDirectories, filterByExtensions, limitFiles, createSnippets, formatForDisplay } from './output-shaping.js';
