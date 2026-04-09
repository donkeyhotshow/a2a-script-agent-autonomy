#!/usr/bin/env node
/**
 * Minimal HTTP smoke: Vite dev server `/api/a2a/*` + optional standalone Client API `/health`.
 * Run after: `npx vite` (port 5173) and optionally SDK server on CLIENT_API_PORT (3001).
 *
 *   node scripts/smoke-client-api.mjs
 *   set WEB_BASE=http://127.0.0.1:5173 && node scripts/smoke-client-api.mjs
 */

const webBase = (process.env.WEB_BASE || 'http://127.0.0.1:5173').replace(/\/$/, '');
const clientApiBase = (process.env.CLIENT_API_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
const skipStandalone = process.env.SMOKE_SKIP_STANDALONE_API === '1';

async function getOk(url) {
    const res = await fetch(url, { method: 'GET' });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text: text.slice(0, 200) };
}

let failed = false;

async function check(name, url) {
    try {
        const r = await getOk(url);
        if (!r.ok) {
            console.error(`FAIL ${name} ${url} -> ${r.status} ${r.text}`);
            failed = true;
        } else {
            console.log(`OK   ${name} ${url} -> ${r.status}`);
        }
    } catch (e) {
        console.error(`FAIL ${name} ${url}`, e?.message || e);
        failed = true;
    }
}

console.log('[smoke-client-api] WEB_BASE=', webBase);
await check('Vite plugin projects', `${webBase}/api/a2a/projects`);
await check('Vite plugin sessions list', `${webBase}/api/a2a/sessions`);

/** Hub queue proxy (optional): 200 = hub OK; 502 = hub down but route exists */
async function checkHubProxyOptional() {
    const url = `${webBase}/api/a2a/hub/promises/pending`;
    try {
        const res = await fetch(url, { method: 'GET' });
        const text = await res.text();
        if (res.ok || res.status === 502) {
            console.log(`OK   Vite hub proxy (${res.status})`, url, text.slice(0, 80));
        } else {
            console.error(`FAIL Vite hub proxy ${url} -> ${res.status} ${text.slice(0, 200)}`);
            failed = true;
        }
    } catch (e) {
        console.error(`FAIL Vite hub proxy ${url}`, e?.message || e);
        failed = true;
    }
}
await checkHubProxyOptional();

if (!skipStandalone) {
    console.log('[smoke-client-api] CLIENT_API_URL=', clientApiBase, '(set SMOKE_SKIP_STANDALONE_API=1 to skip)');
    await check('Standalone Client API health', `${clientApiBase}/health`);
}

process.exit(failed ? 1 : 0);
