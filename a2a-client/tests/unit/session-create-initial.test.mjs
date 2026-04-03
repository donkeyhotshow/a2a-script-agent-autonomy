import { describe, it, expect } from 'vitest';
import { pickInitialExecution } from '../../packages/vite-plugin/routes/utils/session-create-initial.js';

describe('pickInitialExecution', () => {
    it('defaults to task/new', () => {
        expect(pickInitialExecution({})).toEqual({ action: 'task', step: 'new' });
        expect(pickInitialExecution({ task: 'x' })).toEqual({ action: 'task', step: 'new' });
    });

    it('respects mode agent dialog task-decomposition', () => {
        expect(pickInitialExecution({ mode: 'agent' })).toEqual({ action: 'agent', step: 'new' });
        expect(pickInitialExecution({ mode: 'AGENT' })).toEqual({ action: 'agent', step: 'new' });
        expect(pickInitialExecution({ mode: 'dialog' })).toEqual({ action: 'dialog', step: 'new' });
        expect(pickInitialExecution({ mode: 'task-decomposition' })).toEqual({
            action: 'task-decomposition',
            step: 'new',
        });
    });

    it('execution object wins over mode', () => {
        expect(
            pickInitialExecution({
                mode: 'dialog',
                execution: { action: 'agent', step: 'plan' },
            })
        ).toEqual({ action: 'agent', step: 'plan' });
    });

    it('execution without step uses new', () => {
        expect(pickInitialExecution({ execution: { action: 'agent' } })).toEqual({
            action: 'agent',
            step: 'new',
        });
    });
});
