/**
 * Form router choice → ProcessResult via JSON transform pipeline (prompts/transforms/form-choice-response.json).
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { runTransformPipelineFromFile } from '../../transform/pipeline.js';
import type { ProcessOutcome, ProcessResult } from './request-processor.interfaces.js';
import {logger} from '@a2a/server-utils/logger.js';
import {
    shouldEnforceTransformStrictMode,
    validateFormChoiceProcessResult,
    validateDialogExecuteShape,
    validateLlmOutputShape,
} from './validators/transform-execute-validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORM_CHOICE_PIPELINE = path.join(__dirname, '../../../prompts/transforms/form-choice-response.json');

export async function runFormChoicePipeline(input: Record<string, unknown>): Promise<ProcessResult> {
    const res = await runTransformPipelineFromFile(FORM_CHOICE_PIPELINE, input, {});
    if (!res.success) {
        return {
            outcome: 'failed',
            error: res.error || 'Form choice pipeline failed',
        };
    }
    const fp = res.output.formProcessResult as Record<string, unknown> | undefined;
    if (!fp || typeof fp.outcome !== 'string') {
        const errMsg = `Form-choice transform missing formProcessResult in output`;
        logger.error('[FormChoicePipeline] ' + errMsg, { outputKeys: Object.keys(res.output) });
        throw new Error(errMsg);
    }
    const processResult = buildProcessResultFromForm(fp, input);
    const issues = [
        ...validateFormChoiceProcessResult(processResult),
        ...validateDialogExecuteShape(processResult.execute),
        ...validateLlmOutputShape(processResult)
    ];
    if (issues.length > 0) {
        if (shouldEnforceTransformStrictMode()) {
            const codes = issues.map((i) => i.code).join(', ');
            throw new Error(`Form-choice transform contract violation: ${codes}`);
        }
        logger.warn('[FormChoicePipeline] Transform result validation warnings', {
            issues: issues.map((i) => i.code),
            choiceId: input.choice_id,
        });
    }
    return processResult;
}

export function buildProcessResultFromForm(
    fp: Record<string, unknown>,
    input: Record<string, unknown>
): ProcessResult {
    const choiceId = String(input.choice_id ?? '');
    const formId = (input.form_id as string) || 'default';
    const selection = { choiceId, formId, timestamp: new Date().toISOString() };

    const outcome = fp.outcome as ProcessOutcome;
    const out: Record<string, unknown> = {
        outcome,
        message: fp.message,
        selection,
    };

    if (fp.context && typeof fp.context === 'object') {
        out.context = fp.context as Record<string, unknown>;
    }

    if (fp.execute && typeof fp.execute === 'object') {
        out.execute = fp.execute;
    }

    if (fp.aiActions && typeof fp.aiActions === 'object') {
        out.aiActions = fp.aiActions;
    }

    return out as unknown as ProcessResult;
}
