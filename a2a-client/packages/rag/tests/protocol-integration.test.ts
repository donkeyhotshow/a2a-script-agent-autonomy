/**
 * RAGClientService — protocol layer contract tests (mocked createRAG).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRAGClientService } from '../src/protocol-integration.js';

const protocolMocks = vi.hoisted(() => {
    const searchWithProtocol = vi.fn();
    const getSuggestions = vi.fn();
    const expandQuery = vi.fn();
    const reportClick = vi.fn();
    const clearQueryCache = vi.fn();
    const clearTFIDFIndex = vi.fn();
    const searcherDispose = vi.fn();
    const indexProjectParallel = vi.fn();
    const health = vi.fn();
    const indexerDispose = vi.fn();
    const watchStop = vi.fn();
    const watchFn = vi.fn();
    const createWatchManager = vi.fn(() => ({
        watch: watchFn,
        stop: watchStop,
    }));
    const createRAG = vi.fn(() => ({
        indexer: {
            indexProjectParallel,
            health,
            dispose: indexerDispose,
        },
        searcher: {
            getSuggestions,
            expandQuery,
            searchWithProtocol,
            reportClick,
            clearQueryCache,
            clearTFIDFIndex,
            dispose: searcherDispose,
        },
        chunks: {},
        tfidf: {},
    }));
    return {
        createRAG,
        createWatchManager,
        searchWithProtocol,
        getSuggestions,
        expandQuery,
        reportClick,
        clearQueryCache,
        clearTFIDFIndex,
        searcherDispose,
        indexProjectParallel,
        health,
        indexerDispose,
        watchStop,
        watchFn,
    };
});

vi.mock('../src/index.js', () => ({
    createRAG: protocolMocks.createRAG,
    RAGWatchManager: class {},
    createWatchManager: protocolMocks.createWatchManager,
}));

describe('RAGClientService (protocol-integration)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        protocolMocks.indexProjectParallel.mockResolvedValue({
            files: ['a.ts', 'b.ts'],
            chunks: [{ id: 'c1' }, { id: 'c2' }],
        });
        protocolMocks.health.mockResolvedValue({
            coverage: 0.9,
            staleFiles: [],
            orphanedChunks: 0,
            totalFiles: 2,
            totalChunks: 2,
        });
        protocolMocks.getSuggestions.mockReturnValue([
            { text: 'auth', type: 'symbol', filePath: 'a.ts' },
        ]);
        protocolMocks.expandQuery.mockReturnValue(['auth', 'auth login']);
        protocolMocks.searchWithProtocol.mockResolvedValue({
            results: [
                {
                    file: 'a.ts',
                    path: 'a.ts',
                    score: 0.9,
                    matches: [],
                },
            ],
            files: ['a.ts'],
            query: 'auth',
        });
    });

    it('initialize returns file and chunk counts', async () => {
        const svc = createRAGClientService({ projectPath: '/proj' });
        const out = await svc.initialize(4);
        expect(out.success).toBe(true);
        expect(out.fileCount).toBe(2);
        expect(out.chunkCount).toBe(2);
        expect(out.indexed).toBe(true);
        expect(protocolMocks.indexProjectParallel).toHaveBeenCalledWith(4);
    });

    it('initialize returns error when indexing throws', async () => {
        protocolMocks.indexProjectParallel.mockRejectedValueOnce(new Error('disk full'));
        const svc = createRAGClientService({ projectPath: '/proj' });
        const out = await svc.initialize();
        expect(out.success).toBe(false);
        expect(out.error).toContain('disk full');
    });

    it('search passes limit, semantic options, and extension filters', async () => {
        const svc = createRAGClientService({ projectPath: '/proj' });
        await svc.search({
            query: 'hello',
            limit: 7,
            fileTypes: ['ts', '.js'],
            useSemantic: true,
            semanticWeight: 0.55,
        });
        expect(protocolMocks.searchWithProtocol).toHaveBeenCalledWith(
            'hello',
            expect.objectContaining({
                limit: 7,
                useSemantic: true,
                semanticWeight: 0.55,
                filters: { extensions: ['.ts', '.js'] },
            })
        );
    });

    it('search passes folder and modifiedAfter filters', async () => {
        const svc = createRAGClientService({ projectPath: '/proj' });
        await svc.search({
            query: 'q',
            folders: ['src/lib'],
            modifiedAfter: '2024-01-01',
        });
        expect(protocolMocks.searchWithProtocol).toHaveBeenCalledWith(
            'q',
            expect.objectContaining({
                filters: {
                    folders: ['src/lib'],
                    modifiedAfter: '2024-01-01',
                },
            })
        );
    });

    it('search returns suggestions and expandedQuery', async () => {
        const svc = createRAGClientService({ projectPath: '/proj' });
        const out = await svc.search({ query: 'auth' });
        expect(out.success).toBe(true);
        expect(out.results.results).toHaveLength(1);
        expect(out.results.files).toEqual(['a.ts']);
        expect(out.suggestions).toEqual([
            { text: 'auth', type: 'symbol', filePath: 'a.ts' },
        ]);
        expect(out.expandedQuery).toEqual(['auth', 'auth login']);
    });

    it('search returns failure envelope when search throws', async () => {
        protocolMocks.searchWithProtocol.mockRejectedValueOnce(new Error('boom'));
        const svc = createRAGClientService({ projectPath: '/proj' });
        const out = await svc.search({ query: 'x' });
        expect(out.success).toBe(false);
        expect(out.error).toContain('boom');
        expect(out.results.results).toEqual([]);
        expect(out.results.files).toEqual([]);
        expect(out.results.query).toBe('x');
    });

    it('getHealth maps indexer health fields', async () => {
        const svc = createRAGClientService({ projectPath: '/proj' });
        const out = await svc.getHealth();
        expect(out.success).toBe(true);
        expect(out.coverage).toBe(0.9);
        expect(out.totalFiles).toBe(2);
        expect(out.totalChunks).toBe(2);
    });

    it('getHealth returns error when health throws', async () => {
        protocolMocks.health.mockRejectedValueOnce(new Error('no index'));
        const svc = createRAGClientService({ projectPath: '/proj' });
        const out = await svc.getHealth();
        expect(out.success).toBe(false);
        expect(out.error).toContain('no index');
    });

    it('reportRelevance forwards to searcher.reportClick', () => {
        const svc = createRAGClientService({ projectPath: '/proj' });
        svc.reportRelevance('q', 'path/to/file.ts');
        expect(protocolMocks.reportClick).toHaveBeenCalledWith('q', 'path/to/file.ts');
    });

    it('clearCaches clears searcher caches', () => {
        const svc = createRAGClientService({ projectPath: '/proj' });
        svc.clearCaches();
        expect(protocolMocks.clearQueryCache).toHaveBeenCalled();
        expect(protocolMocks.clearTFIDFIndex).toHaveBeenCalled();
    });

    it('startWatching creates watch manager once and watches project path', () => {
        const svc = createRAGClientService({ projectPath: '/tmp/rag-proj' });
        svc.startWatching();
        svc.startWatching();
        expect(protocolMocks.createWatchManager).toHaveBeenCalledTimes(1);
        expect(protocolMocks.watchFn).toHaveBeenCalledWith('/tmp/rag-proj');
    });

    it('dispose stops watcher and disposes searcher and indexer', () => {
        const svc = createRAGClientService({ projectPath: '/p' });
        svc.startWatching();
        svc.dispose();
        expect(protocolMocks.watchStop).toHaveBeenCalled();
        expect(protocolMocks.searcherDispose).toHaveBeenCalled();
        expect(protocolMocks.indexerDispose).toHaveBeenCalled();
    });
});
