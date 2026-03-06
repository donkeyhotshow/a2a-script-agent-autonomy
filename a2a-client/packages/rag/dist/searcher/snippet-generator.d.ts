/**
 * Snippet Generator - Creates improved code snippets for search results
 * Provides semantic context, proper line ranges, and merged highlights
 */
import type { Chunk } from '../chunk-manager.js';
export interface SnippetConfig {
    contextLinesBefore?: number;
    contextLinesAfter?: number;
    maxSnippetLength?: number;
    mergeDistance?: number;
}
export interface SnippetMatch {
    line_start: number;
    line_end: number;
    content: string;
    highlight: string;
    context_score: number;
    matched_terms: string[];
}
export interface SnippetResult {
    chunk: Chunk;
    snippets: SnippetMatch[];
    score: number;
}
/**
 * Generate improved snippets for a search result
 */
export declare function generateSnippets(chunk: Chunk, query: string, score: number, config?: SnippetConfig): SnippetMatch[];
/**
 * Batch generate snippets for multiple search results
 */
export declare function generateSnippetsBatch(results: Array<{
    chunk: Chunk;
    score: number;
}>, query: string, config?: SnippetConfig): SnippetResult[];
