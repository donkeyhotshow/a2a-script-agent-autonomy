/**
 * File relevance scoring for RAG indexing/search.
 * Combines lightweight heuristics with optional ML model hook.
 */
export type FileRelevanceLabel = 'important' | 'normal' | 'low' | 'ignore-candidate';
export interface FileRelevanceFeatures {
    /** Project-relative path (POSIX-style, `/`-separated) */
    relativePath: string;
    /** File extension including dot, e.g. ".ts" */
    ext: string;
    /** File size in bytes */
    size: number;
}
export interface FileRelevanceScore {
    /** Final relevance multiplier in range ~[0.2, 1.2] */
    relevance: number;
    /** Discrete label for easier filtering */
    label: FileRelevanceLabel;
    /** Human-readable reasons used to build this score */
    reasons: string[];
}
/**
 * Optional ML model interface.
 * Implementations can be trained on a dataset of project files
 * and plugged into the scorer via RAG config.
 */
export interface FileRelevanceModel {
    /**
     * Return value should be in [0, 1], where:
     *  - 1.0 = highly relevant
     *  - 0.0 = should almost certainly be ignored
     */
    predict(features: FileRelevanceFeatures): number;
}
/**
 * Main scoring entrypoint.
 * If ML model is provided, its prediction is blended with heuristics.
 */
export declare function scoreFileRelevance(features: FileRelevanceFeatures, model?: FileRelevanceModel): FileRelevanceScore;
