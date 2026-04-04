import { describe, it, expect } from 'vitest';
import { buildSessionViewModel, isCompletedViewModel } from '../../packages/vite-plugin/routes/utils/session-view-model.js';

describe('session-view-model', () => {
    it('returns completed model for empty payload', () => {
        const vm = buildSessionViewModel(null);
        expect(vm.kind).toBe('completed');
        expect(isCompletedViewModel(vm)).toBe(true);
    });

    it('detects choice-form when form.choices present', () => {
        const vm = buildSessionViewModel({
            execute: {
                form: {
                    title: 'Pick',
                    choices: [{ id: 'a', label: 'A' }],
                },
            },
        });
        expect(vm.kind).toBe('choice-form');
        expect(vm.form).toBeDefined();
        expect(isCompletedViewModel(vm)).toBe(false);
    });

    it('detects input-form when form inputs without message', () => {
        const vm = buildSessionViewModel({
            execute: {
                form: {
                    input: [{ name: 'q', label: 'Question' }],
                },
            },
        });
        expect(vm.kind).toBe('input-form');
        expect(vm.message.mainText).toBe('');
    });

    it('detects message+form when message and inputs present', () => {
        const vm = buildSessionViewModel({
            execute: {
                message: 'Describe your task',
                form: {
                    textarea: { name: 'task', label: 'Task' },
                },
            },
        });
        expect(vm.kind).toBe('message+form');
        expect(vm.message.mainText).toBe('Describe your task');
    });

    it('detects message-only when only message present', () => {
        const vm = buildSessionViewModel({
            execute: {
                message: 'Done.',
            },
        });
        expect(vm.kind).toBe('message-only');
        expect(vm.form).toBeNull || expect(vm.form).toBeUndefined;
    });

    it('marks completed when execution.status is completed', () => {
        const vm = buildSessionViewModel({
            execute: {},
            context: {
                execution: { status: 'completed', step: 'finalize' },
            },
        });
        expect(isCompletedViewModel(vm)).toBe(true);
        expect(vm.completed).toBe(true);
    });

    it('reads nested session.execute shape', () => {
        const vm = buildSessionViewModel({
            session: {
                execute: {
                    form: { choices: [{ id: 'x', label: 'X' }] },
                },
            },
        });
        expect(vm.kind).toBe('choice-form');
    });
});

