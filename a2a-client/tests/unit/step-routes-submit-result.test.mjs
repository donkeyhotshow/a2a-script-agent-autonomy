import { describe, it, expect } from 'vitest';
import {
    buildSubmitResult,
    normalizeRouterStepSubmit,
    routerFormHasChoices,
} from '../../packages/vite-plugin/routes/step-routes-router-flow.js';

describe('buildSubmitResult (router two beats)', () => {
    it('maps task to message when previous step had no choices', () => {
        expect(buildSubmitResult({ body: { task: 'fix imports' }, hasChoices: false })).toEqual({
            message: 'fix imports',
        });
    });

    it('maps task to choice when previous step had router choices', () => {
        expect(buildSubmitResult({ body: { task: 'agent' }, hasChoices: true })).toEqual({
            choice: 'agent',
        });
    });

    it('passes explicit result through unchanged', () => {
        expect(
            buildSubmitResult({
                body: { result: { choice: 'dialog' }, task: 'ignored' },
                hasChoices: true,
            })
        ).toEqual({ choice: 'dialog' });
    });
});

describe('routerFormHasChoices', () => {
    it('true for form.choices', () => {
        expect(
            routerFormHasChoices({
                execute: { form: { choices: [{ id: 'a' }] } },
            })
        ).toBe(true);
    });

    it('true for form.meta.routerChoices only', () => {
        expect(
            routerFormHasChoices({
                execute: { form: { meta: { routerChoices: [{ id: 'agent' }] } } },
            })
        ).toBe(true);
    });
});

describe('normalizeRouterStepSubmit', () => {
    const prev = {
        context: { execution: { action: 'task', step: 'router' } },
        execute: { form: { choices: [{ id: 'agent' }, { id: 'dialog' }] } },
    };

    it('coerces message to choice when ids match', () => {
        expect(normalizeRouterStepSubmit({ message: 'agent' }, prev)).toEqual({ choice: 'agent' });
    });

    it('no-op when not router step', () => {
        expect(
            normalizeRouterStepSubmit(
                { message: 'agent' },
                {
                    context: { execution: { step: 'new' } },
                    execute: prev.execute,
                }
            )
        ).toEqual({ message: 'agent' });
    });
});
