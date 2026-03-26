import {describe, expect, it} from 'vitest';
import {
    shouldEnforceTransformStrictMode,
    validateDialogExecuteShape,
    validateFormChoiceProcessResult,
    validateRouterResultShape,
} from '../../src/services/core/request-processor/validators/transform-execute-validator.js';

describe('validateDialogExecuteShape', () => {
    it('accepts chat shape with message and form', () => {
        const issues = validateDialogExecuteShape({
            message: 'hello',
            form: {input: [{name: 'message', label: 'Message', required: true}]},
        });
        expect(issues).toHaveLength(0);
    });

    it('accepts single tool action shape', () => {
        const issues = validateDialogExecuteShape({
            'read-file': {path: 'src/app.ts'},
        } as any);
        expect(issues).toHaveLength(0);
    });

    it('warns when multiple tool keys present', () => {
        const issues = validateDialogExecuteShape({
            'read-file': {path: 'src/app.ts'},
            'write-file': {path: 'src/app.ts', content: 'x'},
        } as any);
        expect(issues.some((i) => i.code === 'DIALOG_EXECUTE_MULTIPLE_ACTIONS')).toBe(true);
    });

    it('warns when form and tool keys mix', () => {
        const issues = validateDialogExecuteShape({
            form: {input: [{name: 'message', label: 'Message', required: true}]},
            'read-file': {path: 'src/app.ts'},
        } as any);
        expect(issues.some((i) => i.code === 'DIALOG_EXECUTE_MULTIPLE_ACTIONS')).toBe(true);
    });

    it('accepts chat shape with form and execute.message', () => {
        const issues = validateDialogExecuteShape({
            message: 'hello',
            form: {input: [{name: 'message', label: 'Message', required: true}]},
        });
        expect(issues).toHaveLength(0);
    });

    it('flags form-only chat shape when execute.message is missing', () => {
        const issues = validateDialogExecuteShape({
            form: {input: [{name: 'message', label: 'Message', required: true}]},
        } as any);
        expect(issues.some((i) => i.code === 'DIALOG_EXECUTE_MESSAGE_MISSING')).toBe(true);
    });
});

describe('validateFormChoiceProcessResult', () => {
    it('warns on missing result', () => {
        const issues = validateFormChoiceProcessResult(null);
        expect(issues.some((i) => i.code === 'FORM_CHOICE_RESULT_MISSING')).toBe(true);
    });
});

describe('validateRouterResultShape', () => {
    it('accepts router choices array', () => {
        const issues = validateRouterResultShape({
            outcome: 'completed',
            execute: {form: {choices: [{id: 'x', label: 'X'}]}},
        });
        expect(issues).toHaveLength(0);
    });

    it('warns when choices missing', () => {
        const issues = validateRouterResultShape({
            outcome: 'completed',
            execute: {form: {}},
        });
        expect(issues.some((i) => i.code === 'ROUTER_CHOICES_MISSING')).toBe(true);
    });
});

describe('shouldEnforceTransformStrictMode', () => {
    it('is false by default', () => {
        delete process.env.A2A_TRANSFORM_STRICT;
        expect(shouldEnforceTransformStrictMode()).toBe(false);
        process.env.A2A_TRANSFORM_STRICT = '0';
        expect(shouldEnforceTransformStrictMode()).toBe(false);
        delete process.env.A2A_TRANSFORM_STRICT;
    });

    it('is true when enabled', () => {
        process.env.A2A_TRANSFORM_STRICT = '1';
        expect(shouldEnforceTransformStrictMode()).toBe(true);
        delete process.env.A2A_TRANSFORM_STRICT;
        process.env.A2A_TRANSFORM_STRICT = 'true';
        expect(shouldEnforceTransformStrictMode()).toBe(true);
        delete process.env.A2A_TRANSFORM_STRICT;
    });
});
