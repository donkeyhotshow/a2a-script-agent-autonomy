/**
 * File-based storage for requests.
 * Each request stored as {promiseId}.json in storage dir.
 */

import * as fs from 'node:fs/promises';
import * as path from 'path';

import {logger} from '@a2a/server-utils/logger.js';

export type RequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface RequestResult {
    id: string;
    promiseId: string;
    clientId: string;
    status: RequestStatus;
    priority: number;
    context: Record<string, unknown>;
    message: string | null;
    codeBlocks: Array<{ path: string; content: string }> | null;
    result: Record<string, unknown> | null;
    error: Record<string, unknown> | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    retryCount?: number;
    retryAfter?: string;
}

function toSerializable(req: Omit<RequestResult, 'createdAt' | 'startedAt' | 'completedAt'> & {
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
}): RequestResult {
    return {
        ...req,
        createdAt: req.createdAt.toISOString(),
        startedAt: req.startedAt?.toISOString() ?? null,
        completedAt: req.completedAt?.toISOString() ?? null,
    };
}

function fromSerializable(req: RequestResult): Omit<RequestResult, 'createdAt' | 'startedAt' | 'completedAt'> & {
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
} {
    return {
        ...req,
        createdAt: new Date(req.createdAt),
        startedAt: req.startedAt ? new Date(req.startedAt) : null,
        completedAt: req.completedAt ? new Date(req.completedAt) : null,
    };
}

export class RequestFileStorage {
    private storageDir: string;

    constructor(storageDir?: string) {
        this.storageDir = storageDir ?? path.resolve(process.cwd(), 'storage', 'requests');
    }

    private async ensureDir(): Promise<void> {
        await fs.mkdir(this.storageDir, { recursive: true });
    }

    private assertSafeId(promiseId: string): void {
        if (!/^[a-zA-Z0-9_-]+$/.test(promiseId)) {
            throw new Error(`Invalid promiseId: ${promiseId}`);
        }
    }

    private filePath(promiseId: string): string {
        this.assertSafeId(promiseId);
        const resolved = path.resolve(this.storageDir, `${promiseId}.json`);
        if (!resolved.startsWith(path.resolve(this.storageDir) + path.sep)) {
            throw new Error(`Path traversal detected for promiseId: ${promiseId}`);
        }
        return resolved;
    }

    async save(req: Omit<RequestResult, 'createdAt' | 'startedAt' | 'completedAt'> & {
        createdAt: Date;
        startedAt: Date | null;
        completedAt: Date | null;
    }): Promise<void> {
        await this.ensureDir();
        const file = this.filePath(req.promiseId);
        const data = JSON.stringify(toSerializable(req), null, 2);
        await fs.writeFile(file, data, 'utf-8');
    }

    async load(promiseId: string): Promise<(Omit<RequestResult, 'createdAt' | 'startedAt' | 'completedAt'> & {
        createdAt: Date;
        startedAt: Date | null;
        completedAt: Date | null;
    }) | null> {
        const file = this.filePath(promiseId);
        try {
            const data = await fs.readFile(file, 'utf-8');
            const parsed = JSON.parse(data) as RequestResult;
            return fromSerializable(parsed);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
            const isJson =
                err instanceof SyntaxError ||
                (typeof err === 'object' &&
                    err !== null &&
                    (err as Error).name === 'SyntaxError');
            if (isJson) {
                const quarantine = path.resolve(
                    this.storageDir,
                    `${path.basename(promiseId)}.corrupt.${Date.now()}.json`,
                );
                if (!quarantine.startsWith(path.resolve(this.storageDir) + path.sep)) {
                    throw new Error(`Path traversal detected in quarantine path for promiseId: ${promiseId}`);
                }
                try {
                    await fs.rename(file, quarantine);
                } catch {
                    // ignore — file may be gone or rename unsupported
                }
                logger.warn('Corrupt request JSON quarantined; load returns null', {
                    promiseId,
                    quarantine,
                    message: (err as Error).message,
                });
                return null;
            }
            throw err;
        }
    }

    async listAll(): Promise<string[]> {
        await this.ensureDir();
        const entries = await fs.readdir(this.storageDir, { withFileTypes: true });
        return entries
            .filter((e) => e.isFile() && e.name.endsWith('.json'))
            .map((e) => e.name.replace(/\.json$/, ''));
    }

    async listPending(): Promise<string[]> {
        const ids = await this.listAll();
        const pending: string[] = [];
        const now = Date.now();
        for (const id of ids) {
            const req = await this.load(id);
            if (req?.status !== 'pending') continue;
            const retryAfter = (req as unknown as {retryAfter?: string}).retryAfter;
            if (retryAfter && new Date(retryAfter).getTime() > now) continue; // skip if waiting for retry
            pending.push(id);
        }
        return pending;
    }

    async listFailed(): Promise<string[]> {
        const ids = await this.listAll();
        const failed: string[] = [];
        for (const id of ids) {
            const req = await this.load(id);
            if (req?.status === 'failed') failed.push(id);
        }
        return failed;
    }

    async delete(promiseId: string): Promise<boolean> {
        const file = this.filePath(promiseId);
        try {
            await fs.unlink(file);
            return true;
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
            throw err;
        }
    }

    /**
     * Cleanup old request files based on retention and max-files policy.
     *
     * - If retentionMs > 0: remove completed/failed/cancelled requests whose completedAt is older than now - retentionMs.
     * - If maxFiles > 0: after age-based cleanup, keep only the newest `maxFiles` requests by createdAt (delete oldest first).
     */
    async cleanup(options: { retentionMs?: number; maxFiles?: number } = {}): Promise<{
        removedByAge: number;
        removedByLimit: number;
        totalBefore: number;
        totalAfter: number;
    }> {
        const {retentionMs, maxFiles} = options;

        await this.ensureDir();
        const allIds = await this.listAll();
        const totalBefore = allIds.length;

        let removedByAge = 0;
        let removedByLimit = 0;

        // Age-based cleanup
        if (retentionMs && retentionMs > 0 && allIds.length > 0) {
            const now = Date.now();
            for (const id of allIds) {
                const req = await this.load(id);
                if (!req) continue;
                const status = req.status;
                const completedAt = req.completedAt;
                if (
                    (status === 'completed' || status === 'failed' || status === 'cancelled') &&
                    completedAt &&
                    now - completedAt.getTime() > retentionMs
                ) {
                    const deleted = await this.delete(id);
                    if (deleted) removedByAge++;
                }
            }
        }

        // Reload ids after age-based cleanup
        const remainingIds = await this.listAll();

        // Max-files cleanup (keep newest by createdAt)
        if (maxFiles && maxFiles > 0 && remainingIds.length > maxFiles) {
            const withCreated: Array<{id: string; createdAt: Date}> = [];
            for (const id of remainingIds) {
                const req = await this.load(id);
                if (!req) continue;
                withCreated.push({id, createdAt: req.createdAt});
            }
            withCreated.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            const toDelete = withCreated.slice(0, Math.max(0, withCreated.length - maxFiles));
            for (const entry of toDelete) {
                const deleted = await this.delete(entry.id);
                if (deleted) removedByLimit++;
            }
        }

        const totalAfter = (await this.listAll()).length;

        return {
            removedByAge,
            removedByLimit,
            totalBefore,
            totalAfter,
        };
    }
}
