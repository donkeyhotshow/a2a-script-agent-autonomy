import {logger} from '../../../../utils/logger.js';
import type { ProcessResult } from '../request-processor.interfaces.js';

export interface TransformExecuteValidationIssue {
    code: string;
    message: string;
}

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
    const toolKeys = [
        'rag-search',
        'read-file',
        'write-file',
        'execute-command',
        'list-directory',
        'grep-search',
        'script',
    ];
    const activeToolKeys = keys.filter((k) => toolKeys.includes(k));
    const hasForm = typeof ex['form'] === 'object' && ex['form'] !== null;
    const hasMessage = typeof ex['message'] === 'string' && ex['message'].trim().length > 0;
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
        issues.push({
            code: 'DIALOG_EXECUTE_UNKNOWN_SHAPE',
            message: 'Dialog execute shape is neither chat form nor single tool action',
        });
    }
    // For chat Pattern-A turns, form means we must have `execute.message`.
    if (hasForm && !hasMessage) {
        issues.push({
            code: 'DIALOG_EXECUTE_MESSAGE_MISSING',
            message: 'Dialog chat response has form but no execute.message',
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
 * - chat-shape: message + optional form (for dialog step or completed)
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
    const toolKeys = [
        'rag-search',
        'read-file',
        'write-file',
        'execute-command',
        'list-directory',
        'grep-search',
        'dialog',
    ];
    const activeToolKeys = keys.filter((k) => toolKeys.includes(k));
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
    if (hasForm && !hasMessage) {
        issues.push({
            code: 'AGENT_EXECUTE_FORM_WITHOUT_MESSAGE',
            message: 'Agent chat response has form but no execute.message',
        });
    }
    return issues;
}
