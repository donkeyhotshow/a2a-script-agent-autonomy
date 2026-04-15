import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';

import {RequestFileStorage} from '../../src/services/core/request/request-file-storage.js';

describe('RequestFileStorage', () => {
    let dir: string | undefined;
    const cleanup = async () => {
        if (dir) {
            await fs.rm(dir, {recursive: true, force: true});
            dir = undefined;
        }
    };

    afterEach(cleanup);

    it('returns null and quarantines corrupt JSON on load', async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'req-storage-'));
        const storage = new RequestFileStorage(dir);
        const promiseId = 'prom_test_corrupt';
        const bad = '{"id":"x",\n  unterminated';
        await fs.writeFile(path.join(dir, `${promiseId}.json`), bad, 'utf-8');

        const loaded = await storage.load(promiseId);
        expect(loaded).toBeNull();

        const names = await fs.readdir(dir);
        expect(names.includes(`${promiseId}.json`)).toBe(false);
        expect(names.some((n) => n.startsWith(promiseId) && n.includes('.corrupt.'))).toBe(true);
    });
});
