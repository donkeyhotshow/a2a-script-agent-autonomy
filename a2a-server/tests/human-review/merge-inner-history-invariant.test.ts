import {describe, expect, it} from 'vitest';
import {mergeGrayRoomFinalizeInnerContext} from '../../src/services/core/request-processor/gray-room-utils.js';

/**
 * Inner context.history must stay list-shaped for downstream LLM prep; corrupt handler output should not win raw.
 */
describe('human-review: mergeGrayRoomFinalizeInnerContext', () => {
    it('rejects non-array history from handler context (keep array invariant)', () => {
        const rawInner = {task: 't', history: [{role: 'user', message: 'u'}]};
        const nextCtx = {
            context: {
                // Simulated bug: handler wrote a string instead of HistoryEntry[]
                history: 'corrupt' as unknown as Record<string, unknown>,
            },
        };
        const out = mergeGrayRoomFinalizeInnerContext(rawInner, nextCtx);
        expect(Array.isArray(out?.history)).toBe(true);
    });
});
