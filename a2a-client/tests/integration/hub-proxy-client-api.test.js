/**
 * /api/a2a/hub/* — SDK hub proxy allowlist + forward (no full createApp).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createHubProxyRouter } from '../../packages/sdk/src/server/server/routes/hub-proxy.js';

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/a2a/hub', createHubProxyRouter());
    return app;
}

beforeEach(() => {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            arrayBuffer: async () => new Uint8Array([91, 93]).buffer,
            headers: { get: (h) => (String(h).toLowerCase() === 'content-type' ? 'application/json' : null) },
        })
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('SDK hub proxy router', () => {
    it('returns 403 for disallowed hub path', async () => {
        const app = makeApp();
        const res = await request(app).get('/api/a2a/hub/not-allowed');
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('hub_path_not_allowed');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('proxies GET /api/a2a/hub/promises/pending', async () => {
        const app = makeApp();
        const res = await request(app).get('/api/a2a/hub/promises/pending');
        expect(res.status).toBe(200);
        expect(fetch).toHaveBeenCalled();
        const [target] = fetch.mock.calls[0];
        expect(String(target)).toContain('/promises/pending');
    });
});
