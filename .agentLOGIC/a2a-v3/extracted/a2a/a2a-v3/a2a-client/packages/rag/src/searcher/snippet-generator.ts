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

const DEFAULT_CONFIG: SnippetConfig = {
    contextLinesBefore: 3,
    contextLinesAfter: 3,
    maxSnippetLength: 20,
    mergeDistance: 5,
};

/**
 * Extract keywords from query for highlighting
 */
function extractSearchTerms(query: string): string[] {
    const stopWords = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of',
        'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'and',
        'or', 'but', 'how', 'what', 'where', 'when', 'why', 'who',
    ]);

    return query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));
}

/**
 * Find all matching lines for given terms in content
 */
function findMatchingLines(content: string, terms: string[]): Map<number, string[]> {
    const lines = content.split('\n');
    const matches = new Map<number, string[]>();

    for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase();
        const matchedTerms: string[] = [];

        for (const term of terms) {
            if (lineLower.includes(term)) {
                matchedTerms.push(term);
            }
        }

        if (matchedTerms.length > 0) {
            matches.set(i + 1, matchedTerms); // 1-based line numbers
        }
    }

    return matches;
}

/**
 * Expand snippet to semantic boundaries (function/class start/end)
 */
function expandToSemanticBoundaries(
    lines: string[],
    startIdx: number,
    endIdx: number,
    fileExt: string
): { startIdx: number; endIdx: number } {
    let newStart = startIdx;
    let newEnd = endIdx;

    // Look backward for function/class/comment start
    const blockStartPatterns = [
        /^\s*(function|class|interface|type|const|let|var|async\s+function)\s/,
        /^\s*(public|private|protected|static|async)\s/,
        /^\s*\/\*\*/,  // JSDoc comment
        /^\s*#+\s/,    // Markdown header
    ];

    for (let i = startIdx; i >= 0; i--) {
        const line = lines[i];
        if (blockStartPatterns.some(p => p.test(line))) {
            newStart = i;
            break;
        }
        // Stop at empty lines after comments
        if (line.trim() === '' && i < startIdx - 1) {
            newStart = i + 1;
            break;
        }
    }

    // Look forward for block end (closing brace or double newline)
    let braceCount = 0;
    let inBlock = false;

    for (let i = startIdx; i < lines.length && i < endIdx + 20; i++) {
        const line = lines[i];

        // Count braces for JS/PHP/CSS
        if (fileExt.match(/\.(js|ts|php|css|scss)$/)) {
            const openBraces = (line.match(/\{/g) || []).length;
            const closeBraces = (line.match(/\}/g) || []).length;

            if (!inBlock && openBraces > 0) {
                inBlock = true;
            }

            braceCount += openBraces - closeBraces;

            if (inBlock && braceCount === 0 && i > startIdx) {
                newEnd = Math.min(i + 1, lines.length);
                break;
            }
        }

        // Double newline indicates end of block
        if (i > endIdx && line.trim() === '' && lines[i - 1]?.trim() === '') {
            newEnd = i;
            break;
        }
    }

    return { startIdx: newStart, endIdx: newEnd };
}

/**
 * Merge overlapping or close snippet ranges
 */
function mergeRanges(
    ranges: Array<{ start: number; end: number; terms: string[] }>,
    mergeDistance: number
): Array<{ start: number; end: number; terms: string[] }> {
    if (ranges.length === 0) return [];

    // Sort by start line
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number; terms: string[] }> = [];

    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];

        // Merge if overlapping or close enough
        if (next.start <= current.end + mergeDistance) {
            current.end = Math.max(current.end, next.end);
            current.terms = Array.from(new Set(current.terms.concat(next.terms)));
        } else {
            merged.push(current);
            current = next;
        }
    }

    merged.push(current);
    return merged;
}

/**
 * Generate highlight snippet with proper context
 */
