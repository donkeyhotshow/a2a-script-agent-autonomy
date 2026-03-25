/**
 * result["rag-search"] shape for protocol – implementation.
 * Task: tasks/client/03-rag-package-simulation-and-policy-alignment.md
 *
 * ✅ IMPLEMENTED: transform search results to { results: [{ file, path, score, matches, metadata }], files?: string[], query? }
 * ✅ IMPLEMENTED: policy: max results, allowed dirs/extensions (Task 39)
 * ✅ IMPLEMENTED: improved snippet generation with semantic context
 * @see docs/new-request-flow/PROTOCOL.md#action-key-shape-обязательно
 */
import { type SnippetConfig } from './searcher/snippet-generator.js';
export interface RagSearchMatch {
    line_start: number;
    line_end: number;
    content: string;
    highlight: string;
    context_score: number;
    matched_terms?: string[];
}
export interface RagSearchResultMetadata {
    framework: string;
    type: string;
    last_modified: string;
}
export interface RagSearchResultEntry {
    file: string;
    path: string;
    score: number;
    matches: RagSearchMatch[];
    metadata?: RagSearchResultMetadata;
}
export interface RagSearchProtocolResult {
    results: RagSearchResultEntry[];
    files?: string[];
    query?: string;
    /** Set when `page` or `pageSize` is passed in options (ISSUE 9). */
    page?: number;
    pageSize?: number;
    /** Total rows in the capped pool (after maxResults, before paging). */
    total?: number;
    hasMore?: boolean;
}
/**
 * Transform RAG search output to result["rag-search"] shape for simulations.
 * Implements Task 03: protocol result mapping with policy integration.
 * Uses improved snippet generation with semantic context.
 */
export declare function toRagSearchResult(rawResults: Array<{
    chunk: {
        filePath: string;
        content: string;
        startLine?: number;
        endLine?: number;
    };
    score: number;
    highlights?: string[];
}>, options?: {
    query?: string;
    maxFiles?: number;
    allowedDirs?: string[];
    allowedExtensions?: string[];
    maxResults?: number;
    snippetConfig?: SnippetConfig;
    /** 1-based page; enables pagination metadata when set with or without pageSize. */
    page?: number;
    pageSize?: number;
}): RagSearchProtocolResult;
