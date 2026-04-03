import {describe, expect, it} from 'vitest';
import {determineRequestType} from '../src/services/core/request-processor/request-processor.service.js';
import {
    normalizeContext,
    resolveExecution,
    resolveResultObject,
    resolveTransformSchema,
} from '../src/services/core/request-processor/normalization.js';

describe('resolveResultObject', () => {
    it('merges nested and root result; root wins on conflicts', () => {
        const merged = resolveResultObject({
            context: {result: {choice: 'dialog', extra: 1}},
            result: {choice: 'agent', message: 'hi'},
        });
        expect(merged?.choice).toBe('agent');
        expect(merged?.message).toBe('hi');
        expect(merged?.extra).toBe(1);
    });

    it('reads choice only from nested when root lacks result', () => {
        const merged = resolveResultObject({
            context: {result: {choice: 'dialog'}},
        });
        expect(merged?.choice).toBe('dialog');
    });
});

describe('determineRequestType router + LLM choice', () => {
    const routerCtx = {
        session_id: 'stateless',
        execution: {action: 'task', step: 'router'},
        task: 'диалог',
        result: {choice: 'dialog'},
        choice_id: 'dialog',
    };

    it('routes to dialog when transformSchema is set (invoke router hint)', () => {
        expect(
            determineRequestType({
                ...routerCtx,
                transformSchema: 'dialog',
            })
        ).toBe('dialog');
    });

    it('routes to dialog when step is router and result.choice is a pipeline id', () => {
        expect(determineRequestType(routerCtx)).toBe('dialog');
    });

    it('routes nested execution + root result', () => {
        expect(
            determineRequestType({
                session_id: 'stateless',
                context: {
                    execution: {action: 'task', step: 'router'},
                    task: 'x',
                },
                result: {choice: 'dialog'},
            })
        ).toBe('dialog');
    });

    it('routes when only choice_id is set (no result key)', () => {
        expect(
            determineRequestType({
                session_id: 'stateless',
                execution: {action: 'task', step: 'router'},
                task: 'hi',
                choice_id: 'dialog',
            })
        ).toBe('dialog');
    });

    it('nested-only execution: root ctx.execution is empty; resolvers still see router', () => {
        const ctx = {
            session_id: 'stateless',
            context: {
                execution: {action: 'task', step: 'router'},
                task: 'fix vue',
            },
            result: {choice: 'fix-vue-imports'},
        };
        expect((ctx as {execution?: unknown}).execution).toBeUndefined();
        expect(resolveExecution(ctx)?.['step']).toBe('router');
        expect(resolveResultObject(ctx)?.choice).toBe('fix-vue-imports');
        expect(determineRequestType(ctx)).toBe('action');
    });
});

describe('normalizeContext router choice', () => {
    it('folds router choice into execution and yields dialog schema', () => {
        const out = normalizeContext({
            execution: {action: 'task', step: 'router'},
            task: 'hello',
            result: {choice: 'dialog'},
        });
        expect((out['execution'] as Record<string, unknown>)?.action).toBe('dialog');
        expect((out['execution'] as Record<string, unknown>)?.step).toBe('start');
        expect(resolveTransformSchema(out)).toBe('dialog');
    });
});
