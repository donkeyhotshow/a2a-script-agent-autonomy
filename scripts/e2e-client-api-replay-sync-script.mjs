/**
 * Live-stack smoke: drive Client API using golden client.json bodies from simulations/sync/script.
 * Requires Vite + plugin on CLIENT_API_BASE (default http://localhost:5173).
 *
 * Usage: node scripts/e2e-client-api-replay-sync-script.mjs
 * Env: CLIENT_API_BASE, MAX_STEPS (default 10), POLL_MS (default 400), POLL_CAP (default 120)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const GOLDEN = join(REPO, 'simulations', 'sync', 'script');

const BASE = (process.env.CLIENT_API_BASE || 'http://localhost:5173').replace(/\/$/, '');
const PREFIX = `${BASE}/api/a2a`;
const MAX_STEPS = Math.min(10, Math.max(1, Number(process.env.MAX_STEPS || 10)));
const POLL_MS = Number(process.env.POLL_MS || 400);
const POLL_CAP = Number(process.env.POLL_CAP || 120);

async function pollAsync(sessionId) {
    for (let i = 0; i < POLL_CAP; i++) {
        const r = await fetch(`${PREFIX}/sessions/${encodeURIComponent(sessionId)}/async`);
        if (!r.ok) throw new Error(`async ${r.status}`);
        const j = await r.json();
        if (j?.status === 'pending' || j?.pending) {
            await new Promise((res) => setTimeout(res, POLL_MS));
            continue;
        }
        return j;
    }
    throw new Error('async poll timeout');
}

function buildNextBody(client) {
    if (client.result) return { result: client.result };
    if (client.task) return { task: client.task };
    return {};
}

async function main() {
    const step1Client = join(GOLDEN, '1', 'client.json');
    if (!existsSync(step1Client)) {
        console.error('Missing', step1Client);
        process.exit(1);
    }
    const c1 = JSON.parse(readFileSync(step1Client, 'utf8'));
    const createBody = {
        projectId: c1.projectId || 'default',
        task: c1.task || 'sync/script golden replay',
        mode: 'agent',
    };

    const cr = await fetch(`${PREFIX}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createBody),
    });
    if (!cr.ok) {
        const t = await cr.text();
        throw new Error(`POST /sessions ${cr.status}: ${t}`);
    }
    const created = await cr.json();
    const sessionId = created.session?.id || created.id;
    if (!sessionId) throw new Error('No session id in create response');

    console.log('session', sessionId);

    for (let step = 1; step <= MAX_STEPS; step++) {
        const cp = join(GOLDEN, String(step), 'client.json');
        if (!existsSync(cp)) break;
        const client = JSON.parse(readFileSync(cp, 'utf8'));
        const body = buildNextBody(client);
        const nr = await fetch(`${PREFIX}/sessions/${encodeURIComponent(sessionId)}/next`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!nr.ok) {
            const t = await nr.text();
            throw new Error(`step ${step} /next ${nr.status}: ${t}`);
        }
        await pollAsync(sessionId);
        const gr = await fetch(`${PREFIX}/sessions/${encodeURIComponent(sessionId)}`);
        const sess = await gr.json();
        const ex = sess.session?.execute || sess.execute;
        const keys = ex && typeof ex === 'object' ? Object.keys(ex).filter((k) => k !== 'message') : [];
        console.log(`step ${step} execute keys:`, keys.length ? keys.join(',') : '(none or message-only)');
    }

    console.log('replay finished (smoke only; server path may differ from goldens)');
}

main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
});
