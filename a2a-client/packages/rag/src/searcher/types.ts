/**
 * RAG Searcher Types
 */

import type { Chunk } from '../chunk-manager.js';
import type { RAGIndexData, IndexFileInfo } from '../indexer.js';
import type { FileRelevanceModel } from '../file-relevance.js';

export interface RAGSearcherConfig {
    projectPath?: string;
    useTFIDF?: boolean;
    /**
     * Optional ML model used to adjust per-file relevance.
     * If not provided, only heuristics are used.
     */
    fileRelevanceModel?: FileRelevanceModel;
}

export interface SearchOptions {
    limit?: number;
    useQueryUnderstanding?: boolean;
    useCodeSimilarity?: boolean;
    useBM25?: boolean;
}

export interface HybridSearchOptions extends SearchOptions {
    keywordWeight?: number;
    tfidfWeight?: number;
    k?: number;
}

export interface SearchResult {
    chunk: Chunk;
    score: number;
    highlights: string[];
}

export interface TFIDFResult {
    id: string;
    score: number;
    chunk?: Chunk;
}

export interface RRFEntry {
    chunk: Chunk;
    score: number;
    highlights: string[];
    keywordRank: number | null;
    keywordScore: number;
    tfidfRank: number | null;
    tfidfScore: number;
}

export interface ExtractedKeywords {
    words: string[];
    techTerms: string[];
    methodNames: string[];
}

export { RAGIndexData, IndexFileInfo };
