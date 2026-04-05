import {describe, expect, it} from 'vitest';
import {toInvokeShapeForPromptsTransform} from '../../src/services/core/request-processor/normalization.js';

/**
 * Prompts transform expects a usable nested `context` object; explicit null should be normalized away.
 */
describe('human-review: toInvokeShapeForPromptsTransform', () => {
    it('does not pass through context: null as the nested envelope', () => {
        const out = toInvokeShapeForPromptsTransform({
            context: null,
            task: 'hello',
        } as Record<string, unknown>);
        expect(out.context).not.toBeNull();
    });
});
