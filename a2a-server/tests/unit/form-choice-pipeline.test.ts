import { describe, it, expect } from 'vitest';
import { runFormChoicePipeline } from '../../src/services/core/request-processor/form-choice-pipeline.js';

describe('form-choice pipeline', () => {
    it('routes agent to ai_action_ready', async () => {
        const res = await runFormChoicePipeline({ choice_id: 'agent', form_id: 'default' });
        expect(res?.outcome).toBe('ai_action_ready');
        expect(res?.message).toMatch(/Agent/i);
        expect((res?.execute as { form?: { title?: string } })?.form?.title).toMatch(/Agent/i);
        expect(res?.aiActions?.action).toBe('agent');
    });

    it('routes dialog and sets task default', async () => {
        const res1 = await runFormChoicePipeline({ choice_id: 'dialog', form_id: 'default' });
        expect(res1?.context?.task).toBe('диалог');
        const res2 = await runFormChoicePipeline({ choice_id: 'dialog', form_id: 'default', task: 'hello' });
        expect(res2?.context?.task).toBe('hello');
    });

    it('default branch uses exact-only routing (unknown id)', async () => {
        const res = await runFormChoicePipeline({ choice_id: 'unknown-mode-xyz', form_id: 'default' });
        expect(res?.outcome).toBe('completed');
        const form = (res?.execute as { form?: { description?: string } })?.form;
        expect(form?.description).toBe('Вибрано: unknown-mode-xyz');
    });

    it('does not substring-match dialog inside another id (exactOnly)', async () => {
        const res = await runFormChoicePipeline({ choice_id: 'my-dialog-extra', form_id: 'default' });
        expect(res?.outcome).toBe('completed');
        const form = (res?.execute as { form?: { description?: string } })?.form;
        expect(form?.description).toBe('Вибрано: my-dialog-extra');
        expect(res?.context).toBeUndefined();
    });
});
