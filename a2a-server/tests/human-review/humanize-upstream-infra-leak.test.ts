import {describe, expect, it} from 'vitest';
import {
    CLIENT_SAFE_PROCESSING_ERROR,
    humanizeUpstreamErrorMessage,
} from '../../src/services/core/request/request.service.js';

/** Operator-facing logs may name infra; user-visible copy must stay generic. */
describe('human-review: humanizeUpstreamErrorMessage', () => {
    it('redacts messages that mention Local LLM upstream endpoints', () => {
        const raw = 'POST failed: dial tcp 127.0.0.1:11435 Local LLM upstream connection refused';
        expect(humanizeUpstreamErrorMessage(raw)).toBe(CLIENT_SAFE_PROCESSING_ERROR);
    });
});
