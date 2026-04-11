import {describe, expect, it} from 'vitest';
import * as fs from 'node:fs/promises';
import {mkdtempOsTmp} from '../../src/utils/mkdtemp-os-tmp';

describe('mkdtempOsTmp', () => {
    it('creates a directory under OS tmp with given prefix', async () => {
        const dir = await mkdtempOsTmp('a2a-mkdtemp-test-');
        try {
            expect(dir).toMatch(/a2a-mkdtemp-test-/);
            const st = await fs.stat(dir);
            expect(st.isDirectory()).toBe(true);
        } finally {
            await fs.rm(dir, {recursive: true, force: true});
        }
    });
});
