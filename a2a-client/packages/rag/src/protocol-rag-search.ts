/**
 * result["rag-search"] shape for protocol – implementation.
 * Task: tasks/client/03-rag-package-simulation-and-policy-alignment.md
 *
 * ✅ IMPLEMENTED: transform search results to { results: [{ file, path, score, matches, metadata }], files?: string[], query? }
 * ✅ IMPLEMENTED: policy: max results, allowed dirs/extensions (Task 39)
 * ✅ IMPLEMENTED: improved snippet generation with semantic context
 * @see docs/new-request-flow/PROTOCOL.md#action-key-shape-обязательно
 */

import { generateSnippets, type SnippetConfig } from './searcher/snippet-generator.js';

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
export function toRagSearchResult(
    rawResults: Array<{
        chunk: {
            filePath: string;
            content: string;
            startLine?: number;
            endLine?: number;
        };
        score: number;
        highlights?: string[];
    }>,
    options?: {
        query?: string;
        maxFiles?: number;
        allowedDirs?: string[];
        allowedExtensions?: string[];
        maxResults?: number;
        snippetConfig?: SnippetConfig;
        /** 1-based page; enables pagination metadata when set with or without pageSize. */
        page?: number;
        pageSize?: number;
    }
): RagSearchProtocolResult {
    // Apply policy limits
    const maxResults = options?.maxResults ?? 20;
    const maxFiles = options?.maxFiles ?? 10;
    const allowedDirs = options?.allowedDirs ?? [];
    const allowedExtensions = options?.allowedExtensions ?? [];

    // Filter results based on policy
    let filteredResults = rawResults;

    // Filter by allowed directories
    if (allowedDirs.length > 0) {
        filteredResults = filteredResults.filter(result => {
            const filePath = result.chunk.filePath;
            return allowedDirs.some(allowedDir => filePath.startsWith(allowedDir));
        });
    }

    // Filter by allowed extensions
    if (allowedExtensions.length > 0) {
        filteredResults = filteredResults.filter(result => {
            const ext = filePathToExtension(result.chunk.filePath);
            return allowedExtensions.includes(ext);
        });
    }

    // Sort by score
    const sortedResults = filteredResults.sort((a, b) => b.score - a.score);

    // Group by file and take best result per file
    const fileMap = new Map<string, typeof sortedResults[0]>();
    for (const result of sortedResults) {
        const filePath = result.chunk.filePath;
        const existing = fileMap.get(filePath);
        if (!existing || result.score > existing.score) {
            fileMap.set(filePath, result);
        }
    }

    const fileResults = Array.from(fileMap.values());
    const pool = fileResults.slice(0, maxResults);

    const usePagination = options?.page != null || options?.pageSize != null;
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = options?.pageSize ?? maxResults;

    let windowed = pool;
    let total: number | undefined;
    let hasMore: boolean | undefined;
    let outPage: number | undefined;
    let outPageSize: number | undefined;

    if (usePagination) {
        total = pool.length;
        outPage = page;
        outPageSize = pageSize;
        const start = (page - 1) * pageSize;
        windowed = pool.slice(start, start + pageSize);
        hasMore = start + windowed.length < total;
    }

    const finalResults = windowed.slice(0, maxFiles);

    // Transform to protocol format with improved snippets
    const query = options?.query ?? '';
    const snippetConfig = options?.snippetConfig;

    const results: RagSearchResultEntry[] = finalResults.map(result => {
        // Use improved snippet generator
        const snippets = generateSnippets(
            {
                id: `${result.chunk.filePath}:${result.chunk.startLine ?? 0}`,
                filePath: result.chunk.filePath,
                type: 'unknown',
                content: result.chunk.content,
                startLine: result.chunk.startLine ?? 1,
                endLine: result.chunk.endLine,
            },
            query,
            result.score,
            snippetConfig
        );

        // Map snippets to protocol format
        const matches: RagSearchMatch[] = snippets.map(s => ({
            line_start: s.line_start,
            line_end: s.line_end,
            content: s.content,
            highlight: s.highlight,
            context_score: s.context_score,
            matched_terms: s.matched_terms,
        }));

        return {
            file: result.chunk.filePath,
            path: result.chunk.filePath,
            score: result.score,
            matches: matches,
            metadata: {
                framework: '',
                type: filePathToExtension(result.chunk.filePath),
                last_modified: '',
            },
        };
    });

    const files = finalResults.map(result => result.chunk.filePath);

    const base: RagSearchProtocolResult = {
        results,
        files,
        query: options?.query
    };

    if (usePagination) {
        base.page = outPage;
        base.pageSize = outPageSize;
        base.total = total;
        base.hasMore = hasMore;
    }

    return base;
}

/**
 * Extract file extension from path
 */
function filePathToExtension(filePath: string): string {
    const ext = filePath.split('.').pop();
    return ext ? ext.toLowerCase() : '';
}
