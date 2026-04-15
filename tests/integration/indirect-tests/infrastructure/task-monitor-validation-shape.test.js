/**
 * Task monitor session shape checks (must match Client API / web execute DTO).
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  TaskMonitorValidation,
  validateClientSession,
  validatePartialSessionEnvelope,
  isTaskMonitorSessionValidationDisabled,
} from '../../../../scripts/monitor-tasks/task-monitor-validation.js';

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

describe('validateClientSession', () => {
  it('accepts minimal Vite-style session with id', () => {
    const r = validateClientSession({
      id: 'sess_1_abc',
      execute: { message: 'OK' },
      asyncPending: false,
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejects missing id when requireId is true (default)', () => {
    const r = validateClientSession({ execute: { message: 'x' } });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/id/i);
  });

  it('allows missing id when requireId is false', () => {
    const r = validateClientSession({ execute: { message: 'x' } }, { requireId: false });
    expect(r.valid).toBe(true);
  });

  it('rejects invalid context.result shape when checkContextResult', () => {
    const r = validateClientSession(
      {
        id: 's1',
        context: {
          result: { 'read-file': { path: 'a' }, 'grep-search': { pattern: 'x' } },
        },
      },
      { requireId: true }
    );
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('context.result'))).toBe(true);
  });

  it('validates messages array when checkMessages', () => {
    expect(
      validateClientSession(
        { id: 's1', messages: [] },
        { checkMessages: true }
      ).valid
    ).toBe(true);
    expect(
      validateClientSession(
        { id: 's1', messages: {} },
        { checkMessages: true }
      ).valid
    ).toBe(false);
  });

  it('delegates from TaskMonitorValidation.validateClientSession', () => {
    const v = new TaskMonitorValidation();
    expect(v.validateClientSession({ id: 'x', execute: { form: {} } }).valid).toBe(true);
  });
});

describe('validatePartialSessionEnvelope', () => {
  it('accepts /next-style execute with message + one tool key', () => {
    const r = validatePartialSessionEnvelope({
      execute: { message: 'x', 'read-file': { path: 'a' } },
    });
    expect(r.valid).toBe(true);
  });

  it('rejects two tool keys on execute', () => {
    const r = validatePartialSessionEnvelope({
      execute: { 'read-file': {}, 'list-directory': {} },
    });
    expect(r.valid).toBe(false);
  });
});

describe('isTaskMonitorSessionValidationDisabled', () => {
  const key = 'TASK_MONITOR_VALIDATE_SESSION';
  const prev = process.env[key];

  afterEach(() => {
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  });

  it('is false when env unset (default validate)', () => {
    delete process.env[key];
    expect(isTaskMonitorSessionValidationDisabled()).toBe(false);
  });

  it('is true when env is 0', () => {
    process.env[key] = '0';
    expect(isTaskMonitorSessionValidationDisabled()).toBe(true);
  });
});
