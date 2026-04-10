/**
 * /api/a2a/hub/* — proxy to AI hub (promise queue). Same allowlist as Vite dev middleware.
 */
import {Router, type Request, type Response} from 'express';

function hubBase(): string {
    return String(process.env.AI_HUB_URL || 'http://localhost:11434').replace(/\/$/, '');
}

function isSafeHubPath(sub: string): boolean {
    if (!sub || sub.includes('..')) return false;
    if (sub.startsWith('/promises/')) return true;
    if (sub.startsWith('/promise/')) return true;
    return false;
}

export function createHubProxyRouter(): Router {
    const router = Router();
    router.all('/*', async (req: Request, res: Response) => {
        const sub = req.path || '/';
        if (!isSafeHubPath(sub)) {
            res.status(403).json({error: 'hub_path_not_allowed', path: sub});
            return;
        }
        const hub = hubBase();
        const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const target = `${hub}${sub}${qs}`;
        const method = req.method || 'GET';
        const headers: Record<string, string> = {};
        const ct = req.headers['content-type'];
        if (ct) headers['Content-Type'] = String(ct);

        let body: string | undefined;
        if (!['GET', 'HEAD', 'DELETE'].includes(method.toUpperCase())) {
            if (req.body != null && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
                body = JSON.stringify(req.body);
                headers['Content-Type'] = headers['Content-Type'] || 'application/json';
            }
        }

        try {
            const r = await fetch(target, {
                method,
                headers,
                body,
                signal: AbortSignal.timeout(120000),
            });
            const buf = Buffer.from(await r.arrayBuffer());
            const outCt = r.headers.get('content-type') || 'application/octet-stream';
            res.status(r.status);
            res.setHeader('Content-Type', outCt);
            res.end(buf);
        } catch (e) {
            res.status(502).json({error: String((e as Error)?.message || e)});
        }
    });
    return router;
}
