/**
 * GET /api/a2a/models — proxy AI hub /api/tags for Web UI model picker.
 */
const API_PREFIX = '/api/a2a';

function getAiHubBaseUrl() {
    const raw = process.env.AI_HUB_URL || 'http://localhost:11434';
    return String(raw).replace(/\/$/, '');
}

export function createModelsRoutes() {
    return async function modelsMiddleware(req, res, next) {
        if (req.method !== 'GET' || !req.url?.startsWith(`${API_PREFIX}/models`)) {
            return next();
        }
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname !== `${API_PREFIX}/models`) {
            return next();
        }
        const hub = getAiHubBaseUrl();
        try {
            const r = await fetch(`${hub}/api/tags`, {
                signal: AbortSignal.timeout(8000),
            });
            const text = await r.text();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = r.ok ? 200 : r.status;
            res.end(text);
        } catch (e) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 502;
            res.end(JSON.stringify({ error: String(e?.message || e), models: [] }));
        }
    };
}
