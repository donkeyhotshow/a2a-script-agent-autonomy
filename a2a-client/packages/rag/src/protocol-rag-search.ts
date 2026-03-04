/**
 * result["rag-search"] shape for protocol – implementation.
 * Task: tasks/client/03-rag-package-simulation-and-policy-alignment.md
 *
 * ✅ IMPLEMENTED: transform search results to { results: [{ file, path, score, matches, metadata }], files?: string[], query? }
 * ✅ IMPLEMENTED: policy: max results, allowed dirs/extensions (Task 39)
 * @see docs/new-request-flow/PROTOCOL.md#action-key-shape-обязательно
 */

export interface RagSearchMatch {
    line_start: number;
    line_end: number;
    content: string;
    highlight: string;
    context_score: number;
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
}

/** 
 * Transform RAG search output to result["rag-search"] shape for simulations.
 * Implements Task 03: protocol result mapping with policy integration.
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
        highlights: string[];
    }>,
    options?: { 
        query?: string; 
        maxFiles?: number;
        allowedDirs?: string[];
        allowedExtensions?: string[];
        maxResults?: number;
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
    
    // Convert to array and apply limits
    const fileResults = Array.from(fileMap.values());
    
    // Apply result limit (after grouping)
    const limitedResults = fileResults.slice(0, maxResults);
    
    // Apply file limit (should be same as result limit after grouping)
    const finalResults = limitedResults.slice(0, maxFiles);

    // Transform to protocol format with matches
    const results: RagSearchResultEntry[] = finalResults.map(result => {
        // Build matches array from highlights
        const matches: RagSearchMatch[] = result.highlights.map((highlight, idx) => ({
            line_start: result.chunk.startLine ?? (idx * 10 + 1),
            line_end: result.chunk.endLine ?? (idx * 10 + 10),
            content: result.chunk.content,
            highlight: highlight,
            context_score: result.score,
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

    // Extract unique file paths (limited to final results)
    const files = finalResults.map(result => result.chunk.filePath);

    return {
        results,
        files,
        query: options?.query
    };
}

/**
 * Extract file extension from path
 */
function filePathToExtension(filePath: string): string {
    const ext = filePath.split('.').pop();
    return ext ? ext.toLowerCase() : '';
}
