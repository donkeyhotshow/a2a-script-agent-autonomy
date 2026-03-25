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
    /**
     * Default TTL for query cache in milliseconds
     * @default undefined (caching disabled)
     */
    queryCacheTTL?: number;
    /**
     * Enable relevance feedback learning from clicks
     * @default true
     */
    relevanceFeedback?: boolean;
}
export interface SearchOptions {
    limit?: number;
    useQueryUnderstanding?: boolean;
    useCodeSimilarity?: boolean;
    useBM25?: boolean;
    /**
     * Enable semantic search (requires embedding provider)
     */
    useSemantic?: boolean;
    /**
     * Weight for semantic results in hybrid search (0-1)
     * @default 0.4
     */
    semanticWeight?: number;
    /**
     * Faceted search filters
     */
    filters?: SearchFilters;
}
/**
 * Faceted search filters
 */
export interface SearchFilters {
    /** File extensions to include (e.g., ['.ts', '.js']) */
    extensions?: string[];
    /** Folder paths to include (e.g., ['src/', 'lib/']) */
    folders?: string[];
    /** Only include files modified after this date (ISO string) */
    modifiedAfter?: string;
    /** Only include files modified before this date (ISO string) */
    modifiedBefore?: string;
    /** Chunk types to include (e.g., ['function', 'class', 'method']) */
    type?: string[];
    /** Minimum file size in bytes */
    minSize?: number;
    /** Maximum file size in bytes */
    maxSize?: number;
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
