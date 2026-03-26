import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { kvGet } from '../../vite-plugin-a2a/storage/kv.js';

describe('kv parse errors', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a2a-kv-'));
        process.env.A2A_CLIENT_STORAGE_DIR = tmpDir;
    });

    afterEach(() => {
        delete process.env.A2A_CLIENT_STORAGE_DIR;
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('throws KV_PARSE_ERROR when json is invalid', () => {
        const fileDir = path.join(tmpDir, 'kv', 'ui');
        fs.mkdirSync(fileDir, { recursive: true });
        fs.writeFileSync(path.join(fileDir, 'broken.json'), '{not-json', 'utf8');

        let thrown = null;
        try {
            kvGet(process.cwd(), 'ui', 'broken');
        } catch (err) {
            thrown = err;
        }

        expect(thrown).toBeTruthy();
        expect(thrown.code).toBe('KV_PARSE_ERROR');
    });
});
