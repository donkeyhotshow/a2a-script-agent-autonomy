import {describe, expect, it} from 'vitest';
import {resolveExecution} from '../../src/services/core/request-processor/normalization.js';

/**
 * Empty root `execution: {}` should not shadow a populated nested context.execution.
 */
describe('human-review: resolveExecution', () => {
    it('uses nested context.execution when root execution is an empty object', () => {
        expect(
            resolveExecution({
                execution: {},
                context: {execution: {action: 'dialog', step: 'input'}},
            })?.action
        ).toBe('dialog');
    });
});
