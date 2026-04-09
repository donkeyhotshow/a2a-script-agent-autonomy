/**
 * Integration test for iterative action exchange
 * Tests the full flow: new_task → action_proposal → step_result → next_step → ... → completed
 */

import {describe, it, expect, beforeAll} from 'vitest';
import {actionProcessor} from '../../src/actions/action-processor.js';

describe('Action Iteration Flow', () => {
    beforeAll(async () => {
        await actionProcessor.initialize();
    });

    it('should find action for vue imports task', async () => {
        const sessionId = 'test-session-001';
        const taskDescription = 'исправить импорты в vue файлах';

        const result = await actionProcessor.processTaskRequest(sessionId, taskDescription);

        expect(result.continue).toBe(true);
        expect(result.actionId).toBe('fix-vue-imports');
        expect(result.message).toBeDefined();
        expect(result.context?.execution?.step).toBe('vue-import-detect');
        const ex0 = result.execute;
        expect(ex0 && 'script' in ex0 && ex0.script?.code).toBeDefined();
        expect(String(ex0 && 'script' in ex0 ? ex0.script?.code : '')).toContain(
            'export default async function'
        );
    });

    it('should process step result and return next step', async () => {
        const sessionId = 'test-session-002';

        // Step 1: Start action
        const startResult = await actionProcessor.processTaskRequest(
            sessionId,
            'исправить импорты в vue'
        );

        expect(startResult.continue).toBe(true);
        expect(startResult.context?.execution?.step).toBe('vue-import-detect');

        const stepResult = {rootDir: '.'};

        const nextResult = await actionProcessor.processStepResult(
            sessionId,
            'vue-import-detect',
            stepResult
        );

        expect(nextResult.continue).toBe(true);
        expect(nextResult.context?.execution?.step).toBe('vue-import-resolve');
        const ex1 = nextResult.execute;
        expect(ex1 && 'script' in ex1 && ex1.script?.code).toBeDefined();
    });

    it('should complete action after all steps', async () => {
        const sessionId = 'test-session-003';

        let result = await actionProcessor.processTaskRequest(sessionId, 'vue import fix');
        expect(result.continue).toBe(true);

        let guard = 0;
        while (result.continue) {
            const step = result.context?.execution?.step;
            expect(step).toBeDefined();
            result = await actionProcessor.processStepResult(sessionId, step!, {step});
            guard += 1;
            if (guard > 20) throw new Error('too many steps');
        }

        expect(result.context?.tasks?.[0]?.status).toBe('completed');
    });

    it('should return no action for unknown task', async () => {
        const sessionId = 'test-session-004';
        const taskDescription = 'запустить ракету на марс';

        const result = await actionProcessor.processTaskRequest(sessionId, taskDescription);

        // With MIN_MATCH_SCORE threshold, irrelevant tasks should not match any action
        expect(result).toBeDefined();
        expect(result.message).toBeDefined();
        expect(result.actionId).toBeUndefined();
        expect(result.continue).toBe(false);
    });

    it('should include code in action response', async () => {
        const sessionId = 'test-session-005';

        const result = await actionProcessor.processTaskRequest(
            sessionId,
            'исправить импорты'
        );

        const ex2 = result.execute;
        expect(ex2 && 'script' in ex2 && ex2.script?.code).toBeDefined();

        // Code should be valid TypeScript
        const code = ex2 && 'script' in ex2 ? ex2.script?.code : '';
        expect(code).toContain('export default async function');
        expect(code).toContain('return {');
    });

    it('should track progress through steps', async () => {
        const sessionId = 'test-session-006';

        // Start
        const start = await actionProcessor.processTaskRequest(sessionId, 'vue imports');
        // action_proposal message doesn't include tasks (see buildActionProposalMessage)
        expect(start.context?.tasks).toBeUndefined();

        // After step 1
        const firstStep = start.context?.execution?.step;
        expect(firstStep).toBeDefined();
        const after1 = await actionProcessor.processStepResult(sessionId, firstStep!, {
            files: [],
        });
        expect(after1.context?.tasks?.[0]?.progress).toBeGreaterThan(0);
    });
});

describe('Action Message Format', () => {
    beforeAll(async () => {
        await actionProcessor.initialize();
    });

    it('should return properly formatted action proposal', async () => {
        const result = await actionProcessor.processTaskRequest(
            'test-session-010',
            'исправить импорты в vue'
        );

        // Check message structure
        expect(typeof result.message).toBe('string');
        expect(result.context).toBeDefined();
        expect(result.execute).toBeDefined();

        // Check context structure
        // action_proposal message doesn't include tasks (see buildActionProposalMessage)
        expect(result.context).not.toHaveProperty('tasks');

        expect(result.context?.execution?.action).toBe('fix-vue-imports');
        expect(result.context?.execution?.step).toBe('vue-import-detect');
        const ex = result.execute;
        expect(ex && 'script' in ex && ex.script?.code).toBeDefined();
    });
});
