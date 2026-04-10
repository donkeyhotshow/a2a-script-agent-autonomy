import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHubPromiseRoutes } from '../../packages/vite-plugin/routes/hubPromiseRoutes.js';

describe('hubPromiseRoutes', () => {
    let mw;

    beforeEach(() => {
        mw = createHubPromiseRoutes();
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

    it('calls next() for non-hub URLs', async () => {
        const next = vi.fn();
        await mw({ method: 'GET', url: '/api/a2a/models' }, { end: vi.fn() }, next);
        expect(next).toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('returns 403 for disallowed hub subpath', async () => {
        const next = vi.fn();
        const res = {
            setHeader: vi.fn(),
            end: vi.fn(),
            statusCode: 0,
        };
        await mw({ method: 'GET', url: '/api/a2a/hub/not-allowed', headers: {} }, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.end.mock.calls[0][0]);
        expect(body.error).toBe('hub_path_not_allowed');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('proxies GET to hub for /promises/pending', async () => {
        const next = vi.fn();
        const res = {
            setHeader: vi.fn(),
            end: vi.fn(),
            statusCode: 0,
        };
        await mw({ method: 'GET', url: '/api/a2a/hub/promises/pending', headers: {} }, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(fetch).toHaveBeenCalled();
        const [target] = fetch.mock.calls[0];
        expect(String(target)).toContain('/promises/pending');
        expect(res.statusCode).toBe(200);
    });

    it('proxies when req.url is absolute (query preserved)', async () => {
        const next = vi.fn();
        const res = {
            setHeader: vi.fn(),
            end: vi.fn(),
            statusCode: 0,
        };
        await mw(
            {
                method: 'GET',
                url: 'http://127.0.0.1:5173/api/a2a/hub/promises/errors?detail=1',
                headers: {},
            },
            res,
            next
        );
        expect(next).not.toHaveBeenCalled();
        expect(fetch).toHaveBeenCalled();
        const [target] = fetch.mock.calls[0];
        expect(String(target)).toContain('/promises/errors');
        expect(String(target)).toContain('detail=1');
        expect(res.statusCode).toBe(200);
    });
});
