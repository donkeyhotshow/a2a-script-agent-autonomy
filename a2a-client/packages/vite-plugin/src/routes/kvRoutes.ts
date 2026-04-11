import { SAFE_SEGMENT } from '../utils/server.js';
import { kvGet, kvSet, kvDelete, kvKeys, kvClear } from '@a2a-client/storage/kv.ts';

const STORAGE_PREFIX = '/api/storage';

export function createKvRoutes({ cwd }) {
    return (req, res, next) => {
        if (!req.url?.startsWith(STORAGE_PREFIX)) return next();

        const url = new URL(req.url, 'http://localhost');
        const p = url.pathname.slice(STORAGE_PREFIX.length);

        const keysMatch = p.match(/^\/([^/]+)\/keys$/);
        if (req.method === 'GET' && keysMatch) {
            const ns = keysMatch[1];
            if (!SAFE_SEGMENT.test(ns)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid namespace' }));
                return;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ keys: kvKeys(cwd, ns) }));
            return;
        }

        const kvMatch = p.match(/^\/([^/]+)\/([^/]+)$/);
        if (kvMatch) {
            const [, ns, key] = kvMatch;
            if (!SAFE_SEGMENT.test(ns) || !SAFE_SEGMENT.test(key)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid namespace or key' }));
                return;
            }

            if (req.method === 'GET') {
                try {
                    const data = kvGet(cwd, ns, key);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data === null ? { value: null } : data));
                } catch (e) {
                    res.writeHead(500).end(JSON.stringify({
                        error: 'KV read failed',
                        code: e?.code || 'KV_READ_ERROR',
                        message: String(e?.message || e),
                    }));
                }
                return;
            }

            if (req.method === 'PUT') {
                let body = '';
                req.on('data', (c) => (body += c));
                req.on('end', () => {
                    try {
                        const data = JSON.parse(body || '{}');
                        kvSet(cwd, ns, key, data);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true }));
                    } catch (e) {
                        res.writeHead(400).end(JSON.stringify({ error: String(e?.message || e) }));
                    }
                });
                return;
            }

            if (req.method === 'DELETE') {
                kvDelete(cwd, ns, key);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
                return;
            }
        }

        const nsMatch = p.match(/^\/([^/]+)$/);
        if (req.method === 'DELETE' && nsMatch) {
            const ns = nsMatch[1];
            if (!SAFE_SEGMENT.test(ns)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid namespace' }));
                return;
            }
            kvClear(cwd, ns);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
        }

        next();
    };
}
