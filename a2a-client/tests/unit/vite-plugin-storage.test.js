/**
 * Unit tests for vite-plugin-a2a storage modules
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  getNewSessionsDir,
  getNewSessionDir,
  getNewStepDir,
  saveNewSession,
  loadNewSession,
  saveNewStep,
  loadNewStep,
  listNewSteps,
  listNewSessions,
  deleteNewSession,
  saveServerPromise,
  loadServerPromise,
  saveClientResult,
  loadClientResult,
  saveRequestToServer,
  loadRequestToServer,
  loadStepFile,
} from '../../vite-plugin-a2a/storage/newSessions.js';

let testDir;

beforeAll(() => {
  testDir = path.join(os.tmpdir(), `a2a-storage-test-${Date.now()}`);
  process.env.A2A_CLIENT_STORAGE_DIR = testDir;
});

afterAll(() => {
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (_) {}
  delete process.env.A2A_CLIENT_STORAGE_DIR;
});

describe('newSessions storage', () => {
  const cwd = testDir;
  const sessionId = 'sess_test_123';

  it('getNewSessionsDir returns sessions path', () => {
    const dir = getNewSessionsDir(cwd);
    expect(dir).toContain('sessions');
    expect(dir).toContain(testDir);
  });

  it('saveNewSession and loadNewSession round-trip', () => {
    const session = { id: sessionId, title: 'Test', createdAt: new Date().toISOString() };
    saveNewSession(cwd, session);
    saveNewStep(cwd, sessionId, 1, {
      step: 1,
      title: 'Test',
      execute: null,
      messages: [],
      context: {},
    });
    const loaded = loadNewSession(cwd, sessionId);
    expect(loaded).not.toBeNull();
    expect(loaded.id).toBe(sessionId);
    expect(loaded.title).toBe('Test');
  });

  it('saveNewStep and loadNewStep round-trip', () => {
    const stepData = {
      step: 1,
      title: 'Test',
      execute: { form: { input: { name: 'task' } } },
      messages: [{ role: 'user', content: 'hello' }],
      context: {},
    };
    saveNewStep(cwd, sessionId, 1, stepData);
    const loaded = loadNewStep(cwd, sessionId, 1);
    expect(loaded).not.toBeNull();
    expect(loaded.step).toBe(1);
    expect(loaded.execute.form.input.name).toBe('task');
    expect(loaded.messages).toHaveLength(1);
    expect(loaded.messages[0].content).toBe('hello');
  });

  it('listNewSteps returns sorted step numbers', () => {
    saveNewStep(cwd, sessionId, 3, { execute: {}, messages: [] });
    saveNewStep(cwd, sessionId, 2, { execute: {}, messages: [] });
    const steps = listNewSteps(cwd, sessionId);
    expect(steps).toEqual([1, 2, 3]);
  });

  it('saveServerPromise, loadServerPromise round-trip', () => {
    const promise = { promiseId: 'p1', status: 'pending', submittedAt: new Date().toISOString() };
    saveServerPromise(cwd, sessionId, 2, promise);
    const loaded = loadServerPromise(cwd, sessionId, 2);
    expect(loaded).not.toBeNull();
    expect(loaded.promiseId).toBe('p1');
    expect(loaded.status).toBe('pending');
  });

  it('saveClientResult, loadClientResult round-trip', () => {
    const result = { result: { message: 'my task' } };
    saveClientResult(cwd, sessionId, 1, result);
    const loaded = loadClientResult(cwd, sessionId, 1);
    expect(loaded).not.toBeNull();
    expect(loaded.result.message).toBe('my task');
  });

  it('saveRequestToServer, loadRequestToServer round-trip', () => {
    const req = { step: 2, result: { message: 'hello' }, context: {} };
    saveRequestToServer(cwd, sessionId, 2, req);
    const loaded = loadRequestToServer(cwd, sessionId, 2);
    expect(loaded).not.toBeNull();
    expect(loaded.result.message).toBe('hello');
  });

  it('loadStepFile returns null for missing file', () => {
    const loaded = loadStepFile(cwd, sessionId, 99, 'nonexistent.json');
    expect(loaded).toBeNull();
  });

  it('listNewSessions returns session list', () => {
    const sessions = listNewSessions(cwd);
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    const found = sessions.find((s) => s.id === sessionId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Test');
  });

  it('deleteNewSession removes session dir', () => {
    deleteNewSession(cwd, sessionId);
    const loaded = loadNewSession(cwd, sessionId);
    expect(loaded).toBeNull();
  });
});
