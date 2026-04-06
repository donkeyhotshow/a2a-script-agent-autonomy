/**
 * Unit tests for output-shaping helpers (used by searchWithProtocol).
 */

import { describe, it, expect } from 'vitest';
import type { SearchResult } from './types.js';
import {
    shapeOutput,
    paginateResults,
    filterByDirectories,
    filterByExtensions,
} from './output-shaping.js';

function makeResult(
    filePath: string,
    content: string,
    score: number,
    startLine = 1,
    endLine = 1
): SearchResult {
    return {
        chunk: {
            id: `${filePath}:${startLine}`,
            filePath,
            type: 'function',
            name: 'x',
            content,
            startLine,
            endLine,
        },
        score,
        highlights: [],
    };
}

describe('shapeOutput', () => {
    it('maps SearchResult[] to protocol results with query', () => {
        const raw: SearchResult[] = [
            makeResult('src/a.ts', 'export const foo = 1', 0.9, 1, 2),
            makeResult('src/b.ts', 'const bar = 2', 0.5, 3, 3),
        ];
        const out = shapeOutput(raw, { query: 'foo', maxResults: 10 });
        expect(out.query).toBe('foo');
        expect(out.results).toHaveLength(2);
        expect(out.files).toEqual(['src/a.ts', 'src/b.ts']);
        expect(out.results[0].score).toBe(0.9);
        expect(out.results[0].matches.length).toBeGreaterThan(0);
    });
});

describe('paginateResults', () => {
    it('slices page 2 and reports totals', () => {
        const r = [makeResult('a.ts', '1', 1), makeResult('b.ts', '2', 1), makeResult('c.ts', '3', 1)];
        const p = paginateResults(r, 2, 2);
        expect(p.currentPage).toBe(2);
        expect(p.totalResults).toBe(3);
        expect(p.totalPages).toBe(2);
        expect(p.results).toHaveLength(1);
        expect(p.results[0].chunk.filePath).toBe('c.ts');
    });
});

describe('filterByDirectories', () => {
    it('strips leading slash on allowed dir', () => {
        const r = [
            makeResult('src/x.ts', 'a', 1),
            makeResult('lib/y.ts', 'b', 1),
        ];
        expect(filterByDirectories(r, ['/src'])).toHaveLength(1);
        expect(filterByDirectories(r, ['/src'])[0].chunk.filePath).toBe('src/x.ts');
    });
});

describe('filterByExtensions', () => {
    it('accepts extensions with or without dot', () => {
        const r = [makeResult('a.ts', 'x', 1), makeResult('b.js', 'y', 1), makeResult('c.md', 'z', 1)];
        const ts = filterByExtensions(r, ['ts', '.JS']);
        expect(ts.map((x) => x.chunk.filePath).sort()).toEqual(['a.ts', 'b.js']);
    });
});
