import { describe, it, expect } from 'vitest';
import { buildSubmitResult } from '../../vite-plugin-a2a/routes/step-routes-router-flow.js';

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
