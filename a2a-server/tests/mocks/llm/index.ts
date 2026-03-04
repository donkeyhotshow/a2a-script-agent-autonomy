/**
 * LLM Mocks for Tests
 * 
 * Provides mock implementations for callLLM() with replay support.
 */

export { 
    setupLLMMock, 
    mockLLMResponse, 
    clearLLMResponses, 
    mockLLMCanonicalResponse,
    createCanonicalResponse,
    createReplayProvider,
    getCallCount,
    resetCallCount,
    loadPresetResponses,
    preloadResponses
} from './mock-llm-adapter.js';
export type { LLMMockConfig, ReplayProviderOptions } from './mock-llm-adapter.js';
