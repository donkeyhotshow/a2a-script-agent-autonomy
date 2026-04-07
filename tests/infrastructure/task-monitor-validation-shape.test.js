/**
 * Task monitor session shape checks (must match Client API / web execute DTO).
 */
import { describe, it, expect } from 'vitest';
import { TaskMonitorValidation } from '../../tests/monitor-tasks/task-monitor-validation.js';

describe('TaskMonitorValidation.validateSessionResponse', () => {
  const v = new TaskMonitorValidation();

  it('accepts execute with message only (agent completion surface)', () => {
    expect(
      v.validateSessionResponse({
        execute: { message: 'Done.' },
        context: { execution: { action: 'agent', step: 'completed' } },
      }).valid
    ).toBe(true);
  });

  it('accepts execute with message + one tool key', () => {
    expect(
      v.validateSessionResponse({
        execute: {
          message: 'Reading…',
          'read-file': { path: 'README.md' },
        },
      }).valid
    ).toBe(true);
  });

  it('accepts execute with form + message (router)', () => {
    expect(
      v.validateSessionResponse({
        execute: {
          message: 'Pick',
          form: { choices: [{ id: 'a', label: 'A' }] },
        },
      }).valid
    ).toBe(true);
  });

  it('rejects two tool keys', () => {
    expect(
      v.validateSessionResponse({
        execute: {
          'read-file': { path: 'a' },
          'list-directory': { path: '.' },
        },
      }).valid
    ).toBe(false);
  });
});
