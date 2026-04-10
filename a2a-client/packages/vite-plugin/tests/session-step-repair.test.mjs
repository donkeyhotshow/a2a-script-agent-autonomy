import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  inferSubmitResultFromRequestToServerPayload,
  repairMissingClientResultForStep,
  validateStepStorage,
} from '../../packages/vite-plugin/storage/session-step-io.js';

describe('inferSubmitResultFromRequestToServerPayload', () => {
  it('prefers result object', () => {
    expect(inferSubmitResultFromRequestToServerPayload({ result: { choice: 'agent' } })).toEqual({
      choice: 'agent',
    });
  });

  it('uses task as message when result missing', () => {
    expect(inferSubmitResultFromRequestToServerPayload({ task: ' hello ' })).toEqual({ message: 'hello' });
  });
});

describe('repairMissingClientResultForStep', () => {
  it('writes client-result from request-to-server', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sess-repair-'));
    const storageRoot = path.join(tmp, 'client-storage');
    const sid = 'sess_test_repair';
    const stepDir = path.join(storageRoot, 'sessions', sid, '3');
    fs.mkdirSync(stepDir, { recursive: true });
    fs.writeFileSync(
      path.join(stepDir, 'request-to-server.json'),
      JSON.stringify({ result: { message: 'x' }, task: 'ignored' }, null, 2)
    );
    const prev = process.env.A2A_CLIENT_STORAGE_DIR;
    process.env.A2A_CLIENT_STORAGE_DIR = storageRoot;
    try {
      const r = repairMissingClientResultForStep(storageRoot, sid, 3, {});
      expect(r.fixed).toBe(true);
      const client = JSON.parse(fs.readFileSync(path.join(stepDir, 'client-result.json'), 'utf8'));
      expect(client.result).toEqual({ message: 'x' });
      const v = validateStepStorage(storageRoot, sid, 3);
      expect(v.errors.some((e) => e.includes('REQUEST_WITHOUT_CLIENT_RESULT'))).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.A2A_CLIENT_STORAGE_DIR;
      else process.env.A2A_CLIENT_STORAGE_DIR = prev;
    }
  });
});
