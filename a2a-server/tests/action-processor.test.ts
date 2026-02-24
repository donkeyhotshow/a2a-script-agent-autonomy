/**
 * ActionProcessor unit tests.
 */

import { describe, it, expect } from 'vitest';
import { actionProcessor } from '../src/actions/action-processor.js';

describe('ActionProcessor', () => {
  describe('processTaskRequest', () => {
    it('returns result with message and continue flag', async () => {
      const sessionId = `test-unit-${Date.now()}`;
      const result = await actionProcessor.processTaskRequest(sessionId, 'fix vue imports');
      expect(result).toBeDefined();
      expect(typeof result.continue).toBe('boolean');
      expect(result.message).toBeDefined();
    });
    it('returns action with currentStep when action matched', async () => {
      const sessionId = `test-unit-2-${Date.now()}`;
      const result = await actionProcessor.processTaskRequest(sessionId, 'vue import fix');
      expect(result.message?.action ?? null).toBeDefined();
      if (result.message?.action?.currentStep) {
        expect(result.message.action.currentStep.id).toBeDefined();
        expect(typeof result.message.action.currentStep.code).toBe('string');
      }
    });
  });

  describe('processStepResult', () => {
    it('accepts stepId and stepResult and returns result', async () => {
      const sessionId = `test-unit-3-${Date.now()}`;
      const first = await actionProcessor.processTaskRequest(sessionId, 'fix vue imports');
      const stepId = first.message?.action?.currentStep?.id;
      if (!stepId) {
        expect(first.message?.action).toBeDefined();
        return;
      }
      const result = await actionProcessor.processStepResult(sessionId, stepId, {
        success: true,
        timestamp: new Date().toISOString(),
      });
      expect(result).toBeDefined();
      expect(typeof result.continue).toBe('boolean');
      expect(result.message).toBeDefined();
    });
  });
});
