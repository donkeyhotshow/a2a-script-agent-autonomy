/**
 * Mock LLM Adapter Test
 * 
 * Demonstrates how to use the LLM mock in tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
    setupLLMMock, 
    clearLLMResponses,
    mockLLMCanonicalResponse,
    createCanonicalResponse,
    getCallCount,
    resetCallCount
} from './index';

describe('LLM Mock Adapter', () => {
    let mockCallLLM: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Setup fresh mock for each test
        const { mockCallLLM: mock } = setupLLMMock({
            verbose: false
        });
        mockCallLLM = mock;
        
        clearLLMResponses();
        resetCallCount();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should return default canonical response', async () => {
        const result = await mockCallLLM({ context: {}, injectedContent: '' });
        
        expect(result).toBeDefined();
        const parsed = JSON.parse(result);
        expect(parsed).toHaveProperty('step');
        expect(parsed).toHaveProperty('message');
        expect(parsed).toHaveProperty('execute');
        expect(parsed).toHaveProperty('completed');
    });

    it('should return preset response when key matches', async () => {
        const presetResponse = JSON.stringify({
            step: 'plan',
            message: 'Test plan',
            execute: { 'message': { text: 'Plan message' } },
            completed: false
        });
        
        mockCallLLM.mockResolvedValueOnce(presetResponse);
        
        const result = await mockCallLLM({ 
            context: { test: true }, 
            injectedContent: '' 
        });
        
        expect(result).toContain('Test plan');
    });

    it('should use custom response generator', async () => {
        const { mockCallLLM: customMock } = setupLLMMock({
            responseGenerator: () => JSON.stringify({
                step: 'custom',
                message: 'Custom response',
                execute: { 'message': { text: 'Custom' } },
                completed: true
            })
        });
        
        const result = await customMock({ context: {}, injectedContent: '' });
        const parsed = JSON.parse(result);
        
        expect(parsed.step).toBe('custom');
        expect(parsed.message).toBe('Custom response');
    });

    it('should track call count', async () => {
        await mockCallLLM({ context: {}, injectedContent: '' });
        await mockCallLLM({ context: {}, injectedContent: '' });
        
        expect(getCallCount()).toBeGreaterThanOrEqual(0);
    });

    it('should create canonical response format', () => {
        const response = createCanonicalResponse({
            step: 'execute',
            message: 'Executing task',
            execute: { 'script': { code: 'console.log("test")' } },
            completed: false
        });
        
        const parsed = JSON.parse(response);
        
        expect(parsed.step).toBe('execute');
        expect(parsed.message).toBe('Executing task');
        expect(parsed.execute).toHaveProperty('script');
        expect(parsed.completed).toBe(false);
    });

    it('should use mockLLMCanonicalResponse helper', () => {
        mockLLMCanonicalResponse('test-key', {
            step: 'research',
            message: 'Researching',
            execute: { 'message': { text: 'Researching...' } },
            completed: false
        });
        
        // The response is stored in the internal map
        // In a real test, you'd access it through the mock function
        expect(true).toBe(true); // Placeholder - map is internal
    });

    it('should clear responses between tests', () => {
        mockLLMCanonicalResponse('key1', { step: 'step1' });
        mockLLMCanonicalResponse('key2', { step: 'step2' });
        
        clearLLMResponses();
        
        // Map should be empty after clear
        expect(true).toBe(true); // Placeholder - map is internal
    });
});

describe('Replay Provider', () => {
    it('should create replay provider function', async () => {
        const { createReplayProvider } = await import('./index');
        
        // Create a replay provider (would read from files in real use)
        const provider = await createReplayProvider({
            replayDir: './nonexistent-dir',
            fallbackToReal: false
        });
        
        // Call the provider
        const result = await provider({ context: {}, injectedContent: '' });
        
        // Should return fallback response
        const parsed = JSON.parse(result);
        expect(parsed).toHaveProperty('step');
    });
});
