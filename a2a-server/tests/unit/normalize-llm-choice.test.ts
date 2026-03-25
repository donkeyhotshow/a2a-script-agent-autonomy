import { describe, it, expect } from 'vitest';
import { normalizeLlmChoiceToExecution } from '../../src/services/core/request-processor/normalize-llm-choice.js';

describe('normalizeLlmChoiceToExecution', () => {
    it('merges result.choice into execution on router handoff', () => {
        const ctx: Record<string, unknown> = {
            execution: { action: 'task', step: 'router' },
            result: { choice: 'agent' },
        };
        normalizeLlmChoiceToExecution(ctx);
        const ex = ctx.execution as Record<string, unknown>;
        expect(ex.action).toBe('agent');
        expect(ex.step).toBe('request');
    });

    it('ignores choice when not on router', () => {
        const ctx: Record<string, unknown> = {
            execution: { action: 'task', step: 'done' },
            result: { choice: 'agent' },
        };
        normalizeLlmChoiceToExecution(ctx);
        expect((ctx.execution as Record<string, unknown>).step).toBe('done');
    });
});
