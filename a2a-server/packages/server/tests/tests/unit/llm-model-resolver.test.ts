import {describe, it, expect} from 'vitest';
import {
    resolveLlmModelFromContext,
    resolveGrayRoomLlmModelFromContext,
} from '../../src/services/core/request-processor/llm-model-resolver';

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

describe('resolveGrayRoomLlmModelFromContext', () => {
    it('uses grayRoomLlmModel, ignores llmModel', () => {
        expect(
            resolveGrayRoomLlmModelFromContext(
                {llmModel: 'glm-4.7-flash', grayRoomLlmModel: '  qwen3:8b  '},
                'fb'
            )
        ).toBe('qwen3:8b');
        expect(resolveGrayRoomLlmModelFromContext({llmModel: 'glm-4.7-flash'}, 'qwen3:8b')).toBe('qwen3:8b');
    });

    it('falls back when grayRoomLlmModel missing', () => {
        expect(resolveGrayRoomLlmModelFromContext({}, 'sidecar')).toBe('sidecar');
    });
});