function createHighlightSnippet(
    lines: string[],
    startIdx: number,
    endIdx: number,
    matchedTerms: string[],
    score: number
): SnippetMatch {
    const snippetLines = lines.slice(startIdx, endIdx);

    // Find the most relevant line for highlight preview
    const contentLower = snippetLines.join('\n').toLowerCase();
    let bestTerm = matchedTerms[0] || '';
    let bestIndex = -1;

    for (const term of matchedTerms) {
        const idx = contentLower.indexOf(term);
        if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
            bestIndex = idx;
            bestTerm = term;
        }
    }

    // Create preview around the first match
    let highlight = '';
    if (bestIndex !== -1) {
        const content = snippetLines.join('\n');
        const matchStart = Math.max(0, content.toLowerCase().indexOf(bestTerm));
        const contextStart = Math.max(0, matchStart - 60);
        const contextEnd = Math.min(content.length, matchStart + bestTerm.length + 60);
        highlight = content.slice(contextStart, contextEnd).replace(/\n/g, ' ');
    }

    return {
        line_start: startIdx + 1,
        line_end: Math.min(endIdx, lines.length),
        content: snippetLines.join('\n'),
        highlight: highlight || snippetLines[0] || '',
        context_score: score,
        matched_terms: matchedTerms,
    };
}

/**
 * Generate improved snippets for a search result
 */
export function generateSnippets(
    chunk: Chunk,
    query: string,
    score: number,
    config: SnippetConfig = {}
): SnippetMatch[] {
    const opts = { ...DEFAULT_CONFIG, ...config };
    const terms = extractSearchTerms(query);

    if (terms.length === 0) {
        // Return first N lines if no specific terms
        const lines = chunk.content.split('\n');
        const endLine = Math.min(opts.maxSnippetLength!, lines.length);
        return [{
            line_start: 1,
            line_end: endLine,
            content: lines.slice(0, endLine).join('\n'),
            highlight: lines[0] || '',
            context_score: score,
            matched_terms: [],
        }];
    }

    const lines = chunk.content.split('\n');
    const matchingLines = findMatchingLines(chunk.content, terms);

    if (matchingLines.size === 0) {
        // No direct matches - return start of chunk
        const endLine = Math.min(opts.maxSnippetLength!, lines.length);
        return [{
            line_start: 1,
            line_end: endLine,
            content: lines.slice(0, endLine).join('\n'),
            highlight: lines[0] || '',
            context_score: score * 0.5, // Reduced score for non-direct match
            matched_terms: [],
        }];
    }

    // Build initial ranges from matching lines
    const ranges: Array<{ start: number; end: number; terms: string[] }> = [];

    for (const [lineNum, matchedTerms] of Array.from(matchingLines.entries())) {
        const start = Math.max(0, lineNum - 1 - opts.contextLinesBefore!);
        const end = Math.min(lines.length, lineNum - 1 + opts.contextLinesAfter! + 1);
        ranges.push({ start, end, terms: matchedTerms });
    }

        // Merge overlapping ranges
    const mergedRanges = mergeRanges(ranges, opts.mergeDistance!);

    // Expand to semantic boundaries
    const fileExt = chunk.filePath.split('.').pop() || '';
    const semanticRanges = mergedRanges.map(r => {
        const expanded = expandToSemanticBoundaries(lines, r.start, r.end, fileExt);
        return { startIdx: expanded.startIdx, endIdx: expanded.endIdx, terms: r.terms };
    });

    // Limit total snippet length
    let totalLines = 0;
    const limitedRanges: typeof semanticRanges = [];

    for (const r of semanticRanges) {
        const rangeLines = r.endIdx - r.startIdx;
        if (totalLines + rangeLines > opts.maxSnippetLength! && limitedRanges.length > 0) {
            break;
        }
        limitedRanges.push(r);
        totalLines += rangeLines;
    }

    // Create snippets
    return limitedRanges.map(r =>
        createHighlightSnippet(lines, r.startIdx, r.endIdx, r.terms, score)
    );
}

/**
 * Batch generate snippets for multiple search results
 */
export function generateSnippetsBatch(
    results: Array<{ chunk: Chunk; score: number }>,
    query: string,
    config?: SnippetConfig
): SnippetResult[] {
    return results.map(r => ({
        chunk: r.chunk,
        score: r.score,
        snippets: generateSnippets(r.chunk, query, r.score, config),
    }));
}
