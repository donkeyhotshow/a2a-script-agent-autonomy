/**
 * Tests for toRagSearchResult function
 */

import { toRagSearchResult } from './protocol-rag-search.js';

describe('toRagSearchResult', () => {
    const mockResults = [
        {
            chunk: {
                filePath: 'src/auth.js',
                content: 'async function login(email, password) { const isValid = await bcrypt.compare(password, storedHash); }',
                startLine: 10,
                endLine: 15
            },
            score: 0.95,
            highlights: ['async function login(email, password)', 'const isValid = await bcrypt.compare(password, storedHash)']
        },
        {
            chunk: {
                filePath: 'src/auth.js',
                content: 'async function register(email, password) { const hashedPassword = await bcrypt.hash(password, 10); }',
                startLine: 20,
                endLine: 25
            },
            score: 0.92,
            highlights: ['async function register(email, password)', 'const hashedPassword = await bcrypt.hash(password, 10)']
        },
        {
            chunk: {
                filePath: 'src/middleware/auth.ts',
                content: 'export function verifyToken(token: string): TokenPayload { return jwt.verify(token, JWT_SECRET) as TokenPayload; }',
                startLine: 5,
                endLine: 10
            },
            score: 0.87,
            highlights: ['export function verifyToken(token: string)', 'return jwt.verify(token, JWT_SECRET) as TokenPayload']
        },
        {
            chunk: {
                filePath: 'src/utils/jwt.js',
                content: 'const jwt = require("jsonwebtoken"); const JWT_SECRET = process.env.JWT_SECRET;',
                startLine: 1,
                endLine: 5
            },
            score: 0.82,
            highlights: ['const jwt = require("jsonwebtoken")', 'const JWT_SECRET = process.env.JWT_SECRET']
        }
    ];

    it('should transform results to protocol format', () => {
        const result = toRagSearchResult(mockResults, { query: 'auth system' });

        expect(result).toHaveProperty('results');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('query', 'auth system');
        expect(result.results).toHaveLength(3); // Grouped by file: auth.js, auth.ts, jwt.js
        expect(result.files).toHaveLength(3);

        expect(result.results[0].file).toBe('src/auth.js');
        expect(result.results[0].path).toBe('src/auth.js');
        expect(result.results[0].score).toBe(0.95);
        expect(result.results[0].matches?.length).toBeGreaterThan(0);
    });

    it('should paginate with page, pageSize, total, hasMore', () => {
        const result = toRagSearchResult(mockResults, {
            query: 'q',
            page: 1,
            pageSize: 2,
            maxResults: 10
        });

        expect(result.results).toHaveLength(2);
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(2);
        expect(result.total).toBe(3);
        expect(result.hasMore).toBe(true);
    });

    it('should return hasMore false on last page', () => {
        const result = toRagSearchResult(mockResults, {
            page: 2,
            pageSize: 2,
            maxResults: 10
        });

        expect(result.results).toHaveLength(1);
        expect(result.hasMore).toBe(false);
    });

    it('should limit number of results', () => {
        const result = toRagSearchResult(mockResults, { maxResults: 2 });

        expect(result.results).toHaveLength(2);
        expect(result.files).toHaveLength(2);
    });

    it('should limit number of files', () => {
        const result = toRagSearchResult(mockResults, { maxFiles: 2 });

        expect(result.files).toHaveLength(2);
        expect(result.results).toHaveLength(2);
    });

    it('should filter by allowed directories', () => {
        const result = toRagSearchResult(mockResults, { 
            allowedDirs: ['src/auth.js'] 
        });

        expect(result.files).toHaveLength(1);
        expect(result.files[0]).toBe('src/auth.js');
    });

    it('should filter by allowed extensions', () => {
        const result = toRagSearchResult(mockResults, { 
            allowedExtensions: ['js'] 
        });

        expect(result.files).toHaveLength(2); // auth.js, jwt.js (auth.ts filtered out)
        expect(result.files).toContain('src/auth.js');
        expect(result.files).toContain('src/utils/jwt.js');
        expect(result.files).not.toContain('src/middleware/auth.ts');
    });

    it('should group by file and take best result', () => {
        const duplicateResults = [
            ...mockResults,
            {
                chunk: {
                    filePath: 'src/auth.js',
                    content: 'another auth function',
                    startLine: 30,
                    endLine: 35
                },
                score: 0.50,
                highlights: ['another auth function']
            }
        ];

        const result = toRagSearchResult(duplicateResults, { maxFiles: 3 });

        // Should only have one result for src/auth.js (the highest scoring one)
        const authResults = result.results.filter(r => r.file === 'src/auth.js');
        expect(authResults).toHaveLength(1);
        expect(authResults[0].score).toBe(0.95);
    });

    it('should handle empty results', () => {
        const result = toRagSearchResult([], { query: 'empty test' });

        expect(result.results).toHaveLength(0);
        expect(result.files).toHaveLength(0);
        expect(result.query).toBe('empty test');
    });

    it('should use default values when options not provided', () => {
        const result = toRagSearchResult(mockResults);

        expect(result.results).toHaveLength(3); // Grouped by file
        expect(result.files).toHaveLength(3);
        expect(result.query).toBeUndefined();
    });

    it('should handle a single raw chunk', () => {
        const one = [mockResults[0]];
        const result = toRagSearchResult(one, { query: 'x' });
        expect(result.results).toHaveLength(1);
        expect(result.files).toEqual(['src/auth.js']);
        expect(result.results[0].score).toBe(0.95);
    });

    it('should return empty page when page is past end', () => {
        const result = toRagSearchResult(mockResults, {
            query: 'q',
            page: 10,
            pageSize: 2,
            maxResults: 10,
        });
        expect(result.total).toBe(3);
        expect(result.results).toHaveLength(0);
        expect(result.files).toHaveLength(0);
        expect(result.hasMore).toBe(false);
    });

    it('should tolerate missing startLine and endLine on chunk', () => {
        const raw = [
            {
                chunk: {
                    filePath: 'bare.txt',
                    content: 'hello world',
                },
                score: 0.5,
            },
        ];
        const result = toRagSearchResult(raw, { query: 'hello' });
        expect(result.results).toHaveLength(1);
        expect(result.results[0].file).toBe('bare.txt');
        expect(result.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should break ties on duplicate filePath by keeping highest score only', () => {
        const dup = [
            {
                chunk: { filePath: 'same.ts', content: 'a', startLine: 1, endLine: 1 },
                score: 0.9,
            },
            {
                chunk: { filePath: 'same.ts', content: 'b', startLine: 2, endLine: 2 },
                score: 0.9,
            },
        ];
        const result = toRagSearchResult(dup, { query: 'q' });
        expect(result.results).toHaveLength(1);
        expect(result.results[0].score).toBe(0.9);
    });
});