import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const accessMock = vi.fn();

vi.mock('node:fs/promises', async (importOriginal) => {
    const mod = await importOriginal<typeof import('node:fs/promises')>();
    return {...mod, access: (...a: Parameters<typeof mod.access>) => accessMock(...a)};
});

import {
    pathIsAccessible,
    timestampedBackupPath,
} from '../../src/utils/fs-access.js';

describe('pathIsAccessible', () => {
    beforeEach(() => {
        accessMock.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns true when fs.access resolves', async () => {
        accessMock.mockResolvedValue(undefined);
        await expect(pathIsAccessible('/some/path')).resolves.toBe(true);
    });

    it('returns false on ENOENT without calling onNonEnoent', async () => {
        const err = Object.assign(new Error('ENOENT'), {code: 'ENOENT'});
        accessMock.mockRejectedValue(err);
        const cb = vi.fn();
        await expect(pathIsAccessible('/missing', cb)).resolves.toBe(false);
        expect(cb).not.toHaveBeenCalled();
    });

    it('returns false and invokes onNonEnoent for EACCES', async () => {
        const err = Object.assign(new Error('permission denied'), {
            code: 'EACCES',
        });
        accessMock.mockRejectedValue(err);
        const cb = vi.fn();
        await expect(pathIsAccessible('/root', cb)).resolves.toBe(false);
        expect(cb).toHaveBeenCalledTimes(1);
        expect(cb.mock.calls[0][0]).toMatchObject({
            filePath: '/root',
            code: 'EACCES',
            error: 'permission denied',
        });
    });

    it('returns false without callback when error has no code', async () => {
        accessMock.mockRejectedValue(new Error('weird'));
        const cb = vi.fn();
        await expect(pathIsAccessible('/x', cb)).resolves.toBe(false);
        expect(cb).not.toHaveBeenCalled();
    });
});

describe('timestampedBackupPath', () => {
    it('appends backup suffix with numeric timestamp', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
        expect(timestampedBackupPath('/a/b.txt')).toBe(
            '/a/b.txt.backup-1700000000000'
        );
        vi.restoreAllMocks();
    });
});
