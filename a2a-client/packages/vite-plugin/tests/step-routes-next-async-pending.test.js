/**
 * POST /sessions/:id/next must return 409 when a step still has an in-flight server promise
 * (Orange / async-only — no overlapping /next).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { handleNextStep } from '../src/routes/step-routes-dialog-flow.js';
import {
  saveNewStep,
  saveServerPromise,
  reconcileSessionIndexFromDisk,
  clearStepSessionsParentRegistry,
} from '@a2a-client/storage/newSessions.ts';

let testDir;
const sessionId = 'sess_1775590000001';

beforeAll(() => {
  testDir = path.join(os.tmpdir(), `a2a-next-async-${Date.now()}`);
  process.env.A2A_CLIENT_STORAGE_DIR = testDir;
});

afterAll(() => {
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (_) {}
  delete process.env.A2A_CLIENT_STORAGE_DIR;
});

describe('handleNextStep async_pending guard', () => {
  const cwd = testDir;

  beforeEach(() => {
    clearStepSessionsParentRegistry();
    const sessionsRoot = path.join(testDir, 'sessions');
    if (fs.existsSync(sessionsRoot)) {
      fs.rmSync(sessionsRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(sessionsRoot, sessionId), { recursive: true });
    saveNewStep(cwd, sessionId, 1, {
      step: 1,
      title: 'S1',
      execute: { form: { input: [{ name: 'task', type: 'text' }] } },
      messages: [],
      context: { execution: { action: 'dialog', step: 'new' } },
    });
    saveServerPromise(cwd, sessionId, 2, {
      promiseId: 'prom_unit_async_pending',
      status: 'pending',
      submittedAt: new Date().toISOString(),
    });
    reconcileSessionIndexFromDisk(cwd, sessionId);
  });

  it('returns 409 async_pending when server-promise is still active', () => {
    const req = new EventEmitter();
    req.method = 'POST';

    const res = {
      writeHead() {
        return res;
      },
      setHeader() {
        return res;
      },
      end(body) {
        res._body = body;
      },
    };

    const handled = handleNextStep({
      cwd,
      path: `/sessions/${sessionId}/next`,
      req,
      res,
      storageMode: 'storage',
    });
    expect(handled).toBe(true);

    req.emit('data', JSON.stringify({ task: 'hello' }));
    req.emit('end');

    const payload = JSON.parse(res._body);
    expect(payload.error).toBe('async_pending');
    expect(payload.message).toMatch(/async/);
  });
});
