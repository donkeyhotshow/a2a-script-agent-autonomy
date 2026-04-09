/**
 * /api/a2a/hub/* — pass-through to AI Integration hub (default :11434) for promise queue ops.
 * Allowed paths only: /promises/* and /promise/* (no ..).
 */
const API_PREFIX = '/api/a2a/hub';

/** Pathname + search — tolerates absolute req.url (some proxies) and normal relative paths. */
function requestUrlParts(req) {
    const full = String(req.url || '');
    try {
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(full)) {
            const u = new URL(full);
            return { pathname: u.pathname, search: u.search };
        }
        const u = new URL(full, 'http://127.0.0.1');
        return { pathname: u.pathname, search: u.search };
    } catch {
        return { pathname: '', search: '' };
    }
}

function getAiHubBaseUrl() {
    const raw = process.env.AI_HUB_URL || 'http://localhost:11434';
    return String(raw).replace(/\/$/, '');
}

function isSafeHubSubPath(sub) {
    if (!sub || sub.includes('..')) return false;
    if (sub.startsWith('/promises/')) return true;
    if (sub.startsWith('/promise/')) return true;
    return false;
}

function bufferRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

export function createHubPromiseRoutes() {
    return async function hubPromiseMiddleware(req, res, next) {
        const { pathname, search } = requestUrlParts(req);
        if (!pathname.startsWith(`${API_PREFIX}/`)) {
            return next();
        }
        const sub = pathname.slice(API_PREFIX.length) || '/';
        if (!isSafeHubSubPath(sub)) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 403;
            res.end(JSON.stringify({ error: 'hub_path_not_allowed', path: sub }));
            return;
        }
        const hub = getAiHubBaseUrl();
        const target = `${hub}${sub}${search}`;

        const method = (req.method || 'GET').toUpperCase();
        const headers = {};
        const ct = req.headers['content-type'];
        if (ct) headers['Content-Type'] = ct;

        let body;
        if (method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') {
            body = await bufferRequestBody(req);
            if (body && body.length === 0) body = undefined;
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
            res.statusCode = r.status;
            res.setHeader('Content-Type', outCt);
            res.end(buf);
        } catch (e) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 502;
            res.end(JSON.stringify({ error: String(e?.message || e) }));
        }
    };
}
