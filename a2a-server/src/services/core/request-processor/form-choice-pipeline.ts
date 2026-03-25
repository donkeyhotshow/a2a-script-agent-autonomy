/**
 * Form router choice → ProcessResult via JSON transform pipeline (prompts/transforms/form-choice-response.json).
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { runTransformPipelineFromFile } from '../../../transform/pipeline.js';
import type { ProcessOutcome, ProcessResult } from './request-processor.interfaces.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORM_CHOICE_PIPELINE = path.join(__dirname, '../../../../prompts/transforms/form-choice-response.json');

export async function runFormChoicePipeline(input: Record<string, unknown>): Promise<ProcessResult | null> {
    const res = await runTransformPipelineFromFile(FORM_CHOICE_PIPELINE, input, {});
    if (!res.success) {
        return {
            outcome: 'failed',
            error: res.error || 'Form choice pipeline failed',
        };
    }
    const fp = res.output.formProcessResult as Record<string, unknown> | undefined;
    if (!fp || typeof fp.outcome !== 'string') {
        return null;
    }
    return buildProcessResultFromForm(fp, input);
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
        const ctx = { ...(fp.context as Record<string, unknown>) };
        const exec = ctx.execution as Record<string, unknown> | undefined;
        if (exec?.action === 'dialog' && exec?.step === 'request') {
            const t = input.task as string | undefined;
            ctx.task = t || 'диалог';
        }
        out.context = ctx;
    }

    if (fp.execute && typeof fp.execute === 'object') {
        out.execute = fp.execute;
    }

    if (fp.aiActions && typeof fp.aiActions === 'object') {
        out.aiActions = fp.aiActions;
    }

    return out as ProcessResult;
}
