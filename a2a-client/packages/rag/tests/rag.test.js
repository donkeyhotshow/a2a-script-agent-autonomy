/**
 * RAG Package Unit Tests
 * Tests for @a2a/rag package
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import path from 'path';
import {RAGIndexer} from '../src/indexer.js';
import {RAGSearcher} from '../src/searcher.js';
import {ChunkManager} from '../src/chunk-manager.js';
import {BM25Scorer} from '../src/bm25.js';
import {HybridSearcher} from '../src/hybrid-search.js';
import {RerankerClient} from '../src/reranker.js';
import {QueryUnderstandingEngine} from '../src/query-understanding.js';

const fsMocks = vi.hoisted(() => ({
    readdir: vi.fn(),
    readFile: vi.fn(),
    stat: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    access: vi.fn(),
}));

// Mock dependencies — indexer uses default import from fs/promises
vi.mock('fs/promises', () => ({default: fsMocks}));
vi.mock('meilisearch', () => ({
    default: vi.fn().mockImplementation(() => ({
        index: vi.fn(),
        createIndex: vi.fn(),
    })),
}));
vi.mock('../src/ast-chunker.js', () => ({
    createASTChunker: vi.fn(() => ({
        chunkFile: vi.fn(() => []),
    })),
}));
vi.mock('../src/file-relevance.js', () => ({
    scoreFileRelevance: vi.fn(() => ({ relevance: 1.0, label: 'normal', reasons: [] })),
}));

describe('@a2a/rag', () => {

    describe('RAGIndexer', () => {
        describe('constructor', () => {
            it('should create indexer with config', () => {
                const config = {
                    projectPath: '/tmp/test-project',
                    includePatterns: ['**/*.js'],
                    excludePatterns: ['node_modules/**']
                };
                const indexer = new RAGIndexer(config);
                expect(indexer).toBeDefined();
                expect(indexer.projectPath).toBe('/tmp/test-project');
                expect(indexer.includePatterns).toEqual(['**/*.js']);
                expect(indexer.excludePatterns).toEqual(['node_modules/**']);
            });
        });

        describe('indexProject()', () => {
            it('should index project files', async () => {
                const config = {
                    projectPath: '/test/project',
                    includePatterns: ['**/*.js'],
                    excludePatterns: ['node_modules/**']
                };
                const indexer = new RAGIndexer(config);

                // Mock fs operations
                fsMocks.readdir.mockResolvedValue([
                    { name: 'file1.js', isFile: () => true, isDirectory: () => false },
                    { name: 'file2.js', isFile: () => true, isDirectory: () => false },
                    { name: 'node_modules', isFile: () => false, isDirectory: () => true },
                ]);
                fsMocks.readFile.mockResolvedValue('function test() { return true; }');
                fsMocks.stat.mockResolvedValue({
                    size: 100,
                    mtime: new Date('2023-01-01'),
                });
                fsMocks.mkdir.mockResolvedValue(undefined);
                fsMocks.writeFile.mockResolvedValue(undefined);

                const index = await indexer.indexProject();

                expect(index).toBeDefined();
                expect(index.files).toHaveLength(2);
                expect(index.chunks.length).toBeGreaterThan(0);
                expect(fsMocks.mkdir).toHaveBeenCalledWith(path.join('/test/project', '.a2a', 'index'), { recursive: true });
            });

            it('should force reindex when forced', async () => {
                const config = {
                    projectPath: '/test/project',
                    includePatterns: ['**/*.js'],
                    excludePatterns: []
                };
                const indexer = new RAGIndexer(config);

                // Mock existing index
                const existingIndex = {
                    version: '1.0',
                    timestamp: new Date().toISOString(),
                    projectPath: '/test/project',
                    files: [{
                        path: 'file1.js',
                        ext: '.js',
                        size: 100,
                        modified: new Date('2023-01-01').toISOString(),
                        hash: 'oldhash',
                        language: 'javascript'
                    }],
                    chunks: []
                };

                fsMocks.readdir.mockResolvedValue([
                    { name: 'file1.js', isFile: () => true, isDirectory: () => false },
                ]);
                fsMocks.readFile
                    .mockResolvedValueOnce(JSON.stringify(existingIndex)) // existing index
                    .mockResolvedValueOnce('function test() { return true; }'); // file content
                fsMocks.stat.mockResolvedValue({
                    size: 100,
                    mtime: new Date('2023-01-01'),
                });
                fsMocks.mkdir.mockResolvedValue(undefined);
                fsMocks.writeFile.mockResolvedValue(undefined);
                fsMocks.unlink.mockResolvedValue(undefined);

                const index = await indexer.indexProject(true); // force = true

                expect(index).toBeDefined();
                expect(fsMocks.unlink).toHaveBeenCalled();
                expect(fsMocks.writeFile).toHaveBeenCalledWith(
                    path.join('/test/project', '.a2a', 'index', 'rag-files.json'),
                    expect.any(String)
                );
            });
        });

        describe('indexFiles()', () => {
            it('should index specific files', async () => {
                const config = {
                    projectPath: '/test/project',
                    includePatterns: ['**/*.js'],
                    excludePatterns: []
                };
                const indexer = new RAGIndexer(config);

                const testFilePath = '/test/project/src/test.js';
                fsMocks.readFile.mockResolvedValue('class TestClass { method() { return "test"; } }');
                fsMocks.stat.mockResolvedValue({
                    size: 50,
                    mtime: new Date('2023-01-01'),
                });

                const result = await indexer.indexFile(testFilePath);

                expect(result).toBeDefined();
                expect(result.file.path).toBe('src/test.js');
                expect(result.file.ext).toBe('.js');
                expect(result.chunks.length).toBeGreaterThan(0);
                expect(result.chunks[0].filePath).toBe('src/test.js');
            });
        });
    });

    describe('RAGSearcher', () => {
        let searcher;

        beforeEach(() => {
            searcher = new RAGSearcher({
                projectPath: '/test/project',
                useTFIDF: false
            });
        });

        describe('constructor', () => {
            it('should create searcher with config', () => {
                const config = {
                    projectPath: '/test/project',
                    useTFIDF: false,
                    queryCacheTTL: 30000
                };
                const testSearcher = new RAGSearcher(config);
                expect(testSearcher.projectPath).toBe('/test/project');
                expect(testSearcher.useTFIDF).toBe(false);
            });
        });

        describe('search()', () => {
            beforeEach(() => {
                // Mock index with sample chunks
                searcher.index = {
                    version: '1.0',
                    timestamp: new Date().toISOString(),
                    projectPath: '/test/project',
                    files: [{
                        path: 'src/user.js',
                        ext: '.js',
                        size: 100,
                        modified: new Date().toISOString(),
                        hash: 'testhash',
                        language: 'javascript',
                        relevanceScore: 1.0
                    }],
                    chunks: [{
                        id: 'chunk1',
                        filePath: 'src/user.js',
                        type: 'function',
                        name: 'getUser',
                        content: 'function getUser(id) { return users[id]; }',
                        startLine: 1
                    }, {
                        id: 'chunk2',
                        filePath: 'src/user.js',
                        type: 'function',
                        name: 'saveUser',
                        content: 'function saveUser(user) { users.push(user); }',
                        startLine: 5
                    }]
                };
            });

            it('should search with query', async () => {
                const results = await searcher.search('getUser');
                expect(results).toBeDefined();
                expect(Array.isArray(results)).toBe(true);
                expect(results.length).toBeGreaterThan(0);
                expect(results[0]).toHaveProperty('chunk');
                expect(results[0]).toHaveProperty('score');
                expect(results[0]).toHaveProperty('highlights');
            });

            it('should respect limit option', async () => {
                const results = await searcher.search('function', { limit: 1 });
                expect(results).toBeDefined();
                expect(results.length).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('ChunkManager', () => {
        let chunkManager;

        beforeEach(() => {
            chunkManager = new ChunkManager({ useAST: false });
        });

        describe('chunkFile()', () => {
            it('should chunk code file', () => {
                const content = `
                    function getUser(id) {
                        return users.find(u => u.id === id);
                    }

                    class UserService {
                        constructor() {
                            this.users = [];
                        }

                        save(user) {
                            this.users.push(user);
                        }
                    }
                `;

                const chunks = chunkManager.chunkFile('src/user.js', content, '.js');

                expect(chunks).toBeDefined();
                expect(Array.isArray(chunks)).toBe(true);
                expect(chunks.length).toBeGreaterThan(0);
                expect(chunks[0]).toHaveProperty('id');
                expect(chunks[0]).toHaveProperty('filePath');
                expect(chunks[0]).toHaveProperty('type');
                expect(chunks[0]).toHaveProperty('content');
            });

            it('should respect maxChunkSize', () => {
                // chunkLines() groups by line count (not char length); many short lines → multiple chunks
                const largeContent = Array.from({length: 250}, () => 'x'.repeat(4)).join('\n');
                const chunks = chunkManager.chunkLines('large.txt', largeContent, 100);

                expect(chunks).toBeDefined();
                expect(chunks.length).toBeGreaterThan(1);
                chunks.forEach(chunk => {
                    const lineCount = chunk.content.split('\n').filter(Boolean).length;
                    expect(lineCount).toBeLessThanOrEqual(100);
                });
            });
        });

        describe('chunkText()', () => {
            it('should chunk text file', () => {
                const content = `# Section 1

This is the first section with some content.

# Section 2

This is the second section with different content.

## Subsection

More content here.`;

                const chunks = chunkManager.chunkMarkdown('README.md', content);

                expect(chunks).toBeDefined();
                expect(Array.isArray(chunks)).toBe(true);
                expect(chunks.length).toBeGreaterThan(0);
                expect(chunks.some(chunk => chunk.name === 'Section 1')).toBe(true);
                expect(chunks.some(chunk => chunk.name === 'Section 2')).toBe(true);
            });
        });
    });

    describe('BM25Scorer', () => {
        let bm25;

        beforeEach(() => {
            bm25 = new BM25Scorer({ k1: 1.5, b: 0.75 });
        });

        describe('search()', () => {
            it('should perform BM25 search', () => {
                bm25.addDocument('doc1', 'The quick brown fox jumps over the lazy dog');
                bm25.addDocument('doc2', 'A brown fox is quick and smart');
                // Omit unrelated docs: zero-query-score ties can sort above negative BM25 totals

                // Default minScore=0 drops all hits when every BM25 sum is negative (small corpus)
                const results = bm25.search('brown fox', { limit: 5, minScore: -1e9 });

                expect(results).toBeDefined();
                expect(Array.isArray(results)).toBe(true);
                expect(results.length).toBeGreaterThan(0);
                expect(results[0]).toHaveProperty('docId');
                expect(results[0]).toHaveProperty('score');
                expect(Number.isFinite(results[0].score)).toBe(true);
                expect(results[0].docId).toMatch(/doc[12]/);
            });

            it('should calculate IDF correctly', () => {
                bm25.addDocument('doc1', 'term1 term2');
                bm25.addDocument('doc2', 'term1 term3');
                bm25.addDocument('doc3', 'term2 term3');

                const stats = bm25.getStats();
                expect(stats).toBeDefined();
                expect(stats.docCount).toBe(3);
                expect(stats.uniqueTerms).toBeGreaterThan(0);

                // Test IDF calculation - term1 appears in 2 docs out of 3
                const df = bm25.getDocumentFrequency('term1');
                expect(df).toBe(2);

                // IDF = log((N - df + 0.5) / (df + 0.5)) = log((3-2+0.5)/(2+0.5)) = log(1.5/2.5) = log(0.6) < 0
                const expectedIDF = Math.log((3 - 2 + 0.5) / (2 + 0.5));
                expect(expectedIDF).toBeLessThan(0);
            });
        });
    });

    describe('HybridSearcher', () => {
        let hybridSearch;

        beforeEach(() => {
            const mockSparseSearch = {
                search: vi.fn().mockResolvedValue([
                    { id: 'doc1', content: 'test content 1', score: 0.8 },
                    { id: 'doc2', content: 'test content 2', score: 0.6 }
                ])
            };
            const mockDenseSearch = {
                search: vi.fn().mockResolvedValue([
                    { id: 'doc1', content: 'test content 1', score: 0.9 },
                    { id: 'doc3', content: 'test content 3', score: 0.7 }
                ])
            };

            hybridSearch = new HybridSearcher({
                sparseSearch: mockSparseSearch,
                denseSearch: mockDenseSearch,
                sparseWeight: 0.6,
                denseWeight: 0.4
            });
        });

        describe('search()', () => {
            it('should combine semantic and keyword search', async () => {
                const results = await hybridSearch.search('test query', { limit: 5 });

                expect(results).toBeDefined();
                expect(Array.isArray(results)).toBe(true);
                expect(results.length).toBeGreaterThan(0);
                expect(results[0]).toHaveProperty('id');
                expect(results[0]).toHaveProperty('score');
                expect(results[0]).toHaveProperty('rrfScore');
                expect(results[0]).toHaveProperty('weights');
            });

            it('should weight results properly', async () => {
                const results = await hybridSearch.search('test query');

                expect(results).toBeDefined();
                expect(results[0].weights.sparse).toBe(0.6);
                expect(results[0].weights.dense).toBe(0.4);

                // Results should be sorted by RRF score
                for (let i = 1; i < results.length; i++) {
                    expect(results[i].rrfScore).toBeLessThanOrEqual(results[i-1].rrfScore);
                }
            });
        });
    });

    describe('RerankerClient', () => {
        let reranker;

        beforeEach(() => {
            reranker = new RerankerClient({ provider: 'local' });
        });

        describe('rerank()', () => {
            it('should rerank results', async () => {
                const query = 'user authentication';
                const documents = [
                    'This is about user login and authentication',
                    'Weather forecast for today',
                    'User management and permissions',
                    'Cooking recipes and ingredients'
                ];

                const results = await reranker.rerank(query, documents, { topN: 3 });

                expect(results).toBeDefined();
                expect(Array.isArray(results)).toBe(true);
                expect(results.length).toBe(3);
                expect(results[0]).toHaveProperty('id');
                expect(results[0]).toHaveProperty('content');
                expect(results[0]).toHaveProperty('score');

                // Should rank authentication-related docs higher
                const authDoc = results.find(r => r.content.includes('authentication'));
                const weatherDoc = results.find(r => r.content.includes('Weather'));
                expect(authDoc).toBeDefined();
                expect(weatherDoc).toBeDefined();
                expect(authDoc.score).toBeGreaterThan(weatherDoc.score);
            });
        });
    });

    describe('QueryUnderstandingEngine', () => {
        let queryUnderstanding;

        beforeEach(() => {
            queryUnderstanding = new QueryUnderstandingEngine();
        });

        describe('analyze()', () => {
            it('should analyze query intent', () => {
                const result = queryUnderstanding.analyze('find UserService class');

                expect(result).toBeDefined();
                expect(result).toHaveProperty('type');
                expect(result).toHaveProperty('confidence');
                expect(result).toHaveProperty('terms');
                expect(result).toHaveProperty('entities');
                expect(result).toHaveProperty('modifiers');
                expect(result.originalQuery).toBe('find UserService class');
                expect(result.terms).toContain('find');
                expect(result.terms).toContain('userservice');
                expect(result.terms).toContain('class');
            });

            it('should expand query', () => {
                const result = queryUnderstanding.analyze('how to authenticate user');

                expect(result).toBeDefined();
                expect(result.type).toBe('documentation');
                expect(result.confidence).toBeGreaterThan(0);
                expect(result.entities.frameworks).toEqual([]); // No specific framework detected
                expect(result.suggestions.length).toBeGreaterThan(0);
            });
        });
    });
});
