import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { runTransformPipelineFromFile } from '../../src/transform/pipeline.js';
import { buildProcessResultFromForm, runFormChoicePipeline } from '../../src/services/core/request-processor/form-choice-pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORM_CHOICE = path.join(__dirname, '../../prompts/transforms/form-choice-response.json');

describe('form-choice pipeline', () => {
    it('routes agent to ai_action_ready', async () => {
        const res = await runFormChoicePipeline({ choice_id: 'agent', form_id: 'default' });
        expect(res?.outcome).toBe('ai_action_ready');
        expect(res?.execute?.message).toMatch(/Agent/);
        expect(res?.aiActions?.action).toBe('agent');
    });

    it('routes dialog and sets task default in buildProcessResultFromForm', async () => {
        const raw = await runTransformPipelineFromFile(FORM_CHOICE, { choice_id: 'dialog', form_id: 'default' }, {});
        expect(raw.success).toBe(true);
        const fp = raw.output.formProcessResult as Record<string, unknown>;
        const pr = buildProcessResultFromForm(fp, { choice_id: 'dialog', task: undefined });
        expect(pr.context?.task).toBe('диалог');
        const pr2 = buildProcessResultFromForm(fp, { choice_id: 'dialog', task: 'hello' });
        expect(pr2.context?.task).toBe('hello');
    });

    it('default branch uses exact-only routing (unknown id)', async () => {
        const res = await runFormChoicePipeline({ choice_id: 'unknown-mode-xyz', form_id: 'default' });
        expect(res?.outcome).toBe('completed');
        expect(res?.execute?.message).toBe('Вибрано: unknown-mode-xyz');
    });

    it('does not substring-match dialog inside another id (exactOnly)', async () => {
        const res = await runFormChoicePipeline({ choice_id: 'my-dialog-extra', form_id: 'default' });
        expect(res?.outcome).toBe('completed');
        expect(res?.execute?.message).toBe('Вибрано: my-dialog-extra');
        expect(res?.context).toBeUndefined();
    });
});
