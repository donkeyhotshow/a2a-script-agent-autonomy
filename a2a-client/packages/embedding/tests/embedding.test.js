/**
 * Tests for @a2a/embedding
 */

const {EmbeddingClient, createEmbeddingClient, DIMENSIONS, DEFAULT_MODELS} = require('../dist/index');

describe('EmbeddingClient', () => {
    describe('constructor', () => {
        test('should use ollama as default provider', () => {
            const client = new EmbeddingClient();
            expect(client.provider).toBe('ollama');
            expect(client.baseUrl).toBe('http://localhost:11434');
            expect(client.model).toBe('nomic-embed-text');
        });

        test('should accept custom config', () => {
            const client = new EmbeddingClient({
                provider: 'mock',
                model: 'test-model',
                baseUrl: 'http://custom:8080',
                cacheFile: '/tmp/test-cache.json'
            });
            expect(client.provider).toBe('mock');
            expect(client.model).toBe('test-model');
            expect(client.baseUrl).toBe('http://custom:8080');
            expect(client.cacheFile).toBe('/tmp/test-cache.json');
        });
    });

    describe('getDimension', () => {
        test('should return correct dimension for nomic-embed-text', () => {
            const client = new EmbeddingClient({model: 'nomic-embed-text'});
            expect(client.getDimension()).toBe(768);
        });

        test('should return correct dimension for mxbai-embed-large', () => {
            const client = new EmbeddingClient({model: 'mxbai-embed-large'});
            expect(client.getDimension()).toBe(1536);
        });

        test('should return 768 for unknown model', () => {
            const client = new EmbeddingClient({model: 'unknown-model'});
            expect(client.getDimension()).toBe(768);
        });
    });

    describe('embed (mock provider)', () => {
        test('should return zero vector for empty text', async () => {
            const client = new EmbeddingClient({provider: 'mock'});
            const result = await client.embed('');
            expect(result).toHaveLength(768);
            expect(result.every(v => v === 0)).toBe(true);
        });

        test('should return zero vector for whitespace only', async () => {
            const client = new EmbeddingClient({provider: 'mock'});
            const result = await client.embed('   ');
            expect(result).toHaveLength(768);
        });

        test('should return deterministic embedding for same text', async () => {
            const client = new EmbeddingClient({provider: 'mock'});
            const result1 = await client.embed('hello world');
            const result2 = await client.embed('hello world');
            expect(result1).toEqual(result2);
        });

        test('should return different embeddings for different text', async () => {
            const client = new EmbeddingClient({provider: 'mock'});
            const result1 = await client.embed('hello');
            const result2 = await client.embed('world');
            expect(result1).not.toEqual(result2);
        });

        test('should cache embeddings', async () => {
            const client = new EmbeddingClient({provider: 'mock'});
            await client.embed('test text');
            expect(client.cache.size).toBe(1);
        });
    });

    describe('embedBatch (mock provider)', () => {
        test('should process multiple texts', async () => {
            const client = new EmbeddingClient({provider: 'mock'});
            const results = await client.embedBatch(['hello', 'world', 'test']);
            expect(results).toHaveLength(3);
            results.forEach(r => expect(r).toHaveLength(768));
        });

        test('should handle empty strings', async () => {
            const client = new EmbeddingClient({provider: 'mock'});
            const results = await client.embedBatch(['hello', '', 'world']);
            expect(results).toHaveLength(3);
            expect(results[1].every(v => v === 0)).toBe(true);
        });

        test('should use cache for batch', async () => {
            const client = new EmbeddingClient({provider: 'mock'});
            await client.embedBatch(['hello', 'world']);
            expect(client.cache.size).toBe(2);
        });
    });

    describe('getCacheStats', () => {
        test('should return cache statistics', () => {
            const client = new EmbeddingClient({provider: 'mock', model: 'nomic-embed-text'});
            const stats = client.getCacheStats();
            expect(stats).toEqual({
                size: 0,
                provider: 'mock',
                model: 'nomic-embed-text',
                dimension: 768,
                baseUrl: 'http://localhost:11434'
            });
        });
    });

    describe('clearCache', () => {
        test('should clear all cached embeddings', async () => {
            const client = new EmbeddingClient({provider: 'mock'});
            await client.embed('test');
            expect(client.cache.size).toBe(1);
            client.clearCache();
            expect(client.cache.size).toBe(0);
        });
    });

    describe('createEmbeddingClient', () => {
        test('should create client with default config', () => {
            const client = createEmbeddingClient();
            expect(client).toBeInstanceOf(EmbeddingClient);
        });

        test('should create client with custom config', () => {
            const client = createEmbeddingClient({provider: 'mock'});
            expect(client.provider).toBe('mock');
        });
    });

    describe('DIMENSIONS', () => {
        test('should have correct dimensions', () => {
            expect(DIMENSIONS['nomic-embed-text']).toBe(768);
            expect(DIMENSIONS['mxbai-embed-large']).toBe(1536);
            expect(DIMENSIONS['bge-m3']).toBe(1024);
        });
    });

    describe('DEFAULT_MODELS', () => {
        test('should have default models defined', () => {
            expect(DEFAULT_MODELS.ollama).toBe('nomic-embed-text');
            expect(DEFAULT_MODELS.openai).toBe('text-embedding-3-small');
        });
    });
});
