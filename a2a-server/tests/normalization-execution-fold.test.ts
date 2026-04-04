import {describe, expect, it} from 'vitest';
import {
    normalizeContext,
    resolveExecution,
} from '../src/services/core/request-processor/normalization.js';

describe('resolveExecution', () => {
    it('prefers root execution when both exist', () => {
        expect(
            resolveExecution({
                execution: {action: 'agent'},
                context: {execution: {action: 'dialog'}},
            })?.action
        ).toBe('agent');
    });

    it('uses nested context.execution when root is absent', () => {
        expect(
            resolveExecution({
                context: {execution: {action: 'dialog', step: 's'}},
            })?.action
        ).toBe('dialog');
    });

    it('returns undefined when missing', () => {
        expect(resolveExecution({})).toBeUndefined();
        expect(resolveExecution({context: {}})).toBeUndefined();
    });
});

describe('normalizeContext foldRootIntoNestedContext', () => {
    it('copies root execution when nested context has none', () => {
        const out = normalizeContext({
            execution: {action: 'dialog', step: 'x'},
            context: {task: 't'},
        });
        const inner = out['context'] as Record<string, unknown>;
        const ex = inner['execution'] as Record<string, unknown>;
        expect(ex?.action).toBe('dialog');
        expect((out['execution'] as Record<string, unknown>)?.action).toBe('dialog');
    });

    it('copies root history when nested history is missing or empty', () => {
        const h = [{role: 'user', message: 'hi'}];
        const out = normalizeContext({
            history: h,
            context: {execution: {action: 'dialog'}},
        });
        expect((out['context'] as Record<string, unknown>)['history']).toEqual(h);
    });
});
