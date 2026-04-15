/**
 * Unit tests for packages/vite-plugin storage modules
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
  clearStepSessionsParentRegistry,
  registerStepSessionsParent,
} from '@a2a-client/storage/newSessions.ts';
import {
  getActiveAsyncWork,
  getProjectModeInflightPromise,
} from '../src/routes/utils/session-projection-dto.js';
import { collectSessionMessagesFlat } from '../src/routes/utils/message-timeline.js';

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

  beforeEach(() => {
    clearStepSessionsParentRegistry();
  });

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
      execute: { form: { input: [{ name: 'task' }] } },
      messages: [{ role: 'user', content: 'hello' }],
      context: {},
    };
    saveNewStep(cwd, sessionId, 1, stepData);
    const loaded = loadNewStep(cwd, sessionId, 1);
    expect(loaded).not.toBeNull();
    expect(loaded.step).toBe(1);
    expect(loaded.execute.form.input[0].name).toBe('task');
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

  it('getActiveAsyncWork returns first step with pending promise', () => {
    const sid = 'sess_active_async_1';
    saveNewStep(cwd, sid, 1, { execute: {}, messages: [], context: {} });
    saveServerPromise(cwd, sid, 2, { promiseId: 'prom_x', status: 'pending' });
    const hit = getActiveAsyncWork(cwd, sid);
    expect(hit?.stepNum).toBe(2);
    expect(hit?.promiseId).toBe('prom_x');
    deleteNewSession(cwd, sid);
  });

  it('collectSessionMessagesFlat keeps deterministic source order per step', () => {
    const sid = 'sess_timeline_order';
    saveNewStep(cwd, sid, 1, {
      execute: { message: 'exec msg' },
      messages: [{ role: 'assistant', content: 'step msg' }],
      context: { history: [{ role: 'assistant', message: 'history msg' }] },
    });
    saveClientResult(cwd, sid, 1, { result: { message: 'user msg' } });
    const { messages } = collectSessionMessagesFlat(cwd, sid);
    expect(messages.map((m) => `${m.source}:${m.content}`)).toEqual([
      'history:history msg',
      'execute:exec msg',
      'step-messages:step msg',
      'client-result:user msg',
    ]);
    deleteNewSession(cwd, sid);
  });

  it('loadNewStep drops stale completed server-promise beside server-response', () => {
    const sid = 'sess_stale_promise';
    saveNewStep(cwd, sid, 1, { execute: {}, messages: [], context: {} });
    const stepDir = getNewStepDir(cwd, sid, 1);
    saveServerPromise(cwd, sid, 1, { promiseId: 'p_old', status: 'completed' });
    expect(fs.existsSync(path.join(stepDir, 'server-promise.json'))).toBe(true);
    loadNewStep(cwd, sid, 1);
    expect(fs.existsSync(path.join(stepDir, 'server-promise.json'))).toBe(false);
    deleteNewSession(cwd, sid);
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

  it('getProjectModeInflightPromise finds pending server-promise under project session-steps', () => {
    const projectPath = path.join(testDir, 'fake-project-root');
    const sid = 'sess_project_inflight';
    const stepsRoot = path.join(projectPath, '.a2a', 'session-steps');
    fs.mkdirSync(stepsRoot, { recursive: true });
    registerStepSessionsParent(sid, stepsRoot);
    try {
      saveNewStep(cwd, sid, 1, { execute: {}, messages: [], context: {} });
      saveServerPromise(cwd, sid, 2, { promiseId: 'prom_proj', status: 'pending' });
    } finally {
      registerStepSessionsParent(sid, null);
    }
    const hit = getProjectModeInflightPromise(cwd, sid, projectPath, { promiseId: null });
    expect(hit?.promiseId).toBe('prom_proj');
    fs.rmSync(path.join(stepsRoot, sid), { recursive: true, force: true });
  });

  it('getProjectModeInflightPromise falls back to session snapshot when no step files', () => {
    const projectPath = path.join(testDir, 'fake-project-root-2');
    const hit = getProjectModeInflightPromise(cwd, 'sess_no_steps', projectPath, {
      promiseId: 'prom_snap',
      promiseStatus: 'processing',
    });
    expect(hit?.promiseId).toBe('prom_snap');
  });

  it('getProjectModeInflightPromise ignores completed snapshot promise', () => {
    const projectPath = path.join(testDir, 'fake-project-root-3');
    const hit = getProjectModeInflightPromise(cwd, 'sess_done', projectPath, {
      promiseId: 'prom_old',
      promiseStatus: 'completed',
    });
    expect(hit).toBeNull();
  });
});
