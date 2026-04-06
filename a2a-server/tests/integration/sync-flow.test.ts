/**
 * Invoke is async-only: POST /api/v1/invoke returns promiseId; terminal payload via GET …/result.
 */

import request from 'supertest';
import app from '../../src/app.js';
import {describe, it, expect, beforeAll, afterAll} from 'vitest';

const POLL_MS = 60_000;
const POLL_INTERVAL_MS = 40;

async function pollResultUntilTerminal(promiseId: string): Promise<{
    terminal: 'completed' | 'failed' | 'cancelled';
    data: Record<string, unknown>;
}> {
    const deadline = Date.now() + POLL_MS;
    for (;;) {
        if (Date.now() > deadline) {
            throw new Error(`poll timeout (${POLL_MS}ms) for ${promiseId}`);
        }
        const res = await request(app).get(`/api/v1/requests/${encodeURIComponent(promiseId)}/result`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const data = res.body.data as Record<string, unknown>;
        const st = data.status;
        if (st === 'completed' || st === 'failed' || st === 'cancelled') {
            return {terminal: st, data};
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
}

describe('Invoke async-only (no sync)', () => {
    beforeAll(() => {
        process.env.SKIP_AUTH = '1';
    });

    afterAll(() => {
        delete process.env.SKIP_AUTH;
    });

    it('POST /invoke returns promiseId, not inline execute', async () => {
        const res = await request(app).post('/api/v1/invoke').send({task: 'dialog'});
        expect([200, 201]).toContain(res.status);
        expect(res.body.success).toBe(true);
        const data = res.body.data as Record<string, unknown>;
        expect(typeof data.promiseId).toBe('string');
        expect(data.promiseId).toMatch(/^prom_/);
        expect(data.execute).toBeUndefined();
        expect(data.sync).toBeUndefined();
    });

    it('poll after task yields router choices + srv_sess_ id', async () => {
        const inv = await request(app).post('/api/v1/invoke').send({task: 'dialog'});
        expect(inv.status).toBe(200);
        const pid = (inv.body.data as {promiseId?: string}).promiseId;
        expect(pid).toBeDefined();

        const {terminal, data} = await pollResultUntilTerminal(pid!);
        expect(terminal).toBe('completed');
        const choices = (data.execute as Record<string, unknown> | undefined)?.form as
            | {choices?: unknown}
            | undefined;
        expect(Array.isArray(choices?.choices)).toBe(true);
        const ctx = data.context as Record<string, unknown> | undefined;
        expect(typeof ctx?.session_id).toBe('string');
        expect(String(ctx?.session_id)).toMatch(/^srv_sess_/);
    }, POLL_MS + 15_000);

    it('rejects unknown property sync (schema additionalProperties)', async () => {
        const res = await request(app).post('/api/v1/invoke').send({
            task: 'x',
            sync: true,
        });
        expect(res.status).toBe(400);
    });

    it('rejects first request missing task', async () => {
        const res = await request(app).post('/api/v1/invoke').send({});
        expect(res.status).toBe(400);
    });
});
