import {logger} from '../../../utils/logger.js';
import type { ProcessResult } from '../request-processor.interfaces.js';

export interface TransformExecuteValidationIssue {
    code: string;
    message: string;
}

/**
 * Single-tool execute keys (agent + dialog LLM transforms, workspace tools).
 * Keep aligned with prompts (e.g. agent-request/coder-request) and `VALID_EXECUTE_KEYS` in action-validator.
 */
export function isAgentTransformSchema(schemaName: string): boolean {
    return (
        schemaName === 'agent' ||
        schemaName.startsWith('agent-') ||
        schemaName === 'coder' ||
        schemaName === 'analyze' ||
        schemaName === 'auto-ai' ||
        schemaName.startsWith('fix-vue-imports') ||
        schemaName === 'fix-laravel-namespaces-and-uses'
    );
}

export function validateExecuteShapeForSchema(
    schemaName: string,
    execute: ProcessResult['execute'] | undefined
): TransformExecuteValidationIssue[] {
    return isAgentTransformSchema(schemaName)
        ? validateAgentExecuteShape(execute)
        : validateDialogExecuteShape(execute);
}

export const SINGLE_TOOL_EXECUTE_KEYS = [
    'rag-search',
    'read-file',
    'write-file',
    'execute-command',
    'list-directory',
    'grep-search',
    'file-exists',
    'edit-patch',
    'run-script',
    'script',
    'dialog',
] as const;

export function validateDialogExecuteShape(execute: ProcessResult['execute'] | undefined): TransformExecuteValidationIssue[] {
    const issues: TransformExecuteValidationIssue[] = [];
    if (!execute || typeof execute !== 'object') {
        issues.push({
            code: 'DIALOG_EXECUTE_MISSING',
            message: 'Dialog transform output must include execute object',
        });
        return issues;
    }
    const ex = execute as Record<string, unknown>;
    const keys = Object.keys(ex).filter((k) => ex[k] !== undefined && ex[k] !== null);
    if (keys.length === 0) {
        issues.push({
            code: 'DIALOG_EXECUTE_EMPTY',
            message: 'Dialog execute object is empty',
        });
        return issues;
    }
    const toolKeys = [...SINGLE_TOOL_EXECUTE_KEYS];
    const activeToolKeys = keys.filter((k) => toolKeys.includes(k as typeof toolKeys[number]));
    const hasForm = typeof ex['form'] === 'object' && ex['form'] !== null;
    const hasExecuteMessage =
        typeof ex['message'] === 'string' && (ex['message'] as string).trim().length > 0;
    const actionKeys = activeToolKeys.length + (hasForm ? 1 : 0);
    if (actionKeys > 1) {
        issues.push({
            code: 'DIALOG_EXECUTE_MULTIPLE_ACTIONS',
            message: 'Dialog execute must expose exactly one action (form or a single tool key)',
        });
        return issues;
    }
    if (activeToolKeys.length === 1 && !hasForm) {
        return issues;
    }
    if (!hasForm && activeToolKeys.length === 0) {
        if (hasExecuteMessage) {
            return issues;
        }
        issues.push({
            code: 'DIALOG_EXECUTE_UNKNOWN_SHAPE',
            message: 'Dialog execute shape is neither chat form nor single tool action',
        });
    }
    const formObj = hasForm ? (ex['form'] as Record<string, unknown>) : undefined;
    const isRouterChoicesForm = Boolean(formObj && Array.isArray(formObj['choices']));
    // Pattern A in prompts uses nested `form.textarea` (not legacy `form.input[]` goldens like dialog/2).
    const isTextareaObjectForm = Boolean(
        formObj &&
            typeof formObj['textarea'] === 'object' &&
            formObj['textarea'] !== null &&
            !Array.isArray(formObj['textarea'])
    );
    if (hasForm && !hasExecuteMessage && !isRouterChoicesForm && isTextareaObjectForm) {
        issues.push({
            code: 'DIALOG_EXECUTE_MESSAGE_MISSING',
            message: 'Dialog Pattern A (form.textarea) requires execute.message',
        });
    }
    return issues;
}

