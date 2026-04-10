/**
 * Client API Server – sessions API (task-from-project flow).
 * POST /api/v1/sessions with projectId + task returns session id.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

/** Avoid loading full RAG → @a2a/execution graph in unit tests (execution package is not pre-bundled). */
vi.mock('@a2a/rag', () => ({
    RAGSearcher: class {
        async searchWithProtocol() {
            return { query: '', results: [], files: [] };
        }
    },
}));

/** Stub upstream: async-only /invoke (promiseId), matches production. */
vi.mock('../../packages/sdk/src/server/services/upstream.service.ts', async (importOriginal) => {
    const mod = await importOriginal();
    return {
        ...mod,
        getServerBaseUrl: async () => 'http://127.0.0.1:3000',
        serverFetch: vi.fn(async (method, _base, pathName) => {
            if (method === 'POST' && pathName === '/api/v1/invoke') {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        success: true,
                        data: {
                            promiseId: 'prom_integration_mock',
                            status: 'pending',
                            pollUrl: '/requests/prom_integration_mock',
                        },
                    }),
                };
            }
            return { ok: false, status: 404, json: async () => ({}) };
        }),
    };
});

import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

let app;
let testStorageDir;
let projectPath;

beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SKIP_AUTH = '1';
    testStorageDir = path.join(os.tmpdir(), `a2a-api-server-test-${Date.now()}`);
    projectPath = path.join(testStorageDir, 'project');
    await fs.mkdir(path.join(projectPath, '.a2a', 'sessions'), { recursive: true });
    await fs.mkdir(path.join(testStorageDir, 'storage'), { recursive: true });
    await fs.writeFile(
        path.join(testStorageDir, 'storage', 'projects.json'),
        JSON.stringify({
            projects: [
                { id: 'test-proj', name: 'Test', path: projectPath }
            ]
        }, null, 2)
    );
    process.env.A2A_CLIENT_STORAGE_DIR = path.join(testStorageDir, 'storage');

    const mod = await import('../../packages/sdk/src/server/index.ts');
    app = mod.createApp();
}, 60_000);

afterAll(async () => {
    try {
        await fs.rm(testStorageDir, { recursive: true, force: true });
    } catch (_) {}
});

describe('Client API Server – sessions', () => {
    it('POST /api/v1/sessions with projectId + task returns 201 and session id', async () => {
        const res = await request(app)
            .post('/api/v1/sessions')
            .send({ projectId: 'test-proj', task: 'fix vue imports', title: 'Task' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        const data = res.body.session;
        expect(data).toBeDefined();
        expect(data.id).toMatch(/^sess_\d+$/);
        expect(data.metadata?.projectId).toBe('test-proj');
        expect(data.metadata?.task).toBe('fix vue imports');
        expect(data.status).toBe('active');
    });

    it('POST /api/v1/sessions allows missing projectId (optional in SDK)', async () => {
        const res = await request(app).post('/api/v1/sessions').send({ task: 'hello' });

        expect(res.status).toBe(201);
        expect(res.body.session?.metadata?.task).toBe('hello');
    });

    it('POST /api/v1/sessions allows empty projectId string (optional in SDK)', async () => {
        const res = await request(app)
            .post('/api/v1/sessions')
            .send({ projectId: '', task: 'hello' });

        expect(res.status).toBe(201);
    });
});
