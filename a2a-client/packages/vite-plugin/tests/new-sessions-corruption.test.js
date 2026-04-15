import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { loadNewSession } from '@a2a-client/storage/newSessions.ts';

describe('newSessions corruption handling', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a2a-newsessions-'));
        process.env.A2A_CLIENT_STORAGE_DIR = tmpDir;
    });

    afterEach(() => {
        delete process.env.A2A_CLIENT_STORAGE_DIR;
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns explicit corrupt session when step files are unreadable', () => {
        const sessionId = 'sess_corrupt_1';
        const stepDir = path.join(tmpDir, 'sessions', sessionId, '1');
        fs.mkdirSync(stepDir, { recursive: true });
        fs.writeFileSync(path.join(stepDir, 'server-response.json'), '{ bad json', 'utf8');

        const session = loadNewSession(process.cwd(), sessionId);
        expect(session).toBeTruthy();
        expect(session.status).toBe('corrupt');
        expect(session.error?.code).toBe('SESSION_CORRUPT');
    });
});
