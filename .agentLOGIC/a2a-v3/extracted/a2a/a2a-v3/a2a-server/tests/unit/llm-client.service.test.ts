/**
 * LLM Client Service Unit Tests
 */

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {LLMClient, getDefaultModel, getLLMClient, type LLMMessage} from '../../src/services/llm-client.service.js';

// Mock the AI adapters
vi.mock('../../src/services/ai/ollama-adapter.js', () => ({
    createOllamaPromise: vi.fn().mockResolvedValue({promiseId: 'test-promise-id'}),
    waitForPromise: vi.fn().mockResolvedValue('Test response from LLM'),
}));

vi.mock('../../src/utils/logger.js', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('LLMClient', () => {
    let client: LLMClient;

    beforeEach(() => {
        vi.clearAllMocks();
        client = new LLMClient({model: 'test-model', temperature: 0.5, maxTokens: 100});
    });

    describe('constructor', () => {
        it('should create client with default values', () => {
            const defaultClient = new LLMClient();
            expect(defaultClient).toBeDefined();
        });

        it('should create client with custom options', () => {
            expect(client).toBeDefined();
        });
    });

    describe('getDefaultModel', () => {
        it('should return default model from env or fallback', () => {
            const model = getDefaultModel();
            expect(model).toBeDefined();
            expect(typeof model).toBe('string');
        });
    });

    describe('generate', () => {
        it('should generate text from prompt', async () => {
            const result = await client.generate('Hello world');
            
            expect(result).toBeDefined();
            expect(result.text).toBe('Test response from LLM');
            expect(result.model).toBe('test-model');
            expect(result.done).toBe(true);
            expect(result.promiseId).toBe('test-promise-id');
        });

        it('should use custom model from options', async () => {
            await client.generate('Test prompt', {model: 'custom-model'});
            // Model is passed to createOllamaPromise
        });

        it('should handle errors gracefully', async () => {
            const {createOllamaPromise} = await import('../../src/services/ai/ollama-adapter.js');
            vi.mocked(createOllamaPromise).mockRejectedValueOnce(new Error('Network error'));
            
            await expect(client.generate('test')).rejects.toThrow('Network error');
        });
    });

    describe('chat', () => {
        it('should send messages and get response', async () => {
            const messages: LLMMessage[] = [
                {role: 'system', content: 'You are helpful'},
                {role: 'user', content: 'Hello'}
            ];

            const result = await client.chat(messages);

            expect(result).toBeDefined();
            expect(result.message).toBeDefined();
            expect(result.message.role).toBe('assistant');
            expect(result.message.content).toBe('Test response from LLM');
            expect(result.model).toBe('test-model');
        });
    });

    describe('checkHealth', () => {
        it('should return true when service is healthy', async () => {
            const mockFetch = vi.fn().mockResolvedValue({ok: true});
            vi.stubGlobal('fetch', mockFetch);

            const health = await client.checkHealth();
            expect(health).toBe(true);
        });

        it('should return false when service is down', async () => {
            const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
            vi.stubGlobal('fetch', mockFetch);

            const health = await client.checkHealth();
            expect(health).toBe(false);
        });
    });

    describe('listModels', () => {
        it('should return list of available models', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    models: [{name: 'model-1'}, {name: 'model-2'}]
                })
            });
            vi.stubGlobal('fetch', mockFetch);

            const models = await client.listModels();
            expect(models).toEqual(['model-1', 'model-2']);
        });

        it('should return empty array on error', async () => {
            const mockFetch = vi.fn().mockRejectedValue(new Error('Error'));
            vi.stubGlobal('fetch', mockFetch);

            const models = await client.listModels();
            expect(models).toEqual([]);
        });
    });
});

describe('getLLMClient', () => {
    it('should return singleton instance', () => {
        const client1 = getLLMClient();
        const client2 = getLLMClient();
        
        expect(client1).toBe(client2);
    });
});
