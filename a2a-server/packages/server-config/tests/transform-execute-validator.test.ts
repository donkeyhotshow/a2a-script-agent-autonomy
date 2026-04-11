import {describe, expect, it} from 'vitest';
import {
    shouldEnforceTransformStrictMode,
    validateAgentExecuteShape,
    validateDialogExecuteShape,
    validateExecuteShapeForSchema,
    isAgentTransformSchema,
    validateFormChoiceProcessResult,
    validateResultShape,
    validateRouterResultShape,
    validateLlmOutputShape,
} from '../../src/services/core/request-processor/validators/transform-execute-validator';

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

    it('accepts legacy form.input[] without execute.message (goldens e.g. dialog/2)', () => {
        const issues = validateDialogExecuteShape({
            form: {input: [{name: 'message', label: 'Message', required: true}]},
        } as any);
        expect(issues).toHaveLength(0);
    });

    it('flags Pattern A form.textarea without execute.message', () => {
        const issues = validateDialogExecuteShape({
            form: {
                textarea: {
                    name: 'message',
                    label: 'Details',
                    required: true,
                },
            },
        } as any);
        expect(issues.some((i) => i.code === 'DIALOG_EXECUTE_MESSAGE_MISSING')).toBe(true);
    });

    it('accepts router form with choices and no execute.message', () => {
        const issues = validateDialogExecuteShape({
            form: {
                title: 'Pick mode',
                choices: [{id: 'dialog', label: 'Dialog', description: 'd'}],
            },
        } as any);
        expect(issues).toHaveLength(0);
    });

    it('accepts workspace tool keys as single action', () => {
        expect(
            validateDialogExecuteShape({'file-exists': {path: 'x'}} as any),
        ).toHaveLength(0);
        expect(
            validateDialogExecuteShape({'edit-patch': {path: 'x', patch: ''}} as any),
        ).toHaveLength(0);
        expect(
            validateDialogExecuteShape({'run-script': {id: 's1'}} as any),
        ).toHaveLength(0);
    });
});

describe('validateAgentExecuteShape', () => {
    it('accepts workspace tool keys (strict mode / agent-workspace-tools)', () => {
        expect(
            validateAgentExecuteShape({'file-exists': {path: 'src/x.ts'}} as any),
        ).toHaveLength(0);
        expect(
            validateAgentExecuteShape({'edit-patch': {path: 'a', patch: '---'}} as any),
        ).toHaveLength(0);
        expect(
            validateAgentExecuteShape({'run-script': {id: 'r1'}} as any),
        ).toHaveLength(0);
    });

    it('accepts script as single tool (fix-vue-imports / coder)', () => {
        const issues = validateAgentExecuteShape({
            script: {language: 'javascript', content: '1+1'},
        } as any);
        expect(issues).toHaveLength(0);
    });

    it('accepts dialog tool as single action', () => {
        const issues = validateAgentExecuteShape({
            dialog: {message: 'hi'},
        } as any);
        expect(issues).toHaveLength(0);
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

describe('validateResultShape (legacy bare blobs)', () => {
    it('flags single-key legacy { content }', () => {
        const issues = validateResultShape({content: 'x'});
        expect(issues.some((i) => i.code === 'RESULT_BARE_BLOB_CONTENT')).toBe(true);
    });

    it('flags single-key legacy { results }', () => {
        const issues = validateResultShape({results: []});
        expect(issues.some((i) => i.code === 'RESULT_BARE_BLOB_RESULTS')).toBe(true);
    });

    it('does not flag read-file action-key shape', () => {
        const issues = validateResultShape({'read-file': {path: 'a.ts'}});
        expect(issues).toHaveLength(0);
    });
});

describe('validateExecuteShapeForSchema', () => {
    it('uses agent rules for coder schema', () => {
        const ex = {message: 'x'} as any;
        const agentIssues = validateExecuteShapeForSchema('coder', ex);
        const dialogIssues = validateDialogExecuteShape(ex);
        expect(agentIssues).toHaveLength(0);
        expect(dialogIssues).toHaveLength(0);
    });

    it('uses dialog rules for dialog schema', () => {
        const issues = validateExecuteShapeForSchema('dialog', {
            form: {choices: [{id: 'a', label: 'A'}]},
        } as any);
        expect(issues).toHaveLength(0);
    });
});

describe('isAgentTransformSchema', () => {
    it('classifies known agent pipelines', () => {
        expect(isAgentTransformSchema('agent')).toBe(true);
        expect(isAgentTransformSchema('agent-tools')).toBe(true);
        expect(isAgentTransformSchema('coder')).toBe(true);
        expect(isAgentTransformSchema('fix-vue-imports')).toBe(true);
        expect(isAgentTransformSchema('fix-vue-imports-decline')).toBe(true);
        expect(isAgentTransformSchema('fix-vue-imports-batched')).toBe(true);
        expect(isAgentTransformSchema('dialog')).toBe(false);
        expect(isAgentTransformSchema('dialog/3')).toBe(false);
        expect(isAgentTransformSchema('router')).toBe(false);
    });
});

describe('validateLlmOutputShape', () => {
    it('flags TOP_LEVEL_MESSAGE_WITH_TOOL', () => {
        const issues = validateLlmOutputShape({
            message: 'Here is the file',
            execute: { 'read-file': { path: 'a.ts' } }
        } as any);
        expect(issues.some(i => i.code === 'TOP_LEVEL_MESSAGE_WITH_TOOL')).toBe(true);
    });

    it('flags DUPLICATE_TOP_AND_EXECUTE_MESSAGE', () => {
        const issues = validateLlmOutputShape({
            message: 'Same text',
            execute: { message: 'Same text', form: {} }
        } as any);
        expect(issues.some(i => i.code === 'DUPLICATE_TOP_AND_EXECUTE_MESSAGE')).toBe(true);
    });

    it('flags TOP_AND_EXECUTE_MESSAGE_MISMATCH', () => {
        const issues = validateLlmOutputShape({
            message: 'Different text',
            execute: { message: 'Some other text', 'read-file': { path: 'a.ts' } }
        } as any);
        expect(issues.some(i => i.code === 'TOP_AND_EXECUTE_MESSAGE_MISMATCH')).toBe(true);
    });

    it('flags EXECUTE_MESSAGE_ONLY', () => {
        const issues = validateLlmOutputShape({
            execute: { message: 'Only message here' }
        } as any);
        expect(issues.some(i => i.code === 'EXECUTE_MESSAGE_ONLY')).toBe(true);
    });

    it('accepts valid execute.message + tool (Pattern B)', () => {
        const issues = validateLlmOutputShape({
            execute: { message: 'Reading file', 'read-file': { path: 'a.ts' } }
        } as any);
        expect(issues).toHaveLength(0);
    });

    it('accepts valid execute.message + form (Pattern A)', () => {
        const issues = validateLlmOutputShape({
            execute: { message: 'Please fill', form: { choices: [] } }
        } as any);
        expect(issues).toHaveLength(0);
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