export function validateFormChoiceProcessResult(result: ProcessResult | null): TransformExecuteValidationIssue[] {
    const issues: TransformExecuteValidationIssue[] = [];
    if (!result) {
        issues.push({
            code: 'FORM_CHOICE_RESULT_MISSING',
            message: 'Form choice pipeline returned null result',
        });
        return issues;
    }
    if (!result.outcome) {
        issues.push({
            code: 'FORM_CHOICE_OUTCOME_MISSING',
            message: 'Form choice result must include outcome',
        });
    }
    if (!result.execute || typeof result.execute !== 'object') {
        issues.push({
            code: 'FORM_CHOICE_EXECUTE_MISSING',
            message: 'Form choice result should include execute object',
        });
    }
    return issues;
}

export function validateRouterResultShape(result: ProcessResult): TransformExecuteValidationIssue[] {
    const issues: TransformExecuteValidationIssue[] = [];
    const choices = result.execute?.form?.choices;
    if (!Array.isArray(choices)) {
        issues.push({
            code: 'ROUTER_CHOICES_MISSING',
            message: 'Router transform result should provide execute.form.choices array',
        });
        return issues;
    }
    if (choices.length === 0) {
        issues.push({
            code: 'ROUTER_CHOICES_EMPTY',
            message: 'Router transform returned empty choices array',
        });
    }
    return issues;
}

/**
 * Validate LLM output shape for top-level message conflicts and execute message issues.
 * This catches TOP_LEVEL_MESSAGE_WITH_TOOL, DUPLICATE_TOP_AND_EXECUTE_MESSAGE, etc.
 */
export function validateLlmOutputShape(result: ProcessResult | Record<string, unknown>): TransformExecuteValidationIssue[] {
    const issues: TransformExecuteValidationIssue[] = [];
    if (!result || typeof result !== 'object') {
        return issues;
    }

    const topMsg = typeof result.message === 'string' ? result.message.trim() : '';
    const ex = result.execute as Record<string, unknown> | undefined;
    
    if (!ex || typeof ex !== 'object' || Array.isArray(ex)) {
        return issues;
    }

    const exKeys = Object.keys(ex).filter((k) => ex[k] !== undefined && ex[k] !== null);
    const toolKeys = [...SINGLE_TOOL_EXECUTE_KEYS];
    const activeToolKeys = exKeys.filter((k) => toolKeys.includes(k as typeof toolKeys[number]));
    const exMsg = typeof ex['message'] === 'string' ? (ex['message'] as string).trim() : '';
    const hasForm = typeof ex['form'] === 'object' && ex['form'] !== null;

    if (topMsg && activeToolKeys.length > 0) {
        issues.push({
            code: 'TOP_LEVEL_MESSAGE_WITH_TOOL',
            message: `tools=[${activeToolKeys.join(',')}] — move assistant line to execute.message next to tool`,
        });
    }

    if (topMsg && exMsg && topMsg === exMsg) {
        issues.push({
            code: 'DUPLICATE_TOP_AND_EXECUTE_MESSAGE',
            message: hasForm || activeToolKeys.length > 0 ? 'same text in two places' : 'same text; execute should use form or tool, not message-only',
        });
    }

    if (topMsg && exMsg && topMsg !== exMsg && activeToolKeys.length > 0) {
        issues.push({
            code: 'TOP_AND_EXECUTE_MESSAGE_MISMATCH',
            message: 'top-level message differs from execute.message while tools present',
        });
    }

    if (
        exKeys.length === 1 &&
        exMsg &&
        !hasForm &&
        activeToolKeys.length === 0 &&
        !(topMsg && topMsg === exMsg)
    ) {
        const outcome = (result as {outcome?: string}).outcome;
        if (outcome === 'ai_action_ready') {
            return issues;
        }
        issues.push({
            code: 'EXECUTE_MESSAGE_ONLY',
            message: 'execute has only message string — expected form or tool keys',
        });
    }

    return issues;
}

/**
 * Validate result shape (action-key format)
 * Result must follow canonical format: { "<action-type>": { ... } }
 * Cannot be bare blob like { "content": "..." } or { "results": [...] }
 */
