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
        expect(result.message.action).toBeDefined();
        expect(result.message.action?.currentStep).toBeDefined();
        expect(result.message.action?.currentStep?.id).toBe('vue-import-detect');
        expect(result.message.action?.currentStep?.code).toBeDefined();
        expect(result.message.action?.currentStep?.code).toContain('export default async function');
    });

    it('should process step result and return next step', async () => {
        const sessionId = 'test-session-002';

        // Step 1: Start action
        const startResult = await actionProcessor.processTaskRequest(
            sessionId,
            'исправить импорты в vue'
        );

        expect(startResult.continue).toBe(true);
        expect(startResult.message.action?.currentStep?.id).toBe('vue-import-detect');

        // Step 2: Send step result
        const stepResult = {
            broken_imports: [
                {file: 'src/App.vue', line: 5, specifier: './components/Button'}
            ]
        };

        const nextResult = await actionProcessor.processStepResult(
            sessionId,
            'vue-import-detect',
            stepResult
        );

        expect(nextResult.continue).toBe(true);
        expect(nextResult.message.action?.currentStep?.id).toBe('vue-import-resolve');
        expect(nextResult.message.action?.currentStep?.code).toBeDefined();
    });

    it('should complete action after all steps', async () => {
        const sessionId = 'test-session-003';

        // Start
        await actionProcessor.processTaskRequest(sessionId, 'vue import fix');

        // Step 1: detect
        const result1 = await actionProcessor.processStepResult(sessionId, 'vue-import-detect', {
            broken_imports: [{file: 'test.vue', line: 1, specifier: './missing'}]
        });
        expect(result1.continue).toBe(true);

        // Step 2: resolve
        const result2 = await actionProcessor.processStepResult(sessionId, 'vue-import-resolve', {
            patches: [{file: 'test.vue', line: 1, from: './missing', to: './found'}]
        });
        expect(result2.continue).toBe(true);

        // Step 3: apply
        const result3 = await actionProcessor.processStepResult(sessionId, 'vue-import-apply', {
            fixed_files: ['test.vue']
        });
        expect(result3.continue).toBe(true);

        // Step 4: cleanup
        const result4 = await actionProcessor.processStepResult(sessionId, 'vue-import-cleanup', {
            cleanup_count: 0
        });

        // After last step, action should be completed
        expect(result4.continue).toBe(false);
        expect(result4.message.context?.tasks?.[0]?.status).toBe('completed');
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

        expect(result.message.action?.currentStep?.code).toBeDefined();

        // Code should be valid TypeScript
        const code = result.message.action?.currentStep?.code;
        expect(code).toContain('import');
        expect(code).toContain('export default async function');
        expect(code).toContain('broken_imports');
    });

    it('should track progress through steps', async () => {
        const sessionId = 'test-session-006';

        // Start
        const start = await actionProcessor.processTaskRequest(sessionId, 'vue imports');
        expect(start.message.context?.tasks?.[0]?.progress).toBe(0);

        // After step 1
        const after1 = await actionProcessor.processStepResult(sessionId, 'vue-import-detect', {
            broken_imports: []
        });
        expect(after1.message.context?.tasks?.[0]?.progress).toBeGreaterThan(0);
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
        expect(result.message).toHaveProperty('context');
        expect(result.message).toHaveProperty('message');
        expect(result.message).toHaveProperty('action');

        // Check context structure
        expect(result.message.context).toHaveProperty('version');
        expect(result.message.context).toHaveProperty('session_id');
        expect(result.message.context).toHaveProperty('tasks');

        // Check action structure
        expect(result.message.action).toHaveProperty('id');
        expect(result.message.action).toHaveProperty('title');
        expect(result.message.action).toHaveProperty('currentStep');
        expect(result.message.action).toHaveProperty('nextSteps');

        // Check currentStep structure
        const step = result.message.action?.currentStep;
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('code');

        // Check nextSteps structure
        const nextSteps = result.message.action?.nextSteps;
        expect(Array.isArray(nextSteps)).toBe(true);
        expect(nextSteps?.length).toBeGreaterThan(0);
        expect(nextSteps?.[0]).toHaveProperty('id');
        expect(nextSteps?.[0]).toHaveProperty('title');
    });
});
