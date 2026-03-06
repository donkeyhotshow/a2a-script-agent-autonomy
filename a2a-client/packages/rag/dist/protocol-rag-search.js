"use strict";
/**
 * result["rag-search"] shape for protocol – implementation.
 * Task: tasks/client/03-rag-package-simulation-and-policy-alignment.md
 *
 * ✅ IMPLEMENTED: transform search results to { results: [{ file, path, score, matches, metadata }], files?: string[], query? }
 * ✅ IMPLEMENTED: policy: max results, allowed dirs/extensions (Task 39)
 * ✅ IMPLEMENTED: improved snippet generation with semantic context
 * @see docs/new-request-flow/PROTOCOL.md#action-key-shape-обязательно
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRagSearchResult = toRagSearchResult;
const snippet_generator_js_1 = require("./searcher/snippet-generator.js");
/**
 * Transform RAG search output to result["rag-search"] shape for simulations.
 * Implements Task 03: protocol result mapping with policy integration.
 * Uses improved snippet generation with semantic context.
 */
function toRagSearchResult(rawResults, options) {
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
    const fileMap = new Map();
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
    // Transform to protocol format with improved snippets
    const query = options?.query ?? '';
    const snippetConfig = options?.snippetConfig;
    const results = finalResults.map(result => {
        // Use improved snippet generator
        const snippets = (0, snippet_generator_js_1.generateSnippets)({
            id: `${result.chunk.filePath}:${result.chunk.startLine ?? 0}`,
            filePath: result.chunk.filePath,
            type: 'unknown',
            content: result.chunk.content,
            startLine: result.chunk.startLine ?? 1,
            endLine: result.chunk.endLine,
        }, query, result.score, snippetConfig);
        // Map snippets to protocol format
        const matches = snippets.map(s => ({
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
function filePathToExtension(filePath) {
    const ext = filePath.split('.').pop();
    return ext ? ext.toLowerCase() : '';
}