export function validateResultShape(result: unknown): TransformExecuteValidationIssue[] {
    const issues: TransformExecuteValidationIssue[] = [];
    
    if (result === undefined || result === null) {
        // Result can be missing - that's ok
        return issues;
    }
    
    if (typeof result !== 'object') {
        issues.push({
            code: 'RESULT_NOT_OBJECT',
            message: 'Result must be an object with action-key format',
        });
        return issues;
    }
    
    const resultObj = result as Record<string, unknown>;
    const keys = Object.keys(resultObj);
    
    if (keys.length === 0) {
        issues.push({
            code: 'RESULT_EMPTY',
            message: 'Result object is empty',
        });
        return issues;
    }
    
    // Check for legacy bare blob formats
    if (keys.includes('content') && keys.length === 1) {
        issues.push({
            code: 'RESULT_BARE_BLOB_CONTENT',
            message: 'Result uses legacy bare blob format: { "content": "..." } - must use action-key format',
        });
    }
    
    if (keys.includes('results') && keys.length === 1) {
        issues.push({
            code: 'RESULT_BARE_BLOB_RESULTS',
            message: 'Result uses legacy bare blob format: { "results": [...] } - must use action-key format',
        });
    }
    
    // Valid action keys
    const validActionKeys = [
        'rag-search',
        'read-file',
        'write-file',
        'execute-command',
        'list-directory',
        'grep-search',
        'file-exists',
        'edit-patch',
        'run-script',
        'script',
        'dialog',
        'form',
        'choice',
        'message',
        'completed',
    ];
    
    // At least one key should be a valid action key (for canonical format)
    const hasValidActionKey = keys.some(k => validActionKeys.includes(k));
    
    if (!hasValidActionKey && keys.length > 0) {
        // Could be custom result - warn but don't fail
        logger.warn('[TransformValidator] Result has unknown action keys', {
            keys,
        });
    }
    
    return issues;
}

export function shouldEnforceTransformStrictMode(): boolean {
    const raw = process.env.A2A_TRANSFORM_STRICT;
    return raw === '1' || raw === 'true';
}

/**
 * Validate agent transform execute shape
 * Agent responses must follow either single-tool or chat-shape patterns:
 * - single-tool: exactly one tool key (rag-search, read-file, write-file, etc.)
 * - chat-shape: `execute.message` and/or `execute.form` (history coalesces top-level LLM `message` or `execute.message`)
 * No mixed execute shapes allowed.
 */
export function validateAgentExecuteShape(execute: ProcessResult['execute'] | undefined): TransformExecuteValidationIssue[] {
    const issues: TransformExecuteValidationIssue[] = [];
    if (!execute || typeof execute !== 'object') {
        issues.push({
            code: 'AGENT_EXECUTE_MISSING',
            message: 'Agent transform output must include execute object',
        });
        return issues;
    }
    const ex = execute as Record<string, unknown>;
    const keys = Object.keys(ex).filter((k) => ex[k] !== undefined && ex[k] !== null);
    if (keys.length === 0) {
        issues.push({
            code: 'AGENT_EXECUTE_EMPTY',
            message: 'Agent execute object is empty',
        });
        return issues;
    }
    const toolKeys = [...SINGLE_TOOL_EXECUTE_KEYS];
    const activeToolKeys = keys.filter((k) => toolKeys.includes(k as typeof toolKeys[number]));
    const hasForm = typeof ex['form'] === 'object' && ex['form'] !== null;
    const hasMessage = typeof ex['message'] === 'string' && ex['message'].trim().length > 0;
    const actionKeys = activeToolKeys.length + (hasForm ? 1 : 0);
    if (actionKeys > 1) {
        issues.push({
            code: 'AGENT_EXECUTE_MULTIPLE_ACTIONS',
            message: 'Agent execute must expose exactly one action (form or a single tool key)',
        });
        return issues;
    }
    if (activeToolKeys.length === 1 && !hasForm) {
        return issues;
    }
    if (!hasForm && activeToolKeys.length === 0) {
        if (!hasMessage) {
            issues.push({
                code: 'AGENT_EXECUTE_UNKNOWN_SHAPE',
                message: 'Agent execute shape is neither single-tool nor chat-shape (missing message)',
            });
        }
        // Empty execute with message is allowed (completed state)
        return issues;
    }
    // Form-only `execute` is allowed for agent: assistant line may be top-level LLM `message` only (see append coalesce).
    return issues;
}
