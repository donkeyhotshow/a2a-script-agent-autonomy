import {describe, it, expect} from 'vitest';
import {resolveLlmModelFromContext} from '../../src/services/core/request-processor/llm-model-resolver.js';

describe('resolveLlmModelFromContext', () => {
    it('uses context llmModel when set', () => {
        expect(resolveLlmModelFromContext({llmModel: '  glm-4.7-flash  '}, 'fallback')).toBe('glm-4.7-flash');
    });

    it('falls back when missing or empty', () => {
        expect(resolveLlmModelFromContext({}, 'fb')).toBe('fb');
        expect(resolveLlmModelFromContext({llmModel: ''}, 'fb')).toBe('fb');
        expect(resolveLlmModelFromContext(undefined, 'fb')).toBe('fb');
    });
});
