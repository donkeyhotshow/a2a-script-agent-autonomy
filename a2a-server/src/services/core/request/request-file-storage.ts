/**
 * File-based storage for requests.
 * Each request stored as {promiseId}.json in storage dir.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

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

    private filePath(promiseId: string): string {
        return path.join(this.storageDir, `${promiseId}.json`);
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
}
